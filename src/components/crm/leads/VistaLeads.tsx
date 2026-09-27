"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChartBar, Kanban, Table } from "@phosphor-icons/react";
import type { LeadConResumen } from "@/lib/datos/leads";
import { BarraFiltros } from "./BarraFiltros";
import { TablaLeads } from "./TablaLeads";
import { Tablero } from "./Tablero";
import { Prevision } from "./Prevision";
import { aCsv, aplicar, descargar, enriquecer, leerFiltros, type Filtros, type Vista } from "./filtros";

const PESTANAS: { vista: Vista; texto: string; Icono: typeof Table }[] = [
  { vista: "tabla", texto: "Tabla", Icono: Table },
  { vista: "tablero", texto: "Tablero", Icono: Kanban },
  { vista: "prevision", texto: "Previsión", Icono: ChartBar },
];

/** Valores por defecto: no se escriben en la URL. */
const DEFECTO: Omit<Filtros, "q"> = { vista: "tabla", etapa: "todas", origen: "todos", periodo: "todo", orden: "nivel" };

export function VistaLeads({ leads }: { leads: LeadConResumen[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();
  const filtros = leerFiltros(params);

  const cambiar = useCallback(
    (c: Partial<Filtros>) => {
      const p = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(c)) {
        if (!v || DEFECTO[k as keyof typeof DEFECTO] === v) p.delete(k);
        else p.set(k, String(v));
      }
      empezar(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
    },
    [params, pathname, router]
  );

  const todas = useMemo(() => enriquecer(leads), [leads]);
  const conEtapa = filtros.vista === "tabla";
  const filas = useMemo(() => aplicar(todas, filtros, { conEtapa }), [todas, filtros, conEtapa]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <nav className="-mx-4 flex gap-1 border-b border-linea px-4 lg:-mx-8 lg:px-8" aria-label="Vistas">
        {PESTANAS.map(({ vista, texto, Icono }) => {
          const activa = filtros.vista === vista;
          return (
            <button
              key={vista}
              type="button"
              onClick={() => cambiar({ vista })}
              aria-current={activa ? "page" : undefined}
              className={`relative flex h-10 items-center gap-1.5 px-2.5 text-sm font-medium transition-colors ${
                activa ? "text-tinta" : "text-tinta-2 hover:text-tinta"
              }`}
            >
              <Icono className="size-4" weight={activa ? "fill" : "regular"} aria-hidden />
              {texto}
              {activa && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-tinta" aria-hidden />}
            </button>
          );
        })}
      </nav>

      <BarraFiltros
        filtros={filtros}
        cambiar={cambiar}
        conEtapa={conEtapa}
        onExportar={() => descargar(`leads-${new Date().toISOString().slice(0, 10)}.csv`, aCsv(filas))}
      />

      <div className={`min-h-0 flex-1 transition-opacity ${pendiente ? "opacity-70" : ""}`}>
        {filtros.vista === "tabla" && <TablaLeads filas={filas} />}
        {filtros.vista === "tablero" && <Tablero leads={filas} />}
        {filtros.vista === "prevision" && <Prevision filas={filas} />}
      </div>
    </div>
  );
}
