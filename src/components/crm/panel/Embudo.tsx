import Link from "next/link";
import { ETIQUETA_LEAD, ETIQUETA_ORIGEN, COLOR_LEAD, type EstadoLead, type OrigenLead } from "@/lib/tipos";
import { numero } from "@/lib/formato";

/**
 * Embudo de 90 días: cuántos leads han llegado al menos a cada etapa y qué
 * porcentaje pasa de una a la siguiente. Rampa de un solo tono (ordinal).
 */
export function Embudo({
  datos,
  centroId,
}: {
  datos: { estado: EstadoLead; total: number; alcanzado: number }[];
  centroId: string | null;
}) {
  const pasos = datos.filter((d) => d.estado !== "perdido");
  const perdidos = datos.find((d) => d.estado === "perdido")?.total ?? 0;
  const maximo = Math.max(1, ...pasos.map((d) => d.alcanzado));
  const consulta = (estado: EstadoLead) => `/crm/leads?etapa=${estado}${centroId ? `&centro=${centroId}` : ""}`;

  return (
    <div className="flex flex-col gap-1.5">
      {pasos.map((d, i) => {
        const previo = i > 0 ? pasos[i - 1].alcanzado : null;
        const paso = previo ? Math.round((d.alcanzado / previo) * 100) : null;
        return (
          <Link
            key={d.estado}
            href={consulta(d.estado)}
            className="group grid grid-cols-[7rem_1fr_5.5rem] items-center gap-3 rounded-md px-1 py-1 transition-colors hover:bg-placa-2"
          >
            <span className="truncate text-[0.8125rem] text-tinta">{ETIQUETA_LEAD[d.estado]}</span>
            <span className="h-5 rounded bg-placa-2">
              <span
                className="block h-full rounded"
                style={{
                  width: `${Math.max((d.alcanzado / maximo) * 100, d.alcanzado > 0 ? 8 : 0)}%`,
                  backgroundColor: COLOR_LEAD[d.estado],
                }}
              />
            </span>
            <span className="text-right text-[0.8125rem] tabular-nums">
              <span className="font-medium text-tinta">{numero(d.alcanzado)}</span>
              {paso != null && <span className="text-tinta-2" title="Pasan desde la etapa anterior"> · {paso}%</span>}
            </span>
          </Link>
        );
      })}
      <p className="mt-2 text-[0.8125rem] text-tinta-2">
        {numero(perdidos)} perdidos. El porcentaje de la derecha es cuántos pasan desde la etapa anterior.
      </p>
    </div>
  );
}

/** Leads por origen en 90 días, con cuántos acabaron siendo socios. */
export function PorOrigen({ datos }: { datos: { origen: OrigenLead; total: number; convertidos: number }[] }) {
  const maximo = Math.max(1, ...datos.map((d) => d.total));
  return (
    <ul className="flex flex-col gap-2.5">
      {datos.map((d) => {
        const tasa = d.total > 0 ? Math.round((d.convertidos / d.total) * 100) : 0;
        return (
          <li key={d.origen} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
              <span className="text-tinta">{ETIQUETA_ORIGEN[d.origen]}</span>
              <span className="tabular-nums text-tinta-2">
                <span className="font-medium text-tinta">{numero(d.total)}</span> · {tasa}% convierte
              </span>
            </div>
            <span className="relative h-2 rounded-full bg-placa-2" aria-hidden>
              <span className="absolute inset-y-0 left-0 rounded-full bg-serie-1" style={{ width: `${(d.total / maximo) * 100}%` }} />
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-serie-3"
                style={{ width: `${(d.convertidos / maximo) * 100}%` }}
              />
            </span>
          </li>
        );
      })}
      <li className="mt-1 flex gap-4 text-xs text-tinta-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-serie-1" aria-hidden /> Leads
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-serie-3" aria-hidden /> Convertidos
        </span>
      </li>
    </ul>
  );
}
