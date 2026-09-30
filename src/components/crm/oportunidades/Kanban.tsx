"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ETIQUETA_ETAPA,
  PROBABILIDAD_POR_ETAPA,
  TONO_ETAPA,
  esEtapa,
  estadoParaEtapa,
  nombreCompleto,
  valorEsperado,
  type Etapa,
  type OportunidadCompleta,
} from "@/lib/b2b";
import { dinero, numero } from "@/lib/formato";
import { Avatar, BadgePrioridad, BadgeTipoOportunidad, LogoEmpresa, Responsable } from "@/components/crm/b2b/Piezas";
import { useAccionesOportunidad, MenuOportunidad } from "./Acciones";
import { MarcaEstado, Probabilidad, ProximaAccion, fechaCorta } from "./Piezas";

type Columnas = Record<Etapa, OportunidadCompleta[]>;

function agrupar(filas: OportunidadCompleta[], etapas: Etapa[]): Columnas {
  const c = Object.fromEntries(etapas.map((e) => [e, [] as OportunidadCompleta[]])) as Columnas;
  for (const o of filas) c[o.etapa]?.push(o);
  for (const e of etapas) c[e].sort((a, b) => a.posicion - b.posicion);
  return c;
}

/** Posición = punto medio entre las vecinas; en los extremos, una unidad más allá. */
function posicionEntre(lista: OportunidadCompleta[], i: number) {
  const antes = lista[i - 1]?.posicion;
  const despues = lista[i + 1]?.posicion;
  if (antes == null && despues == null) return 0;
  if (antes == null) return despues! - 1;
  if (despues == null) return antes + 1;
  return (antes + despues) / 2;
}

/* --------------------------------- Tarjeta -------------------------------- */

function Contenido({ o }: { o: OportunidadCompleta }) {
  return (
    <>
      <div className="flex items-start gap-2 pr-6">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-tinta">{o.nombre}</p>
      </div>

      {o.empresa && (
        <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-tinta">
          <LogoEmpresa nombre={o.empresa.nombre} url={o.empresa.logo_url} tamano="xs" />
          <span className="truncate">{o.empresa.nombre}</span>
        </p>
      )}
      {o.contacto && (
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-tinta-2">
          <Avatar nombre={o.contacto.nombre} apellidos={o.contacto.apellidos} url={o.contacto.avatar_url} tamano="xs" />
          <span className="truncate">{nombreCompleto(o.contacto)}</span>
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <BadgeTipoOportunidad tipo={o.tipo} />
        {(o.prioridad === "alta" || o.prioridad === "urgente") && <BadgePrioridad prioridad={o.prioridad} />}
        <MarcaEstado estado={o.estado} />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums text-tinta">{dinero(o.valor)}</span>
        <Probabilidad o={o} />
      </div>

      <div className="mt-2 border-t border-linea/70 pt-2">
        <ProximaAccion o={o} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-tinta-2">
        <span className="tabular-nums" title="Fecha de creación">
          Creada {fechaCorta(o.created_at)}
        </span>
        <Responsable m={o.responsable} soloAvatar />
      </div>
    </>
  );
}

const claseTarjeta =
  "relative block w-full rounded-lg border border-linea bg-placa p-3 text-left shadow-[0_1px_2px_rgb(0_0_0/0.08)]";

function Tarjeta({ o, alAbrir }: { o: OportunidadCompleta; alAbrir: (o: OportunidadCompleta) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: o.id,
    data: { etapa: o.etapa },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative ${isDragging ? "opacity-40" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        aria-roledescription="tarjeta arrastrable"
        aria-label={`${o.nombre}, ${dinero(o.valor)}. Espacio para mover, clic para vista rápida.`}
        onClick={() => alAbrir(o)}
        className={`${claseTarjeta} cursor-grab transition-[border-color,box-shadow] hover:border-tinta-2/40 hover:shadow-[0_2px_8px_rgb(0_0_0/0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento active:cursor-grabbing`}
      >
        <Contenido o={o} />
      </div>
      <MenuOportunidad o={o} className="absolute right-1.5 top-1.5" />
    </li>
  );
}

/* --------------------------------- Columna -------------------------------- */

function Columna({
  etapa,
  items,
  alAbrir,
}: {
  etapa: Etapa;
  items: OportunidadCompleta[];
  alAbrir: (o: OportunidadCompleta) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa, data: { tipo: "columna" } });
  const valor = items.reduce((s, o) => s + o.valor, 0);
  const esperado = items.reduce((s, o) => s + valorEsperado(o), 0);

  return (
    <section
      className={`flex max-h-[75dvh] w-[288px] shrink-0 snap-start flex-col rounded-xl border bg-placa-2/40 transition-colors md:max-h-none md:w-0 md:min-w-[190px] md:flex-1 ${
        isOver ? "border-acento bg-acento/5" : "border-linea"
      }`}
      aria-label={`${ETIQUETA_ETAPA[etapa]}: ${items.length} oportunidades, ${dinero(valor)}`}
    >
      <header className="flex flex-col gap-0.5 px-3 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: TONO_ETAPA[etapa] }} aria-hidden />
          <h2 className="truncate text-sm font-semibold text-tinta">{ETIQUETA_ETAPA[etapa]}</h2>
          <span className="rounded-md bg-placa-2 px-1.5 text-xs tabular-nums text-tinta-2">{numero(items.length)}</span>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs tabular-nums text-tinta-2">
          <span className="text-sm font-medium text-tinta">{dinero(valor)}</span>
          {etapa !== "ganada" && etapa !== "perdida" && valor > 0 && <span>· {dinero(esperado)} esperados</span>}
        </p>
      </header>

      <SortableContext id={etapa} items={items.map((o) => o.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
          {items.map((o) => (
            <Tarjeta key={o.id} o={o} alAbrir={alAbrir} />
          ))}
          {items.length === 0 && (
            <li className="grid min-h-[96px] place-items-center rounded-lg border border-dashed border-linea px-3 text-center text-[0.8125rem] text-tinta-2">
              Suelta aquí una oportunidad
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}

/* --------------------------------- Kanban --------------------------------- */

export function Kanban({ filas, etapas }: { filas: OportunidadCompleta[]; etapas: Etapa[] }) {
  const { abrir, mover } = useAccionesOportunidad();
  const idDnd = useId();
  const [columnas, setColumnas] = useState(() => agrupar(filas, etapas));
  const [activa, setActiva] = useState<OportunidadCompleta | null>(null);
  const inicio = useRef<{ etapa: Etapa; indice: number; foto: Columnas } | null>(null);
  const finArrastre = useRef(0);

  // Datos nuevos del servidor sustituyen al estado optimista.
  const [origen, setOrigen] = useState({ filas, etapas });
  if (filas !== origen.filas || etapas.join() !== origen.etapas.join()) {
    setOrigen({ filas, etapas });
    setColumnas(agrupar(filas, etapas));
  }

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const porId = useMemo(() => {
    const m = new Map<string, OportunidadCompleta>();
    for (const e of etapas) for (const o of columnas[e] ?? []) m.set(o.id, o);
    return m;
  }, [columnas, etapas]);

  function columnaDe(id: UniqueIdentifier | undefined, cols = columnas): Etapa | null {
    if (id == null) return null;
    if (esEtapa(id) && cols[id]) return id;
    for (const e of etapas) if (cols[e]?.some((o) => o.id === id)) return e;
    return null;
  }

  const nombre = (id: UniqueIdentifier) => porId.get(String(id))?.nombre ?? "La oportunidad";
  const anuncios: Announcements = {
    onDragStart: ({ active }) => `${nombre(active.id)} cogida.`,
    onDragOver: ({ active, over }) => {
      const e = columnaDe(over?.id);
      return e ? `${nombre(active.id)} sobre ${ETIQUETA_ETAPA[e]}.` : `${nombre(active.id)} fuera de las columnas.`;
    },
    onDragEnd: ({ active, over }) => {
      const e = columnaDe(over?.id);
      return e ? `${nombre(active.id)} soltada en ${ETIQUETA_ETAPA[e]}.` : `${nombre(active.id)} vuelve a su sitio.`;
    },
    onDragCancel: ({ active }) => `Movimiento cancelado. ${nombre(active.id)} vuelve a su sitio.`,
  };

  function alEmpezar({ active }: DragStartEvent) {
    const etapa = columnaDe(active.id);
    if (!etapa) return;
    inicio.current = { etapa, indice: columnas[etapa].findIndex((o) => o.id === active.id), foto: columnas };
    setActiva(porId.get(String(active.id)) ?? null);
  }

  /** Cruza de columna en vivo para que las demás tarjetas hagan hueco. */
  function alPasar({ active, over }: DragOverEvent) {
    if (!over) return;
    setColumnas((cols) => {
      const desde = columnaDe(active.id, cols);
      const hacia = columnaDe(over.id, cols);
      if (!desde || !hacia || desde === hacia) return cols;
      const origenLista = cols[desde];
      const destino = cols[hacia];
      const item = origenLista.find((o) => o.id === active.id);
      if (!item) return cols;
      const iOver = destino.findIndex((o) => o.id === over.id);
      const abajo =
        active.rect.current.translated && over.rect
          ? active.rect.current.translated.top > over.rect.top + over.rect.height / 2
          : false;
      const indice = iOver >= 0 ? iOver + (abajo ? 1 : 0) : destino.length;
      return {
        ...cols,
        [desde]: origenLista.filter((o) => o.id !== active.id),
        [hacia]: [...destino.slice(0, indice), { ...item, etapa: hacia }, ...destino.slice(indice)],
      };
    });
  }

  function restaurar() {
    if (inicio.current) setColumnas(inicio.current.foto);
  }

  function alSoltar({ active, over }: DragEndEvent) {
    setActiva(null);
    finArrastre.current = Date.now();
    const ini = inicio.current;
    if (!ini) return;
    const etapa = columnaDe(active.id);
    if (!over || !etapa) {
      restaurar();
      return;
    }

    let lista = columnas[etapa];
    const desdeI = lista.findIndex((o) => o.id === active.id);
    const overI = lista.findIndex((o) => o.id === over.id);
    if (overI >= 0 && overI !== desdeI) lista = arrayMove(lista, desdeI, overI);
    const indice = lista.findIndex((o) => o.id === active.id);

    if (etapa === ini.etapa && indice === ini.indice) {
      restaurar();
      return;
    }

    const original = ini.foto[ini.etapa].find((o) => o.id === active.id)!;
    const posicion = posicionEntre(lista, indice);
    const cambia = etapa !== ini.etapa;
    const movida: OportunidadCompleta = {
      ...original,
      etapa,
      posicion,
      ...(cambia
        ? { probabilidad: PROBABILIDAD_POR_ETAPA[etapa], estado: estadoParaEtapa(etapa, original.estado) }
        : {}),
    };
    lista = lista.map((o) => (o.id === movida.id ? movida : o));
    const foto = ini.foto;
    setColumnas((cols) => ({ ...cols, [etapa]: lista }));

    // Persistencia: si falla (o se cancela el motivo de pérdida), vuelve todo a como estaba.
    mover(original, etapa, { posicion, alFallar: () => setColumnas(foto), silencioso: !cambia });
    inicio.current = null;
  }

  function alAbrir(o: OportunidadCompleta) {
    // El clic que sigue a soltar una tarjeta no debe abrir la vista rápida.
    if (Date.now() - finArrastre.current < 250) return;
    abrir(o);
  }

  return (
    <DndContext
      id={idDnd}
      sensors={sensores}
      collisionDetection={closestCorners}
      onDragStart={alEmpezar}
      onDragOver={alPasar}
      onDragEnd={alSoltar}
      onDragCancel={() => {
        setActiva(null);
        restaurar();
      }}
      accessibility={{
        announcements: anuncios,
        screenReaderInstructions: {
          draggable:
            "Pulsa espacio o intro para coger la tarjeta. Usa las flechas para moverla entre posiciones y columnas, espacio o intro para soltarla y escape para cancelar.",
        },
      }}
    >
      <div
        className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 md:h-[calc(100dvh-4.5rem)] md:min-h-[420px] lg:-mx-8 lg:px-8"
        role="region"
        aria-label="Tablero de oportunidades"
      >
        {etapas.map((e) => (
          <Columna key={e} etapa={e} items={columnas[e] ?? []} alAbrir={alAbrir} />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
        {activa ? (
          <div className={`${claseTarjeta} w-[272px] rotate-[1.5deg] cursor-grabbing border-acento shadow-xl`}>
            <Contenido o={activa} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
