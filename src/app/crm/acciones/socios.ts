"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { textoDe, type EstadoAccion } from "@/lib/acciones";
import { ETIQUETA_SOCIO, type EstadoSocio } from "@/lib/tipos";

/** Transiciones permitidas desde cada estado, y el texto de cada acción. */
const TRANSICIONES: Record<string, { de: EstadoSocio[]; a: EstadoSocio; verbo: string }> = {
  congelar: { de: ["activo", "impago"], a: "congelado", verbo: "Congelado" },
  reactivar: { de: ["congelado", "baja"], a: "activo", verbo: "Reactivado" },
  baja: { de: ["activo", "congelado", "impago"], a: "baja", verbo: "Dado de baja" },
};

export async function cambiarEstadoSocio(
  _anterior: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const id = textoDe(formData, "id");
  const operacion = textoDe(formData, "operacion");
  const motivo = textoDe(formData, "motivo");
  const regla = TRANSICIONES[operacion];

  if (!id || !regla) return { ok: false, mensaje: "Esa acción no existe." };

  const supabase = await createClient();
  const { data: socio } = await supabase
    .from("socios")
    .select("estado, numero_socio")
    .eq("id", id)
    .maybeSingle<{ estado: EstadoSocio; numero_socio: string }>();

  if (!socio) return { ok: false, mensaje: "Ese socio ya no existe." };
  if (!regla.de.includes(socio.estado)) {
    return {
      ok: false,
      mensaje: `No se puede pasar de ${ETIQUETA_SOCIO[socio.estado].toLowerCase()} a ${ETIQUETA_SOCIO[regla.a].toLowerCase()}.`,
    };
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("socios")
    .update({
      estado: regla.a,
      fecha_baja: regla.a === "baja" ? hoy : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, mensaje: `No se pudo actualizar: ${error.message}` };

  await supabase.from("actividades").insert({
    socio_id: id,
    tipo: "cambio_estado",
    descripcion: `${ETIQUETA_SOCIO[socio.estado]} → ${ETIQUETA_SOCIO[regla.a]}${motivo ? `. ${motivo}` : ""}`,
  });

  revalidatePath(`/crm/socios/${id}`);
  revalidatePath("/crm/socios");
  revalidatePath("/crm");
  return { ok: true, mensaje: `${regla.verbo}: ${socio.numero_socio}.` };
}

export async function guardarNotasSocio(
  _anterior: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const id = textoDe(formData, "id");
  const notas = textoDe(formData, "notas");
  if (!id) return { ok: false, mensaje: "Falta el socio." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("socios")
    .update({ notas: notas || null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  revalidatePath(`/crm/socios/${id}`);
  return { ok: true, mensaje: "Notas guardadas." };
}

/** Marca un recibo como cobrado hoy. */
export async function marcarPagado(
  _anterior: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const pagoId = textoDe(formData, "pago_id");
  const socioId = textoDe(formData, "socio_id");
  const metodo = textoDe(formData, "metodo") || "tarjeta";
  if (!pagoId) return { ok: false, mensaje: "Falta el recibo." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pagos")
    .update({
      estado: "pagado",
      fecha_pago: new Date().toISOString().slice(0, 10),
      metodo,
    })
    .eq("id", pagoId);

  if (error) return { ok: false, mensaje: `No se pudo cobrar: ${error.message}` };

  // Si ya no le quedan impagos, el socio deja de estar en impago.
  if (socioId) {
    const { count } = await supabase
      .from("pagos")
      .select("id", { count: "exact", head: true })
      .eq("socio_id", socioId)
      .eq("estado", "impagado");

    if ((count ?? 0) === 0) {
      await supabase
        .from("socios")
        .update({ estado: "activo", updated_at: new Date().toISOString() })
        .eq("id", socioId)
        .eq("estado", "impago");
    }
    revalidatePath(`/crm/socios/${socioId}`);
  }

  revalidatePath("/crm/pagos");
  revalidatePath("/crm");
  return { ok: true, mensaje: "Recibo cobrado." };
}
