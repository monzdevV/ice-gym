"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { registrarActividad } from "@/app/crm/acciones/leads";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { TIPOS_ACTIVIDAD_MANUAL, ETIQUETA_ACTIVIDAD } from "@/lib/tipos";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";

function Boton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${claseBotonPrincipal} shrink-0`}
    >
      {pending ? "Guardando…" : "Apuntar"}
    </button>
  );
}

/** Apunta una llamada, email, WhatsApp, visita o nota en el historial. */
export function FormularioActividad({ leadId, socioId }: { leadId?: string; socioId?: string }) {
  const [estado, accion] = useActionState(registrarActividad, ESTADO_INICIAL);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) {
      ref.current?.reset();
      toast.success(estado.mensaje);
    } else if (estado.ok === false) {
      toast.error(estado.mensaje);
    }
  }, [estado]);

  return (
    <form ref={ref} action={accion} className="flex flex-col gap-3 py-4">
      {leadId && <input type="hidden" name="lead_id" value={leadId} />}
      {socioId && <input type="hidden" name="socio_id" value={socioId} />}

      <fieldset className="flex w-fit flex-wrap gap-0.5 rounded-lg border border-linea bg-placa p-0.5">
        <legend className="sr-only">Tipo de actividad</legend>
        {TIPOS_ACTIVIDAD_MANUAL.map((tipo, i) => (
          <label
            key={tipo}
            className="cursor-pointer rounded-md px-3 py-1 text-[0.8125rem] font-medium text-tinta-2 transition-colors hover:text-tinta has-checked:bg-placa-2 has-checked:text-tinta has-focus-visible:outline-2 has-focus-visible:outline-acento-tinta"
          >
            <input type="radio" name="tipo" value={tipo} defaultChecked={i === 0} className="sr-only" />
            <span>{ETIQUETA_ACTIVIDAD[tipo]}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex gap-2">
        <label htmlFor="descripcion" className="sr-only">
          Qué ha pasado
        </label>
        <input
          id="descripcion"
          name="descripcion"
          required
          maxLength={2000}
          placeholder="Llamada de 10 min, se pasa el jueves por la tarde"
          className={claseCampo}
        />
        <Boton />
      </div>
    </form>
  );
}
