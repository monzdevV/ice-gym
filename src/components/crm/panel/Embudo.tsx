import Link from "next/link";
import { rampaAzul } from "@/design/tokens";
import { ETIQUETA_LEAD, ESTADOS_LEAD, type EstadoLead } from "@/lib/tipos";
import { numero } from "@/lib/formato";

/**
 * Embudo de leads de los últimos 90 días. Magnitud por etapa, así que barras
 * horizontales con rampa de un solo tono: cuanto más avanzada la etapa, más
 * claro el azul. Cada barra lleva su cifra al lado, sin necesidad de leyenda.
 */
export function Embudo({
  datos,
  centroId,
}: {
  datos: { estado: EstadoLead; total: number }[];
  centroId: string | null;
}) {
  const maximo = Math.max(1, ...datos.map((d) => d.total));
  const total = datos.reduce((s, d) => s + d.total, 0);

  return (
    <div className="flex flex-col gap-2.5 p-4">
      {ESTADOS_LEAD.map((estado, i) => {
        const fila = datos.find((d) => d.estado === estado);
        const valor = fila?.total ?? 0;
        return (
          <Link
            key={estado}
            href={`/crm/leads${centroId ? `?centro=${centroId}` : ""}`}
            className="group grid grid-cols-[104px_1fr_auto] items-center gap-3"
          >
            <span className="etiqueta text-[0.6rem] transition-colors group-hover:text-hielo">
              {ETIQUETA_LEAD[estado]}
            </span>
            <span className="h-4 bg-grafito">
              <span
                className="block h-full rounded-r-[4px] transition-opacity group-hover:opacity-80"
                style={{
                  width: `${Math.max((valor / maximo) * 100, valor > 0 ? 2 : 0)}%`,
                  backgroundColor: rampaAzul[i],
                }}
              />
            </span>
            <span className="cifra w-8 text-right text-base text-hielo">{numero(valor)}</span>
          </Link>
        );
      })}

      <p className="mt-1 border-t border-acero pt-3 text-xs text-niebla">
        {numero(total)} leads en los últimos 90 días
      </p>
    </div>
  );
}
