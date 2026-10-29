"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ArrowsLeftRight, CaretLineLeft, CaretLineRight, Check, GearSix, PencilSimple, Plus, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { crearOportunidadVentas, moverOportunidadVentas, plegarEtapaVentas } from "@/app/crm/acciones/ventas";
import { dinero, numero } from "@/lib/formato";
import {
  ETIQUETA_PLAZO,
  PLAZOS,
  TONO_PLAZO,
  hoyISO,
  leerImporte,
  plazoMasUrgente,
  quienVenta,
  rutaVentas,
  type EtapaVentas,
  type OportunidadVentasCompleta,
  type Plazo,
} from "@/lib/ventas";
import { Responsable, Senal } from "@/components/crm/b2b/Piezas";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { Selector } from "@/components/crm/actividad/Selector";
import { ListaActividades } from "@/components/crm/ventas/ListaActividades";
import { Estrellas, Etiquetas, MarcaPlazo } from "@/components/crm/ventas/Piezas";
import { useFlujo } from "./Contexto";
import { EstrellasEditables, aislar } from "./Estrellas";
import { posicionEntre } from "./utiles";

type Columnas = Record<string, OportunidadVentasCompleta[]>;
type FiltroPlazo = Plazo | "sin";

function agrupar(filas: OportunidadVentasCompleta[], etapas: EtapaVentas[]): Columnas {
  const c: Columnas = Object.fromEntries(etapas.map((e) => [e.id, [] as OportunidadVentasCompleta[]]));
  for (const o of filas) if (o.etapa_id) c[o.etapa_id]?.push(o);
  for (const e of etapas) c[e.id].sort((a, b) => a.posicion - b.posicion);
  return c;
}

/* ---------------------------------- Tarjeta --------------------------------- */

/** Reloj de actividades: abre las pendientes y deja planificar otra. */
function RelojActividades({ o }: { o: OportunidadVentasCompleta }) {
  const { actividadesDe, planificar, catalogos } = useFlujo();
  const plazo = plazoMasUrgente(o.actividades);
  const lista = actividadesDe(o.id);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          {...aislar}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Actividades de ${o.nombre}`}
          className="grid size-6 place-items-center rounded-md hover:bg-placa-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta"
        >
          <MarcaPlazo plazo={plazo} n={o.actividades.length} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] gap-0 bg-placa p-3 text-tinta" {...aislar} onClick={(e) => e.stopPropagation()}>
        {lista.length > 0 ? (
          <ListaActividades actividades={lista} tipos={catalogos.tipos} planes={catalogos.planes} comerciales={catalogos.comerciales} />
        ) : (
          <p className="pb-2 text-sm text-tinta-2">Nada planificado.</p>
        )}
        <button
          type="button"
          onClick={() => planificar({ o })}
          className="mt-1 flex h-8 items-center gap-1.5 rounded-md px-2 text-[0.8125rem] font-medium text-acento-tinta hover:bg-placa-2"
        >
          <Plus className="size-3.5" weight="bold" aria-hidden />
          Planificar una actividad
        </button>
      </PopoverContent>
    </Popover>
  );
}

/**
 * «Mover a etapa» sin arrastrar: la alternativa de teclado, lector de pantalla y
 * dedo (WCAG 2.5.7) al arrastre de la tarjeta.
 */
function MoverEtapa({ o }: { o: OportunidadVentasCompleta }) {
  const router = useRouter();
  const { catalogos } = useFlujo();
  const [pendiente, empezar] = useTransition();

  function mover(etapa: EtapaVentas) {
    if (etapa.id === o.etapa_id) return;
    empezar(async () => {
      const r = await moverOportunidadVentas(o.id, etapa.id);
      if (!r.ok) return void toast.error(r.mensaje);
      toast.success(etapa.ganada ? `${o.nombre}: ¡ganada!` : `${o.nombre} → ${etapa.nombre}`);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          {...aislar}
          onClick={(e) => e.stopPropagation()}
          disabled={pendiente}
          aria-label={`Mover ${o.nombre} a otra etapa`}
          title="Mover a etapa"
          className="grid size-6 place-items-center rounded-md text-tinta-2 hover:bg-placa-2 hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta disabled:opacity-50"
        >
          <ArrowsLeftRight className="size-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" {...aislar} onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Mover a etapa</DropdownMenuLabel>
        {catalogos.etapas.map((e) => {
          const actual = e.id === o.etapa_id;
          return (
            <DropdownMenuItem key={e.id} disabled={actual} onSelect={() => mover(e)}>
              <Check className={actual ? "" : "invisible"} aria-hidden />
              {e.nombre}
              {actual && <span className="sr-only"> (etapa actual)</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Contenido({ o, interactivo = true }: { o: OportunidadVentasCompleta; interactivo?: boolean }) {
  const quien = quienVenta(o);
  return (
    <>
      <div className="flex items-start gap-2">
        <p className="line-clamp-2 min-w-0 flex-1 text-[0.875rem] font-semibold leading-snug text-tinta">
          {interactivo ? (
            <Link href={rutaVentas.oportunidad(o.id)} {...aislar} className="outline-none hover:text-acento-tinta focus-visible:underline">
              {o.nombre}
            </Link>
          ) : (
            o.nombre
          )}
        </p>
        {o.estado === "ganada" && <Senal tipo="exito">Ganada</Senal>}
        {o.estado === "perdida" && <Senal tipo="critico">Perdida</Senal>}
      </div>
      {quien && <p className="mt-0.5 truncate text-xs text-tinta-2">{quien}</p>}
      {o.ingresos > 0 && (
        <p className={`cifra mt-1.5 text-base ${o.estado === "perdida" ? "text-tinta-2 line-through decoration-1" : "text-tinta"}`}>{dinero(o.ingresos)}</p>
      )}
      {o.etiquetas.length > 0 && (
        <div className="mt-2">
          <Etiquetas lista={o.etiquetas} />
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-1.5">
        {interactivo ? <EstrellasEditables valor={o.prioridad} id={o.id} /> : <Estrellas n={o.prioridad} />}
        {interactivo && <RelojActividades o={o} />}
        {interactivo && <MoverEtapa o={o} />}
        <span className="ml-auto">
          <Responsable m={o.comercial} soloAvatar />
        </span>
      </div>
    </>
  );
}

const claseTarjeta = "relative block w-full rounded-2xl bg-tarjeta px-3 py-3 text-left shadow-placa ring-1 ring-linea/70";

function Tarjeta({ o, alAbrir }: { o: OportunidadVentasCompleta; alAbrir: (o: OportunidadVentasCompleta) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: o.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={isDragging ? "opacity-40" : ""}>
      <div
        {...attributes}
        {...listeners}
        aria-roledescription="tarjeta arrastrable"
        aria-label={`${o.nombre}${o.ingresos ? `, ${dinero(o.ingresos)}` : ""}. Espacio para arrastrar, o usa el botón «Mover a etapa».`}
        onClick={() => alAbrir(o)}
        className={`${claseTarjeta} cursor-grab transition-[box-shadow,transform] duration-150 hover:-translate-y-px hover:ring-tinta-2/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta active:cursor-grabbing`}
      >
        <Contenido o={o} />
      </div>
    </li>
  );
}

/* -------------------------------- Alta rápida -------------------------------- */

function AltaRapida({ etapa, onCerrar }: { etapa: EtapaVentas; onCerrar: () => void }) {
  const router = useRouter();
  const { catalogos, nueva } = useFlujo();
  const idError = useId();
  const [pendiente, empezar] = useTransition();
  const [d, setD] = useState({ cliente_id: "", contacto_nombre: "", nombre: "", email: "", telefono: "", ingresos: "", prioridad: 0 });
  const [importeMalo, setImporteMalo] = useState(false);
  const poner = (k: keyof typeof d, v: string | number) => setD((a) => ({ ...a, [k]: v }));

  const datos = () => ({ ...d, cliente_id: d.cliente_id || null, etapa_id: etapa.id });

  function anadir(e: React.FormEvent) {
    e.preventDefault();
    // Importe a la española («1.500», «1.234,56»): si no se entiende, no se crea.
    const ingresos = d.ingresos.trim() ? leerImporte(d.ingresos) : 0;
    if (ingresos == null || ingresos < 0) {
      setImporteMalo(true);
      return void toast.error("Ingresos: escribe una cantidad, p. ej. 1.234,56");
    }
    setImporteMalo(false);
    empezar(async () => {
      const r = await crearOportunidadVentas({ ...datos(), ingresos });
      if (!r.ok) return void toast.error(r.mensaje);
      toast.success(r.mensaje);
      setD({ cliente_id: "", contacto_nombre: "", nombre: "", email: "", telefono: "", ingresos: "", prioridad: 0 });
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={anadir}
      onKeyDown={(e) => e.key === "Escape" && onCerrar()}
      className="mx-2 mb-2 flex flex-col gap-2 rounded-2xl bg-tarjeta p-3 shadow-placa ring-2 ring-acento/60"
      aria-label={`Alta rápida en ${etapa.nombre}`}
    >
      <label htmlFor={`${idError}-cliente`} className="sr-only">
        Cliente
      </label>
      <Selector
        id={`${idError}-cliente`}
        name="cliente_id"
        valor={d.cliente_id}
        onCambio={(v) => {
          const c = catalogos.clientes.find((x) => x.id === v);
          setD((a) => ({ ...a, cliente_id: v, email: a.email || c?.email || "", telefono: a.telefono || c?.telefono || "" }));
        }}
        placeholder="Cliente"
        opciones={catalogos.clientes.map((c) => ({ valor: c.id, texto: c.nombre, detalle: c.email ?? undefined }))}
      />
      {!d.cliente_id && (
        <input value={d.contacto_nombre} onChange={(e) => poner("contacto_nombre", e.target.value)} placeholder="Contacto" aria-label="Contacto" className={claseCampo} />
      )}
      <input value={d.nombre} onChange={(e) => poner("nombre", e.target.value)} autoFocus placeholder="Nombre de la oportunidad" aria-label="Nombre de la oportunidad" className={claseCampo} />
      <input type="email" value={d.email} onChange={(e) => poner("email", e.target.value)} placeholder="Correo electrónico" aria-label="Correo electrónico" className={claseCampo} />
      <input type="tel" value={d.telefono} onChange={(e) => poner("telefono", e.target.value)} placeholder="Teléfono" aria-label="Teléfono" className={claseCampo} />
      <div className="flex items-center gap-2">
        <input
          inputMode="decimal"
          value={d.ingresos}
          onChange={(e) => {
            poner("ingresos", e.target.value);
            setImporteMalo(false);
          }}
          placeholder="0 €"
          aria-label="Ingresos esperados"
          aria-invalid={importeMalo || undefined}
          aria-describedby={importeMalo ? idError : undefined}
          className={`${claseCampo} w-28 tabular-nums`}
        />
        <EstrellasEditables valor={d.prioridad} onCambio={(n) => poner("prioridad", n)} />
      </div>
      {importeMalo && (
        <p id={idError} className="text-xs font-medium text-critico">
          Escribe una cantidad, por ejemplo 1.234,56
        </p>
      )}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pendiente} className={`${claseBotonPrincipal} h-8 px-3`}>
          Añadir
        </button>
        <button
          type="button"
          onClick={() => {
            nueva({ ...datos(), ingresos: d.ingresos });
            onCerrar();
          }}
          className="h-8 rounded-md border border-linea px-3 text-sm font-medium text-tinta hover:bg-placa-2"
        >
          Editar
        </button>
        <button type="button" onClick={onCerrar} aria-label="Descartar el alta rápida" title="Descartar" className="ml-auto grid size-8 place-items-center rounded-md text-tinta-2 hover:bg-placa-2 hover:text-tinta">
          <X className="size-4" weight="bold" aria-hidden />
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------- Columna --------------------------------- */

/** Barra de actividades de la columna: rojo vencidas, ámbar hoy, verde planificadas, gris sin nada. Cada tramo filtra. */
function BarraPlazos({
  items,
  filtro,
  onFiltro,
}: {
  items: OportunidadVentasCompleta[];
  filtro: FiltroPlazo | null;
  onFiltro: (p: FiltroPlazo | null) => void;
}) {
  const hoy = hoyISO();
  const cuenta: Record<FiltroPlazo, number> = { vencida: 0, hoy: 0, planificada: 0, sin: 0 };
  for (const o of items) cuenta[plazoMasUrgente(o.actividades, hoy) ?? "sin"]++;
  const total = items.length;
  const tramos: { p: FiltroPlazo; tono: string; texto: string }[] = [
    ...PLAZOS.map((p) => ({ p, tono: TONO_PLAZO[p], texto: ETIQUETA_PLAZO[p] })),
    { p: "sin" as const, tono: "var(--linea)", texto: "Sin actividad" },
  ];
  const activo = filtro ? tramos.find((t) => t.p === filtro) : null;
  // La barra se ve fina, pero cada tramo se pulsa en 24 px de alto (WCAG 2.5.8).
  return (
    <div>
      <div className="flex h-6 w-full items-center gap-px" role="group" aria-label="Filtrar por actividad">
        {total === 0 && <span className="h-1.5 w-full rounded-full bg-linea/60" aria-hidden />}
        {total > 0 &&
          tramos.map(({ p, tono, texto }) =>
            cuenta[p] ? (
              <button
                key={p}
                type="button"
                onClick={() => onFiltro(filtro === p ? null : p)}
                aria-pressed={filtro === p}
                title={`${texto}: ${cuenta[p]}`}
                aria-label={`${texto}: ${cuenta[p]}`}
                className={`flex h-full min-w-1.5 items-center rounded-sm transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta ${
                  filtro && filtro !== p ? "opacity-30" : ""
                }`}
                style={{ width: `${(cuenta[p] / total) * 100}%` }}
              >
                <span className="h-1.5 w-full rounded-full" style={{ background: tono }} aria-hidden />
              </button>
            ) : null
          )}
      </div>
      {/* El tramo elegido, también en palabras: el color no puede ser la única pista. */}
      {activo && (
        <p className="flex flex-wrap items-center gap-1 text-xs text-tinta-2">
          Sólo «{activo.texto.toLowerCase()}» ({cuenta[activo.p]})
          <button type="button" onClick={() => onFiltro(null)} className="rounded px-1 py-0.5 font-medium text-acento-tinta underline-offset-4 hover:underline">
            Ver todas
          </button>
        </p>
      )}
    </div>
  );
}

function Plegada({ etapa, n, valor }: { etapa: EtapaVentas; n: number; valor: number }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() =>
        empezar(async () => {
          const r = await plegarEtapaVentas(etapa.id, false);
          if (r.ok) router.refresh();
          else toast.error(r.mensaje);
        })
      }
      aria-label={`Desplegar ${etapa.nombre}: ${n} oportunidades, ${dinero(valor)}`}
      title="Desplegar"
      className="flex w-11 shrink-0 flex-col items-center gap-3 rounded-2xl bg-columna py-3 text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta md:min-h-0"
    >
      <CaretLineRight className="size-4" aria-hidden />
      <span className="text-xs font-semibold tabular-nums">{numero(n)}</span>
      <span className="text-sm font-semibold text-tinta [writing-mode:vertical-rl]">{etapa.nombre}</span>
    </button>
  );
}

function Columna({
  etapa,
  items,
  alAbrir,
}: {
  etapa: EtapaVentas;
  items: OportunidadVentasCompleta[];
  alAbrir: (o: OportunidadVentasCompleta) => void;
}) {
  const router = useRouter();
  const [, empezar] = useTransition();
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id });
  const [alta, setAlta] = useState(false);
  const botonAlta = useRef<HTMLButtonElement>(null);
  const [filtro, setFiltro] = useState<FiltroPlazo | null>(null);
  const hoy = hoyISO();
  const visibles = filtro ? items.filter((o) => (plazoMasUrgente(o.actividades, hoy) ?? "sin") === filtro) : items;
  const valor = items.reduce((s, o) => s + o.ingresos, 0);

  function plegar() {
    empezar(async () => {
      const r = await plegarEtapaVentas(etapa.id, true);
      if (r.ok) router.refresh();
      else toast.error(r.mensaje);
    });
  }

  return (
    <section
      className={`flex max-h-[75dvh] w-[288px] shrink-0 snap-start flex-col rounded-2xl transition-[background-color,box-shadow] md:max-h-none md:min-h-0 md:w-0 md:min-w-[232px] md:flex-1 ${
        isOver ? "bg-acento-suave ring-2 ring-acento/60" : "bg-columna"
      }`}
      aria-label={`${etapa.nombre}: ${items.length} oportunidades, ${dinero(valor)}`}
    >
      <header className="group/columna shrink-0 px-3 pb-3 pt-3">
        <div className="flex items-center gap-1.5">
          <h2 className="truncate text-sm font-semibold text-tinta" title={etapa.requisitos ?? undefined}>
            {etapa.nombre}
          </h2>
          <span className="text-xs font-medium tabular-nums text-tinta-2">{numero(items.length)}</span>
          <span className="ml-auto flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label={`Opciones de ${etapa.nombre}`} className="grid size-7 place-items-center rounded-md text-tinta-2 hover:bg-placa-2 hover:text-tinta">
                  <GearSix className="size-4" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={plegar}>
                  <CaretLineLeft aria-hidden />
                  Plegar
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`${rutaVentas.configuracion}?tab=etapas`}>
                    <PencilSimple aria-hidden />
                    Editar etapa
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              ref={botonAlta}
              type="button"
              onClick={() => setAlta((v) => !v)}
              aria-expanded={alta}
              aria-label={`Alta rápida en ${etapa.nombre}`}
              className="grid size-7 place-items-center rounded-md text-tinta-2 hover:bg-placa-2 hover:text-tinta"
            >
              <Plus className="size-4" weight="bold" aria-hidden />
            </button>
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <BarraPlazos items={items} filtro={filtro} onFiltro={setFiltro} />
          </div>
          <span className="cifra text-base text-tinta">{dinero(valor)}</span>
        </div>
      </header>

      {alta && (
        <AltaRapida
          etapa={etapa}
          onCerrar={() => {
            setAlta(false);
            // Al cerrar con Escape o con la X, el foco vuelve al «+» en vez de perderse.
            botonAlta.current?.focus();
          }}
        />
      )}

      <SortableContext id={etapa.id} items={visibles.map((o) => o.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-[120px] flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-2 pb-2 pt-0.5">
          {visibles.map((o) => (
            <Tarjeta key={o.id} o={o} alAbrir={alAbrir} />
          ))}
          {visibles.length === 0 && (
            <li className="grid min-h-[96px] place-items-center rounded-lg border border-dashed border-linea px-3 text-center text-[0.8125rem] text-tinta-2">
              {filtro ? "Nada con ese estado de actividad" : "Suelta aquí una oportunidad"}
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}

/* ---------------------------------- Kanban --------------------------------- */

export function KanbanVentas({ filas, etapas }: { filas: OportunidadVentasCompleta[]; etapas: EtapaVentas[] }) {
  const router = useRouter();
  const [, empezar] = useTransition();
  const idDnd = useId();
  const [columnas, setColumnas] = useState(() => agrupar(filas, etapas));
  const [activa, setActiva] = useState<OportunidadVentasCompleta | null>(null);
  const inicio = useRef<{ etapa: string; indice: number; foto: Columnas } | null>(null);
  const finArrastre = useRef(0);

  // Datos nuevos del servidor sustituyen al estado optimista, pero nunca a mitad
  // de un arrastre: se aplican al soltar o cancelar.
  const [arrastrando, setArrastrando] = useState(false);
  const [origen, setOrigen] = useState({ filas, etapas });
  if (!arrastrando && (filas !== origen.filas || etapas !== origen.etapas)) {
    setOrigen({ filas, etapas });
    setColumnas(agrupar(filas, etapas));
  }

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const abiertas = etapas.filter((e) => !e.plegada);
  const porId = useMemo(() => {
    const m = new Map<string, OportunidadVentasCompleta>();
    for (const lista of Object.values(columnas)) for (const o of lista) m.set(o.id, o);
    return m;
  }, [columnas]);

  function columnaDe(id: UniqueIdentifier | undefined, cols = columnas): string | null {
    if (id == null) return null;
    if (cols[String(id)]) return String(id);
    for (const e of etapas) if (cols[e.id]?.some((o) => o.id === id)) return e.id;
    return null;
  }
  const nombreEtapa = (id: string | null) => etapas.find((e) => e.id === id)?.nombre ?? "";
  const nombre = (id: UniqueIdentifier) => porId.get(String(id))?.nombre ?? "La oportunidad";
  const anuncios: Announcements = {
    onDragStart: ({ active }) => `${nombre(active.id)} cogida.`,
    onDragOver: ({ active, over }) => {
      const e = columnaDe(over?.id);
      return e ? `${nombre(active.id)} sobre ${nombreEtapa(e)}.` : `${nombre(active.id)} fuera de las columnas.`;
    },
    onDragEnd: ({ active, over }) => {
      const e = columnaDe(over?.id);
      return e ? `${nombre(active.id)} soltada en ${nombreEtapa(e)}.` : `${nombre(active.id)} vuelve a su sitio.`;
    },
    onDragCancel: ({ active }) => `Movimiento cancelado. ${nombre(active.id)} vuelve a su sitio.`,
  };

  function alEmpezar({ active }: DragStartEvent) {
    const etapa = columnaDe(active.id);
    if (!etapa) return;
    inicio.current = { etapa, indice: columnas[etapa].findIndex((o) => o.id === active.id), foto: columnas };
    setArrastrando(true);
    setActiva(porId.get(String(active.id)) ?? null);
  }

  /** Cruza de columna en vivo para que las demás tarjetas hagan hueco. */
  function alPasar({ active, over }: DragOverEvent) {
    if (!over) return;
    setColumnas((cols) => {
      const desde = columnaDe(active.id, cols);
      const hacia = columnaDe(over.id, cols);
      if (!desde || !hacia || desde === hacia) return cols;
      const item = cols[desde].find((o) => o.id === active.id);
      if (!item) return cols;
      const destino = cols[hacia];
      const iOver = destino.findIndex((o) => o.id === over.id);
      const abajo =
        active.rect.current.translated && over.rect ? active.rect.current.translated.top > over.rect.top + over.rect.height / 2 : false;
      const indice = iOver >= 0 ? iOver + (abajo ? 1 : 0) : destino.length;
      return {
        ...cols,
        [desde]: cols[desde].filter((o) => o.id !== active.id),
        [hacia]: [...destino.slice(0, indice), { ...item, etapa_id: hacia }, ...destino.slice(indice)],
      };
    });
  }

  function restaurar() {
    if (inicio.current) setColumnas(inicio.current.foto);
  }

  function alSoltar({ active, over }: DragEndEvent) {
    setActiva(null);
    setArrastrando(false);
    finArrastre.current = Date.now();
    const ini = inicio.current;
    inicio.current = null;
    if (!ini) return;
    const etapaId = columnaDe(active.id);
    if (!over || !etapaId) return void (ini && setColumnas(ini.foto));

    let lista = columnas[etapaId];
    const desdeI = lista.findIndex((o) => o.id === active.id);
    const overI = lista.findIndex((o) => o.id === over.id);
    if (overI >= 0 && overI !== desdeI) lista = arrayMove(lista, desdeI, overI);
    const indice = lista.findIndex((o) => o.id === active.id);
    if (etapaId === ini.etapa && indice === ini.indice) return void setColumnas(ini.foto);

    const destino = etapas.find((e) => e.id === etapaId)!;
    const original = ini.foto[ini.etapa].find((o) => o.id === active.id)!;
    const posicion = posicionEntre(lista, indice);
    const cambia = etapaId !== ini.etapa;
    const movida: OportunidadVentasCompleta = {
      ...original,
      etapa_id: etapaId,
      posicion,
      // Las mismas reglas que moverOportunidadVentas: una perdida que cambia de etapa se restaura.
      ...(cambia && {
        probabilidad:
          original.probabilidad_manual && !destino.ganada && original.estado !== "perdida" ? original.probabilidad : destino.probabilidad,
        estado: destino.ganada ? "ganada" : "abierta",
      }),
    };
    lista = lista.map((o) => (o.id === movida.id ? movida : o));
    const foto = ini.foto;
    setColumnas((cols) => ({ ...cols, [etapaId]: lista }));
    // Lo que llegó del servidor durante el arrastre ya es viejo: el refresco de este movimiento lo sustituye.
    setOrigen({ filas, etapas });

    // Si falla, todo vuelve a como estaba.
    empezar(async () => {
      const r = await moverOportunidadVentas(original.id, etapaId, posicion);
      if (r.ok) {
        if (cambia) toast.success(destino.ganada ? `${original.nombre}: ¡ganada!` : `${original.nombre} → ${destino.nombre}`);
        router.refresh();
      } else {
        setColumnas(foto);
        toast.error(r.mensaje);
      }
    });
  }

  function alAbrir(o: OportunidadVentasCompleta) {
    // El clic que sigue a soltar una tarjeta no abre la ficha.
    if (Date.now() - finArrastre.current < 250) return;
    router.push(rutaVentas.oportunidad(o.id));
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
        setArrastrando(false);
        restaurar();
        inicio.current = null;
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
        className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 md:min-h-0 md:flex-1 md:snap-none md:overflow-y-hidden lg:-mx-8 lg:px-8"
        role="region"
        aria-label="Flujo de ventas"
      >
        {etapas.map((e) =>
          e.plegada ? (
            <Plegada key={e.id} etapa={e} n={columnas[e.id]?.length ?? 0} valor={(columnas[e.id] ?? []).reduce((s, o) => s + o.ingresos, 0)} />
          ) : (
            <Columna key={e.id} etapa={e} items={columnas[e.id] ?? []} alAbrir={alAbrir} />
          )
        )}
        {abiertas.length === 0 && etapas.length > 0 && (
          <p className="self-center text-sm text-tinta-2">Todas las etapas están plegadas. Pulsa una para desplegarla.</p>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
        {activa ? (
          <div className={`${claseTarjeta} w-[272px] rotate-[1.5deg] cursor-grabbing shadow-xl ring-2 ring-acento`}>
            <Contenido o={activa} interactivo={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
