"use server";

import { createClient } from "@/lib/supabase/server";
import { textoDe } from "@/lib/acciones";
import { codigoCentro } from "@/design/tokens";

/** Acciones de la web pública. Solo usan la clave anon: RLS permite a anon insertar leads, no leerlos. */

export type CampoVisita = "nombre" | "email" | "telefono" | "centro_id" | "tarifa_id" | "mensaje" | "consentimiento";

export type EstadoVisita = {
  ok: boolean | null;
  mensaje: string;
  errores?: Partial<Record<CampoVisita, string>>;
  /** Código de tres letras del centro elegido, para la confirmación. */
  codigo?: string;
  centro?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TELEFONO = /^[+\d][\d\s().-]{6,19}$/;

export async function pedirVisita(_anterior: EstadoVisita, formData: FormData): Promise<EstadoVisita> {
  // Honeypot: una persona no ve este campo. Si llega relleno, fingimos éxito y no guardamos nada.
  if (textoDe(formData, "web")) return { ok: true, mensaje: "Solicitud recibida.", codigo: "—", centro: "" };

  const nombre = textoDe(formData, "nombre");
  const email = textoDe(formData, "email").toLowerCase();
  const telefono = textoDe(formData, "telefono");
  const centroId = textoDe(formData, "centro_id");
  const tarifaId = textoDe(formData, "tarifa_id");
  const mensaje = textoDe(formData, "mensaje");
  const consentimiento = formData.get("consentimiento") === "si";

  const errores: EstadoVisita["errores"] = {};
  if (nombre.length < 2) errores.nombre = "Escribe tu nombre (al menos 2 letras).";
  else if (nombre.length > 120) errores.nombre = "El nombre es demasiado largo: usa como mucho 120 caracteres.";
  if (!email) errores.email = "Escribe tu email, por ejemplo nombre@correo.com.";
  else if (!EMAIL.test(email) || email.length > 200) errores.email = "Al email le falta algo. Escríbelo como nombre@correo.com.";
  if (telefono && !TELEFONO.test(telefono)) {
    errores.telefono = "Escribe solo números, por ejemplo 612 345 678, o deja el teléfono vacío.";
  }
  if (!UUID.test(centroId)) errores.centro_id = "Elige el centro que quieres visitar.";
  if (tarifaId && !UUID.test(tarifaId)) errores.tarifa_id = "Elige una tarifa de la lista o «Aún no lo sé».";
  if (mensaje.length > 1000) errores.mensaje = `El mensaje tiene ${mensaje.length} caracteres y el máximo es 1000. Acórtalo un poco.`;
  if (!consentimiento) errores.consentimiento = "Marca la casilla para que el centro pueda escribirte.";

  if (Object.keys(errores).length) {
    const n = Object.keys(errores).length;
    return { ok: false, mensaje: n === 1 ? "Falta corregir 1 campo." : `Falta corregir ${n} campos.`, errores };
  }

  const supabase = await createClient();

  const [centro, tarifa] = await Promise.all([
    supabase.from("centros").select("id,nombre,slug").eq("id", centroId).eq("activo", true).maybeSingle(),
    tarifaId
      ? supabase.from("tarifas").select("id").eq("id", tarifaId).eq("activa", true).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  // Un fallo de conexión no es culpa de quien rellena: no se le marca el campo.
  if (centro.error || tarifa.error) {
    console.error("[visita] consulta fallida", centro.error ?? tarifa.error);
    return { ok: false, mensaje: "No hemos podido enviar tu solicitud. Inténtalo de nuevo en un momento." };
  }
  if (!centro.data) {
    return {
      ok: false,
      mensaje: "Falta corregir 1 campo.",
      errores: { centro_id: "Ese centro ya no admite visitas. Elige otro de la lista." },
    };
  }
  if (tarifaId && !tarifa.data) {
    return {
      ok: false,
      mensaje: "Falta corregir 1 campo.",
      errores: { tarifa_id: "Esa tarifa ya no está disponible. Elige otra o «Aún no lo sé»." },
    };
  }

  // Sin .select(): anon puede insertar pero no leer leads.
  const { error } = await supabase.from("leads").insert({
    nombre,
    email,
    telefono: telefono || null,
    mensaje: mensaje || null,
    origen: "web",
    estado: "nuevo",
    centro_id: centro.data.id,
    tarifa_interes_id: tarifaId || null,
  });

  if (error) {
    console.error("[visita] insert de lead fallido", error);
    return {
      ok: false,
      mensaje: "No hemos podido enviar tu solicitud. Inténtalo de nuevo en un momento o llama a tu centro.",
    };
  }

  const nombreCentro = String(centro.data.nombre).replace(/^Ice Gym\s+/i, "");
  return {
    ok: true,
    mensaje: "Solicitud recibida.",
    codigo: codigoCentro(centro.data.slug ?? centro.data.nombre),
    centro: nombreCentro,
  };
}
