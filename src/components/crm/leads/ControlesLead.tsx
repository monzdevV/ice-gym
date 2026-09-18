"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cambiarEstadoLead, convertirEnSocio, guardarNotasLead } from "@/app/crm/acciones/leads";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { codigoCentro } from "@/design/tokens";
import { ESTADOS_LEAD, ETIQUETA_LEAD, type EstadoLead, type Centro, type Tarifa } from "@/lib/tipos";
import { dineroExacto } from "@/lib/formato";
import { claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";

/* --------------------------- Cambio de etapa --------------------------- */

/** Las seis etapas en fila: la actual en tinta; pulsar otra mueve el lead. */
export function SelectorEstado({ id, actual }: { id: string; actual: EstadoLead }) {
  const [estado, accion, pendiente] = useActionState(cambiarEstadoLead, ESTADO_INICIAL);

  useEffect(() => {
    if (estado.ok) toast.success(estado.mensaje);
    else if (estado.ok === false) toast.error(estado.mensaje);
  }, [estado]);

  return (
    <form action={accion}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado_anterior" value={actual} />
      <div
        role="group"
        aria-label="Etapa del lead"
        className={`flex flex-wrap gap-y-1 ${pendiente ? "opacity-60" : ""}`}
      >
        {ESTADOS_LEAD.map((e) => {
          const activa = e === actual;
          return (
            <button
              key={e}
              type="submit"
              name="estado"
              value={e}
              aria-pressed={activa}
              disabled={pendiente || activa}
              className={`corte-a -mx-[4px] px-4 py-1.5 text-[0.9rem] transition-colors active:translate-y-px ${
                activa ? "rotulo bg-tinta text-fondo" : "condensada text-tinta-2 hover:bg-placa-2 hover:text-tinta"
              }`}
            >
              {ETIQUETA_LEAD[e]}
            </button>
          );
        })}
      </div>
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
      className="condensada text-[0.85rem] text-acento-tinta underline underline-offset-4 disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Guardar notas"}
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
    <form action={accion} className="flex flex-col gap-3 pt-3">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="notas" className="sr-only">
        Notas internas
      </label>
      <textarea
        id="notas"
        name="notas"
        rows={5}
        defaultValue={notas}
        placeholder="Qué busca, cuándo puede venir, qué le frena"
        className={`${claseCampo} h-auto resize-y py-2.5 leading-relaxed`}
      />
      <div className="flex justify-end">
        <BotonNotas />
      </div>
    </form>
  );
}

/* ------------------------------ Convertir ------------------------------- */

function BotonConvertir() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${claseBotonPrincipal} w-full`}>
      <UserPlus className="size-5" weight="bold" aria-hidden />
      {pending ? "Creando socio…" : "Convertir en socio"}
    </button>
  );
}

export function PanelConvertir({
  leadId,
  centros,
  tarifas,
  centroSugerido,
  tarifaSugerida,
}: {
  leadId: string;
  centros: Centro[];
  tarifas: Tarifa[];
  centroSugerido: string | null;
  tarifaSugerida: string | null;
}) {
  const [estado, accion] = useActionState(convertirEnSocio, ESTADO_INICIAL);
  const [centroId, setCentroId] = useState(centroSugerido ?? centros[0]?.id ?? "");
  const [tarifaId, setTarifaId] = useState(tarifaSugerida ?? tarifas[1]?.id ?? tarifas[0]?.id ?? "");
  const tarifa = tarifas.find((t) => t.id === tarifaId);

  const opcion = (activa: boolean) =>
    `corte-a -mx-[4px] px-4 py-2 text-[0.95rem] transition-colors ${
      activa ? "rotulo bg-tinta text-fondo" : "condensada text-tinta-2 hover:bg-placa-2 hover:text-tinta"
    }`;

  return (
    <form action={accion} className="flex flex-col gap-5 pt-4">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="centro_id" value={centroId} />
      <input type="hidden" name="tarifa_id" value={tarifaId} />

      <div>
        <p className="condensada mb-2 text-[0.85rem] text-tinta">Centro</p>
        <div role="radiogroup" aria-label="Centro" className="flex flex-wrap gap-y-1">
          {centros.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={centroId === c.id}
              title={c.nombre}
              onClick={() => setCentroId(c.id)}
              className={opcion(centroId === c.id)}
            >
              {codigoCentro(c.slug)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="condensada mb-2 text-[0.85rem] text-tinta">Tarifa</p>
        <div role="radiogroup" aria-label="Tarifa" className="flex flex-col gap-[3px]">
          {tarifas.map((t) => {
            const activa = tarifaId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={activa}
                onClick={() => setTarifaId(t.id)}
                className={`flex items-baseline justify-between px-3 py-2.5 text-left transition-colors ${
                  activa ? "bg-tinta text-fondo" : "bg-placa text-tinta hover:bg-placa-2"
                }`}
              >
                <span className="rotulo text-[1.15rem]">{t.nombre}</span>
                <span className="cifra text-[1.15rem]">{dineroExacto(t.cuota_mensual)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="condensada text-[0.85rem] text-tinta">Apellidos</span>
        <input name="apellidos" placeholder="Si el lead sólo dejó el nombre" className={claseCampo} />
      </label>

      {tarifa && (
        <p className="text-[0.88rem] leading-relaxed text-tinta-2">
          Se emite la cuota de este mes ({dineroExacto(tarifa.cuota_mensual)})
          {Number(tarifa.matricula) > 0 && ` y la matrícula (${dineroExacto(tarifa.matricula)})`}, pendientes de cobro.
        </p>
      )}

      {estado.ok === false && (
        <p role="alert" className={claseError}>
          {estado.mensaje}
        </p>
      )}

      <BotonConvertir />
    </form>
  );
}
