"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import {
  COLOR_LEAD,
  ESTADOS_LEAD,
  ETIQUETA_LEAD,
  ETIQUETA_ORIGEN,
  esEstadoLead,
  type EstadoLead,
} from "@/lib/tipos";
import type { LeadConContexto } from "@/lib/datos/leads";
import { SinDatos } from "@/components/crm/Primitivas";

/** Tiempo desde el último movimiento, como el intervalo de una torre de tiempos: "+3 D". */
function intervalo(iso: string) {
  const horas = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (horas < 24) return `+${horas} H`;
  return `+${Math.round(horas / 24)} D`;
}

/* -------------------------------- Fila ------------------------------- */

function Contenido({ lead }: { lead: LeadConContexto }) {
  const frio = Date.now() - new Date(lead.updated_at).getTime() > 7 * 86_400_000;
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <p className="condensada truncate text-[1.02rem] text-tinta">{lead.nombre}</p>
        <span
          className={`cifra shrink-0 text-[0.95rem] ${frio ? "text-tinta" : "text-tinta-2"}`}
          title={frio ? "Más de una semana sin movimiento" : "Tiempo desde el último movimiento"}
        >
          {intervalo(lead.updated_at)}
        </span>
      </div>
      <p className="mt-1 truncate text-[0.8rem] text-tinta-2">
        {ETIQUETA_ORIGEN[lead.origen]}
        {lead.centro && ` · ${codigoCentro(lead.centro.nombre)}`}
        {lead.tarifa && ` · ${lead.tarifa.nombre}`}
      </p>
    </>
  );
}

function Fila({ lead }: { lead: LeadConContexto }) {
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
        className="block cursor-grab bg-placa px-3 py-2.5 transition-colors hover:bg-placa-2 active:cursor-grabbing"
      >
        <Contenido lead={lead} />
      </Link>
    </li>
  );
}

/* ------------------------------- Columna ------------------------------ */

function Columna({ estado, leads }: { estado: EstadoLead; leads: LeadConContexto[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });

  return (
    <section
      ref={setNodeRef}
      className="flex w-[264px] shrink-0 snap-start flex-col lg:w-auto"
      aria-label={`${ETIQUETA_LEAD[estado]}, ${leads.length} leads`}
    >
      <header className="flex items-stretch">
        <span className="w-2" style={{ backgroundColor: COLOR_LEAD[estado] }} aria-hidden />
        <div className="corte-d flex flex-1 items-baseline justify-between gap-2 bg-tinta py-2 pl-3 pr-5 text-fondo">
          <h2 className="rotulo truncate text-[1.05rem]">{ETIQUETA_LEAD[estado]}</h2>
          <span className="cifra text-[1.2rem]">{leads.length}</span>
        </div>
      </header>

      <ul
        className={`mt-[3px] flex max-h-[64vh] min-h-[140px] flex-col gap-[3px] overflow-y-auto transition-colors ${
          isOver ? "bg-acento p-[3px]" : ""
        }`}
      >
        {leads.map((lead) => (
          <Fila key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && (
          <li className="grid min-h-[100px] place-items-center border border-dashed border-linea px-3 text-center text-[0.8rem] text-tinta-2">
            Arrastra aquí un lead
          </li>
        )}
      </ul>
    </section>
  );
}

/* ------------------------------- Tablero ------------------------------ */

export function Tablero({ leads }: { leads: LeadConContexto[] }) {
  const router = useRouter();
  const [items, setItems] = useState(leads);
  const [arrastrando, setArrastrando] = useState<LeadConContexto | null>(null);
  const [, empezar] = useTransition();

  useEffect(() => setItems(leads), [leads]);

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const porEstado = useMemo(() => {
    const mapa = new Map<EstadoLead, LeadConContexto[]>(ESTADOS_LEAD.map((e) => [e, []]));
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

    // Movimiento optimista: la fila salta ya y el servidor confirma después.
    setItems((antes) =>
      antes.map((l) => (l.id === id ? { ...l, estado: destino, updated_at: new Date().toISOString() } : l))
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
      <div className="px-4 lg:px-8">
        <SinDatos
          titulo="Ningún lead todavía"
          texto="Cuando alguien pida su pase de prueba en la web aparecerá aquí, en la columna Nuevo."
        />
      </div>
    );
  }

  return (
    <DndContext sensors={sensores} onDragStart={alEmpezar} onDragEnd={alSoltar}>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-10 lg:grid lg:grid-cols-6 lg:gap-3 lg:overflow-visible lg:px-8">
        {ESTADOS_LEAD.map((estado) => (
          <Columna key={estado} estado={estado} leads={porEstado.get(estado) ?? []} />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
        {arrastrando ? (
          <div className="flex w-[256px] items-stretch bg-placa-2">
            <span className="w-1.5 bg-acento" aria-hidden />
            <div className="flex-1 px-3 py-2.5">
              <Contenido lead={arrastrando} />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
