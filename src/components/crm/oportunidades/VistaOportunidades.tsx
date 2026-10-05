"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Kanban as IconoKanban, Table } from "@phosphor-icons/react";
import type { OportunidadCompleta } from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import { SinDatos } from "@/components/crm/Primitivas";
import { ProveedorAcciones } from "./Acciones";
import { BarraFiltros } from "./BarraFiltros";
import { Kanban } from "./Kanban";
import { TablaOportunidades } from "./TablaOportunidades";
import { DEFECTO, cuantosFiltros, etapasVisibles, leerFiltros, type FiltrosOportunidad, type Vista } from "./filtros";

const PESTANAS: { vista: Vista; texto: string; Icono: typeof Table }[] = [
  { vista: "kanban", texto: "Kanban", Icono: IconoKanban },
  { vista: "tabla", texto: "Tabla", Icono: Table },
];

export function VistaOportunidades({
  filas,
  catalogos,
  hayAlguna,
  accionVacia,
}: {
  filas: OportunidadCompleta[];
  catalogos: Catalogos;
  /** Si existe al menos una oportunidad sin filtros (para el estado vacío). */
  hayAlguna: boolean;
  accionVacia?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();
  const filtros = leerFiltros(params);

  function cambiar(c: Partial<FiltrosOportunidad>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(c)) {
      if (v === "" || v == null || DEFECTO[k as keyof FiltrosOportunidad] === v) p.delete(k);
      else p.set(k, String(v));
    }
    empezar(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  }

  const n = cuantosFiltros(filtros);

  return (
    <ProveedorAcciones catalogos={catalogos}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="-mx-4 flex items-end gap-4 border-b border-linea px-4 lg:-mx-8 lg:px-8">
          <nav className="flex gap-1" aria-label="Vista">
            {PESTANAS.map(({ vista, texto, Icono }) => {
              const activa = filtros.vista === vista;
              return (
                <button
                  key={vista}
                  type="button"
                  onClick={() => cambiar({ vista })}
                  aria-pressed={activa}
                  className={`relative flex h-10 items-center gap-1.5 px-2.5 text-sm font-medium transition-colors ${
                    activa ? "text-tinta" : "text-tinta-2 hover:text-tinta"
                  }`}
                >
                  <Icono className="size-4" weight={activa ? "fill" : "regular"} aria-hidden />
                  Vista {texto.toLowerCase()}
                  {activa && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-tinta" aria-hidden />}
                </button>
              );
            })}
          </nav>
          {filtros.vista === "kanban" && (
            <p className="ml-auto hidden pb-2.5 text-xs text-tinta-2 md:block">
              Arrastra las tarjetas para cambiar de etapa u ordenar · clic para vista rápida
            </p>
          )}
        </div>

        <BarraFiltros filtros={filtros} cambiar={cambiar} catalogos={catalogos} />

        <div
          className={`min-h-0 flex-1 transition-opacity ${pendiente ? "opacity-70" : ""}`}
          aria-busy={pendiente}
        >
          {!hayAlguna ? (
            <SinDatos
              titulo="Aún no hay oportunidades"
              texto="Crea la primera: una venta a un cliente, una compra a un proveedor de maquinaria, un acuerdo de colaboración… Todo el pipeline vive aquí."
              accion={accionVacia}
            />
          ) : filas.length === 0 && n > 0 && filtros.vista === "tabla" ? (
            <SinDatos
              titulo="Nada con estos filtros"
              texto="Prueba a quitar algún filtro o a buscar con otras palabras."
            />
          ) : filtros.vista === "kanban" ? (
            <Kanban filas={filas} etapas={etapasVisibles(filtros.etapa)} />
          ) : (
            <TablaOportunidades filas={filas} filtros={filtros} cambiar={cambiar} />
          )}
        </div>
      </div>
    </ProveedorAcciones>
  );
}
