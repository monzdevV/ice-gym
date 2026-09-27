"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { textoDe, type EstadoAccion } from "@/lib/acciones";
import {
  ETIQUETA_LEAD,
  TIPOS_ACTIVIDAD_MANUAL,
  esEstadoLead,
  esOrigenLead,
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
  revalidatePath("/crm/club");
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
  revalidatePath("/crm/club");
  redirect(`/crm/socios/${socio.id}`);
}

/* ----------------------------- Oportunidades ---------------------------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function revalidarLeads(id?: string) {
  revalidatePath("/crm/leads");
  if (id) revalidatePath(`/crm/leads/${id}`);
  revalidatePath("/crm");
  revalidatePath("/crm/club");
}

/** Normaliza etiquetas: minúsculas, sin repetir, máximo 8 de 24 letras. */
function limpiarEtiquetas(texto: string) {
  return [
    ...new Set(
      texto
        .split(",")
        .map((t) => t.trim().toLowerCase().slice(0, 24))
        .filter(Boolean)
    ),
  ].slice(0, 8);
}

/** Alta manual de un lead desde el CRM. */
export async function crearLead(_anterior: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const nombre = textoDe(formData, "nombre");
  const email = textoDe(formData, "email").toLowerCase();
  const telefono = textoDe(formData, "telefono");
  const origen = textoDe(formData, "origen");
  const centroId = textoDe(formData, "centro_id");
  const tarifaId = textoDe(formData, "tarifa_id");
  const notas = textoDe(formData, "notas");

  if (nombre.length < 2) return { ok: false, mensaje: "Escribe el nombre." };
  if (!EMAIL.test(email)) return { ok: false, mensaje: "Ese email no parece válido." };
  if (!esOrigenLead(origen)) return { ok: false, mensaje: "Elige de dónde viene." };
  if (centroId && !UUID.test(centroId)) return { ok: false, mensaje: "Centro no válido." };
  if (tarifaId && !UUID.test(tarifaId)) return { ok: false, mensaje: "Tarifa no válida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      nombre,
      email,
      telefono: telefono || null,
      origen,
      estado: "nuevo",
      centro_id: centroId || null,
      tarifa_interes_id: tarifaId || null,
      notas: notas || null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, mensaje: `No se pudo crear: ${error?.message ?? ""}` };

  revalidarLeads();
  redirect(`/crm/leads/${data.id}`);
}

/** Guarda valor, probabilidad, próxima acción y etiquetas. Sólo toca los campos que llegan. */
export async function actualizarOportunidad(
  _anterior: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const id = textoDe(formData, "id");
  if (!UUID.test(id)) return { ok: false, mensaje: "Falta el lead." };

  const cambios: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (formData.has("valor_estimado")) {
    const v = textoDe(formData, "valor_estimado").replace(",", ".");
    const n = v === "" ? null : Number(v);
    if (n != null && (!Number.isFinite(n) || n < 0 || n > 1_000_000)) {
      return { ok: false, mensaje: "El valor tiene que ser un importe positivo." };
    }
    cambios.valor_estimado = n;
  }
  if (formData.has("probabilidad")) {
    const v = textoDe(formData, "probabilidad");
    const n = v === "" ? null : Math.round(Number(v));
    if (n != null && (!Number.isFinite(n) || n < 0 || n > 100)) {
      return { ok: false, mensaje: "La probabilidad va de 0 a 100." };
    }
    cambios.probabilidad = n;
  }
  if (formData.has("proxima_accion")) {
    cambios.proxima_accion = textoDe(formData, "proxima_accion").slice(0, 200) || null;
  }
  if (formData.has("proxima_accion_fecha")) {
    const v = textoDe(formData, "proxima_accion_fecha");
    const d = v ? new Date(v) : null;
    if (d && Number.isNaN(d.getTime())) return { ok: false, mensaje: "Fecha no válida." };
    cambios.proxima_accion_fecha = d ? d.toISOString() : null;
  }
  if (formData.has("etiquetas")) {
    cambios.etiquetas = limpiarEtiquetas(textoDe(formData, "etiquetas"));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("leads").update(cambios).eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  revalidarLeads(id);
  return { ok: true, mensaje: "Guardado." };
}

/** Mueve varios leads a la misma etapa y anota el cambio en cada historial. */
export async function moverLeads(ids: string[], nuevo: EstadoLead): Promise<EstadoAccion> {
  if (!esEstadoLead(nuevo)) return { ok: false, mensaje: "Ese estado no existe." };
  const validos = ids.filter((i) => UUID.test(i)).slice(0, 200);
  if (validos.length === 0) return { ok: false, mensaje: "No hay leads seleccionados." };

  const supabase = await createClient();
  const { data: previos, error: errorLectura } = await supabase
    .from("leads")
    .select("id, estado")
    .in("id", validos)
    .returns<{ id: string; estado: EstadoLead }[]>();
  if (errorLectura) return { ok: false, mensaje: errorLectura.message };

  const aMover = (previos ?? []).filter((l) => l.estado !== nuevo);
  if (aMover.length === 0) return { ok: true, mensaje: "Ya estaban en esa etapa." };

  const { error } = await supabase
    .from("leads")
    .update({ estado: nuevo, updated_at: new Date().toISOString() })
    .in(
      "id",
      aMover.map((l) => l.id)
    );
  if (error) return { ok: false, mensaje: `No se pudieron mover: ${error.message}` };

  await supabase.from("actividades").insert(
    aMover.map((l) => ({
      lead_id: l.id,
      tipo: "cambio_estado",
      descripcion: `${ETIQUETA_LEAD[l.estado]} → ${ETIQUETA_LEAD[nuevo]}`,
    }))
  );

  revalidarLeads();
  const n = aMover.length;
  return { ok: true, mensaje: `${n} movido${n === 1 ? "" : "s"} a ${ETIQUETA_LEAD[nuevo]}.` };
}

/** Añade una etiqueta a varios leads a la vez. */
export async function etiquetarLeads(ids: string[], etiqueta: string): Promise<EstadoAccion> {
  const [limpia] = limpiarEtiquetas(etiqueta);
  const validos = ids.filter((i) => UUID.test(i)).slice(0, 200);
  if (!limpia) return { ok: false, mensaje: "Escribe una etiqueta." };
  if (validos.length === 0) return { ok: false, mensaje: "No hay leads seleccionados." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, etiquetas")
    .in("id", validos)
    .returns<{ id: string; etiquetas: string[] | null }[]>();
  if (error) return { ok: false, mensaje: error.message };

  const pendientes = (data ?? []).filter((l) => !(l.etiquetas ?? []).includes(limpia));
  const resultados = await Promise.all(
    pendientes.map((l) =>
      supabase
        .from("leads")
        .update({ etiquetas: [...(l.etiquetas ?? []), limpia].slice(0, 8) })
        .eq("id", l.id)
    )
  );
  const fallo = resultados.find((r) => r.error);
  if (fallo?.error) return { ok: false, mensaje: fallo.error.message };

  revalidarLeads();
  return { ok: true, mensaje: `Etiqueta «${limpia}» añadida.` };
}

/** Da un lead por perdido guardando el motivo. */
export async function marcarPerdido(
  _anterior: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const id = textoDe(formData, "id");
  const motivo = textoDe(formData, "motivo").slice(0, 300);
  const previo = textoDe(formData, "estado_anterior");
  if (!UUID.test(id) || !esEstadoLead(previo)) return { ok: false, mensaje: "Falta el lead." };
  if (motivo.length < 3) return { ok: false, mensaje: "Cuenta brevemente por qué se pierde." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ estado: "perdido", motivo_perdida: motivo, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  await supabase.from("actividades").insert({
    lead_id: id,
    tipo: "cambio_estado",
    descripcion: `${ETIQUETA_LEAD[previo]} → Perdido: ${motivo}`,
  });

  revalidarLeads(id);
  return { ok: true, mensaje: "Marcado como perdido." };
}
