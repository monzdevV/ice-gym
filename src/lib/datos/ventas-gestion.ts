import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Oportunidades (de cualquier estado) que hay en cada etapa: Ajustes avisa antes de borrar una. */
export async function oportunidadesPorEtapa(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("ventas_oportunidades").select("etapa_id").not("etapa_id", "is", null).limit(10000);
  const r: Record<string, number> = {};
  for (const o of (data ?? []) as { etapa_id: string }[]) r[o.etapa_id] = (r[o.etapa_id] ?? 0) + 1;
  return r;
}
