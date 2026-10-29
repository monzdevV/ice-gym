import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { DatosFactura } from "@/lib/facturas";

/**
 * Agente lector de facturas.
 * Manda la factura (foto o PDF) a Claude (API de Anthropic) con una sola herramienta,
 * `guardar_factura`. Claude NUNCA toca la base de datos: solo devuelve la llamada a la
 * herramienta con los datos; quien la ejecuta (el INSERT) es nuestro código.
 * Sin memoria: cada factura es una conversación nueva.
 */

const MODELO_DEFECTO = "claude-haiku-5-5";
const TIMEOUT_MS = 90_000;

export const PROMPT_SISTEMA = [
  "Eres un asistente de administración.",
  "Lee la factura que te paso (PDF o foto).",
  "Saca: número, fecha, proveedor, NIF,",
  "base imponible, IVA y total.",
  "Si un dato no aparece, déjalo vacío.",
  "No inventes nada.",
  "Cuando lo tengas, llama a guardar_factura.",
].join("\n");

const texto = (description: string) => ({ type: ["string", "null"], description });
const numero = (description: string) => ({ type: ["number", "null"], description });

// `strict` garantiza que los argumentos cumplen el esquema. Estos modelos no admiten forzar
// la herramienta con tool_choice, así que el prompt le dice que la llame.
export const HERRAMIENTA_GUARDAR_FACTURA: Anthropic.Beta.BetaTool = {
  name: "guardar_factura",
  description: "Guarda en la base de datos los datos leídos de la factura.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      numero: texto("Número de factura, tal cual aparece."),
      fecha: texto("Fecha de emisión en formato AAAA-MM-DD."),
      proveedor: texto("Nombre o razón social de quien emite la factura."),
      nif: texto("NIF/CIF del proveedor."),
      base: numero("Base imponible en euros, con punto decimal."),
      iva: numero("Cuota de IVA en euros (el importe, no el porcentaje), con punto decimal."),
      total: numero("Total de la factura en euros, con punto decimal."),
    },
    required: ["numero", "fecha", "proveedor", "nif", "base", "iva", "total"],
    additionalProperties: false,
  },
};

export type ArchivoFactura = { bytes: ArrayBuffer | Buffer; tipo: string; nombre: string };
export type ResultadoAgente = { datos: DatosFactura; modelo: string };

/* ---------------------------- Normalización ---------------------------- */

function textoLimpio(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

/** Acepta 1234.56, "1.234,56", "1,234.56", "1234,56 €"… y devuelve un número con punto. */
export function normalizarNumero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
  let t = textoLimpio(v);
  if (!t) return null;
  t = t.replace(/[^\d,.-]/g, "");
  const coma = t.lastIndexOf(",");
  const punto = t.lastIndexOf(".");
  if (coma > -1 && punto > -1) {
    // El último separador es el decimal; el otro, de miles.
    t = coma > punto ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (coma > -1) {
    t = t.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(t);
  return t !== "" && Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Devuelve AAAA-MM-DD o null. Acepta también DD/MM/AAAA y DD-MM-AAAA. */
export function normalizarFecha(v: unknown): string | null {
  const t = textoLimpio(v);
  if (!t) return null;
  let a: number, m: number, d: number;
  let r = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (r) [a, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else if ((r = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) [d, m, a] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else return null;
  const fecha = new Date(Date.UTC(a, m - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return null;
  return `${String(a).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** NIF en mayúsculas, sin espacios, guiones ni puntos (quita también el prefijo «ES» del NIF-IVA). */
export function normalizarNif(v: unknown): string | null {
  const t = textoLimpio(v);
  if (!t) return null;
  let n = t.toUpperCase().replace(/[\s.\-_/]/g, "");
  if (/^ES[A-Z0-9]\d{7}[A-Z0-9]$/.test(n)) n = n.slice(2);
  return n === "" ? null : n;
}

export function normalizarDatos(bruto: Record<string, unknown>): DatosFactura {
  return {
    numero: textoLimpio(bruto.numero),
    fecha: normalizarFecha(bruto.fecha),
    proveedor: textoLimpio(bruto.proveedor),
    nif: normalizarNif(bruto.nif),
    base: normalizarNumero(bruto.base),
    iva: normalizarNumero(bruto.iva),
    total: normalizarNumero(bruto.total),
  };
}

/** Cuántos de los 7 datos tienen valor. */
export const datosRellenos = (d: DatosFactura) => Object.values(d).filter((v) => v !== null).length;

/* ------------------------------- Llamada ------------------------------- */

function contenidoArchivo(archivo: ArchivoFactura): Anthropic.Beta.BetaContentBlockParam {
  const bytes = archivo.bytes instanceof ArrayBuffer ? Buffer.from(archivo.bytes) : archivo.bytes;
  const data = bytes.toString("base64");
  if (archivo.tipo === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  }
  const imagenes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  const tipoImagen = imagenes.find((t) => t === archivo.tipo);
  if (tipoImagen) return { type: "image", source: { type: "base64", media_type: tipoImagen, data } };
  throw new Error(`Tipo de archivo no admitido (${archivo.tipo}). Sube una foto (JPG, PNG, WebP) o un PDF.`);
}

/**
 * Manda la factura a Claude y devuelve los argumentos de `guardar_factura` ya normalizados.
 * No guarda nada: el INSERT lo hace quien llama (la acción del servidor). Tras eso el bucle
 * termina; no se vuelve a llamar a Claude.
 */
export async function ejecutarAgente(archivo: ArchivoFactura): Promise<ResultadoAgente> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) {
    throw new Error("Falta la clave de Claude: añade ANTHROPIC_API_KEY a .env.local y reinicia el servidor.");
  }
  const modelo = process.env.ANTHROPIC_MODEL || MODELO_DEFECTO;
  const cliente = new Anthropic({ apiKey: clave, timeout: TIMEOUT_MS, maxRetries: 1 });

  let respuesta: Anthropic.Beta.BetaMessage;
  try {
    respuesta = await cliente.beta.messages.create({
      model: modelo,
      max_tokens: 16000,
      output_config: { effort: "low" },
      system: PROMPT_SISTEMA,
      messages: [
        {
          role: "user",
          content: [contenidoArchivo(archivo), { type: "text", text: `Factura: ${archivo.nombre}` }],
        },
      ],
      tools: [HERRAMIENTA_GUARDAR_FACTURA],
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error("Anthropic rechaza la clave (ANTHROPIC_API_KEY no es válida).");
    if (e instanceof Anthropic.PermissionDeniedError) throw new Error("La clave de Claude no tiene permiso para este modelo o no queda saldo.");
    if (e instanceof Anthropic.RateLimitError) throw new Error("Demasiadas peticiones a Claude. Espera un momento y repite.");
    if (e instanceof Anthropic.APIConnectionTimeoutError) {
      throw new Error(`Claude ha tardado más de ${TIMEOUT_MS / 1000} s en responder. Prueba otra vez.`);
    }
    if (e instanceof Anthropic.APIConnectionError) throw new Error("No se pudo conectar con Claude. Revisa la conexión a internet.");
    if (e instanceof Anthropic.NotFoundError) {
      throw new Error(`El modelo «${modelo}» no existe o la clave no tiene acceso. Revisa ANTHROPIC_MODEL en .env.local.`);
    }
    if (e instanceof Anthropic.APIError) {
      if (e.status === 413) throw new Error("El archivo es demasiado grande para mandarlo a Claude. Reduce la foto o el PDF.");
      if (e.status === 529 || e.status === 503) throw new Error("Claude está saturado ahora mismo. Espera un minuto y pulsa Reintentar.");
      if (e.status === 400) {
        throw new Error("Claude no ha podido abrir el archivo. Comprueba que la foto se ve bien o que el PDF no tiene contraseña y prueba otra vez.");
      }
      if ((e.status ?? 0) >= 500) throw new Error("Claude ha tenido un fallo interno. Pulsa Reintentar en un momento.");
      throw new Error(`Claude ha devuelto un error (${e.status ?? "?"}). Pulsa Reintentar; si se repite, avisa a quien mantiene el CRM.`);
    }
    throw e;
  }

  if (respuesta.stop_reason === "refusal") {
    throw new Error("Claude se ha negado a leer este archivo.");
  }
  if (respuesta.stop_reason === "max_tokens") {
    throw new Error("Claude se ha quedado sin espacio antes de terminar de leer la factura. Prueba otra vez.");
  }

  const llamada = respuesta.content.find(
    (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === "guardar_factura",
  );
  if (!llamada) {
    throw new Error("Claude no ha llamado a guardar_factura: no ha podido leer la factura.");
  }

  const args = llamada.input;
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("Claude ha devuelto los datos en un formato que no se entiende.");
  }

  return { datos: normalizarDatos(args as Record<string, unknown>), modelo: respuesta.model || modelo };
}
