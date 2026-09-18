"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cambiarEstadoSocio, guardarNotasSocio, marcarPagado } from "@/app/crm/acciones/socios";
import { ESTADO_INICIAL } from "@/lib/acciones";
import type { EstadoSocio } from "@/lib/tipos";
import { claseCampo } from "@/components/crm/Primitivas";

/* ----------------------- Congelar, reactivar, baja ---------------------- */

type Operacion = "congelar" | "reactivar" | "baja";

const TEXTOS: Record<Operacion, { boton: string; titulo: string; cuerpo: string; confirmar: string; ejemplo: string }> = {
  congelar: {
    boton: "Congelar",
    titulo: "Congelar la cuota",
    cuerpo: "No podrá entrar ni se le cobrarán cuotas hasta que lo reactives.",
    confirmar: "Congelar",
    ejemplo: "Lesión de rodilla, un mes",
  },
  reactivar: {
    boton: "Reactivar",
    titulo: "Reactivar al socio",
    cuerpo: "Vuelve a tener acceso a los centros y se le cobrará la cuota del mes que viene.",
    confirmar: "Reactivar",
    ejemplo: "Vuelve tras la lesión",
  },
  baja: {
    boton: "Dar de baja",
    titulo: "Dar de baja",
    cuerpo: "Su ficha se cierra con fecha de hoy. El historial de pagos y accesos se conserva.",
    confirmar: "Dar de baja",
    ejemplo: "Se muda a otra ciudad",
  },
};

function BotonConfirmar({ texto }: { texto: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="corte-d rotulo h-11 bg-tinta pl-5 pr-8 text-[1rem] text-fondo transition-transform active:translate-y-px disabled:opacity-50"
    >
      {pending ? "Guardando…" : texto}
    </button>
  );
}

function AccionConConfirmacion({ id, operacion }: { id: string; operacion: Operacion }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion] = useActionState(cambiarEstadoSocio, ESTADO_INICIAL);
  const t = TEXTOS[operacion];

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
          className="corte-a condensada -mx-[4px] px-5 py-2 text-[0.95rem] text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta active:translate-y-px"
        >
          {t.boton}
        </button>
      </DialogTrigger>

      <DialogContent className="gap-0 rounded-none border-0 bg-placa p-0 shadow-none sm:max-w-md">
        <form action={accion}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="operacion" value={operacion} />

          <div className="flex items-stretch">
            <span className="w-2.5 bg-acento" aria-hidden />
            <DialogTitle className="corte-rotulo rotulo bg-tinta py-2 pl-4 pr-10 text-[1.8rem] text-fondo">
              {t.titulo}
            </DialogTitle>
          </div>

          <div className="flex flex-col gap-5 p-6">
            <DialogDescription className="text-[0.95rem] leading-relaxed text-tinta-2">{t.cuerpo}</DialogDescription>

            <label className="flex flex-col gap-1.5">
              <span className="condensada text-[0.85rem] text-tinta">Motivo (opcional)</span>
              <input name="motivo" maxLength={200} placeholder={t.ejemplo} className={claseCampo} />
            </label>

            <div className="flex items-center justify-end gap-6">
              <DialogClose asChild>
                <button type="button" className="condensada text-[0.9rem] text-tinta-2 underline-offset-4 hover:text-tinta hover:underline">
                  Cancelar
                </button>
              </DialogClose>
              <BotonConfirmar texto={t.confirmar} />
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccionesSocio({ id, estado }: { id: string; estado: EstadoSocio }) {
  return (
    <div className="flex flex-wrap items-center gap-y-1">
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
      className="condensada text-[0.85rem] text-acento-tinta underline underline-offset-4 disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Guardar notas"}
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
    <form action={accion} className="flex flex-col gap-3 pt-3">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="notas-socio" className="sr-only">
        Notas
      </label>
      <textarea
        id="notas-socio"
        name="notas"
        rows={4}
        defaultValue={notas}
        placeholder="Lesiones, preferencias, acuerdos con recepción"
        className={`${claseCampo} h-auto resize-y py-2.5 leading-relaxed`}
      />
      <div className="flex justify-end">
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
      className="corte-d rotulo bg-acento py-1.5 pl-3 pr-6 text-[0.9rem] text-sobre-campo transition-transform active:translate-y-px disabled:opacity-50"
    >
      {pending ? "Cobrando…" : "Cobrar"}
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
