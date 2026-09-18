"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { textoDe, type EstadoAccion } from "@/lib/acciones";
import {
  ETIQUETA_LEAD,
  TIPOS_ACTIVIDAD_MANUAL,
  esEstadoLead,
  type EstadoLead,
  type TipoActividad,
} from "@/lib/tipos";

/** Mueve un lead de columna y deja constancia en su historial. */
export async function moverLead(
  id: string,
  nuevo: EstadoLead,
  anterior: EstadoLead
): Promise<EstadoAccion> {
  if (!esEstadoLead(nuevo) || !esEstadoLead(anterior)) {
    return { ok: false, mensaje: "Ese estado no existe." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ estado: nuevo, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, mensaje: `No se pudo mover el lead: ${error.message}` };

  await supabase.from("actividades").insert({
    lead_id: id,
    tipo: "cambio_estado",
    descripcion: `${ETIQUETA_LEAD[anterior]} → ${ETIQUETA_LEAD[nuevo]}`,
  });

  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${id}`);
  revalidatePath("/crm");
  return { ok: true, mensaje: `Movido a ${ETIQUETA_LEAD[nuevo]}.` };
}

/** Cambia el estado desde la ficha (alternativa accesible al arrastre). */
export async function cambiarEstadoLead(
  _anterior: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const id = textoDe(formData, "id");
  const nuevo = textoDe(formData, "estado");
  const previo = textoDe(formData, "estado_anterior");

  if (!id || !esEstadoLead(nuevo) || !esEstadoLead(previo)) {
    return { ok: false, mensaje: "Ese estado no existe." };
  }
  if (nuevo === previo) return { ok: null, mensaje: "" };

  return moverLead(id, nuevo, previo);
}

export async function guardarNotasLead(
  _anterior: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const id = textoDe(formData, "id");
  const notas = textoDe(formData, "notas");
  if (!id) return { ok: false, mensaje: "Falta el lead." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ notas: notas || null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  revalidatePath(`/crm/leads/${id}`);
  return { ok: true, mensaje: "Notas guardadas." };
}

export async function registrarActividad(
  _anterior: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const leadId = textoDe(formData, "lead_id");
  const socioId = textoDe(formData, "socio_id");
  const tipo = textoDe(formData, "tipo") as TipoActividad;
  const descripcion = textoDe(formData, "descripcion");

  if (!leadId && !socioId) return { ok: false, mensaje: "Falta la ficha." };
  if (!(TIPOS_ACTIVIDAD_MANUAL as readonly string[]).includes(tipo)) {
    return { ok: false, mensaje: "Ese tipo de actividad no existe." };
  }
  if (descripcion.length < 2) return { ok: false, mensaje: "Describe qué ha pasado." };

  const supabase = await createClient();
  const { error } = await supabase.from("actividades").insert({
    lead_id: leadId || null,
    socio_id: socioId || null,
    tipo,
    descripcion,
  });

  if (error) return { ok: false, mensaje: `No se pudo registrar: ${error.message}` };

  if (leadId) revalidatePath(`/crm/leads/${leadId}`);
  if (socioId) revalidatePath(`/crm/socios/${socioId}`);
  return { ok: true, mensaje: "Actividad registrada." };
}

/**
 * Convierte un lead en socio: crea la ficha de socio, emite la cuota del mes
 * (y la matrícula si la tarifa la tiene) y enlaza ambos registros.
 */
export async function convertirEnSocio(
  _anterior: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const leadId = textoDe(formData, "lead_id");
  const centroId = textoDe(formData, "centro_id");
  const tarifaId = textoDe(formData, "tarifa_id");
  const apellidos = textoDe(formData, "apellidos");

  if (!leadId || !centroId || !tarifaId) {
    return { ok: false, mensaje: "Elige centro y tarifa antes de convertir." };
  }

  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, nombre, email, telefono, estado, socio_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, mensaje: "Ese lead ya no existe." };
  if (lead.socio_id) return { ok: false, mensaje: "Este lead ya es socio." };

  const { data: tarifa } = await supabase
    .from("tarifas")
    .select("id, nombre, cuota_mensual, matricula")
    .eq("id", tarifaId)
    .maybeSingle();

  if (!tarifa) return { ok: false, mensaje: "Esa tarifa ya no existe." };

  // El lead guarda el nombre completo en un solo campo; lo partimos.
  const partes = lead.nombre.trim().split(/\s+/);
  const nombre = partes[0] ?? lead.nombre;
  const apellidosFinales = apellidos || partes.slice(1).join(" ") || "—";

  const { data: socio, error: errorSocio } = await supabase
    .from("socios")
    .insert({
      nombre,
      apellidos: apellidosFinales,
      email: lead.email,
      telefono: lead.telefono,
      centro_id: centroId,
      tarifa_id: tarifaId,
      estado: "activo",
    })
    .select("id, numero_socio")
    .single();

  if (errorSocio || !socio) {
    return { ok: false, mensaje: `No se pudo crear el socio: ${errorSocio?.message ?? ""}` };
  }

  const primerDiaDelMes = new Date();
  const periodo = new Date(
    Date.UTC(primerDiaDelMes.getUTCFullYear(), primerDiaDelMes.getUTCMonth(), 1)
  )
    .toISOString()
    .slice(0, 10);

  const recibos: {
    socio_id: string;
    periodo: string;
    concepto: "cuota" | "matricula";
    importe: number;
    estado: "pendiente";
  }[] = [
    {
      socio_id: socio.id,
      periodo,
      concepto: "cuota",
      importe: tarifa.cuota_mensual,
      estado: "pendiente",
    },
  ];
  if (Number(tarifa.matricula) > 0) {
    recibos.push({
      socio_id: socio.id,
      periodo,
      concepto: "matricula",
      importe: tarifa.matricula,
      estado: "pendiente",
    });
  }
  await supabase.from("pagos").insert(recibos);

  await supabase
    .from("leads")
    .update({ estado: "convertido", socio_id: socio.id, updated_at: new Date().toISOString() })
    .eq("id", leadId);

  await supabase.from("actividades").insert({
    lead_id: leadId,
    tipo: "cambio_estado",
    descripcion: `Convertido en socio ${socio.numero_socio} con tarifa ${tarifa.nombre}.`,
  });

  revalidatePath("/crm/leads");
  revalidatePath("/crm/socios");
  revalidatePath("/crm");
  redirect(`/crm/socios/${socio.id}`);
}
