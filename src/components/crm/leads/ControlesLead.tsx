"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cambiarEstadoLead, convertirEnSocio, guardarNotasLead } from "@/app/crm/acciones/leads";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { ESTADOS_LEAD, ETIQUETA_LEAD, type EstadoLead, type Centro, type Tarifa } from "@/lib/tipos";
import { dineroExacto } from "@/lib/formato";

/* --------------------------- Cambio de estado --------------------------- */

export function SelectorEstado({ id, actual }: { id: string; actual: EstadoLead }) {
  const [estado, accion, pendiente] = useActionState(cambiarEstadoLead, ESTADO_INICIAL);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) toast.success(estado.mensaje);
    else if (estado.ok === false) toast.error(estado.mensaje);
  }, [estado]);

  return (
    <form ref={ref} action={accion} className="relative flex items-center border border-acero bg-grafito">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado_anterior" value={actual} />
      <label htmlFor="estado-lead" className="sr-only">
        Estado del lead
      </label>
      <select
        id="estado-lead"
        name="estado"
        defaultValue={actual}
        disabled={pendiente}
        onChange={() => ref.current?.requestSubmit()}
        className="etiqueta appearance-none bg-transparent py-2.5 pl-3 pr-9 text-[0.62rem] text-hielo outline-none disabled:opacity-50"
      >
        {ESTADOS_LEAD.map((e) => (
          <option key={e} value={e}>
            {ETIQUETA_LEAD[e]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-3.5 text-niebla" strokeWidth={1.5} aria-hidden />
    </form>
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

export function FormularioNotas({ id, notas }: { id: string; notas: string }) {
  const [estado, accion] = useActionState(guardarNotasLead, ESTADO_INICIAL);

  useEffect(() => {
    if (estado.ok) toast.success(estado.mensaje);
    else if (estado.ok === false) toast.error(estado.mensaje);
  }, [estado]);

  return (
    <form action={accion} className="p-4">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="notas" className="sr-only">
        Notas internas
      </label>
      <textarea
        id="notas"
        name="notas"
        rows={5}
        defaultValue={notas}
        placeholder="Qué busca, cuándo puede venir, qué le frena…"
        className="w-full resize-y border border-acero bg-grafito p-3 text-sm leading-relaxed text-hielo outline-none transition-colors placeholder:text-niebla focus:border-azul"
      />
      <div className="mt-3 flex justify-end">
        <BotonNotas />
      </div>
    </form>
  );
}

/* ------------------------------ Convertir ------------------------------- */

function BotonConvertir() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="titular flex h-11 w-full items-center justify-center gap-2 bg-azul text-base text-negro transition-colors hover:bg-hielo disabled:opacity-50"
    >
      <UserPlus className="size-4" strokeWidth={2} aria-hidden />
      {pending ? "Creando socio" : "Convertir en socio"}
    </button>
  );
}

export function PanelConvertir({
  leadId,
  centros,
  tarifas,
  centroSugerido,
  tarifaSugerida,
  yaEsSocio,
}: {
  leadId: string;
  centros: Centro[];
  tarifas: Tarifa[];
  centroSugerido: string | null;
  tarifaSugerida: string | null;
  yaEsSocio: boolean;
}) {
  const [estado, accion] = useActionState(convertirEnSocio, ESTADO_INICIAL);
  const [tarifaId, setTarifaId] = useState(tarifaSugerida ?? tarifas[1]?.id ?? tarifas[0]?.id ?? "");

  useEffect(() => {
    if (estado.ok === false) toast.error(estado.mensaje);
  }, [estado]);

  if (yaEsSocio) return null;

  const tarifa = tarifas.find((t) => t.id === tarifaId);
  const campo =
    "h-10 w-full appearance-none border border-acero bg-grafito px-3 text-sm text-hielo outline-none focus:border-azul";

  return (
    <form action={accion} className="space-y-3 p-4">
      <input type="hidden" name="lead_id" value={leadId} />

      <div>
        <label htmlFor="centro_id" className="etiqueta mb-2 block">
          Centro
        </label>
        <select
          id="centro_id"
          name="centro_id"
          defaultValue={centroSugerido ?? centros[0]?.id ?? ""}
          required
          className={campo}
        >
          {centros.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="tarifa_id" className="etiqueta mb-2 block">
          Tarifa
        </label>
        <select
          id="tarifa_id"
          name="tarifa_id"
          value={tarifaId}
          onChange={(e) => setTarifaId(e.target.value)}
          required
          className={campo}
        >
          {tarifas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre} · {dineroExacto(t.cuota_mensual)}/mes
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="apellidos" className="etiqueta mb-2 block">
          Apellidos
        </label>
        <input
          id="apellidos"
          name="apellidos"
          placeholder="Si el lead sólo dejó el nombre"
          className={`${campo} placeholder:text-niebla`}
        />
      </div>

      {tarifa && (
        <p className="border-l-2 border-azul bg-azul/5 px-3 py-2 text-xs leading-relaxed text-niebla">
          Se emitirá la cuota de este mes ({dineroExacto(tarifa.cuota_mensual)})
          {Number(tarifa.matricula) > 0 && ` y la matrícula (${dineroExacto(tarifa.matricula)})`} como
          pendientes de cobro.
        </p>
      )}

      <BotonConvertir />
    </form>
  );
}
