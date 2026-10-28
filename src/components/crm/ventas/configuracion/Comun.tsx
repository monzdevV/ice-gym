"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Resultado } from "@/app/crm/acciones/b2b";
import { COLORES_EQUIPO, tonoColor, type ColorEquipo } from "@/lib/b2b";

/** Piezas compartidas de Ajustes de ventas, Equipos y Clientes. */

export const NOMBRE_COLOR: Record<ColorEquipo, string> = {
  azul: "Azul",
  violeta: "Violeta",
  ambar: "Ámbar",
  rosa: "Rosa",
  verde: "Verde",
  gris: "Gris",
};

export const claseSecundario =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-linea px-4 text-sm font-medium text-tinta transition-colors hover:bg-placa-2 disabled:opacity-50";

export const claseIcono =
  "grid size-8 shrink-0 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta disabled:opacity-40";

export const clasePeligro =
  "inline-flex h-9 items-center gap-1.5 rounded-md bg-critico px-4 text-sm font-medium text-sobre-critico transition-[filter] hover:brightness-110 disabled:opacity-50";

export function Campo({ etiqueta, children, className = "" }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-[0.8125rem] font-medium text-tinta">{etiqueta}</span>
      {children}
    </label>
  );
}

/** Muestras de color de radio (teclado: flechas). */
export function SelectorColor({ valor, onCambio, nombre = "color" }: { valor: string; onCambio: (c: ColorEquipo) => void; nombre?: string }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[0.8125rem] font-medium text-tinta">Color</legend>
      <div className="flex flex-wrap gap-2">
        {COLORES_EQUIPO.map((c) => (
          <label key={c} className="cursor-pointer" title={NOMBRE_COLOR[c]}>
            <input type="radio" name={nombre} value={c} checked={valor === c} onChange={() => onCambio(c)} className="peer sr-only" />
            <span className="sr-only">{NOMBRE_COLOR[c]}</span>
            <span
              className="block size-7 rounded-full ring-offset-2 ring-offset-placa transition-shadow peer-checked:ring-2 peer-checked:ring-tinta peer-focus-visible:ring-2 peer-focus-visible:ring-acento"
              style={{ background: tonoColor(c) }}
              aria-hidden
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Ejecuta una acción del servidor con aviso y refresco: el patrón de todas las listas de Ajustes. */
export function useAccion() {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  function ejecutar(accion: () => Promise<Resultado>, alAcabar?: (r: Resultado) => void) {
    empezar(async () => {
      const r = await accion();
      if (r.ok) {
        toast.success(r.mensaje);
        alAcabar?.(r);
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }
  return { ejecutar, pendiente };
}

/** Botón de papelera con confirmación. */
export function BorrarConConfirmacion({
  titulo,
  descripcion,
  etiqueta,
  onBorrar,
  children,
}: {
  titulo: string;
  descripcion: string;
  /** Texto accesible del botón. */
  etiqueta: string;
  onBorrar: () => Promise<Resultado>;
  /** Contenido extra del diálogo (p. ej. a dónde pasan las oportunidades). */
  children?: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const { ejecutar, pendiente } = useAccion();
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={`${claseIcono} hover:text-critico`} aria-label={etiqueta} title={etiqueta}>
        <Trash className="size-4" aria-hidden />
      </button>
      <Dialog open={abierto} onOpenChange={(v) => !pendiente && setAbierto(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>{descripcion}</DialogDescription>
          </DialogHeader>
          {children}
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setAbierto(false)} disabled={pendiente} className={claseSecundario}>
              Cancelar
            </button>
            <button type="button" onClick={() => ejecutar(onBorrar, () => setAbierto(false))} disabled={pendiente} className={clasePeligro}>
              <Trash className="size-4" aria-hidden />
              {pendiente ? "Borrando…" : "Borrar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Diálogo de formulario de Ajustes (alta y edición). */
export function DialogoFormulario({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription className={descripcion ? "" : "sr-only"}>{descripcion ?? titulo}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
