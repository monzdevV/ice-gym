"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, PencilSimple, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cancelarActividadVentas, hechaYSiguiente, marcarActividadHecha } from "@/app/crm/acciones/ventas";
import type { Miembro } from "@/lib/b2b";
import {
  ETIQUETA_PLAZO,
  TONO_PLAZO,
  hoyISO,
  plazoDe,
  rutaVentas,
  textoPlazo,
  type ActividadVentasCompleta,
  type PlanActividad,
  type TipoActividadVentas,
} from "@/lib/ventas";
import { Responsable } from "@/components/crm/b2b/Piezas";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { DialogoActividad } from "./DialogoActividad";
import { IconoActividad } from "./Piezas";

const claseIcono =
  "grid size-7 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta disabled:opacity-50";

/** «Marcar como hecho» con comentario opcional, y la opción de dejar planificada la siguiente. */
function MarcarHecha({ a }: { a: ActividadVentasCompleta }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [comentario, setComentario] = useState("");
  const [pendiente, empezar] = useTransition();

  function hacer(siguiente: boolean) {
    empezar(async () => {
      const r = siguiente ? await hechaYSiguiente(a.id, comentario) : await marcarActividadHecha(a.id, comentario);
      if (r.ok) {
        toast.success(siguiente ? "Hecha. La siguiente queda planificada." : "Actividad hecha.");
        setAbierto(false);
        setComentario("");
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button type="button" className={claseIcono} aria-label={`Marcar como hecha: ${a.resumen ?? a.tipo?.nombre ?? "actividad"}`} title="Marcar como hecho">
          <Check className="size-4" weight="bold" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-72 flex-col gap-2 p-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.8125rem] font-medium text-tinta">Comentario</span>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            maxLength={5000}
            autoFocus
            placeholder="Cómo ha ido (opcional)"
            className={`${claseCampo} h-auto py-2`}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => hacer(false)} disabled={pendiente} className={claseBotonPrincipal}>
            Hecho
          </button>
          <button
            type="button"
            onClick={() => hacer(true)}
            disabled={pendiente}
            className="h-9 rounded-md border border-linea px-3 text-sm font-medium text-tinta hover:bg-placa-2 disabled:opacity-50"
          >
            Hecho y planificar siguiente
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Actividades pendientes, de la más urgente a la última: plazo en color (con
 * texto), tipo, resumen, responsable y nota. Hecha, editar o cancelar en cada fila.
 */
export function ListaActividades({
  actividades,
  tipos,
  planes = [],
  comerciales,
  conOrigen = false,
}: {
  actividades: ActividadVentasCompleta[];
  tipos: TipoActividadVentas[];
  planes?: PlanActividad[];
  comerciales: Miembro[];
  /** Muestra la oportunidad o el cliente de cada actividad (listas que mezclan varias). */
  conOrigen?: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<ActividadVentasCompleta | null>(null);
  const [pendiente, empezar] = useTransition();
  const hoy = hoyISO();

  function cancelar(a: ActividadVentasCompleta) {
    empezar(async () => {
      const r = await cancelarActividadVentas(a.id);
      if (r.ok) {
        toast.success(r.mensaje);
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  return (
    <>
      <ul className="flex flex-col divide-y divide-linea/70">
        {actividades.map((a) => {
          const plazo = plazoDe(a.vence, hoy);
          return (
            <li key={a.id} className="flex items-start gap-3 py-2.5">
              <IconoActividad icono={a.tipo?.icono} plazo={plazo} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-semibold" style={{ color: TONO_PLAZO[plazo] }}>
                    {textoPlazo(a.vence, hoy)}
                    <span className="sr-only"> ({ETIQUETA_PLAZO[plazo]})</span>
                  </span>
                  <span className="font-medium text-tinta">{a.resumen || a.tipo?.nombre || "Actividad"}</span>
                  {a.resumen && a.tipo && <span className="text-xs text-tinta-2">{a.tipo.nombre}</span>}
                </p>
                {conOrigen && (a.oportunidad || a.cliente) && (
                  <p className="mt-0.5 truncate text-xs">
                    {a.oportunidad ? (
                      <Link href={rutaVentas.oportunidad(a.oportunidad.id)} className="text-acento-tinta underline-offset-4 hover:underline">
                        {a.oportunidad.nombre}
                      </Link>
                    ) : (
                      a.cliente && (
                        <Link href={rutaVentas.cliente(a.cliente.id)} className="text-acento-tinta underline-offset-4 hover:underline">
                          {a.cliente.nombre}
                        </Link>
                      )
                    )}
                  </p>
                )}
                {a.nota && <p className="mt-1 whitespace-pre-line text-[0.8125rem] leading-relaxed text-tinta-2">{a.nota}</p>}
              </div>
              <span className="mt-0.5 shrink-0">
                <Responsable m={a.asignado} soloAvatar />
              </span>
              <span className="flex shrink-0 items-center">
                <MarcarHecha a={a} />
                <button type="button" onClick={() => setEditando(a)} className={claseIcono} aria-label="Editar actividad" title="Editar">
                  <PencilSimple className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => cancelar(a)}
                  disabled={pendiente}
                  className={`${claseIcono} hover:text-critico`}
                  aria-label="Cancelar actividad"
                  title="Cancelar"
                >
                  <X className="size-4" weight="bold" aria-hidden />
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <DialogoActividad
        abierto={!!editando}
        onCerrar={() => setEditando(null)}
        donde={{ oportunidad: editando?.oportunidad_id ?? undefined, cliente: editando?.cliente_id ?? undefined }}
        actividad={editando}
        tipos={tipos}
        planes={planes}
        comerciales={comerciales}
      />
    </>
  );
}
