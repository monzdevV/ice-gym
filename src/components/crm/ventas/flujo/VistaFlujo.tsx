"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarBlank, CaretDown, ChartBar, Clock, FileArrowUp, Kanban, ListBullets, Plus } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { CatalogosVentas } from "@/lib/datos/ventas";
import {
  ETIQUETA_VISTA_VENTAS,
  VISTAS_VENTAS,
  cuantosFiltrosVentas,
  escribirFiltrosVentas,
  leerFiltrosVentas,
  rutaVentas,
  type ActividadVentasCompleta,
  type FiltrosVentas,
  type OportunidadVentasCompleta,
  type VistaVentas,
} from "@/lib/ventas";
import { SinDatos, claseBotonPrincipal } from "@/components/crm/Primitivas";
import { AnalisisVentas } from "./Analisis";
import { BarraBusqueda } from "./BarraBusqueda";
import { CalendarioVentas } from "./Calendario";
import { ProveedorFlujo, useFlujo } from "./Contexto";
import type { Prefill } from "./DialogoNueva";
import { ImportarCsv } from "./ImportarCsv";
import { KanbanVentas } from "./Kanban";
import { ListaVentas } from "./Lista";
import { VistaActividad } from "./VistaActividad";

const ICONO_VISTA: Record<VistaVentas, typeof Kanban> = {
  kanban: Kanban,
  lista: ListBullets,
  calendario: CalendarBlank,
  analisis: ChartBar,
  actividad: Clock,
};

/** Parámetros que no son de búsqueda: abren «Nuevo» con datos ya puestos (enlaces desde equipos, clientes…). */
const PARAMS_NUEVO = ["nuevo"];

function BotonesCrear({ onImportar }: { onImportar: () => void }) {
  const { nueva } = useFlujo();
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => nueva()} className={claseBotonPrincipal}>
        <Plus className="size-4" weight="bold" aria-hidden />
        Nuevo
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex h-9 items-center gap-1.5 rounded-lg border border-linea bg-placa px-3 text-sm font-medium text-tinta hover:bg-placa-2">
            Generar
            <CaretDown className="size-3.5 text-tinta-2" weight="bold" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={onImportar}>
            <FileArrowUp aria-hidden />
            Importar desde CSV o Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function VistaFlujo({
  filas,
  actividades,
  catalogos,
  hayAlguna,
  cifras,
}: {
  filas: OportunidadVentasCompleta[];
  /** Actividades pendientes de las oportunidades de la vista (con nota, para editarlas). */
  actividades: ActividadVentasCompleta[];
  catalogos: CatalogosVentas;
  /** Si existe al menos una oportunidad sin filtros (para el estado vacío). */
  hayAlguna: boolean;
  cifras: { etiqueta: string; valor: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();
  const [importar, setImportar] = useState(false);
  const f = leerFiltrosVentas(params);
  const texto = params.toString();

  const cambiar = useCallback(
    (c: Partial<FiltrosVentas>) => {
      const p = escribirFiltrosVentas(c, new URLSearchParams(texto));
      empezar(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
    },
    [texto, pathname, router]
  );

  const busqueda = useMemo(() => {
    const p = new URLSearchParams(texto);
    for (const k of PARAMS_NUEVO) p.delete(k);
    return p.toString();
  }, [texto]);

  const prefill = useMemo<Prefill | null>(() => {
    const p = new URLSearchParams(texto);
    if (p.get("nuevo") !== "1") return null;
    return {
      equipo_id: p.get("equipo") || null,
      cliente_id: p.get("cliente") || null,
      empresa_id: p.get("empresa") || null,
      ...(p.get("etapa") ? { etapa_id: p.get("etapa") } : {}),
    };
  }, [texto]);

  const aplicarQuery = (q: string) => empezar(() => router.replace(`${pathname}${q ? `?${q}` : ""}`, { scroll: false }));
  const n = cuantosFiltrosVentas(f);

  function vista() {
    if (catalogos.etapas.length === 0)
      return (
        <SinDatos
          titulo="El flujo aún no tiene etapas"
          texto="Crea las etapas por las que pasa una venta (por ejemplo Nuevo, Calificado, Propuesta y Ganado) en Ajustes de ventas."
          accion={
            <Link href={`${rutaVentas.configuracion}?tab=etapas`} className={`${claseBotonPrincipal} mt-2`}>
              Crear etapas
            </Link>
          }
        />
      );
    if (!hayAlguna)
      return (
        <SinDatos
          titulo="Aún no hay oportunidades"
          texto="Crea la primera con «Nuevo», con el «+» de una columna o importando un archivo. Cada oportunidad avanza por las etapas hasta ganarse o perderse."
        />
      );
    if (filas.length === 0 && n > 0 && f.vista !== "kanban")
      return <SinDatos titulo="Nada con estos filtros" texto="Prueba a quitar algún filtro o a buscar con otras palabras." />;
    switch (f.vista) {
      case "kanban":
        return <KanbanVentas filas={filas} etapas={catalogos.etapas} />;
      case "lista":
        return <ListaVentas filas={filas} filtros={f} cambiar={cambiar} />;
      case "calendario":
        return <CalendarioVentas filas={filas} filtros={f} cambiar={cambiar} />;
      case "analisis":
        return <AnalisisVentas filas={filas} filtros={f} cambiar={cambiar} />;
      case "actividad":
        return <VistaActividad filas={filas} />;
    }
  }

  return (
    <ProveedorFlujo catalogos={catalogos} actividades={actividades} prefillInicial={prefill} alCerrarNueva={() => prefill && aplicarQuery(busqueda)}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <header className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <h1 className="rotulo text-[1.9rem] text-tinta">Flujo</h1>
          <dl className="flex items-center gap-6">
            {cifras.map((c) => (
              <div key={c.etiqueta} className="flex flex-col">
                <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-tinta-2">{c.etiqueta}</dt>
                <dd className="cifra text-xl text-tinta">{c.valor}</dd>
              </div>
            ))}
          </dl>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <BotonesCrear onImportar={() => setImportar(true)} />
            <nav className="flex rounded-lg bg-placa-2 p-0.5" aria-label="Vista">
              {VISTAS_VENTAS.map((v) => {
                const Icono = ICONO_VISTA[v];
                const activa = f.vista === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => cambiar({ vista: v })}
                    aria-pressed={activa}
                    aria-label={ETIQUETA_VISTA_VENTAS[v]}
                    title={ETIQUETA_VISTA_VENTAS[v]}
                    className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium transition-[background-color,color,box-shadow] duration-150 ${
                      activa ? "bg-placa text-tinta shadow-placa" : "text-tinta-2 hover:text-tinta"
                    }`}
                  >
                    <Icono className="size-4" weight={activa ? "fill" : "regular"} aria-hidden />
                    <span className={activa ? "hidden xl:inline" : "hidden"}>{ETIQUETA_VISTA_VENTAS[v]}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        <BarraBusqueda filtros={f} cambiar={cambiar} aplicarQuery={aplicarQuery} queryActual={busqueda} catalogos={catalogos} />

        <div className={`flex min-h-0 flex-1 flex-col transition-opacity ${pendiente ? "opacity-70" : ""}`} aria-busy={pendiente}>
          {vista()}
        </div>
      </div>

      <ImportarCsv abierto={importar} onCerrar={() => setImportar(false)} catalogos={catalogos} />
    </ProveedorFlujo>
  );
}
