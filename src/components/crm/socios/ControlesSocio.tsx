"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, PauseCircle, PlayCircle, UserX } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cambiarEstadoSocio, guardarNotasSocio, marcarPagado } from "@/app/crm/acciones/socios";
import { ESTADO_INICIAL } from "@/lib/acciones";
import type { EstadoSocio } from "@/lib/tipos";

/* ----------------------- Congelar, reactivar, baja ---------------------- */

type Operacion = "congelar" | "reactivar" | "baja";

const TEXTOS: Record<Operacion, { boton: string; titulo: string; cuerpo: string; confirmar: string }> = {
  congelar: {
    boton: "Congelar",
    titulo: "Congelar la cuota",
    cuerpo: "El socio no podrá entrar ni se le emitirán cuotas hasta que lo reactives.",
    confirmar: "Congelar",
  },
  reactivar: {
    boton: "Reactivar",
    titulo: "Reactivar al socio",
    cuerpo: "Vuelve a tener acceso a los centros y se le emitirá la cuota del próximo mes.",
    confirmar: "Reactivar",
  },
  baja: {
    boton: "Dar de baja",
    titulo: "Dar de baja",
    cuerpo: "Se cierra su ficha con fecha de hoy. Conservamos el historial de pagos y accesos.",
    confirmar: "Dar de baja",
  },
};

function BotonConfirmar({ texto, peligro }: { texto: string; peligro: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`titular h-10 px-5 text-sm transition-colors disabled:opacity-50 ${
        peligro ? "bg-bengala text-negro hover:bg-hielo" : "bg-azul text-negro hover:bg-hielo"
      }`}
    >
      {pending ? "Guardando" : texto}
    </button>
  );
}

function AccionConConfirmacion({ id, operacion }: { id: string; operacion: Operacion }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion] = useActionState(cambiarEstadoSocio, ESTADO_INICIAL);
  const t = TEXTOS[operacion];
  const peligro = operacion === "baja";
  const Icono = operacion === "congelar" ? PauseCircle : operacion === "reactivar" ? PlayCircle : UserX;

  useEffect(() => {
    if (estado.ok) {
      toast.success(estado.mensaje);
      setAbierto(false);
    } else if (estado.ok === false) {
      toast.error(estado.mensaje);
    }
  }, [estado]);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`etiqueta flex h-10 items-center gap-2 border px-3 text-[0.6rem] transition-colors ${
            peligro
              ? "border-acero text-niebla hover:border-bengala hover:text-bengala"
              : "border-acero text-niebla hover:border-azul hover:text-azul"
          }`}
        >
          <Icono className="size-4" strokeWidth={1.5} aria-hidden />
          {t.boton}
        </button>
      </DialogTrigger>

      <DialogContent className="border-acero bg-carbon sm:max-w-md">
        <form action={accion}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="operacion" value={operacion} />

          <DialogHeader>
            <DialogTitle className="titular text-2xl text-hielo">{t.titulo}</DialogTitle>
            <DialogDescription className="text-niebla">{t.cuerpo}</DialogDescription>
          </DialogHeader>

          <label htmlFor={`motivo-${operacion}`} className="etiqueta mb-2 mt-5 block">
            Motivo (opcional)
          </label>
          <input
            id={`motivo-${operacion}`}
            name="motivo"
            maxLength={200}
            placeholder={peligro ? "Se muda de ciudad" : "Lesión de rodilla, un mes"}
            className="h-10 w-full border border-acero bg-grafito px-3 text-sm text-hielo outline-none placeholder:text-niebla focus:border-azul"
          />

          <DialogFooter className="mt-6 gap-2">
            <DialogClose asChild>
              <button
                type="button"
                className="etiqueta h-10 border border-acero px-4 text-[0.6rem] text-niebla hover:text-hielo"
              >
                Cancelar
              </button>
            </DialogClose>
            <BotonConfirmar texto={t.confirmar} peligro={peligro} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccionesSocio({ id, estado }: { id: string; estado: EstadoSocio }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(estado === "activo" || estado === "impago") && <AccionConConfirmacion id={id} operacion="congelar" />}
      {(estado === "congelado" || estado === "baja") && <AccionConConfirmacion id={id} operacion="reactivar" />}
      {estado !== "baja" && <AccionConConfirmacion id={id} operacion="baja" />}
    </div>
  );
}

/* --------------------------------- Notas -------------------------------- */

function BotonNotas() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="etiqueta border border-acero px-3 py-2 text-[0.6rem] text-niebla transition-colors hover:border-azul hover:text-azul disabled:opacity-50"
    >
      {pending ? "Guardando" : "Guardar notas"}
    </button>
  );
}

export function NotasSocio({ id, notas }: { id: string; notas: string }) {
  const [estado, accion] = useActionState(guardarNotasSocio, ESTADO_INICIAL);

  useEffect(() => {
    if (estado.ok) toast.success(estado.mensaje);
    else if (estado.ok === false) toast.error(estado.mensaje);
  }, [estado]);

  return (
    <form action={accion} className="p-4">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="notas-socio" className="sr-only">Notas</label>
      <textarea
        id="notas-socio"
        name="notas"
        rows={4}
        defaultValue={notas}
        placeholder="Lesiones, preferencias, acuerdos con recepción…"
        className="w-full resize-y border border-acero bg-grafito p-3 text-sm leading-relaxed text-hielo outline-none placeholder:text-niebla focus:border-azul"
      />
      <div className="mt-3 flex justify-end">
        <BotonNotas />
      </div>
    </form>
  );
}

/* ------------------------------ Cobrar recibo --------------------------- */

function BotonCobrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="etiqueta flex items-center gap-1 border border-acero px-2 py-1 text-[0.55rem] text-niebla transition-colors hover:border-azul hover:text-azul disabled:opacity-50"
    >
      <Check className="size-3" strokeWidth={2} aria-hidden />
      {pending ? "…" : "Cobrar"}
    </button>
  );
}

export function CobrarRecibo({ pagoId, socioId }: { pagoId: string; socioId: string }) {
  const [estado, accion] = useActionState(marcarPagado, ESTADO_INICIAL);

  useEffect(() => {
    if (estado.ok) toast.success(estado.mensaje);
    else if (estado.ok === false) toast.error(estado.mensaje);
  }, [estado]);

  return (
    <form action={accion}>
      <input type="hidden" name="pago_id" value={pagoId} />
      <input type="hidden" name="socio_id" value={socioId} />
      <BotonCobrar />
    </form>
  );
}
