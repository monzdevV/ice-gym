"use client";

import { useState } from "react";
import { colorDato } from "@/design/tokens";
import { numero } from "@/lib/formato";

type Punto = { hora: number; accesos: number };

const etiquetaHora = (h: number) => `${String(h).padStart(2, "0")}:00`;

/**
 * Perfil de afluencia por hora de los últimos 90 días.
 * Una sola serie, así que no lleva leyenda: el título ya la nombra.
 * Sólo se etiqueta la hora punta; el resto se lee al pasar por encima.
 */
export function GraficoAfluencia({ datos }: { datos: Punto[] }) {
  const [activa, setActiva] = useState<number | null>(null);

  const maximo = Math.max(1, ...datos.map((d) => d.accesos));
  const punta = datos.reduce((a, b) => (b.accesos > a.accesos ? b : a), datos[0]);
  const total = datos.reduce((s, d) => s + d.accesos, 0);

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm text-niebla">
          Hora punta{" "}
          <strong className="font-semibold text-hielo">{etiquetaHora(punta?.hora ?? 0)}</strong>
        </p>
        <p className="text-xs text-niebla" data-cifra>
          {numero(total)} accesos en 90 días
        </p>
      </div>

      {/* Gráfico */}
      <div className="relative mt-5 flex h-44 items-end gap-[2px]" role="img"
        aria-label={`Afluencia por hora. Máximo a las ${etiquetaHora(punta?.hora ?? 0)} con ${punta?.accesos ?? 0} accesos.`}
      >
        {datos.map((d) => {
          const alto = (d.accesos / maximo) * 100;
          const esPunta = d.hora === punta?.hora;
          const resaltada = activa === d.hora;
          return (
            <div
              key={d.hora}
              className="group relative flex h-full flex-1 cursor-default items-end"
              onMouseEnter={() => setActiva(d.hora)}
              onMouseLeave={() => setActiva(null)}
              onFocus={() => setActiva(d.hora)}
              onBlur={() => setActiva(null)}
              tabIndex={0}
            >
              {/* Zona de impacto más alta que la barra */}
              <span className="absolute inset-0" aria-hidden />
              <span
                className="w-full rounded-t-[4px] transition-colors"
                style={{
                  height: `${Math.max(alto, 1.5)}%`,
                  backgroundColor: resaltada || esPunta ? "#5CE1FF" : colorDato.azul,
                  opacity: activa !== null && !resaltada ? 0.45 : 1,
                }}
              />

              {resaltada && (
                <div className="pointer-events-none absolute -top-1 left-1/2 z-10 w-max -translate-x-1/2 -translate-y-full border border-acero bg-negro px-2.5 py-1.5 text-center">
                  <p className="etiqueta text-[0.6rem]">{etiquetaHora(d.hora)}</p>
                  <p className="cifra mt-1 text-lg text-hielo">{numero(d.accesos)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Eje: sólo las horas que orientan */}
      <div className="mt-2 flex gap-[2px]" aria-hidden>
        {datos.map((d) => (
          <span key={d.hora} className="flex-1 text-center text-[0.58rem] text-niebla" data-cifra>
            {d.hora % 4 === 0 ? String(d.hora).padStart(2, "0") : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
