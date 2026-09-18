"use client";

import { useState } from "react";
import { numero } from "@/lib/formato";

type Punto = { hora: number; accesos: number };

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

/**
 * Afluencia por hora (últimos 90 días). Una serie, sin leyenda: el título la nombra.
 * La hora punta va en tinta y rotulada; el resto se lee al pasar por encima.
 */
export function GraficoAfluencia({ datos }: { datos: Punto[] }) {
  const [activa, setActiva] = useState<number | null>(null);

  const maximo = Math.max(1, ...datos.map((d) => d.accesos));
  const punta = datos.reduce((a, b) => (b.accesos > a.accesos ? b : a), datos[0]);
  const mostrada = datos.find((d) => d.hora === activa) ?? punta;

  return (
    <div className="pt-4">
      {/* Rótulo de la hora mostrada: la punta por defecto, la que señales al pasar */}
      <div className="flex items-baseline gap-3" aria-live="polite">
        <span className="rotulo text-[2rem] text-tinta">{hh(mostrada?.hora ?? 0)}</span>
        <span className="cifra text-[1.3rem] text-tinta">{numero(mostrada?.accesos ?? 0)}</span>
        <span className="dato">{mostrada?.hora === punta?.hora ? "accesos · hora punta" : "accesos"}</span>
      </div>

      <div
        className="mt-4 flex h-40 items-end gap-[2px]"
        role="img"
        aria-label={`Afluencia por hora. La hora punta es a las ${hh(punta?.hora ?? 0)} con ${punta?.accesos ?? 0} accesos.`}
        onMouseLeave={() => setActiva(null)}
      >
        {datos.map((d) => {
          const esPunta = d.hora === punta?.hora;
          const resaltada = activa === null ? esPunta : activa === d.hora;
          return (
            <button
              key={d.hora}
              type="button"
              className="flex h-full flex-1 cursor-default items-end"
              onMouseEnter={() => setActiva(d.hora)}
              onFocus={() => setActiva(d.hora)}
              onBlur={() => setActiva(null)}
              aria-label={`${hh(d.hora)}: ${d.accesos} accesos`}
            >
              <span
                className={`w-full ${resaltada ? "bg-tinta" : "bg-dato-azul"}`}
                style={{ height: `${Math.max((d.accesos / maximo) * 100, 1.5)}%` }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-[2px] border-t border-tinta pt-1.5" aria-hidden>
        {datos.map((d) => (
          <span key={d.hora} className="condensada flex-1 text-center text-[0.68rem] text-tinta-2" data-cifra>
            {d.hora % 3 === 0 ? d.hora : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
