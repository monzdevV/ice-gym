"use client";

import { useState } from "react";
import { dinero, mesCorto } from "@/lib/formato";

type Punto = { mes: string; cobrado: number; impagado: number };

/**
 * Ingresos de seis meses: cobrado e impagado apilados, con 2 px de hueco entre
 * series. Dos series, así que lleva leyenda; el impagado usa el único rojo.
 */
export function GraficoIngresos({ datos }: { datos: Punto[] }) {
  const [activo, setActivo] = useState<string | null>(null);
  const maximo = Math.max(1, ...datos.map((d) => d.cobrado + d.impagado));
  const mostrado = datos.find((d) => d.mes === activo) ?? datos[datos.length - 1];

  return (
    <div className="pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3" aria-live="polite">
        <div className="flex items-baseline gap-3">
          <span className="rotulo text-[2rem] text-tinta">{mostrado ? mesCorto(mostrado.mes) : "—"}</span>
          <span className="cifra text-[1.3rem] text-tinta">{dinero(mostrado?.cobrado ?? 0)}</span>
          {mostrado && mostrado.impagado > 0 && (
            <span className="cifra text-[1.05rem] text-alarma-tinta">+{dinero(mostrado.impagado)} sin cobrar</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {[
            { c: "bg-dato-azul", t: "Cobrado" },
            { c: "bg-dato-bengala", t: "Impagado" },
          ].map((s) => (
            <span key={s.t} className="flex items-center gap-1.5">
              <span className={`size-2.5 ${s.c}`} aria-hidden />
              <span className="dato">{s.t}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex h-44 items-end gap-3" onMouseLeave={() => setActivo(null)}>
        {datos.map((d) => {
          const resaltado = activo === null || activo === d.mes;
          return (
            <button
              key={d.mes}
              type="button"
              className="flex h-full flex-1 cursor-default flex-col justify-end"
              onMouseEnter={() => setActivo(d.mes)}
              onFocus={() => setActivo(d.mes)}
              onBlur={() => setActivo(null)}
              aria-label={`${mesCorto(d.mes)}: ${dinero(d.cobrado)} cobrado, ${dinero(d.impagado)} impagado`}
            >
              {d.impagado > 0 && (
                <span
                  className={`mb-[2px] w-full bg-dato-bengala transition-opacity ${resaltado ? "" : "opacity-40"}`}
                  style={{ height: `${(d.impagado / maximo) * 100}%`, minHeight: 3 }}
                />
              )}
              <span
                className={`w-full bg-dato-azul transition-opacity ${resaltado ? "" : "opacity-40"}`}
                style={{ height: `${(d.cobrado / maximo) * 100}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-3 border-t border-tinta pt-1.5" aria-hidden>
        {datos.map((d) => (
          <span key={d.mes} className="condensada flex-1 text-center text-[0.72rem] text-tinta-2">
            {mesCorto(d.mes)}
          </span>
        ))}
      </div>
    </div>
  );
}
