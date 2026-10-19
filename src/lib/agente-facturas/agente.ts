import "server-only";
import type { DatosFactura } from "@/lib/facturas";

/**
 * Agente lector de facturas.
 * Manda la factura (foto o PDF) a Claude vía OpenRouter con una sola herramienta,
 * `guardar_factura`. Claude NUNCA toca la base de datos: solo devuelve la llamada a la
 * herramienta con los datos; quien la ejecuta (el INSERT) es nuestro código.
 * Sin memoria: cada factura es una conversación nueva.
 */

const URL_OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";
const MODELO_DEFECTO = "anthropic/claude-sonnet-4.5";
const TIMEOUT_MS = 60_000;

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

export const HERRAMIENTA_GUARDAR_FACTURA = {
  type: "function",
  function: {
    name: "guardar_factura",
    description: "Guarda en la base de datos los datos leídos de la factura.",
    parameters: {
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
  },
} as const;

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

function contenidoArchivo(archivo: ArchivoFactura) {
  const bytes = archivo.bytes instanceof ArrayBuffer ? Buffer.from(archivo.bytes) : archivo.bytes;
  const url = `data:${archivo.tipo};base64,${bytes.toString("base64")}`;
  if (archivo.tipo === "application/pdf") {
    return { type: "file", file: { filename: archivo.nombre || "factura.pdf", file_data: url } };
  }
  if (archivo.tipo.startsWith("image/")) return { type: "image_url", image_url: { url } };
  throw new Error(`Tipo de archivo no admitido (${archivo.tipo}). Sube una foto (JPG, PNG, WebP) o un PDF.`);
}

type RespuestaOpenRouter = {
  model?: string;
  error?: { message?: string };
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: { function?: { name?: string; arguments?: string } }[];
    };
  }[];
};

/**
 * Manda la factura a Claude y devuelve los argumentos de `guardar_factura` ya normalizados.
 * No guarda nada: el INSERT lo hace quien llama (la acción del servidor). Tras eso el bucle
 * termina; no se vuelve a llamar a Claude.
 */
export async function ejecutarAgente(archivo: ArchivoFactura): Promise<ResultadoAgente> {
  const clave = process.env.OPENROUTER_API_KEY;
  if (!clave) {
    throw new Error("Falta la clave de OpenRouter: añade OPENROUTER_API_KEY a .env.local y reinicia el servidor.");
  }
  const modelo = process.env.OPENROUTER_MODEL || MODELO_DEFECTO;

  const cuerpo = {
    model: modelo,
    messages: [
      { role: "system", content: PROMPT_SISTEMA },
      {
        role: "user",
        content: [{ type: "text", text: `Factura: ${archivo.nombre}` }, contenidoArchivo(archivo)],
      },
    ],
    tools: [HERRAMIENTA_GUARDAR_FACTURA],
    tool_choice: { type: "function", function: { name: "guardar_factura" } },
    temperature: 0,
    max_tokens: 1024,
  };

  let res: Response;
  try {
    res = await fetch(URL_OPENROUTER, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
        "X-Title": "Ice Gym CRM - lector de facturas",
      },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new Error(`Claude ha tardado más de ${TIMEOUT_MS / 1000} s en responder. Prueba otra vez.`);
    }
    throw new Error("No se pudo conectar con OpenRouter. Revisa la conexión a internet.");
  }

  let json: RespuestaOpenRouter | null = null;
  try {
    json = (await res.json()) as RespuestaOpenRouter;
  } catch {
    // Respuesta sin JSON: se trata abajo según el código HTTP.
  }

  if (!res.ok || json?.error) {
    if (res.status === 401) throw new Error("OpenRouter rechaza la clave (OPENROUTER_API_KEY no es válida).");
    if (res.status === 402) throw new Error("No queda saldo en OpenRouter para llamar a Claude.");
    if (res.status === 429) throw new Error("Demasiadas peticiones a OpenRouter. Espera un momento y repite.");
    if (res.status === 413) throw new Error("El archivo es demasiado grande para mandarlo a Claude.");
    const detalle = json?.error?.message ? `: ${json.error.message}` : "";
    throw new Error(`OpenRouter ha devuelto un error (${res.status})${detalle}.`);
  }

  const llamada = json?.choices?.[0]?.message?.tool_calls?.find((t) => t.function?.name === "guardar_factura");
  if (!llamada?.function?.arguments) {
    throw new Error("Claude no ha llamado a guardar_factura: no ha podido leer la factura.");
  }

  let args: unknown;
  try {
    args = JSON.parse(llamada.function.arguments);
  } catch {
    args = null;
  }
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("Claude ha devuelto los datos en un formato que no se entiende.");
  }

  return { datos: normalizarDatos(args as Record<string, unknown>), modelo: json?.model || modelo };
}
