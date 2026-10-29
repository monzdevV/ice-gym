import Link from "next/link";
import { dinero, fecha } from "@/lib/formato";
import { rutaVentas, type EtapaVentas, type OportunidadVentasCompleta } from "@/lib/ventas";
import { SinDatos } from "@/components/crm/Primitivas";
import { Estrellas, SenalEstadoVenta } from "@/components/crm/ventas/Piezas";

/** Oportunidades de Ventas de un cliente o de una empresa, en cualquier estado. */
export function ListaOportunidades({
  oportunidades,
  etapas,
  vacio,
}: {
  oportunidades: OportunidadVentasCompleta[];
  etapas: EtapaVentas[];
  vacio: string;
}) {
  if (oportunidades.length === 0) return <SinDatos titulo="Sin oportunidades" texto={vacio} />;
  const etapa = new Map(etapas.map((e) => [e.id, e.nombre]));
  return (
    <ul className="-mx-2 flex flex-col">
      {oportunidades.map((o) => (
        <li key={o.id}>
          <Link href={rutaVentas.oportunidad(o.id)} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 transition-colors hover:bg-placa-2/60">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-tinta">{o.nombre}</span>
              <span className="block truncate text-xs text-tinta-2">
                {(o.etapa_id && etapa.get(o.etapa_id)) ?? "Sin etapa"}
                {o.cierre_previsto ? ` · cierre ${fecha(o.cierre_previsto)}` : ""}
              </span>
            </span>
            <Estrellas n={o.prioridad} tamano="size-3.5" />
            <SenalEstadoVenta estado={o.estado} />
            <span className={`cifra w-24 text-right ${o.estado === "perdida" ? "text-tinta-2 line-through decoration-1" : "text-tinta"}`}>
              {dinero(o.ingresos)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
