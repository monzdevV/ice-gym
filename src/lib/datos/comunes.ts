import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Centro, Tarifa } from "@/lib/tipos";

export async function listarCentros(): Promise<Centro[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("centros")
    .select("*")
    .order("nombre")
    .returns<Centro[]>();
  return data ?? [];
}

export async function listarTarifas(): Promise<Tarifa[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tarifas")
    .select("*")
    .order("orden")
    .returns<Tarifa[]>();
  return data ?? [];
}

/** Devuelve el centro pedido si existe en la lista; si no, null (= todos). */
export function centroValido(centros: Centro[], id?: string | null) {
  if (!id) return null;
  return centros.some((c) => c.id === id) ? id : null;
}
