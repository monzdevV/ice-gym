"use client";

import { useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { moverLead } from "@/app/crm/acciones/leads";
import { codigoCentro } from "@/design/tokens";
import { dinero, numero } from "@/lib/formato";
import { probabilidadDe, puntuacion, totales } from "@/lib/oportunidad";
import { ESTADOS_LEAD, ETIQUETA_LEAD, ETIQUETA_ORIGEN, TONO_LEAD, esEstadoLead, type EstadoLead } from "@/lib/tipos";
import { SinDatos } from "@/components/crm/Primitivas";
import { BarraProbabilidad, MarcaNivel } from "./Piezas";
import type { FilaLead } from "./filtros";

/* ------------------------------- Tarjeta ------------------------------ */

function Contenido({ lead }: { lead: FilaLead }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-tinta">{lead.nombre}</p>
        <span className="shrink-0 text-sm font-medium tabular-nums text-tinta">
          {lead.valor > 0 ? dinero(lead.valor) : "—"}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[0.8125rem] text-tinta-2">
        {ETIQUETA_ORIGEN[lead.origen]}
        {lead.centro && ` · ${codigoCentro(lead.centro.nombre)}`}
        {lead.tarifa && ` · ${lead.tarifa.nombre}`}
      </p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <BarraProbabilidad valor={lead.prob} celdas={10} />
        {lead.punt && <MarcaNivel p={lead.punt} compacta />}
      </div>
    </>
  );
}

function Tarjeta({ lead }: { lead: FilaLead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { estado: lead.estado },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={isDragging ? "opacity-30" : ""}
    >
      <Link
        href={`/crm/leads/${lead.id}`}
        {...listeners}
        {...attributes}
        aria-roledescription="lead arrastrable"
        className="block cursor-grab rounded-lg border border-linea bg-placa p-3 shadow-[0_1px_2px_rgb(0_0_0/0.12)] transition-colors hover:border-tinta-2/40 active:cursor-grabbing"
      >
        <Contenido lead={lead} />
      </Link>
    </li>
  );
}

/* ------------------------------- Columna ------------------------------ */

function Columna({ estado, leads }: { estado: EstadoLead; leads: FilaLead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });
  const suma = totales(leads);

  return (
    <section
      ref={setNodeRef}
      className={`flex max-h-[70dvh] w-[272px] shrink-0 snap-start flex-col rounded-xl border bg-placa-2/40 transition-colors md:max-h-none ${
        isOver ? "border-acento bg-acento/10" : "border-linea"
      }`}
      aria-label={`${ETIQUETA_LEAD[estado]}, ${leads.length} leads`}
    >
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        <span className="size-2 rounded-full" style={{ backgroundColor: TONO_LEAD[estado] }} aria-hidden />
        <h2 className="truncate text-sm font-semibold text-tinta">{ETIQUETA_LEAD[estado]}</h2>
        <span className="rounded-md bg-placa-2 px-1.5 text-xs tabular-nums text-tinta-2">{numero(leads.length)}</span>
        <span className="ml-auto text-xs tabular-nums text-tinta-2">{dinero(suma.valor)}</span>
      </header>

      <ul className="relative flex min-h-[140px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {leads.map((lead) => (
          <Tarjeta key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && (
          <li className="grid min-h-[96px] place-items-center rounded-lg border border-dashed border-linea px-3 text-center text-[0.8125rem] text-tinta-2">
            Arrastra aquí un lead
          </li>
        )}
      </ul>
    </section>
  );
}

/* ------------------------------- Tablero ------------------------------ */

export function Tablero({ leads }: { leads: FilaLead[] }) {
  const router = useRouter();
  const [items, setItems] = useState(leads);
  const [arrastrando, setArrastrando] = useState<FilaLead | null>(null);
  const [, empezar] = useTransition();
  // Id estable: sin él, dnd-kit numera distinto en servidor y cliente y la hidratación falla.
  const idDnd = useId();

  // Si el servidor manda datos nuevos, sustituyen al estado optimista.
  const [origen, setOrigen] = useState(leads);
  if (leads !== origen) {
    setOrigen(leads);
    setItems(leads);
  }

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const porEstado = useMemo(() => {
    const mapa = new Map<EstadoLead, FilaLead[]>(ESTADOS_LEAD.map((e) => [e, []]));
    for (const lead of items) mapa.get(lead.estado)?.push(lead);
    return mapa;
  }, [items]);

  function alEmpezar(evento: DragStartEvent) {
    setArrastrando(items.find((l) => l.id === evento.active.id) ?? null);
  }

  function alSoltar(evento: DragEndEvent) {
    setArrastrando(null);
    const destino = evento.over?.id;
    if (!esEstadoLead(destino)) return;

    const id = String(evento.active.id);
    const lead = items.find((l) => l.id === id);
    if (!lead || lead.estado === destino) return;

    const previo = lead.estado;
    const instantanea = items;

    // Movimiento optimista: la tarjeta salta ya y el servidor confirma después.
    setItems((antes) =>
      antes.map((l) => {
        if (l.id !== id) return l;
        const movido = { ...l, estado: destino, updated_at: new Date().toISOString() };
        return { ...movido, prob: probabilidadDe(movido), punt: puntuacion(movido, movido.resumen), parado: 0 };
      })
    );

    empezar(async () => {
      const resultado = await moverLead(id, destino, previo);
      if (resultado.ok) {
        toast.success(`${lead.nombre} pasa a ${ETIQUETA_LEAD[destino].toLowerCase()}`);
        router.refresh();
      } else {
        setItems(instantanea);
        toast.error(resultado.mensaje);
      }
    });
  }

  if (items.length === 0) {
    return (
      <SinDatos
        titulo="Ningún lead con estos filtros"
        texto="Cuando alguien pida su pase de prueba en la web aparecerá aquí, en la columna Nuevo."
      />
    );
  }

  return (
    <DndContext id={idDnd} sensors={sensores} onDragStart={alEmpezar} onDragEnd={alSoltar}>
      <div className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:h-full lg:-mx-8 lg:px-8">
        {ESTADOS_LEAD.map((estado) => (
          <Columna key={estado} estado={estado} leads={porEstado.get(estado) ?? []} />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
        {arrastrando ? (
          <div className="w-[256px] rotate-[1.5deg] rounded-lg border border-acento bg-placa p-3 shadow-xl">
            <Contenido lead={arrastrando} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
