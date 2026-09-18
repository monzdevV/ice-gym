import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EstadoPago, Pago } from "@/lib/tipos";

export type PagoFila = Pago & {
  socio: {
    id: string;
    numero_socio: string;
    nombre: string;
    apellidos: string;
    telefono: string | null;
    centro_id: string;
    estado: string;
  } | null;
};

/**
 * Recibos de un periodo, con el socio. Los impagos van primero y se agrupan
 * aparte: son lo que recepción tiene que resolver hoy.
 */
export async function listarPagos(filtros: {
  centro: string | null;
  estado: EstadoPago | null;
  meses: number;
}) {
  const supabase = await createClient();
  const desde = new Date();
  desde.setUTCMonth(desde.getUTCMonth() - (filtros.meses - 1), 1);
  const desdeIso = desde.toISOString().slice(0, 10);

  // "!inner" para poder filtrar por el centro del socio
  let consulta = supabase
    .from("pagos")
    .select(
      "*, socio:socios!inner(id, numero_socio, nombre, apellidos, telefono, centro_id, estado)"
    )
    .gte("periodo", desdeIso)
    .order("periodo", { ascending: false })
    .limit(400);

  if (filtros.centro) consulta = consulta.eq("socio.centro_id", filtros.centro);
  if (filtros.estado) consulta = consulta.eq("estado", filtros.estado);

  const { data } = await consulta.returns<PagoFila[]>();
  const pagos = data ?? [];

  const impagados = pagos.filter((p) => p.estado === "impagado");
  const resto = pagos.filter((p) => p.estado !== "impagado");

  const suma = (lista: PagoFila[]) => lista.reduce((s, p) => s + Number(p.importe), 0);

  return {
    impagados,
    resto,
    totales: {
      cobrado: suma(pagos.filter((p) => p.estado === "pagado")),
      pendiente: suma(pagos.filter((p) => p.estado === "pendiente")),
      impagado: suma(impagados),
      recibosImpagados: impagados.length,
      sociosConDeuda: new Set(impagados.map((p) => p.socio_id)).size,
    },
  };
}
