import "server-only";
import { createClient } from "@/lib/supabase/server";
import { RESUMEN_VACIO, SEMANAS_ACTIVIDAD, type ResumenActividad } from "@/lib/oportunidad";
import type { Actividad, Lead, Socio, TipoActividad } from "@/lib/tipos";

export type LeadConContexto = Lead & {
  centro: { id: string; nombre: string } | null;
  tarifa: { id: string; nombre: string; cuota_mensual: number } | null;
};

export type LeadConResumen = LeadConContexto & { resumen: ResumenActividad };

const SELECT_LEAD =
  "*, centro:centros(id, nombre), tarifa:tarifas!leads_tarifa_interes_id_fkey(id, nombre, cuota_mensual)";

const SEMANA = 7 * 86_400_000;

type FilaActividad = { lead_id: string; tipo: TipoActividad; created_at: string };

/** Agrupa actividades (ordenadas de nueva a vieja) en un resumen por lead. */
export function resumirActividad(filas: FilaActividad[], ahora = Date.now()) {
  const mapa = new Map<string, ResumenActividad>();
  for (const f of filas) {
    let r = mapa.get(f.lead_id);
    if (!r) {
      r = { ...RESUMEN_VACIO, semanas: Array(SEMANAS_ACTIVIDAD).fill(0), ultima: null };
      mapa.set(f.lead_id, r);
    }
    const hace = ahora - new Date(f.created_at).getTime();
    if (!r.ultima) r.ultima = { fecha: f.created_at, tipo: f.tipo };
    const semana = SEMANAS_ACTIVIDAD - 1 - Math.floor(hace / SEMANA);
    if (semana >= 0) r.semanas[semana] += 1;
    if (hace <= SEMANA) r.ultimos7 += 1;
    r.total += 1;
  }
  return mapa;
}

/** Interacciones hechas por personas (no los cambios de etapa del sistema) en las últimas semanas. */
async function actividadReciente(): Promise<FilaActividad[]> {
  const supabase = await createClient();
  const desde = new Date(Date.now() - SEMANAS_ACTIVIDAD * SEMANA).toISOString();
  const { data, error } = await supabase
    .from("actividades")
    .select("lead_id, tipo, created_at")
    .not("lead_id", "is", null)
    .neq("tipo", "cambio_estado")
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(5000)
    .returns<FilaActividad[]>();
  if (error) throw new Error(`No se pudo leer la actividad: ${error.message}`);
  return data ?? [];
}

export async function listarLeads(centroId: string | null): Promise<LeadConResumen[]> {
  const supabase = await createClient();
  let consulta = supabase.from("leads").select(SELECT_LEAD).order("updated_at", { ascending: false });
  if (centroId) consulta = consulta.eq("centro_id", centroId);

  const [{ data, error }, actividad] = await Promise.all([
    consulta.returns<LeadConContexto[]>(),
    actividadReciente(),
  ]);
  if (error) throw new Error(`No se pudieron leer los leads: ${error.message}`);

  const resumenes = resumirActividad(actividad);
  return (data ?? []).map((l) => ({
    ...l,
    etiquetas: l.etiquetas ?? [],
    resumen: resumenes.get(l.id) ?? RESUMEN_VACIO,
  }));
}

export async function obtenerLead(id: string) {
  const supabase = await createClient();

  const [lead, actividades] = await Promise.all([
    supabase.from("leads").select(SELECT_LEAD).eq("id", id).maybeSingle<LeadConContexto>(),
    supabase
      .from("actividades")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .returns<Actividad[]>(),
  ]);
  if (lead.error) throw new Error(`No se pudo leer el lead: ${lead.error.message}`);

  let socio: Pick<Socio, "id" | "numero_socio" | "nombre" | "apellidos"> | null = null;
  if (lead.data?.socio_id) {
    const { data } = await supabase
      .from("socios")
      .select("id, numero_socio, nombre, apellidos")
      .eq("id", lead.data.socio_id)
      .maybeSingle();
    socio = data;
  }

  const lista = actividades.data ?? [];
  const resumen =
    resumirActividad(
      lista
        .filter((a) => a.tipo !== "cambio_estado")
        .map((a) => ({ lead_id: id, tipo: a.tipo, created_at: a.created_at }))
    ).get(id) ?? RESUMEN_VACIO;

  return {
    lead: lead.data ? { ...lead.data, etiquetas: lead.data.etiquetas ?? [] } : null,
    actividades: lista,
    socio,
    resumen,
  };
}

/** Todas las etiquetas usadas, para sugerirlas al escribir. */
export function etiquetasUsadas(leads: Pick<Lead, "etiquetas">[]) {
  return [...new Set(leads.flatMap((l) => l.etiquetas ?? []))].sort((a, b) => a.localeCompare(b, "es"));
}
