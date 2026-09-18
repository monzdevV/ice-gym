"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Mail, MessageCircle, Phone, Plus, StickyNote, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { registrarActividad } from "@/app/crm/acciones/leads";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { TIPOS_ACTIVIDAD_MANUAL, ETIQUETA_ACTIVIDAD } from "@/lib/tipos";

const ICONO = {
  llamada: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  visita: UserCheck,
  nota: StickyNote,
} as const;

function Boton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="etiqueta flex h-10 shrink-0 items-center gap-1.5 border border-azul/50 bg-azul/10 px-3 text-[0.6rem] text-azul transition-colors hover:bg-azul/20 disabled:opacity-50"
    >
      <Plus className="size-3.5" strokeWidth={2} aria-hidden />
      {pending ? "Guardando" : "Añadir"}
    </button>
  );
}

export function FormularioActividad({
  leadId,
  socioId,
}: {
  leadId?: string;
  socioId?: string;
}) {
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
    <form ref={ref} action={accion} className="border-b border-acero p-4">
      {leadId && <input type="hidden" name="lead_id" value={leadId} />}
      {socioId && <input type="hidden" name="socio_id" value={socioId} />}

      <fieldset>
        <legend className="sr-only">Tipo de actividad</legend>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_ACTIVIDAD_MANUAL.map((tipo, i) => {
            const Icono = ICONO[tipo];
            return (
              <label
                key={tipo}
                className="etiqueta flex cursor-pointer items-center gap-1.5 border border-acero px-2.5 py-1.5 text-[0.58rem] transition-colors hover:border-niebla has-checked:border-azul has-checked:bg-azul/10 has-checked:text-azul"
              >
                <input
                  type="radio"
                  name="tipo"
                  value={tipo}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                <Icono className="size-3" strokeWidth={1.5} aria-hidden />
                {ETIQUETA_ACTIVIDAD[tipo]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-3 flex gap-2">
        <label htmlFor="descripcion" className="sr-only">
          Qué ha pasado
        </label>
        <input
          id="descripcion"
          name="descripcion"
          required
          maxLength={2000}
          placeholder="Llamada de 10 min, queda en pasarse el jueves…"
          className="h-10 w-full border border-acero bg-grafito px-3 text-sm text-hielo outline-none transition-colors placeholder:text-niebla focus:border-azul"
        />
        <Boton />
      </div>
    </form>
  );
}
