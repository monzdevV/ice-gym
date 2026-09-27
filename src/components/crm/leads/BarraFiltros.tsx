"use client";

import { useEffect, useState } from "react";
import { CaretDown, DownloadSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ESTADOS_LEAD, ETIQUETA_LEAD, ETIQUETA_ORIGEN, ORIGENES_LEAD } from "@/lib/tipos";
import { ORDENES, PERIODOS, type Filtros } from "./filtros";

/** Píldora segmentada: «Etiqueta | Valor ▾», como en las barras de filtros de los CRM de ventas. */
function Pildora<T extends string>({
  etiqueta,
  valor,
  opciones,
  onCambio,
}: {
  etiqueta: string;
  valor: T;
  opciones: { valor: T; texto: string }[];
  onCambio: (v: T) => void;
}) {
  const actual = opciones.find((o) => o.valor === valor)?.texto ?? valor;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-stretch overflow-hidden rounded-lg border border-linea bg-placa text-[0.8125rem] transition-colors hover:border-tinta-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento"
        >
          <span className="flex items-center border-r border-linea px-2.5 text-tinta-2">{etiqueta}</span>
          <span className="flex items-center gap-1.5 px-2.5 font-medium text-tinta">
            {actual}
            <CaretDown className="size-3 text-tinta-2" weight="bold" aria-hidden />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuRadioGroup value={valor} onValueChange={(v) => onCambio(v as T)}>
          {opciones.map((o) => (
            <DropdownMenuRadioItem key={o.valor} value={o.valor}>
              {o.texto}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BarraFiltros({
  filtros,
  cambiar,
  onExportar,
  conEtapa,
}: {
  filtros: Filtros;
  cambiar: (c: Partial<Filtros>) => void;
  onExportar: () => void;
  conEtapa: boolean;
}) {
  // La búsqueda escribe en la URL con un pequeño retardo para no saturar el historial.
  const [texto, setTexto] = useState(filtros.q);
  const [qUrl, setQUrl] = useState(filtros.q);
  if (filtros.q !== qUrl) {
    // La URL cambió desde fuera (p. ej. «Limpiar»): el campo la sigue.
    setQUrl(filtros.q);
    setTexto(filtros.q);
  }
  useEffect(() => {
    if (texto === filtros.q) return;
    const t = setTimeout(() => cambiar({ q: texto }), 200);
    return () => clearTimeout(t);
  }, [texto, filtros.q, cambiar]);

  const hayFiltros = filtros.q || filtros.etapa !== "todas" || filtros.origen !== "todos" || filtros.periodo !== "todo";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative flex h-8 w-full items-center sm:w-56">
        <span className="sr-only">Buscar leads</span>
        <MagnifyingGlass className="pointer-events-none absolute left-2.5 size-4 text-tinta-2" aria-hidden />
        <input
          id="buscar-leads"
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar nombre, email, etiqueta…"
          className="h-8 w-full rounded-lg border border-linea bg-placa pl-8 pr-2 text-[0.8125rem] text-tinta outline-none placeholder:text-tinta-2 focus:border-acento focus:ring-2 focus:ring-acento/25"
        />
      </label>

      <Pildora
        etiqueta="Ordenar"
        valor={filtros.orden}
        opciones={Object.entries(ORDENES).map(([valor, texto]) => ({ valor: valor as Filtros["orden"], texto }))}
        onCambio={(orden) => cambiar({ orden })}
      />
      {conEtapa && (
        <Pildora
          etiqueta="Etapa"
          valor={filtros.etapa}
          opciones={[
            { valor: "todas", texto: "Todas" },
            { valor: "abiertas", texto: "Abiertas" },
            ...ESTADOS_LEAD.map((e) => ({ valor: e, texto: ETIQUETA_LEAD[e] })),
          ]}
          onCambio={(etapa) => cambiar({ etapa })}
        />
      )}
      <Pildora
        etiqueta="Origen"
        valor={filtros.origen}
        opciones={[
          { valor: "todos", texto: "Todos" },
          ...ORIGENES_LEAD.map((o) => ({ valor: o, texto: ETIQUETA_ORIGEN[o] })),
        ]}
        onCambio={(origen) => cambiar({ origen })}
      />
      <Pildora
        etiqueta="Actividad"
        valor={filtros.periodo}
        opciones={Object.entries(PERIODOS).map(([valor, texto]) => ({ valor: valor as Filtros["periodo"], texto }))}
        onCambio={(periodo) => cambiar({ periodo })}
      />

      {hayFiltros && (
        <button
          type="button"
          onClick={() => cambiar({ q: "", etapa: "todas", origen: "todos", periodo: "todo" })}
          className="flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
        >
          <X className="size-3.5" aria-hidden />
          Limpiar
        </button>
      )}

      <button
        type="button"
        onClick={onExportar}
        className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-linea bg-placa px-3 text-[0.8125rem] font-medium text-tinta transition-colors hover:bg-placa-2"
      >
        <DownloadSimple className="size-4" aria-hidden />
        Exportar
      </button>
    </div>
  );
}
