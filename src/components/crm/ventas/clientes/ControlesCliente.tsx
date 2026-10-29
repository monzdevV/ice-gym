"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowCounterClockwise, CalendarPlus, NotePencil, Trash } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  archivarClienteVentas,
  borrarClienteVentas,
  borrarNotaVentas,
  registrarNotaVentas,
} from "@/app/crm/acciones/ventas";
import type { Miembro } from "@/lib/b2b";
import { fechaHora } from "@/lib/formato";
import {
  rutaVentas,
  type ActividadVentasCompleta,
  type MensajeVentas,
  type PlanActividad,
  type TipoActividadVentas,
} from "@/lib/ventas";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { DialogoActividad } from "@/components/crm/ventas/DialogoActividad";
import { ListaActividades } from "@/components/crm/ventas/ListaActividades";
import { clasePeligro, claseIcono, claseSecundario, useAccion } from "@/components/crm/ventas/configuracion/Comun";

const claseBoton =
  "inline-flex h-8 items-center gap-1.5 rounded-md bg-placa px-3 text-[0.8125rem] font-medium text-tinta shadow-placa transition-colors hover:bg-placa-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento disabled:opacity-50";

/** Archivar o restaurar, y borrar con confirmación (vuelve a la lista). */
export function AccionesCliente({ id, nombre, activo, nOportunidades }: { id: string; nombre: string; activo: boolean; nOportunidades: number }) {
  const router = useRouter();
  const { ejecutar, pendiente } = useAccion();
  const [borrando, setBorrando] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => ejecutar(() => archivarClienteVentas(id, activo))} disabled={pendiente} className={claseBoton}>
        {activo ? <Archive className="size-4" aria-hidden /> : <ArrowCounterClockwise className="size-4" aria-hidden />}
        {activo ? "Archivar" : "Restaurar"}
      </button>
      <button type="button" onClick={() => setBorrando(true)} className={`${claseBoton} px-2 text-critico`} aria-label="Borrar cliente" title="Borrar cliente">
        <Trash className="size-4" aria-hidden />
      </button>
      <Dialog open={borrando} onOpenChange={(v) => !pendiente && setBorrando(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Borrar {nombre}?</DialogTitle>
            <DialogDescription>
              Se borran su historial y sus actividades.{" "}
              {nOportunidades
                ? `Sus ${nOportunidades} ${nOportunidades === 1 ? "oportunidad se conserva" : "oportunidades se conservan"}, sin cliente. `
                : ""}
              Si sólo quieres ocultarlo, archívalo. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setBorrando(false)} disabled={pendiente} className={claseSecundario}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => ejecutar(() => borrarClienteVentas(id), () => router.push(rutaVentas.clientes))}
              disabled={pendiente}
              className={clasePeligro}
            >
              <Trash className="size-4" aria-hidden />
              {pendiente ? "Borrando…" : "Borrar cliente"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ETIQUETA_MENSAJE = { nota: "Nota", sistema: "Cambio", actividad: "Actividad hecha" } as const;

/**
 * Historial del cliente, como el chatter del CRM de ventas: registrar una nota,
 * planificar actividades, las pendientes y todo lo que ha pasado.
 */
export function ChatterCliente({
  clienteId,
  pendientes,
  mensajes,
  tipos,
  planes,
  comerciales,
  asignado,
}: {
  clienteId: string;
  pendientes: ActividadVentasCompleta[];
  mensajes: MensajeVentas[];
  tipos: TipoActividadVentas[];
  planes: PlanActividad[];
  comerciales: Miembro[];
  asignado: string | null;
}) {
  const { ejecutar, pendiente } = useAccion();
  const [escribiendo, setEscribiendo] = useState(false);
  const [nota, setNota] = useState("");
  const [planificando, setPlanificando] = useState(false);

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl bg-placa p-5 shadow-placa" aria-labelledby="historial-cliente">
      <h2 id="historial-cliente" className="sr-only">
        Historial y actividades
      </h2>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setEscribiendo((v) => !v)} aria-expanded={escribiendo} className={claseBoton}>
          <NotePencil className="size-4" aria-hidden />
          Registrar una nota
        </button>
        <button type="button" onClick={() => setPlanificando(true)} className={claseBoton} disabled={!tipos.length}>
          <CalendarPlus className="size-4" aria-hidden />
          Planificar actividad
        </button>
      </div>

      {escribiendo && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar(
              () => registrarNotaVentas({ cliente: clienteId }, nota),
              () => {
                setNota("");
                setEscribiendo(false);
              }
            );
          }}
          className="flex flex-col gap-2"
        >
          <label>
            <span className="sr-only">Nota</span>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              maxLength={10000}
              autoFocus
              placeholder="Registra una nota interna…"
              className={`${claseCampo} h-auto py-2`}
            />
          </label>
          <button type="submit" disabled={pendiente || !nota.trim()} className={`${claseBotonPrincipal} self-start`}>
            Registrar
          </button>
        </form>
      )}

      {pendientes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-tinta-2">Actividades planificadas</h3>
          <ListaActividades actividades={pendientes} tipos={tipos} planes={planes} comerciales={comerciales} />
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-tinta-2">Historial</h3>
        {mensajes.length === 0 ? (
          <p className="text-sm text-tinta-2">Todavía no hay nada. Las notas y las actividades hechas aparecen aquí.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {mensajes.map((m) => (
              <li key={m.id} className="group flex gap-3">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${m.tipo === "nota" ? "bg-acento" : m.tipo === "actividad" ? "bg-exito" : "bg-apagado"}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-tinta-2">
                    <span className="font-medium text-tinta">{m.autor?.split("@")[0] ?? "Sistema"}</span>
                    <span>{ETIQUETA_MENSAJE[m.tipo]}</span>
                    <time dateTime={m.created_at}>{fechaHora(m.created_at)}</time>
                  </p>
                  <p className={`mt-0.5 whitespace-pre-line text-sm leading-relaxed ${m.tipo === "nota" ? "rounded-lg bg-placa-2 px-3 py-2 text-tinta" : "text-tinta"}`}>
                    {m.cuerpo}
                  </p>
                </div>
                {m.tipo === "nota" && (
                  <button
                    type="button"
                    onClick={() => ejecutar(() => borrarNotaVentas(m.id))}
                    disabled={pendiente}
                    className={`${claseIcono} opacity-0 transition-opacity hover:text-critico focus-visible:opacity-100 group-hover:opacity-100`}
                    aria-label="Borrar nota"
                    title="Borrar nota"
                  >
                    <Trash className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <DialogoActividad
        abierto={planificando}
        onCerrar={() => setPlanificando(false)}
        donde={{ cliente: clienteId }}
        tipos={tipos}
        planes={planes}
        comerciales={comerciales}
        asignado={asignado}
      />
    </section>
  );
}
