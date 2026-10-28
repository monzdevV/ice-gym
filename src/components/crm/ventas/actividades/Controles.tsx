"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import { useParametros } from "@/components/crm/actividad/useParametros";

export const PLAZOS_FILTRO = ["todas", "vencidas", "hoy", "futuras"] as const;
export type PlazoFiltro = (typeof PLAZOS_FILTRO)[number];
const TEXTO: Record<PlazoFiltro, string> = { todas: "Todas", vencidas: "Vencidas", hoy: "Hoy", futuras: "Próximas" };

const pestana =
  "flex h-8 items-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-medium transition-[background-color,color,box-shadow] duration-150";

/** Vista (pendientes o análisis), plazo, de quién y búsqueda: todo en la URL. */
export function ControlesActividades({
  vista,
  plazo,
  equipo,
  q,
  cuentas,
  puedeSoloMias,
}: {
  vista: "lista" | "analisis";
  plazo: PlazoFiltro;
  equipo: boolean;
  q: string;
  cuentas: Record<PlazoFiltro, number>;
  /** Sin ficha en el equipo no hay «mías»: el interruptor queda fijo en todo el equipo. */
  puedeSoloMias: boolean;
}) {
  const { cambiar, pendiente } = useParametros();
  const [texto, setTexto] = useState(q);
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(espera.current), []);

  function buscar(v: string) {
    setTexto(v);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => cambiar({ q: v.trim() || null }), 300);
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-3 transition-opacity ${pendiente ? "opacity-70" : ""}`} aria-busy={pendiente}>
      <nav className="flex rounded-lg bg-placa-2 p-0.5" aria-label="Vista">
        {(["lista", "analisis"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={vista === v}
            onClick={() => cambiar({ vista: v === "lista" ? null : v })}
            className={`${pestana} ${vista === v ? "bg-placa text-tinta shadow-placa" : "text-tinta-2 hover:text-tinta"}`}
          >
            {v === "lista" ? "Pendientes" : "Análisis"}
          </button>
        ))}
      </nav>

      {vista === "lista" && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Plazo">
          {PLAZOS_FILTRO.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={plazo === p}
              onClick={() => cambiar({ plazo: p === "todas" ? null : p })}
              className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] transition-colors ${
                plazo === p ? "border-acento bg-acento/10 font-medium text-acento-tinta" : "border-linea text-tinta-2 hover:text-tinta"
              }`}
            >
              {TEXTO[p]}
              <span className={`tabular-nums ${p === "vencidas" && cuentas.vencidas > 0 ? "font-semibold text-critico" : ""}`}>{cuentas[p]}</span>
            </button>
          ))}
        </div>
      )}

      <label className="flex items-center gap-2 text-[0.8125rem] text-tinta">
        <Switch
          checked={equipo}
          disabled={!puedeSoloMias}
          onCheckedChange={(v) => cambiar({ quien: v ? "equipo" : null })}
          aria-label="Ver las de todo el equipo"
        />
        Todo el equipo
      </label>

      {vista === "lista" && (
        <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg bg-placa px-3 shadow-placa sm:max-w-72">
          <MagnifyingGlass className="size-4 shrink-0 text-tinta-2" aria-hidden />
          <span className="sr-only">Buscar actividades</span>
          <input
            type="search"
            value={texto}
            onChange={(e) => buscar(e.target.value)}
            placeholder="Buscar por oportunidad, cliente o resumen"
            className="h-full w-full min-w-0 bg-transparent text-[0.8125rem] text-tinta outline-none placeholder:text-tinta-2"
          />
        </label>
      )}
    </div>
  );
}
