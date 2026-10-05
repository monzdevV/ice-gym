"use client";

import { useState } from "react";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import { claseCampo } from "@/components/crm/Primitivas";
import { borrarEvaluacion, guardarEvaluacion } from "@/app/crm/acciones/rrhh";
import {
  ETIQUETA_PUNTUACION,
  PUNTUACIONES,
  TONO_PUNTUACION,
  hoyMadrid,
  nombreEmpleado,
  trimestreActual,
  type EmpleadoMini,
  type Evaluacion,
} from "@/lib/rrhh";
import { CampoRrhh, ConfirmarBorrado, DialogoFormulario, MenuFila } from "./Comun";
import { claseBotonAccionRrhh, claseEnlaceSeccion } from "./Piezas";

const select = `${claseCampo} appearance-none`;

/** Selector de puntuación 1–5 como botones segmentados (radio accesible). */
function SelectorPuntuacion({ inicial }: { inicial?: number }) {
  const [valor, setValor] = useState(inicial ?? 0);
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[0.8125rem] font-medium text-tinta">Puntuación</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {PUNTUACIONES.map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name="puntuacion" value={n} required checked={valor === n} onChange={() => setValor(n)} className="peer sr-only" />
            <span
              className="flex h-14 flex-col items-center justify-center rounded-md border border-linea bg-placa text-tinta transition-colors hover:bg-placa-2 peer-checked:border-transparent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-acento"
              style={valor === n ? { background: TONO_PUNTUACION[n] } : undefined}
            >
              <span className="text-lg font-semibold tabular-nums leading-none">{n}</span>
              <span className="mt-1 text-[0.6875rem] leading-none">{ETIQUETA_PUNTUACION[n]}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CamposEvaluacion({ empleados, evaluacion, empleadoId }: { empleados: EmpleadoMini[]; evaluacion?: Evaluacion; empleadoId?: string }) {
  const actual = trimestreActual();
  const [visible, setVisible] = useState(evaluacion?.visible_empleado ?? true);
  const fijo = evaluacion?.empleado_id ?? empleadoId;
  return (
    <>
      {evaluacion && <input type="hidden" name="id" value={evaluacion.id} />}
      {fijo ? (
        <input type="hidden" name="empleado_id" value={fijo} />
      ) : (
        <CampoRrhh etiqueta="Empleado">
          <select name="empleado_id" required defaultValue="" className={select}>
            <option value="" disabled>
              Elige a quién evalúas
            </option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {nombreEmpleado(e)}
              </option>
            ))}
          </select>
        </CampoRrhh>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoRrhh etiqueta="Trimestre">
          <select name="trimestre" defaultValue={evaluacion?.trimestre ?? actual.trimestre} className={select}>
            {[1, 2, 3, 4].map((t) => (
              <option key={t} value={t}>
                Q{t}
              </option>
            ))}
          </select>
        </CampoRrhh>
        <CampoRrhh etiqueta="Año">
          <input type="number" name="anio" min={2000} max={2100} required defaultValue={evaluacion?.anio ?? actual.anio} className={claseCampo} />
        </CampoRrhh>
        <CampoRrhh etiqueta="Fecha">
          <input type="date" name="fecha" defaultValue={evaluacion?.fecha ?? hoyMadrid()} className={claseCampo} />
        </CampoRrhh>
      </div>
      <SelectorPuntuacion inicial={evaluacion?.puntuacion} />
      <CampoRrhh etiqueta="Comentarios">
        <textarea name="comentarios" rows={4} defaultValue={evaluacion?.comentarios ?? ""} placeholder="Puntos fuertes, a mejorar y objetivos para el próximo trimestre." className={`${claseCampo} h-auto py-2`} />
      </CampoRrhh>
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block text-sm font-medium text-tinta">Visible para el empleado</span>
          <span className="block text-xs text-tinta-2">Si la ocultas, sólo la ven sus responsables y administración.</span>
        </span>
        <Switch checked={visible} onCheckedChange={setVisible} />
      </label>
      <input type="hidden" name="visible_empleado" value={visible ? "si" : "no"} />
    </>
  );
}

/** Nueva evaluación trimestral. Con `empleadoId` queda fijada a esa persona (desde su ficha). */
export function NuevaEvaluacion({ empleados, empleadoId, enlace = false }: { empleados: EmpleadoMini[]; empleadoId?: string; enlace?: boolean }) {
  return (
    <DialogoFormulario
      disparador={
        enlace ? (
          <button type="button" className={claseEnlaceSeccion}>
            <Plus className="size-3.5" weight="bold" aria-hidden /> Evaluar
          </button>
        ) : (
          <button type="button" className={claseBotonAccionRrhh}>
            <Plus className="size-4" weight="bold" aria-hidden /> Nueva evaluación
          </button>
        )
      }
      titulo="Evaluación trimestral"
      descripcion="Puntuación de 1 (muy bajo) a 5 (excelente). Una por persona y trimestre."
      accion={guardarEvaluacion}
      textoEnviar="Guardar evaluación"
    >
      <CamposEvaluacion empleados={empleados} empleadoId={empleadoId} />
    </DialogoFormulario>
  );
}

export function AccionesEvaluacion({ evaluacion, empleados, puedeBorrar }: { evaluacion: Evaluacion; empleados: EmpleadoMini[]; puedeBorrar: boolean }) {
  const [editar, setEditar] = useState(false);
  const [borrar, setBorrar] = useState(false);
  return (
    <>
      <MenuFila
        etiqueta="Acciones de la evaluación"
        acciones={[
          { texto: "Editar", Icono: PencilSimple, onSelect: () => setEditar(true) },
          ...(puedeBorrar ? [{ texto: "Borrar", Icono: Trash, onSelect: () => setBorrar(true), peligro: true }] : []),
        ]}
      />
      <DialogoFormulario abierto={editar} onAbierto={setEditar} titulo="Editar evaluación" accion={guardarEvaluacion} textoEnviar="Guardar cambios">
        <CamposEvaluacion empleados={empleados} evaluacion={evaluacion} />
      </DialogoFormulario>
      <ConfirmarBorrado
        abierto={borrar}
        onAbierto={setBorrar}
        titulo="¿Borrar esta evaluación?"
        texto="Desaparece del histórico de la persona. No se puede deshacer."
        borrar={() => borrarEvaluacion(evaluacion.id)}
      />
    </>
  );
}
