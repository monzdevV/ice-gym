"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
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
import { Building2, Phone } from "lucide-react";
import { moverLead } from "@/app/crm/acciones/leads";
import {
  COLOR_LEAD,
  ESTADOS_LEAD,
  ETIQUETA_LEAD,
  ETIQUETA_ORIGEN,
  esEstadoLead,
  type EstadoLead,
} from "@/lib/tipos";
import type { LeadConContexto } from "@/lib/datos/leads";
import { relativo } from "@/lib/formato";
import { SinDatos } from "@/components/crm/Primitivas";

/* -------------------------------- Tarjeta ------------------------------- */

function Contenido({ lead }: { lead: LeadConContexto }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.9rem] font-semibold leading-tight text-hielo">{lead.nombre}</p>
        <span
          className="mt-1 size-1.5 shrink-0"
          style={{ backgroundColor: COLOR_LEAD[lead.estado] }}
          aria-hidden
        />
      </div>

      <p className="mt-1.5 truncate text-xs text-niebla">{ETIQUETA_ORIGEN[lead.origen]}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-niebla">
        {lead.centro && (
          <span className="flex min-w-0 items-center gap-1">
            <Building2 className="size-3 shrink-0" strokeWidth={1.5} aria-hidden />
            <span className="truncate">{lead.centro.nombre.replace("Ice Gym ", "")}</span>
          </span>
        )}
        {lead.telefono && (
          <span className="flex items-center gap-1">
            <Phone className="size-3 shrink-0" strokeWidth={1.5} aria-hidden />
            <span data-cifra>{lead.telefono.slice(-9)}</span>
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-acero pt-2.5">
        <span className="etiqueta text-[0.55rem]">
          {lead.tarifa ? lead.tarifa.nombre : "Sin tarifa"}
        </span>
        <span className="text-[0.65rem] text-niebla">{relativo(lead.updated_at)}</span>
      </div>
    </>
  );
}

function Tarjeta({ lead }: { lead: LeadConContexto }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { estado: lead.estado },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={isDragging ? "opacity-25" : ""}
    >
      <Link
        href={`/crm/leads/${lead.id}`}
        {...listeners}
        {...attributes}
        className="block cursor-grab border border-acero bg-carbon p-3 transition-colors hover:border-azul active:cursor-grabbing"
      >
        <Contenido lead={lead} />
      </Link>
    </li>
  );
}

/* -------------------------------- Columna ------------------------------- */

function Columna({ estado, leads }: { estado: EstadoLead; leads: LeadConContexto[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });

  return (
    <section
      ref={setNodeRef}
      className={`flex w-[258px] shrink-0 snap-start flex-col border transition-colors lg:w-auto ${
        isOver ? "border-azul bg-carbon" : "border-acero bg-negro"
      }`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-acero px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="size-2 shrink-0"
            style={{ backgroundColor: COLOR_LEAD[estado] }}
            aria-hidden
          />
          <h2 className="etiqueta truncate text-[0.6rem]">{ETIQUETA_LEAD[estado]}</h2>
        </span>
        <span className="cifra shrink-0 text-base text-hielo">{leads.length}</span>
      </header>

      <ul className="scroll-fino flex max-h-[62vh] min-h-[120px] flex-col gap-2 overflow-y-auto p-2">
        {leads.map((lead) => (
          <Tarjeta key={lead.id} lead={lead} />
        ))}

        {leads.length === 0 && (
          <li
            className={`grid min-h-[100px] place-items-center border border-dashed px-3 text-center text-[0.7rem] transition-colors ${
              isOver ? "border-azul text-azul" : "border-acero text-niebla/70"
            }`}
          >
            Suelta aquí
          </li>
        )}
      </ul>
    </section>
  );
}

/* -------------------------------- Tablero ------------------------------- */

export function Tablero({ leads }: { leads: LeadConContexto[] }) {
  const router = useRouter();
  const [items, setItems] = useState(leads);
  const [arrastrando, setArrastrando] = useState<LeadConContexto | null>(null);
  const [, empezar] = useTransition();

  useEffect(() => setItems(leads), [leads]);

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } })
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

    // Movimiento optimista: la tarjeta salta ya y el servidor confirma después.
    setItems((antes) =>
      antes.map((l) =>
        l.id === id ? { ...l, estado: destino, updated_at: new Date().toISOString() } : l
      )
    );

    empezar(async () => {
      const resultado = await moverLead(id, destino, previo);
      if (resultado.ok) {
        toast.success(`${lead.nombre} → ${ETIQUETA_LEAD[destino]}`);
        router.refresh();
      } else {
        setItems(instantanea);
        toast.error(resultado.mensaje);
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="p-4 lg:p-6">
        <div className="panel">
          <SinDatos
            titulo="Ningún lead todavía"
            texto="Cuando alguien pida su pase de prueba en la web, aparecerá aquí en la primera columna."
          />
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensores} onDragStart={alEmpezar} onDragEnd={alSoltar}>
      <div className="scroll-fino flex snap-x snap-mandatory gap-3 overflow-x-auto p-4 lg:grid lg:grid-cols-6 lg:overflow-visible lg:p-6">
        {ESTADOS_LEAD.map((estado) => (
          <Columna key={estado} estado={estado} leads={porEstado.get(estado) ?? []} />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {arrastrando ? (
          <div className="w-[250px] rotate-1 border border-azul bg-carbon p-3">
            <Contenido lead={arrastrando} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
