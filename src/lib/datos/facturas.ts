import "server-only";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_FACTURAS, type Factura } from "@/lib/facturas";

/* -------------------------------- Tipos -------------------------------- */

export const SELECT_FACTURA =
  "id, numero, fecha, proveedor, nif, base, iva, total, empresa_id, archivo, origen, modelo, created_at, empresa:empresas(nombre)";

export type FilaFactura = Omit<Factura, "empresa_nombre"> & { empresa: { nombre: string } | null };

/** Fila de Supabase → Factura (numeric llega a veces como texto: se pasa a número). */
export function aFactura({ empresa, ...f }: FilaFactura): Factura {
  const num = (v: number | string | null) => (v === null ? null : Number(v));
  return {
    ...f,
    base: num(f.base),
    iva: num(f.iva),
    total: num(f.total),
    empresa_nombre: empresa?.nombre ?? null,
  };
}

/* ------------------------------- Listado ------------------------------- */

/** Las últimas 200 facturas leídas, la más reciente primero. */
export async function listarFacturas(): Promise<Factura[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("facturas")
    .select(SELECT_FACTURA)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<FilaFactura[]>();
  return (data ?? []).map(aFactura);
}

/** Enlace firmado (10 min) para ver el original en el bucket privado. */
export async function urlFirmadaFactura(ruta: string): Promise<string | null> {
  if (!ruta || ruta.includes("..")) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET_FACTURAS).createSignedUrl(ruta, 60 * 10);
  return data?.signedUrl ?? null;
}
