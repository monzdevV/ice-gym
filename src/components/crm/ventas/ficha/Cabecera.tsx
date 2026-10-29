"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowCounterClockwise,
  CalendarCheck,
  CaretLeft,
  CaretRight,
  Copy,
  DotsThree,
  DotsThreeVertical,
  EnvelopeSimple,
  Trash,
  Trophy,
  UsersThree,
  XCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  archivarOportunidadVentas,
  borrarOportunidadVentas,
  duplicarOportunidadVentas,
  marcarGanadaVentas,
  moverOportunidadVentas,
  restaurarOportunidadVentas,
} from "@/app/crm/acciones/ventas";
import type { Resultado } from "@/app/crm/acciones/b2b";
import { rutaVentas, type EtapaVentas, type MotivoPerdida, type OportunidadVentasCompleta } from "@/lib/ventas";
import { claseBotonPrincipal } from "@/components/crm/Primitivas";
import { DialogoPerdida } from "@/components/crm/ventas/DialogoPerdida";
import { SenalEstadoVenta } from "@/components/crm/ventas/Piezas";

const botonSec =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-linea bg-placa px-3 text-sm font-medium text-tinta transition-colors hover:bg-placa-2 disabled:opacity-50";
const botonIcono =
  "grid size-8 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta aria-disabled:pointer-events-none aria-disabled:opacity-40";

export type Paginador = { posicion: number; total: number; anterior: string | null; siguiente: string | null };

/** Ejecuta una acción del servidor con aviso y refresco. Devuelve el resultado para encadenar. */
function useAccion() {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  function lanzar(accion: () => Promise<Resultado>, despues?: (r: Resultado) => void) {
    empezar(async () => {
      const r = await accion();
      if (!r.ok) return void toast.error(r.mensaje);
      toast.success(r.mensaje);
      if (despues) despues(r);
      else router.refresh();
    });
  }
  return { lanzar, pendiente, router };
}

/** Migas, paginador y el menú ⋮ de la ficha. */
export function BarraFicha({
  o,
  paginador,
  motivos,
}: {
  o: OportunidadVentasCompleta;
  paginador: Paginador | null;
  motivos: MotivoPerdida[];
}) {
  const { lanzar, pendiente, router } = useAccion();
  const [borrar, setBorrar] = useState(false);
  const [perdida, setPerdida] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <nav aria-label="Migas" className="flex min-w-0 flex-1 items-center gap-1.5 text-[0.8125rem]">
        <Link href={rutaVentas.flujo} className="shrink-0 text-acento-tinta underline-offset-4 hover:underline">
          Flujo
        </Link>
        <span className="text-tinta-2" aria-hidden>
          /
        </span>
        <span className="truncate text-tinta" aria-current="page">
          {o.nombre}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={botonIcono} aria-label="Más acciones" disabled={pendiente}>
              <DotsThreeVertical className="size-[18px]" weight="bold" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onSelect={() => lanzar(() => duplicarOportunidadVentas(o.id), (r) => r.id && router.push(rutaVentas.oportunidad(r.id)))}>
              <Copy aria-hidden />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => lanzar(() => archivarOportunidadVentas(o.id, o.activa))}>
              <Archive aria-hidden />
              {o.activa ? "Archivar" : "Desarchivar"}
            </DropdownMenuItem>
            {o.estado !== "perdida" && (
              <DropdownMenuItem onSelect={() => setPerdida(true)}>
                <XCircle aria-hidden />
                Marcar como perdido
              </DropdownMenuItem>
            )}
            <DropdownMenuItem disabled={!o.email} asChild>
              <a href={o.email ? `mailto:${o.email}` : undefined}>
                <EnvelopeSimple aria-hidden />
                Enviar correo
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setBorrar(true)}>
              <Trash aria-hidden />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {paginador && paginador.total > 0 && (
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="mr-1 text-[0.8125rem] tabular-nums text-tinta-2">
            {paginador.posicion} / {paginador.total}
            <span className="sr-only"> oportunidades del flujo</span>
          </span>
          {/* En los extremos, sin enlace: un href="#" con aria-disabled seguía navegando con Intro. */}
          {paginador.anterior ? (
            <Link href={rutaVentas.oportunidad(paginador.anterior)} className={botonIcono} aria-label="Oportunidad anterior">
              <CaretLeft className="size-4" weight="bold" aria-hidden />
            </Link>
          ) : (
            <span className={botonIcono} aria-hidden>
              <CaretLeft className="size-4 opacity-40" weight="bold" />
            </span>
          )}
          {paginador.siguiente ? (
            <Link href={rutaVentas.oportunidad(paginador.siguiente)} className={botonIcono} aria-label="Oportunidad siguiente">
              <CaretRight className="size-4" weight="bold" aria-hidden />
            </Link>
          ) : (
            <span className={botonIcono} aria-hidden>
              <CaretRight className="size-4 opacity-40" weight="bold" />
            </span>
          )}
        </div>
      )}

      <Dialog open={borrar} onOpenChange={(v) => !pendiente && setBorrar(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar la oportunidad?</DialogTitle>
            <DialogDescription>
              {o.nombre}. Se borran también su historial y sus actividades. Si sólo quieres quitarla de en medio, archívala.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setBorrar(false)} disabled={pendiente} className={botonSec}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() => lanzar(() => borrarOportunidadVentas(o.id), () => router.replace(rutaVentas.flujo))}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-critico px-4 text-sm font-semibold text-sobre-critico transition-[background-color,transform] hover:bg-critico/90 active:scale-[0.97] disabled:opacity-50"
            >
              {pendiente ? "Eliminando…" : "Eliminar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogoPerdida ids={perdida ? [o.id] : []} titulo={o.nombre} motivos={motivos} onCerrar={() => setPerdida(false)} />
    </div>
  );
}

/** Ganado / Perdido mientras está en curso; el estado y «Restaurar» cuando ya se ha cerrado. */
export function BotonesEstado({ o, motivos }: { o: OportunidadVentasCompleta; motivos: MotivoPerdida[] }) {
  const { lanzar, pendiente } = useAccion();
  const [perdida, setPerdida] = useState(false);

  if (o.estado !== "abierta") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <SenalEstadoVenta estado={o.estado} />
        {!o.activa && <span className="text-xs font-medium text-tinta-2">Archivada</span>}
        <button type="button" onClick={() => lanzar(() => restaurarOportunidadVentas(o.id))} disabled={pendiente} className={botonSec}>
          <ArrowCounterClockwise className="size-4" aria-hidden />
          Restaurar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => lanzar(() => marcarGanadaVentas(o.id))} disabled={pendiente} className={claseBotonPrincipal}>
        <Trophy className="size-4" weight="fill" aria-hidden />
        Ganado
      </button>
      <button type="button" onClick={() => setPerdida(true)} disabled={pendiente} className={botonSec}>
        <XCircle className="size-4" aria-hidden />
        Perdido
      </button>
      {!o.activa && <span className="text-xs font-medium text-tinta-2">Archivada</span>}
      <DialogoPerdida ids={perdida ? [o.id] : []} titulo={o.nombre} motivos={motivos} onCerrar={() => setPerdida(false)} />
    </div>
  );
}

/**
 * Barra de etapas: la actual resaltada con el tiempo que lleva en ella; las
 * plegadas se reúnen en «…». Pulsar una etapa mueve la oportunidad.
 */
export function BarraEtapas({ o, etapas, tiempo }: { o: OportunidadVentasCompleta; etapas: EtapaVentas[]; tiempo: string }) {
  const { lanzar, pendiente } = useAccion();
  const visibles = etapas.filter((e) => !e.plegada || e.id === o.etapa_id);
  const plegadas = etapas.filter((e) => e.plegada && e.id !== o.etapa_id);
  const indiceActual = visibles.findIndex((e) => e.id === o.etapa_id);

  function mover(e: EtapaVentas) {
    if (e.id !== o.etapa_id) lanzar(() => moverOportunidadVentas(o.id, e.id));
  }

  function teclas(ev: React.KeyboardEvent, i: number) {
    const paso = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : 0;
    if (!paso) return;
    ev.preventDefault();
    const botones = ev.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[role=radio]");
    botones?.[(i + paso + visibles.length) % visibles.length]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Etapa"
      className={`flex max-w-full items-stretch overflow-x-auto rounded-lg bg-placa-2 p-0.5 ${pendiente ? "opacity-70" : ""}`}
    >
      {visibles.map((e, i) => {
        const actual = e.id === o.etapa_id;
        const pasada = indiceActual >= 0 && i < indiceActual;
        const boton = (
          <button
            key={e.id}
            type="button"
            role="radio"
            aria-checked={actual}
            tabIndex={actual || (indiceActual < 0 && i === 0) ? 0 : -1}
            disabled={pendiente}
            onKeyDown={(ev) => teclas(ev, i)}
            onClick={() => mover(e)}
            className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[0.8125rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta ${
              actual ? "bg-acento text-sobre-campo shadow-placa" : pasada ? "text-tinta hover:bg-placa" : "text-tinta-2 hover:bg-placa hover:text-tinta"
            }`}
          >
            {e.nombre}
            {actual && <span className="text-xs font-normal">{tiempo}<span className="sr-only"> en esta etapa</span></span>}
          </button>
        );
        return e.requisitos ? (
          <Tooltip key={e.id}>
            <TooltipTrigger asChild>{boton}</TooltipTrigger>
            <TooltipContent side="bottom">{e.requisitos}</TooltipContent>
          </Tooltip>
        ) : (
          boton
        );
      })}
      {plegadas.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="grid h-8 shrink-0 place-items-center rounded-md px-2 text-tinta-2 hover:bg-placa hover:text-tinta" aria-label="Etapas plegadas">
              <DotsThree className="size-5" weight="bold" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {plegadas.map((e) => (
              <DropdownMenuItem key={e.id} onSelect={() => mover(e)}>
                {e.nombre}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/** Botones de resumen: reuniones y actividades pendientes; llevan al historial. */
export function BotonesResumen({ reuniones, pendientes }: { reuniones: number; pendientes: number }) {
  const clase = "inline-flex h-9 items-center gap-2 rounded-lg bg-placa px-3 text-sm shadow-placa transition-colors hover:bg-placa-2";
  return (
    <div className="flex flex-wrap gap-2">
      <a href="#actividades" className={clase}>
        <UsersThree className="size-[18px] text-tinta-2" aria-hidden />
        <span className="text-tinta">{reuniones === 0 ? "Sin reuniones" : `${reuniones} ${reuniones === 1 ? "reunión" : "reuniones"}`}</span>
      </a>
      <a href="#actividades" className={clase}>
        <CalendarCheck className="size-[18px] text-tinta-2" aria-hidden />
        <span className="cifra text-base text-tinta">{pendientes}</span>
        <span className="text-tinta-2">{pendientes === 1 ? "actividad" : "actividades"}</span>
      </a>
    </div>
  );
}
