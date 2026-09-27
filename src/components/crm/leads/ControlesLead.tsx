"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, UserPlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  actualizarOportunidad,
  cambiarEstadoLead,
  convertirEnSocio,
  guardarNotasLead,
  marcarPerdido,
} from "@/app/crm/acciones/leads";
import { ESTADO_INICIAL, type EstadoAccion } from "@/lib/acciones";
import { ESTADOS_LEAD, ETIQUETA_LEAD, PROBABILIDAD_ETAPA, type EstadoLead, type Centro, type Tarifa } from "@/lib/tipos";
import { dinero, dineroExacto } from "@/lib/formato";
import { claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Enseña el resultado de una acción como toast. */
function useAviso(estado: EstadoAccion) {
  useEffect(() => {
    if (estado.ok) toast.success(estado.mensaje);
    else if (estado.ok === false) toast.error(estado.mensaje);
  }, [estado]);
}

function Guardar({ texto = "Guardar" }: { texto?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-8 items-center rounded-md border border-linea bg-placa-2 px-3 text-[0.8125rem] font-medium text-tinta transition-colors hover:border-tinta-2/40 disabled:opacity-50"
    >
      {pending ? "Guardando…" : texto}
    </button>
  );
}

const etiquetaCampo = "text-[0.8125rem] font-medium text-tinta-2";

/* --------------------------- Cambio de etapa --------------------------- */

/** Las etapas como un stepper: las pasadas marcadas, la actual resaltada. Pulsar otra mueve el lead. */
export function SelectorEstado({ id, actual }: { id: string; actual: EstadoLead }) {
  const [estado, accion, pendiente] = useActionState(cambiarEstadoLead, ESTADO_INICIAL);
  useAviso(estado);
  const pasos = ESTADOS_LEAD.filter((e) => e !== "perdido");
  const indice = actual === "perdido" ? -1 : pasos.indexOf(actual);

  return (
    <form action={accion}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado_anterior" value={actual} />
      <div
        role="group"
        aria-label="Etapa del lead"
        className={`flex overflow-x-auto rounded-lg border border-linea bg-placa ${pendiente ? "opacity-60" : ""}`}
      >
        {pasos.map((e, i) => {
          const activa = e === actual;
          const pasada = i < indice;
          return (
            <button
              key={e}
              type="submit"
              name="estado"
              value={e}
              aria-pressed={activa}
              disabled={pendiente || activa || e === "convertido"}
              title={e === "convertido" ? "Usa «Convertir en socio» para cerrar el lead" : undefined}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-r border-linea px-3 py-2 text-[0.8125rem] font-medium transition-colors last:border-r-0 ${
                activa
                  ? "bg-acento text-sobre-campo"
                  : pasada
                    ? "bg-acento/10 text-tinta hover:bg-acento/20"
                    : "text-tinta-2 hover:bg-placa-2 hover:text-tinta disabled:hover:bg-transparent"
              }`}
            >
              {pasada && <Check className="size-3.5" weight="bold" aria-hidden />}
              {ETIQUETA_LEAD[e]}
            </button>
          );
        })}
      </div>
    </form>
  );
}

/* ------------------------------ Oportunidad ----------------------------- */

export function EditorOportunidad({
  id,
  estado,
  valorEstimado,
  valorTarifa,
  probabilidad,
}: {
  id: string;
  estado: EstadoLead;
  valorEstimado: number | null;
  valorTarifa: number;
  probabilidad: number | null;
}) {
  const [resultado, accion] = useActionState(actualizarOportunidad, ESTADO_INICIAL);
  useAviso(resultado);
  const [valor, setValor] = useState(valorEstimado != null ? String(valorEstimado) : "");
  const [prob, setProb] = useState(probabilidad != null ? String(probabilidad) : "");

  const v = valor === "" ? valorTarifa : Number(valor.replace(",", ".")) || 0;
  const p = prob === "" ? PROBABILIDAD_ETAPA[estado] : Number(prob) || 0;

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={etiquetaCampo}>Valor anual (€)</span>
          <input
            name="valor_estimado"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={String(valorTarifa)}
            className={`${claseCampo} tabular-nums`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={etiquetaCampo}>Probabilidad (%)</span>
          <input
            name="probabilidad"
            type="number"
            min={0}
            max={100}
            value={prob}
            onChange={(e) => setProb(e.target.value)}
            placeholder={String(PROBABILIDAD_ETAPA[estado])}
            className={`${claseCampo} tabular-nums`}
          />
        </label>
      </div>
      <p className="text-[0.8125rem] leading-relaxed text-tinta-2">
        Vacío = automático: cuota de la tarifa × 12 y probabilidad de la etapa.
      </p>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-placa-2 px-3 py-2.5">
        <span className="text-[0.8125rem] text-tinta-2">Ponderado</span>
        <span className="text-lg font-semibold tabular-nums text-tinta">{dinero((v * p) / 100)}</span>
      </div>
      <div className="flex justify-end">
        <Guardar />
      </div>
    </form>
  );
}

/* ---------------------------- Próxima acción ---------------------------- */

/** datetime-local espera la hora local sin zona. */
function aLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function EditorProximaAccion({
  id,
  texto,
  fecha,
}: {
  id: string;
  texto: string | null;
  fecha: string | null;
}) {
  const [resultado, accion] = useActionState(actualizarOportunidad, ESTADO_INICIAL);
  useAviso(resultado);
  const [cuando, setCuando] = useState(aLocal(fecha));

  // Atajos: mañana, en 3 días, en una semana, a las 10:00.
  function dentroDe(dias: number) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    d.setHours(10, 0, 0, 0);
    setCuando(aLocal(d.toISOString()));
  }

  return (
    <form
      action={(fd) => {
        // Se envía en ISO para que el servidor no dependa de su zona horaria.
        fd.set("proxima_accion_fecha", cuando ? new Date(cuando).toISOString() : "");
        return accion(fd);
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1.5">
        <span className={etiquetaCampo}>Qué hay que hacer</span>
        <input
          name="proxima_accion"
          defaultValue={texto ?? ""}
          maxLength={200}
          placeholder="Llamar para confirmar la visita"
          className={claseCampo}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`cuando-${id}`} className={etiquetaCampo}>
          Cuándo
        </label>
        <input
          id={`cuando-${id}`}
          type="datetime-local"
          value={cuando}
          onChange={(e) => setCuando(e.target.value)}
          className={`${claseCampo} tabular-nums`}
        />
        <div className="flex flex-wrap gap-1.5">
          {[
            { t: "Mañana", d: 1 },
            { t: "En 3 días", d: 3 },
            { t: "En una semana", d: 7 },
          ].map((o) => (
            <button
              key={o.t}
              type="button"
              onClick={() => dentroDe(o.d)}
              className="h-7 rounded-md border border-linea px-2 text-xs text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
            >
              {o.t}
            </button>
          ))}
          {cuando && (
            <button
              type="button"
              onClick={() => setCuando("")}
              className="h-7 rounded-md px-2 text-xs text-tinta-2 hover:text-tinta"
            >
              Quitar fecha
            </button>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Guardar />
      </div>
    </form>
  );
}

/* ------------------------------- Etiquetas ------------------------------ */

export function EditorEtiquetas({ id, etiquetas, sugeridas }: { id: string; etiquetas: string[]; sugeridas: string[] }) {
  const [resultado, accion] = useActionState(actualizarOportunidad, ESTADO_INICIAL);
  useAviso(resultado);
  const [lista, setLista] = useState(etiquetas);
  const [nueva, setNueva] = useState("");
  const libres = sugeridas.filter((s) => !lista.includes(s)).slice(0, 8);

  function anadir(t: string) {
    const limpia = t.trim().toLowerCase().slice(0, 24);
    if (limpia && !lista.includes(limpia) && lista.length < 8) setLista([...lista, limpia]);
    setNueva("");
  }

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="etiquetas" value={lista.join(",")} />
      <div className="flex flex-wrap gap-1.5">
        {lista.length === 0 && <span className="text-sm text-tinta-2">Sin etiquetas.</span>}
        {lista.map((t) => (
          <span key={t} className="tag">
            {t}
            <button
              type="button"
              onClick={() => setLista(lista.filter((x) => x !== t))}
              aria-label={`Quitar ${t}`}
              className="-mr-1 ml-0.5 rounded px-0.5 hover:bg-white/20"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              anadir(nueva);
            }
          }}
          placeholder="Añadir etiqueta y pulsar Enter"
          aria-label="Nueva etiqueta"
          className={claseCampo}
        />
        <Guardar />
      </div>
      {libres.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {libres.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => anadir(s)}
              className="h-6 rounded-md border border-dashed border-linea px-2 text-xs text-tinta-2 hover:text-tinta"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}

/* ----------------------------- Marcar perdido --------------------------- */

export function BotonPerdido({ id, estado }: { id: string; estado: EstadoLead }) {
  const [resultado, accion] = useActionState(marcarPerdido, ESTADO_INICIAL);
  useAviso(resultado);
  const [abierto, setAbierto] = useState(false);
  const [visto, setVisto] = useState(resultado);
  if (resultado !== visto) {
    setVisto(resultado);
    if (resultado.ok) setAbierto(false);
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-md border border-linea px-3 text-[0.8125rem] font-medium text-tinta-2 transition-colors hover:border-critico/50 hover:text-critico"
        >
          Marcar perdido
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <form action={accion} className="flex flex-col gap-2.5">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="estado_anterior" value={estado} />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-tinta">¿Por qué se pierde?</span>
            <input name="motivo" required minLength={3} autoFocus placeholder="Precio, se va a otro gimnasio…" className={claseCampo} />
          </label>
          {resultado.ok === false && <p className={claseError}>{resultado.mensaje}</p>}
          <div className="flex justify-end">
            <Guardar texto="Marcar perdido" />
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/* --------------------------------- Notas -------------------------------- */

export function FormularioNotas({ id, notas }: { id: string; notas: string }) {
  const [estado, accion] = useActionState(guardarNotasLead, ESTADO_INICIAL);
  useAviso(estado);

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="notas" className="sr-only">
        Notas internas
      </label>
      <textarea
        id="notas"
        name="notas"
        rows={4}
        defaultValue={notas}
        placeholder="Qué busca, cuándo puede venir, qué le frena"
        className={`${claseCampo} h-auto resize-y py-2 leading-relaxed`}
      />
      <div className="flex justify-end">
        <Guardar texto="Guardar notas" />
      </div>
    </form>
  );
}

/* ------------------------------ Convertir ------------------------------- */

function BotonConvertir() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${claseBotonPrincipal} w-full`}>
      <UserPlus className="size-4" weight="bold" aria-hidden />
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

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="centro_id" value={centroId} />
      <input type="hidden" name="tarifa_id" value={tarifaId} />

      <div>
        <p className={`mb-1.5 ${etiquetaCampo}`}>Centro</p>
        <div role="radiogroup" aria-label="Centro" className="flex w-fit flex-wrap gap-0.5 rounded-lg border border-linea p-0.5">
          {centros.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={centroId === c.id}
              onClick={() => setCentroId(c.id)}
              className={`rounded-md px-2.5 py-1 text-[0.8125rem] font-medium transition-colors ${
                centroId === c.id ? "bg-placa-2 text-tinta" : "text-tinta-2 hover:text-tinta"
              }`}
            >
              {c.nombre.replace(/^Ice Gym\s+/i, "")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className={`mb-1.5 ${etiquetaCampo}`}>Tarifa</p>
        <div role="radiogroup" aria-label="Tarifa" className="flex flex-col gap-1.5">
          {tarifas.map((t) => {
            const activa = tarifaId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={activa}
                onClick={() => setTarifaId(t.id)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  activa ? "border-acento bg-acento/10 text-tinta" : "border-linea text-tinta hover:bg-placa-2"
                }`}
              >
                <span className="font-medium">{t.nombre}</span>
                <span className="tabular-nums text-tinta-2">{dineroExacto(t.cuota_mensual)}/mes</span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={etiquetaCampo}>Apellidos</span>
        <input name="apellidos" placeholder="Si el lead sólo dejó el nombre" className={claseCampo} />
      </label>

      {tarifa && (
        <p className="text-[0.8125rem] leading-relaxed text-tinta-2">
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
