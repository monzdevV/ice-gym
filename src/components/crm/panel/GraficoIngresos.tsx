"use client";

import { useState } from "react";
import { colorDato } from "@/design/tokens";
import { dinero, mesCorto } from "@/lib/formato";

type Punto = { mes: string; cobrado: number; impagado: number };

/**
 * Ingresos de los últimos seis meses: cobrado e impagado apilados.
 * Dos series, así que lleva leyenda; además el impagado va en el color de
 * alarma reservado, y se etiqueta directamente cuando existe.
 */
export function GraficoIngresos({ datos }: { datos: Punto[] }) {
  const [activo, setActivo] = useState<string | null>(null);

  const maximo = Math.max(1, ...datos.map((d) => d.cobrado + d.impagado));

  return (
    <div className="p-4">
      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-4">
        {[
          { c: colorDato.azul, t: "Cobrado" },
          { c: colorDato.bengala, t: "Impagado" },
        ].map((s) => (
          <span key={s.t} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0" style={{ backgroundColor: s.c }} aria-hidden />
            <span className="etiqueta text-[0.6rem]">{s.t}</span>
          </span>
        ))}
      </div>

      <div className="mt-5 flex h-48 items-end gap-2">
        {datos.map((d) => {
          const total = d.cobrado + d.impagado;
          const resaltado = activo === d.mes;
          return (
            <div
              key={d.mes}
              className="relative flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setActivo(d.mes)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(d.mes)}
              onBlur={() => setActivo(null)}
              tabIndex={0}
            >
              {resaltado && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 border border-acero bg-negro px-3 py-2">
                  <p className="etiqueta text-[0.6rem]">{mesCorto(d.mes)}</p>
                  <p className="mt-1.5 flex items-center gap-2 text-xs text-hielo">
                    <span className="size-2" style={{ backgroundColor: colorDato.azul }} aria-hidden />
                    <span data-cifra>{dinero(d.cobrado)}</span>
                  </p>
                  {d.impagado > 0 && (
                    <p className="mt-1 flex items-center gap-2 text-xs text-hielo">
                      <span className="size-2" style={{ backgroundColor: colorDato.bengala }} aria-hidden />
                      <span data-cifra>{dinero(d.impagado)}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Impagado arriba, con 2px de hueco para que se lea como otra serie */}
              {d.impagado > 0 && (
                <span
                  className="mb-[2px] w-full rounded-t-[4px]"
                  style={{
                    height: `${(d.impagado / maximo) * 100}%`,
                    minHeight: 3,
                    backgroundColor: colorDato.bengala,
                    opacity: activo && !resaltado ? 0.45 : 1,
                  }}
                />
              )}
              <span
                className={`w-full ${d.impagado > 0 ? "" : "rounded-t-[4px]"}`}
                style={{
                  height: `${(d.cobrado / maximo) * 100}%`,
                  backgroundColor: colorDato.azul,
                  opacity: activo && !resaltado ? 0.45 : 1,
                }}
              />

              <span className="mt-2 text-center text-[0.62rem] uppercase text-niebla">
                {mesCorto(d.mes)}
              </span>
              <span className="text-center text-[0.62rem] text-niebla/70" data-cifra>
                {total >= 1000 ? `${Math.round(total / 1000)}k` : Math.round(total)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
