"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { claseCampo } from "@/components/crm/Primitivas";
import { borrarPaso, borrarTarea, guardarPaso, guardarTarea, marcarTarea } from "@/app/crm/acciones/rrhh";
import { nombreEmpleado, type EmpleadoMini, type PasoPlantilla, type TareaIncorporacion } from "@/lib/rrhh";
import { CampoRrhh, ConfirmarBorrado, DialogoFormulario, MenuFila } from "./Comun";
import { claseEnlaceSeccion } from "./Piezas";

const select = `${claseCampo} appearance-none`;

/** Casilla de una tarea de incorporación: marca y desmarca con respuesta inmediata. */
export function CasillaIncorporacion({ tarea, puede }: { tarea: Pick<TareaIncorporacion, "id" | "nombre" | "completada">; puede: boolean }) {
  const router = useRouter();
  const [, empezar] = useTransition();
  const [hecha, setHecha] = useOptimistic(tarea.completada);
  return (
    <input
      type="checkbox"
      checked={hecha}
      disabled={!puede}
      title={puede ? undefined : "Sólo quien tiene asignada la tarea, su responsable o administración pueden marcarla"}
      aria-label={`${hecha ? "Reabrir" : "Completar"} «${tarea.nombre}»`}
      onChange={(e) => {
        const valor = e.target.checked;
        empezar(async () => {
          setHecha(valor);
          const r = await marcarTarea(tarea.id, valor);
          if (r.ok) {
            toast.success(r.mensaje);
            router.refresh();
          } else toast.error(r.mensaje);
        });
      }}
      className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--acento)] disabled:cursor-not-allowed"
    />
  );
}

function CamposTarea({ empleadoId, tarea, responsables }: { empleadoId: string; tarea?: TareaIncorporacion; responsables: EmpleadoMini[] }) {
  const [obligatoria, setObligatoria] = useState(tarea?.obligatoria ?? true);
  return (
    <>
      <input type="hidden" name="empleado_id" value={empleadoId} />
      {tarea && <input type="hidden" name="id" value={tarea.id} />}
      <CampoRrhh etiqueta="Tarea" obligatorio>
        <input name="nombre" required minLength={2} defaultValue={tarea?.nombre ?? ""} placeholder="Entregar tarjeta de acceso" className={claseCampo} autoFocus />
      </CampoRrhh>
      <CampoRrhh etiqueta="Descripción">
        <textarea name="descripcion" rows={2} defaultValue={tarea?.descripcion ?? ""} className={`${claseCampo} h-auto py-2`} />
      </CampoRrhh>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoRrhh etiqueta="Responsable">
          <select name="responsable_id" defaultValue={tarea?.responsable_id ?? ""} className={select}>
            <option value="">Sin asignar</option>
            {responsables.map((e) => (
              <option key={e.id} value={e.id}>
                {nombreEmpleado(e)}
              </option>
            ))}
          </select>
        </CampoRrhh>
        <CampoRrhh etiqueta="Fecha límite">
          <input type="date" name="fecha_limite" defaultValue={tarea?.fecha_limite ?? ""} className={claseCampo} />
        </CampoRrhh>
      </div>
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block text-sm font-medium text-tinta">Obligatoria</span>
          <span className="block text-xs text-tinta-2">La incorporación se completa cuando están hechas todas las obligatorias.</span>
        </span>
        <Switch checked={obligatoria} onCheckedChange={setObligatoria} aria-label="Tarea obligatoria" />
      </label>
      <input type="hidden" name="obligatoria" value={obligatoria ? "si" : "no"} />
    </>
  );
}

/** Añadir una tarea a la incorporación de un empleado (administración). */
export function NuevaTareaIncorporacion({ empleadoId, responsables }: { empleadoId: string; responsables: EmpleadoMini[] }) {
  return (
    <DialogoFormulario
      disparador={
        <button type="button" className={claseEnlaceSeccion}>
          <Plus className="size-3.5" weight="bold" aria-hidden /> Añadir
        </button>
      }
      titulo="Nueva tarea de incorporación"
      accion={guardarTarea}
      textoEnviar="Añadir tarea"
      ancho="sm:max-w-md"
    >
      <CamposTarea empleadoId={empleadoId} responsables={responsables} />
    </DialogoFormulario>
  );
}

/** Editar o borrar una tarea (administración). */
export function AccionesTareaIncorporacion({ tarea, responsables }: { tarea: TareaIncorporacion; responsables: EmpleadoMini[] }) {
  const [editar, setEditar] = useState(false);
  const [borrar, setBorrar] = useState(false);
  return (
    <>
      <MenuFila
        etiqueta={`Acciones de «${tarea.nombre}»`}
        acciones={[
          { texto: "Editar", Icono: PencilSimple, onSelect: () => setEditar(true) },
          { texto: "Borrar", Icono: Trash, onSelect: () => setBorrar(true), peligro: true },
        ]}
      />
      <DialogoFormulario abierto={editar} onAbierto={setEditar} titulo="Editar tarea" accion={guardarTarea} textoEnviar="Guardar cambios" ancho="sm:max-w-md">
        <CamposTarea empleadoId={tarea.empleado_id} tarea={tarea} responsables={responsables} />
      </DialogoFormulario>
      <ConfirmarBorrado
        abierto={borrar}
        onAbierto={setBorrar}
        titulo={`¿Borrar «${tarea.nombre}»?`}
        texto="La tarea desaparece de la incorporación de esta persona. No se puede deshacer."
        borrar={() => borrarTarea(tarea.id)}
      />
    </>
  );
}

/* ------------------------------- Plantilla ------------------------------- */

function CamposPaso({ paso }: { paso?: PasoPlantilla }) {
  const [obligatoria, setObligatoria] = useState(paso?.obligatoria ?? true);
  return (
    <>
      {paso && <input type="hidden" name="id" value={paso.id} />}
      <CampoRrhh etiqueta="Tarea" obligatorio>
        <input name="nombre" required minLength={2} defaultValue={paso?.nombre ?? ""} className={claseCampo} autoFocus />
      </CampoRrhh>
      <CampoRrhh etiqueta="Descripción">
        <textarea name="descripcion" rows={2} defaultValue={paso?.descripcion ?? ""} className={`${claseCampo} h-auto py-2`} />
      </CampoRrhh>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoRrhh etiqueta="Responsable por defecto">
          <select name="responsable" defaultValue={paso?.responsable ?? "jefe"} className={select}>
            <option value="jefe">Su jefe / responsable</option>
            <option value="rrhh">Quien le da de alta (RRHH)</option>
          </select>
        </CampoRrhh>
        <CampoRrhh etiqueta="Plazo (días desde el alta)">
          <input type="number" name="dias_plazo" min={0} max={365} defaultValue={paso?.dias_plazo ?? 7} className={claseCampo} />
        </CampoRrhh>
      </div>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-tinta">Obligatoria</span>
        <Switch checked={obligatoria} onCheckedChange={setObligatoria} aria-label="Paso obligatorio" />
      </label>
      <input type="hidden" name="obligatoria" value={obligatoria ? "si" : "no"} />
    </>
  );
}

export function NuevoPaso() {
  return (
    <DialogoFormulario
      disparador={
        <button type="button" className={claseEnlaceSeccion}>
          <Plus className="size-3.5" weight="bold" aria-hidden /> Añadir
        </button>
      }
      titulo="Nuevo paso de la plantilla"
      descripcion="Se añadirá a la incorporación de las próximas altas."
      accion={guardarPaso}
      textoEnviar="Añadir paso"
      ancho="sm:max-w-md"
    >
      <CamposPaso />
    </DialogoFormulario>
  );
}

export function AccionesPaso({ paso }: { paso: PasoPlantilla }) {
  const [editar, setEditar] = useState(false);
  const [borrar, setBorrar] = useState(false);
  return (
    <>
      <MenuFila
        etiqueta={`Acciones de «${paso.nombre}»`}
        acciones={[
          { texto: "Editar", Icono: PencilSimple, onSelect: () => setEditar(true) },
          { texto: "Quitar", Icono: Trash, onSelect: () => setBorrar(true), peligro: true },
        ]}
      />
      <DialogoFormulario abierto={editar} onAbierto={setEditar} titulo="Editar paso" accion={guardarPaso} textoEnviar="Guardar cambios" ancho="sm:max-w-md">
        <CamposPaso paso={paso} />
      </DialogoFormulario>
      <ConfirmarBorrado
        abierto={borrar}
        onAbierto={setBorrar}
        titulo={`¿Quitar «${paso.nombre}» de la plantilla?`}
        texto="Las próximas altas ya no la tendrán. Las incorporaciones ya creadas no cambian."
        borrar={() => borrarPaso(paso.id)}
      />
    </>
  );
}
