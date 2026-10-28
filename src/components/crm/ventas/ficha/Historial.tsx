"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise, CheckCircle, NotePencil, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { borrarNotaVentas, registrarNotaVentas } from "@/app/crm/acciones/ventas";
import type { CatalogosVentas } from "@/lib/datos/ventas";
import type { ActividadVentasCompleta, MensajeVentas, TipoMensaje } from "@/lib/ventas";
import { hora } from "@/lib/formato";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { claveDia, etiquetaDia } from "@/components/crm/actividad/utiles";
import { DialogoActividad } from "@/components/crm/ventas/DialogoActividad";
import { ListaActividades } from "@/components/crm/ventas/ListaActividades";

const boton =
  "inline-flex h-8 items-center rounded-md border border-linea bg-placa px-3 text-[0.8125rem] font-medium text-tinta transition-colors hover:bg-placa-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";
const botonActivo = "border-acento bg-acento-suave text-tinta";

const ICONO_MENSAJE: Record<TipoMensaje, typeof NotePencil> = {
  nota: NotePencil,
  sistema: ArrowsClockwise,
  actividad: CheckCircle,
};

const autorDe = (email: string | null) => (email ? email.split("@")[0] : "Sistema");

/**
 * Columna de seguimiento de la ficha: escribir, anotar y planificar arriba;
 * lo planificado; y debajo, todo lo que ha pasado, por días.
 */
export function Historial({
  oportunidad,
  email,
  comercial,
  pendientes,
  mensajes,
  catalogos,
}: {
  oportunidad: string;
  email: string | null;
  comercial: string | null;
  pendientes: ActividadVentasCompleta[];
  mensajes: MensajeVentas[];
  catalogos: CatalogosVentas;
}) {
  const router = useRouter();
  const [componiendo, setComponiendo] = useState(false);
  const [nota, setNota] = useState("");
  const [planificar, setPlanificar] = useState(false);
  const [borrar, setBorrar] = useState<MensajeVentas | null>(null);
  const [pendiente, empezar] = useTransition();

  function guardarNota(e: React.FormEvent) {
    e.preventDefault();
    empezar(async () => {
      const r = await registrarNotaVentas({ oportunidad }, nota);
      if (!r.ok) return void toast.error(r.mensaje);
      toast.success(r.mensaje);
      setNota("");
      setComponiendo(false);
      router.refresh();
    });
  }

  function confirmarBorrado() {
    if (!borrar) return;
    empezar(async () => {
      const r = await borrarNotaVentas(borrar.id);
      if (!r.ok) return void toast.error(r.mensaje);
      toast.success(r.mensaje);
      setBorrar(null);
      router.refresh();
    });
  }

  const dias: { clave: string; items: MensajeVentas[] }[] = [];
  for (const m of mensajes) {
    const clave = claveDia(m.created_at);
    const ultimo = dias[dias.length - 1];
    if (ultimo?.clave === clave) ultimo.items.push(m);
    else dias.push({ clave, items: [m] });
  }

  return (
    <section aria-label="Seguimiento" className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {email ? (
          <a href={`mailto:${email}`} className={boton}>
            Enviar mensaje
          </a>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} aria-disabled className={boton}>
                Enviar mensaje
              </span>
            </TooltipTrigger>
            <TooltipContent>Pon un correo electrónico en la oportunidad</TooltipContent>
          </Tooltip>
        )}
        <button type="button" onClick={() => setComponiendo((c) => !c)} aria-expanded={componiendo} className={`${boton} ${componiendo ? botonActivo : ""}`}>
          Registrar una nota
        </button>
        <button type="button" onClick={() => setPlanificar(true)} className={boton}>
          Actividad
        </button>
      </div>

      {componiendo && (
        <form onSubmit={guardarNota} className="flex flex-col gap-2">
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            maxLength={10_000}
            autoFocus
            aria-label="Nota interna"
            placeholder="Nota interna: sólo la ve el equipo"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
            }}
            className={`${claseCampo} h-auto py-2`}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={pendiente || !nota.trim()} className={claseBotonPrincipal}>
              {pendiente ? "Guardando…" : "Registrar"}
            </button>
            <button type="button" onClick={() => setComponiendo(false)} className={boton}>
              Descartar
            </button>
          </div>
        </form>
      )}

      <div id="actividades" className="scroll-mt-20">
        <h2 className="mb-1 text-sm font-semibold text-tinta">
          Actividades planificadas{pendientes.length > 0 && <span className="ml-1.5 font-normal text-tinta-2">{pendientes.length}</span>}
        </h2>
        {pendientes.length ? (
          <ListaActividades actividades={pendientes} tipos={catalogos.tipos} planes={catalogos.planes} comerciales={catalogos.comerciales} />
        ) : (
          <p className="py-2 text-sm text-tinta-2">Nada planificado. Una llamada o una reunión con fecha evita que se enfríe.</p>
        )}
      </div>

      <ol className="flex flex-col gap-5" aria-label="Historial">
        {dias.map((d) => (
          <li key={d.clave}>
            <p className="mb-3 flex items-center gap-3 text-xs font-medium text-tinta-2">
              <span className="h-px flex-1 bg-linea" aria-hidden />
              {etiquetaDia(d.clave)}
              <span className="h-px flex-1 bg-linea" aria-hidden />
            </p>
            <ul className="flex flex-col gap-4">
              {d.items.map((m) => {
                const Icono = ICONO_MENSAJE[m.tipo];
                return (
                  <li key={m.id} className="group flex gap-3">
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-full ${m.tipo === "nota" ? "bg-acento-suave text-acento-tinta" : m.tipo === "actividad" ? "bg-exito-suave text-exito" : "bg-placa-2 text-tinta-2"}`}
                      aria-hidden
                    >
                      <Icono className="size-4" weight="bold" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2 text-[0.8125rem]">
                        <span className="font-semibold text-tinta">{autorDe(m.autor)}</span>
                        <span className="text-xs tabular-nums text-tinta-2">{hora(m.created_at)}</span>
                        {m.tipo === "nota" && <span className="text-xs text-tinta-2">· nota</span>}
                      </p>
                      <p className={`mt-0.5 whitespace-pre-line text-sm leading-relaxed ${m.tipo === "sistema" ? "text-tinta-2" : "text-tinta"}`}>{m.cuerpo}</p>
                    </div>
                    {m.tipo === "nota" && (
                      <button
                        type="button"
                        onClick={() => setBorrar(m)}
                        className="grid size-7 shrink-0 place-items-center rounded-md text-tinta-2 opacity-0 transition-opacity hover:bg-placa-2 hover:text-critico focus-visible:opacity-100 group-hover:opacity-100"
                        aria-label="Borrar nota"
                      >
                        <Trash className="size-4" aria-hidden />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      <DialogoActividad
        abierto={planificar}
        onCerrar={() => setPlanificar(false)}
        donde={{ oportunidad }}
        tipos={catalogos.tipos}
        planes={catalogos.planes}
        comerciales={catalogos.comerciales}
        asignado={comercial ?? catalogos.yo}
      />

      <Dialog open={!!borrar} onOpenChange={(v) => !v && !pendiente && setBorrar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Borrar la nota?</DialogTitle>
            <DialogDescription className="line-clamp-3 whitespace-pre-line">{borrar?.cuerpo}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setBorrar(null)} disabled={pendiente} className={boton}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarBorrado}
              disabled={pendiente}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-critico px-4 text-sm font-semibold text-sobre-campo hover:bg-critico/90 disabled:opacity-50"
            >
              {pendiente ? "Borrando…" : "Borrar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
