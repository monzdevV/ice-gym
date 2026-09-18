import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Actividad, Lead, Socio } from "@/lib/tipos";

export type LeadConContexto = Lead & {
  centro: { id: string; nombre: string } | null;
  tarifa: { id: string; nombre: string; cuota_mensual: number } | null;
};

const SELECT_LEAD =
  "*, centro:centros(id, nombre), tarifa:tarifas!leads_tarifa_interes_id_fkey(id, nombre, cuota_mensual)";

export async function listarLeads(centroId: string | null): Promise<LeadConContexto[]> {
  const supabase = await createClient();
  let consulta = supabase.from("leads").select(SELECT_LEAD).order("updated_at", { ascending: false });
  if (centroId) consulta = consulta.eq("centro_id", centroId);

  const { data } = await consulta.returns<LeadConContexto[]>();
  return data ?? [];
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

  let socio: Pick<Socio, "id" | "numero_socio" | "nombre" | "apellidos"> | null = null;
  if (lead.data?.socio_id) {
    const { data } = await supabase
      .from("socios")
      .select("id, numero_socio, nombre, apellidos")
      .eq("id", lead.data.socio_id)
      .maybeSingle();
    socio = data;
  }

  return { lead: lead.data ?? null, actividades: actividades.data ?? [], socio };
}
