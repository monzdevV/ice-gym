import Link from "next/link";
import { COLOR_LEAD, ETIQUETA_LEAD, ESTADOS_LEAD, type EstadoLead } from "@/lib/tipos";
import { numero } from "@/lib/formato";

/**
 * El embudo de los últimos 90 días como una clasificación: una fila por etapa,
 * en orden, con su barra de un solo tono y la cifra al lado.
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
    <div className="pt-3">
      <ol className="flex flex-col gap-[3px]">
        {ESTADOS_LEAD.map((estado) => {
          const valor = datos.find((d) => d.estado === estado)?.total ?? 0;
          return (
            <li key={estado}>
              <Link
                href={`/crm/leads${centroId ? `?centro=${centroId}` : ""}`}
                className="grid h-10 grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 bg-placa px-3 transition-colors hover:bg-placa-2"
              >
                <span className="condensada truncate text-[0.88rem] text-tinta">{ETIQUETA_LEAD[estado]}</span>
                <span className="h-2 bg-placa-2">
                  <span
                    className="block h-full"
                    style={{
                      width: `${Math.max((valor / maximo) * 100, valor > 0 ? 3 : 0)}%`,
                      backgroundColor: COLOR_LEAD[estado],
                    }}
                  />
                </span>
                <span className="cifra text-right text-[1.3rem] text-tinta">{numero(valor)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-tinta-2">{numero(total)} leads en los últimos 90 días.</p>
    </div>
  );
}
