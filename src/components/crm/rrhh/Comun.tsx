"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { DotsThree, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { claseBotonPrincipal, claseError } from "@/components/crm/Primitivas";
import type { Resultado } from "@/app/crm/acciones/b2b";

/** Piezas cliente comunes de RRHH: el mismo Dialog de alta, confirmación de borrado y menú «…» del CRM. */

function Enviar({ texto, pendienteTexto }: { texto: string; pendienteTexto: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={claseBotonPrincipal}>
      {pending ? pendienteTexto : texto}
    </button>
  );
}

/**
 * Formulario en Dialog conectado a una server action. Al guardar bien: aviso,
 * cierre y refresco. `children` recibe el estado para pintar los campos.
 */
export function DialogoFormulario({
  disparador,
  titulo,
  descripcion,
  accion,
  textoEnviar,
  textoPendiente = "Guardando…",
  ancho = "sm:max-w-lg",
  abierto: abiertoExterno,
  onAbierto,
  children,
}: {
  disparador?: ReactNode;
  titulo: string;
  descripcion?: string;
  accion: (prev: Resultado | null, fd: FormData) => Promise<Resultado>;
  textoEnviar: string;
  textoPendiente?: string;
  ancho?: string;
  abierto?: boolean;
  onAbierto?: (v: boolean) => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const [abiertoPropio, setAbiertoPropio] = useState(false);
  const abierto = abiertoExterno ?? abiertoPropio;
  const [vez, setVez] = useState(0);
  const setAbierto = (v: boolean) => {
    if (v) setVez((n) => n + 1);
    if (onAbierto) onAbierto(v);
    else setAbiertoPropio(v);
  };
  const [estado, enviar] = useActionState(async (prev: Resultado | null, fd: FormData) => {
    const r = await accion(prev, fd);
    if (r.ok) {
      toast.success(r.mensaje);
      setAbierto(false);
      router.refresh();
    }
    return r;
  }, null);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      {disparador && <DialogTrigger asChild>{disparador}</DialogTrigger>}
      <DialogContent className={`max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 ${ancho}`}>
        <DialogHeader className="border-b border-linea px-5 py-4">
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        <form key={vez} action={enviar} className="flex flex-col gap-4 px-5 py-4">
          {children}
          {estado?.ok === false && (
            <p role="alert" className={claseError}>
              {estado.mensaje}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="inline-flex h-9 items-center rounded-md border border-linea px-4 text-sm font-medium text-tinta hover:bg-placa-2"
            >
              Cancelar
            </button>
            <Enviar texto={textoEnviar} pendienteTexto={textoPendiente} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Confirmación de borrado, igual que «Borrar contacto». */
export function ConfirmarBorrado({
  abierto,
  onAbierto,
  titulo,
  texto,
  borrar,
  alTerminar,
}: {
  abierto: boolean;
  onAbierto: (v: boolean) => void;
  titulo: string;
  texto: string;
  borrar: () => Promise<Resultado>;
  alTerminar?: () => void;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  function confirmar() {
    empezar(async () => {
      const r = await borrar();
      if (r.ok) {
        toast.success(r.mensaje);
        onAbierto(false);
        alTerminar?.();
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }
  return (
    <Dialog open={abierto} onOpenChange={onAbierto}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{texto}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onAbierto(false)}
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-tinta-2 hover:bg-placa-2 hover:text-tinta"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={pendiente}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-alarma px-4 text-sm font-medium text-white shadow-sm transition-[filter] hover:brightness-110 disabled:opacity-50"
          >
            <Trash className="size-4" aria-hidden />
            {pendiente ? "Borrando…" : "Borrar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type AccionMenu = { texto: string; Icono: React.ElementType; onSelect: () => void; peligro?: boolean };

/** Menú «…» de una fila. */
export function MenuFila({ acciones, etiqueta = "Acciones" }: { acciones: AccionMenu[]; etiqueta?: string }) {
  const normales = acciones.filter((a) => !a.peligro);
  const peligrosas = acciones.filter((a) => a.peligro);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={etiqueta}
          className="grid size-8 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta data-[state=open]:bg-placa-2"
        >
          <DotsThree className="size-5" weight="bold" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {normales.map(({ texto, Icono, onSelect }) => (
          <DropdownMenuItem key={texto} onSelect={onSelect}>
            <Icono className="size-4" aria-hidden /> {texto}
          </DropdownMenuItem>
        ))}
        {normales.length > 0 && peligrosas.length > 0 && <DropdownMenuSeparator />}
        {peligrosas.map(({ texto, Icono, onSelect }) => (
          <DropdownMenuItem key={texto} variant="destructive" onSelect={onSelect}>
            <Icono className="size-4" aria-hidden /> {texto}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Etiqueta + control, como el `Campo` de los formularios del CRM. */
export function CampoRrhh({ etiqueta, children, className = "", ayuda }: { etiqueta: string; children: ReactNode; className?: string; ayuda?: ReactNode }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-[0.8125rem] font-medium text-tinta">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-xs text-tinta-2">{ayuda}</span>}
    </label>
  );
}
