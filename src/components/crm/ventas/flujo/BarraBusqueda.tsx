"use client";

import { Fragment, useEffect, useState } from "react";
import { CaretDown, Check, Funnel, MagnifyingGlass, Stack, Star, Trash, X } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { nombreCompleto, tonoColor } from "@/lib/b2b";
import type { CatalogosVentas } from "@/lib/datos/ventas";
import {
  AGRUPACIONES_VENTAS,
  CAMPOS_FECHA_VENTAS,
  CLAVES_FILTRO_VENTAS,
  FILTROS_VENTAS,
  type AgrupacionVentas,
  type CampoFechaVentas,
  type FiltroVentas,
  type FiltrosVentas,
} from "@/lib/ventas";
import { Pildora } from "@/components/crm/actividad/Pildora";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { PERIODOS, periodoDe, rangoPeriodo, type Periodo } from "./utiles";

/* Búsqueda del flujo: texto, facetas que se quitan y un panel con Filtros, Agrupar por y Favoritos. */

type Favorito = { nombre: string; query: string };
const CLAVE_FAVORITOS = "ventas-favoritos";

function leerFavoritos(): Favorito[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(CLAVE_FAVORITOS) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is Favorito => typeof x?.nombre === "string" && typeof x?.query === "string") : [];
  } catch {
    return [];
  }
}

function guardarFavoritos(lista: Favorito[]) {
  try {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(lista));
  } catch {}
}

const FAMILIAS = [...new Set(CLAVES_FILTRO_VENTAS.map((k) => FILTROS_VENTAS[k].familia))];

const claseOpcion =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-tinta transition-colors hover:bg-placa-2 focus-visible:bg-placa-2 focus-visible:outline-none";
const claseTituloPanel = "mb-1.5 flex items-center gap-1.5 px-2 text-[0.8125rem] font-semibold text-tinta";

function Opcion({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={claseOpcion}>
      <Check className={`size-3.5 shrink-0 text-acento-tinta ${on ? "" : "invisible"}`} weight="bold" aria-hidden />
      <span className={`min-w-0 flex-1 truncate ${on ? "font-medium" : ""}`}>{children}</span>
    </button>
  );
}

function Faceta({ icono, texto, onQuitar }: { icono: React.ReactNode; texto: string; onQuitar: () => void }) {
  return (
    <span className="inline-flex h-6 max-w-72 shrink-0 items-center gap-1 rounded-md bg-acento-suave pl-1.5 text-xs font-medium text-tinta">
      <span className="text-acento-tinta" aria-hidden>
        {icono}
      </span>
      <span className="truncate">{texto}</span>
      <button
        type="button"
        onClick={onQuitar}
        aria-label={`Quitar ${texto}`}
        className="grid h-6 w-6 place-items-center rounded-r-md text-tinta-2 hover:bg-acento/15 hover:text-tinta"
      >
        <X className="size-3" weight="bold" aria-hidden />
      </button>
    </span>
  );
}

export function BarraBusqueda({
  filtros: f,
  cambiar,
  aplicarQuery,
  queryActual,
  catalogos,
}: {
  filtros: FiltrosVentas;
  cambiar: (c: Partial<FiltrosVentas>) => void;
  /** Sustituye toda la búsqueda por una guardada (favoritos). */
  aplicarQuery: (query: string) => void;
  queryActual: string;
  catalogos: CatalogosVentas;
}) {
  const [texto, setTexto] = useState(f.q);
  const [abierto, setAbierto] = useState(false);
  // Los favoritos sólo se pintan con el panel abierto (nunca en el servidor): se pueden leer al montar.
  const [favoritos, setFavoritos] = useState<Favorito[]>(() => (typeof window === "undefined" ? [] : leerFavoritos()));
  const [nombreFavorito, setNombreFavorito] = useState("");
  const [rango, setRango] = useState({ desde: f.desde, hasta: f.hasta });

  // La URL manda sólo si cambia desde fuera (atrás, un favorito). Lo que llega
  // de una búsqueda mandada desde aquí no pisa lo que se sigue escribiendo.
  const [origen, setOrigen] = useState(f.q);
  const [enviado, setEnviado] = useState<string | null>(null);
  if (f.q !== origen) {
    setOrigen(f.q);
    if (f.q !== enviado && texto.trim() !== f.q) setTexto(f.q);
  }
  const [origenRango, setOrigenRango] = useState(`${f.desde}|${f.hasta}`);
  if (`${f.desde}|${f.hasta}` !== origenRango) {
    setOrigenRango(`${f.desde}|${f.hasta}`);
    setRango({ desde: f.desde, hasta: f.hasta });
  }

  // Al escribir se busca solo, con una pausa para no recargar a cada tecla.
  useEffect(() => {
    const q = texto.trim();
    if (q === f.q || q === enviado) return;
    const t = setTimeout(() => {
      setEnviado(q);
      cambiar({ q });
    }, 350);
    return () => clearTimeout(t);
  }, [texto, f.q, enviado, cambiar]);

  const alternarFiltro = (k: FiltroVentas) => cambiar({ f: f.f.includes(k) ? f.f.filter((x) => x !== k) : [...f.f, k] });
  const alternarAgrupar = (k: AgrupacionVentas) => {
    if (f.agrupar.includes(k)) cambiar({ agrupar: f.agrupar.filter((x) => x !== k) });
    else cambiar({ agrupar: [...f.agrupar.slice(0, 1), k] });
  };
  const periodo = periodoDe(f.desde, f.hasta);

  function guardarFavorito(e: React.FormEvent) {
    e.preventDefault();
    const nombre = nombreFavorito.trim();
    if (!nombre) return;
    const lista = [...favoritos.filter((x) => x.nombre !== nombre), { nombre, query: queryActual }];
    setFavoritos(lista);
    guardarFavoritos(lista);
    setNombreFavorito("");
  }

  function borrarFavorito(nombre: string) {
    const lista = favoritos.filter((x) => x.nombre !== nombre);
    setFavoritos(lista);
    guardarFavoritos(lista);
  }

  /* Facetas: una por familia de filtros, como en el flujo de ventas. */
  const facetas: { clave: string; icono: React.ReactNode; texto: string; quitar: () => void }[] = [];
  for (const familia of FAMILIAS) {
    const activos = f.f.filter((k) => FILTROS_VENTAS[k].familia === familia);
    if (activos.length)
      facetas.push({
        clave: familia,
        icono: <Funnel className="size-3" weight="fill" />,
        texto: activos.map((k) => FILTROS_VENTAS[k].texto).join(" o "),
        quitar: () => cambiar({ f: f.f.filter((k) => !activos.includes(k)) }),
      });
  }
  if (f.desde || f.hasta)
    facetas.push({
      clave: "fecha",
      icono: <Funnel className="size-3" weight="fill" />,
      texto: `${CAMPOS_FECHA_VENTAS[f.fecha]}: ${periodo ? PERIODOS[periodo] : `${f.desde || "…"} – ${f.hasta || "…"}`}`,
      quitar: () => cambiar({ desde: "", hasta: "" }),
    });
  const nombreDe = <T extends { id: string }>(lista: T[], id: string, txt: (x: T) => string) => {
    const x = lista.find((y) => y.id === id);
    return x ? txt(x) : "…";
  };
  if (f.cliente) facetas.push({ clave: "cliente", icono: <Funnel className="size-3" weight="fill" />, texto: `Cliente: ${nombreDe(catalogos.clientes, f.cliente, (c) => c.nombre)}`, quitar: () => cambiar({ cliente: "" }) });
  if (f.empresa) facetas.push({ clave: "empresa", icono: <Funnel className="size-3" weight="fill" />, texto: `Empresa: ${nombreDe(catalogos.empresas, f.empresa, (e) => e.nombre)}`, quitar: () => cambiar({ empresa: "" }) });
  if (f.etapa) facetas.push({ clave: "etapa", icono: <Funnel className="size-3" weight="fill" />, texto: `Etapa: ${nombreDe(catalogos.etapas, f.etapa, (e) => e.nombre)}`, quitar: () => cambiar({ etapa: "" }) });
  if (f.agrupar.length)
    facetas.push({
      clave: "agrupar",
      icono: <Stack className="size-3" weight="fill" />,
      texto: f.agrupar.map((a) => AGRUPACIONES_VENTAS[a]).join(" › "),
      quitar: () => cambiar({ agrupar: [] }),
    });

  const opcionesEquipo = [{ valor: "", texto: "Todos" }, ...catalogos.equipos.map((e) => ({ valor: e.id, texto: e.nombre }))];
  const opcionesComercial = [
    { valor: "", texto: "Todos" },
    { valor: "sin", texto: "Sin asignar" },
    ...catalogos.comerciales.map((c) => ({ valor: c.id, texto: nombreCompleto(c) })),
  ];
  const opcionesEtiqueta = [
    { valor: "", texto: "Todas" },
    ...catalogos.etiquetas.map((e) => ({
      valor: e.id,
      texto: e.nombre,
      icono: <span className="size-2 shrink-0 rounded-full" style={{ background: tonoColor(e.color) }} aria-hidden />,
    })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={abierto} onOpenChange={setAbierto}>
        <div className="flex h-9 min-w-0 flex-[1_1_22rem] items-center gap-1.5 rounded-lg bg-placa pl-2.5 pr-1 shadow-placa focus-within:ring-2 focus-within:ring-acento-tinta">
          <MagnifyingGlass className="size-4 shrink-0 text-tinta-2" aria-hidden />
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {facetas.map((x) => (
              <Faceta key={x.clave} icono={x.icono} texto={x.texto} onQuitar={x.quitar} />
            ))}
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") cambiar({ q: texto.trim() });
                if (e.key === "Backspace" && !texto && facetas.length) facetas[facetas.length - 1].quitar();
              }}
              placeholder="Buscar…"
              aria-label="Buscar oportunidades por nombre, cliente, email, ciudad o etiqueta"
              className="h-8 min-w-24 flex-1 bg-transparent text-sm text-tinta outline-none placeholder:text-tinta-2"
            />
          </div>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Filtros, agrupar y favoritos"
              className="grid size-7 shrink-0 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta data-[state=open]:bg-placa-2 data-[state=open]:text-tinta"
            >
              <CaretDown className="size-3.5" weight="bold" aria-hidden />
            </button>
          </PopoverTrigger>
        </div>

        <PopoverContent align="end" className="w-[min(46rem,calc(100vw-2rem))] gap-0 bg-placa p-0 text-tinta shadow-lg">
          <div className="grid max-h-[70dvh] overflow-y-auto md:grid-cols-3 md:divide-x md:divide-linea">
            {/* Filtros */}
            <section className="p-2" aria-label="Filtros">
              <h3 className={claseTituloPanel}>
                <Funnel className="size-4 text-acento-tinta" weight="fill" aria-hidden />
                Filtros
              </h3>
              {FAMILIAS.map((familia, i) => (
                <Fragment key={familia}>
                  {i > 0 && <hr className="my-1.5 border-linea" />}
                  {CLAVES_FILTRO_VENTAS.filter((k) => FILTROS_VENTAS[k].familia === familia).map((k) => (
                    <Opcion key={k} on={f.f.includes(k)} onClick={() => alternarFiltro(k)}>
                      {FILTROS_VENTAS[k].texto}
                    </Opcion>
                  ))}
                </Fragment>
              ))}
              <hr className="my-1.5 border-linea" />
              <div className="flex flex-col gap-1.5 px-2 py-1">
                <select
                  value={f.fecha}
                  onChange={(e) => cambiar({ fecha: e.target.value as CampoFechaVentas })}
                  aria-label="Campo de fecha"
                  className={`${claseCampo} h-8`}
                >
                  {Object.entries(CAMPOS_FECHA_VENTAS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {(Object.keys(PERIODOS) as Periodo[]).map((p) => (
                <Opcion key={p} on={periodo === p} onClick={() => cambiar(periodo === p ? { desde: "", hasta: "" } : rangoPeriodo(p))}>
                  {PERIODOS[p]}
                </Opcion>
              ))}
              <form
                className="flex flex-col gap-1.5 px-2 pb-1 pt-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  cambiar(rango);
                }}
              >
                <span className="text-xs text-tinta-2">Rango</span>
                <div className="flex items-center gap-1.5">
                  <input type="date" value={rango.desde} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} aria-label="Desde" className={`${claseCampo} h-8 px-2`} />
                  <input type="date" value={rango.hasta} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} aria-label="Hasta" className={`${claseCampo} h-8 px-2`} />
                </div>
                <button type="submit" className="h-8 rounded-md border border-linea text-[0.8125rem] font-medium text-tinta hover:bg-placa-2">
                  Aplicar rango
                </button>
              </form>
            </section>

            {/* Agrupar por */}
            <section className="border-t border-linea p-2 md:border-t-0" aria-label="Agrupar por">
              <h3 className={claseTituloPanel}>
                <Stack className="size-4 text-acento-tinta" weight="fill" aria-hidden />
                Agrupar por
              </h3>
              {(Object.keys(AGRUPACIONES_VENTAS) as AgrupacionVentas[]).map((k) => {
                const nivel = f.agrupar.indexOf(k);
                return (
                  <Opcion key={k} on={nivel >= 0} onClick={() => alternarAgrupar(k)}>
                    {AGRUPACIONES_VENTAS[k]}
                    {nivel >= 0 && f.agrupar.length > 1 && <span className="ml-1.5 text-xs text-tinta-2">({nivel + 1}.º)</span>}
                  </Opcion>
                );
              })}
              <p className="px-2 pt-1.5 text-xs leading-relaxed text-tinta-2">Agrupa la lista y el análisis; hasta dos niveles.</p>
            </section>

            {/* Favoritos */}
            <section className="border-t border-linea p-2 md:border-t-0" aria-label="Favoritos">
              <h3 className={claseTituloPanel}>
                <Star className="size-4 text-aviso" weight="fill" aria-hidden />
                Favoritos
              </h3>
              {favoritos.length === 0 && <p className="px-2 py-1 text-[0.8125rem] text-tinta-2">Aún no hay búsquedas guardadas.</p>}
              <ul className="flex flex-col">
                {favoritos.map((x) => (
                  <li key={x.nombre} className="group flex items-center">
                    <Opcion
                      on={x.query === queryActual}
                      onClick={() => {
                        aplicarQuery(x.query);
                        setAbierto(false);
                      }}
                    >
                      {x.nombre}
                    </Opcion>
                    <button
                      type="button"
                      onClick={() => borrarFavorito(x.nombre)}
                      aria-label={`Borrar el favorito ${x.nombre}`}
                      className="grid size-7 shrink-0 place-items-center rounded-md text-tinta-2 opacity-60 hover:bg-critico-suave hover:text-critico group-hover:opacity-100"
                    >
                      <Trash className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <form onSubmit={guardarFavorito} className="mt-2 flex flex-col gap-1.5 border-t border-linea px-2 pt-2.5">
                <label className="text-xs text-tinta-2" htmlFor="nombre-favorito">
                  Guardar la búsqueda actual
                </label>
                <input
                  id="nombre-favorito"
                  value={nombreFavorito}
                  onChange={(e) => setNombreFavorito(e.target.value)}
                  maxLength={60}
                  placeholder="Nombre"
                  className={`${claseCampo} h-8`}
                />
                <button type="submit" disabled={!nombreFavorito.trim()} className={`${claseBotonPrincipal} h-8`}>
                  Guardar
                </button>
              </form>
            </section>
          </div>
        </PopoverContent>
      </Popover>

      <Pildora etiqueta="Equipo" valor={f.equipo} opciones={opcionesEquipo} onCambio={(v) => cambiar({ equipo: v })} />
      <Pildora etiqueta="Comercial" valor={f.comercial} opciones={opcionesComercial} onCambio={(v) => cambiar({ comercial: v })} />
      {catalogos.etiquetas.length > 0 && (
        <Pildora etiqueta="Etiqueta" valor={f.etiqueta} opciones={opcionesEtiqueta} onCambio={(v) => cambiar({ etiqueta: v })} />
      )}
    </div>
  );
}
