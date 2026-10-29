"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilSimple, Plus, SignIn, SignOut, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { claseCampo } from "@/components/crm/Primitivas";
import { borrarFichaje, fichar, guardarFichaje } from "@/app/crm/acciones/rrhh";
import { duracion, hoyMadrid, nombreEmpleado, type EmpleadoMini, type Fichaje } from "@/lib/rrhh";
import { CampoRrhh, ConfirmarBorrado, DialogoFormulario, MenuFila } from "./Comun";
import { claseBotonAccionRrhh, claseBotonSecundarioRrhh } from "./Piezas";

const select = `${claseCampo} appearance-none`;

const horaMadrid = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Madrid" }).format(new Date(iso));

/** Botón para fichar: entrada si no hay fichaje abierto; salida (con el tiempo que lleva) si lo hay. */
export function BotonFichar({ abierto }: { abierto: Pick<Fichaje, "entrada"> | null }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    if (!abierto) return;
    const tic = () => setAhora(Date.now());
    tic();
    const t = setInterval(tic, 30_000);
    return () => clearInterval(t);
  }, [abierto]);

  const minutos = abierto && ahora ? Math.max(0, Math.floor((ahora - new Date(abierto.entrada).getTime()) / 60_000)) : null;

  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() =>
        empezar(async () => {
          const r = await fichar();
          if (r.ok) {
            toast.success(r.mensaje);
            router.refresh();
          } else toast.error(r.mensaje);
        })
      }
      className={abierto ? claseBotonSecundarioRrhh : claseBotonAccionRrhh}
    >
      {abierto ? <SignOut className="size-4" aria-hidden /> : <SignIn className="size-4" weight="bold" aria-hidden />}
      {pendiente ? "Registrando…" : abierto ? "Registrar salida" : "Registrar entrada"}
      {abierto && (
        <span className="text-xs font-normal tabular-nums text-tinta-2">
          desde {horaMadrid(abierto.entrada)}
          {minutos != null ? ` · ${duracion(minutos)}` : ""}
        </span>
      )}
    </button>
  );
}

function CamposFichaje({ empleados, fichaje, empleadoId }: { empleados: EmpleadoMini[]; fichaje?: Fichaje; empleadoId?: string }) {
  const [estado, setEstado] = useState(fichaje?.estado ?? "correcto");
  return (
    <>
      {fichaje && <input type="hidden" name="id" value={fichaje.id} />}
      <CampoRrhh etiqueta="Empleado" obligatorio>
        <select name="empleado_id" required defaultValue={fichaje?.empleado_id ?? empleadoId ?? ""} className={select}>
          <option value="" disabled>
            Elige a quién
          </option>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>
              {nombreEmpleado(e)}
            </option>
          ))}
        </select>
      </CampoRrhh>
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoRrhh etiqueta="Fecha" obligatorio>
          <input type="date" name="fecha" required defaultValue={fichaje?.fecha ?? hoyMadrid()} className={claseCampo} />
        </CampoRrhh>
        <CampoRrhh etiqueta="Entrada" obligatorio>
          <input type="time" name="entrada" required defaultValue={fichaje ? horaMadrid(fichaje.entrada) : "09:00"} className={claseCampo} />
        </CampoRrhh>
        <CampoRrhh etiqueta="Salida">
          <input type="time" name="salida" defaultValue={fichaje?.salida ? horaMadrid(fichaje.salida) : ""} className={claseCampo} />
        </CampoRrhh>
      </div>
      <p className="-mt-2 text-xs text-tinta-2">Si la salida es anterior a la entrada se entiende que es del día siguiente.</p>
      <CampoRrhh etiqueta="Estado">
        <select name="estado" value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} className={select}>
          <option value="correcto">Correcto</option>
          <option value="incidencia">Incidencia</option>
        </select>
      </CampoRrhh>
      <CampoRrhh etiqueta={estado === "incidencia" ? "Qué ha pasado" : "Nota (opcional)"} obligatorio={estado === "incidencia"}>
        <input name="incidencia" defaultValue={fichaje?.incidencia ?? ""} required={estado === "incidencia"} placeholder="Olvido de fichaje, cita médica…" className={claseCampo} />
      </CampoRrhh>
    </>
  );
}

/** Alta manual de un registro (administración). */
export function NuevoFichaje({ empleados, empleadoId }: { empleados: EmpleadoMini[]; empleadoId?: string }) {
  return (
    <DialogoFormulario
      disparador={
        <button type="button" className={claseBotonSecundarioRrhh}>
          <Plus className="size-4" weight="bold" aria-hidden /> Registro manual
        </button>
      }
      titulo="Registro manual de horario"
      descripcion="Para olvidos de fichaje o correcciones. Queda marcado como manual."
      accion={guardarFichaje}
      textoEnviar="Guardar registro"
    >
      <CamposFichaje empleados={empleados} empleadoId={empleadoId} />
    </DialogoFormulario>
  );
}

/** Menú de un registro: corregir o borrar (administración). */
export function AccionesFichaje({ fichaje, empleados }: { fichaje: Fichaje; empleados: EmpleadoMini[] }) {
  const [editar, setEditar] = useState(false);
  const [borrar, setBorrar] = useState(false);
  return (
    <>
      <MenuFila
        etiqueta="Acciones del registro"
        acciones={[
          { texto: "Corregir", Icono: PencilSimple, onSelect: () => setEditar(true) },
          { texto: "Borrar", Icono: Trash, onSelect: () => setBorrar(true), peligro: true },
        ]}
      />
      <DialogoFormulario abierto={editar} onAbierto={setEditar} titulo="Corregir registro" accion={guardarFichaje} textoEnviar="Guardar cambios">
        <CamposFichaje empleados={empleados} fichaje={fichaje} />
      </DialogoFormulario>
      <ConfirmarBorrado
        abierto={borrar}
        onAbierto={setBorrar}
        titulo="¿Borrar este registro?"
        texto="Se elimina la entrada y la salida de ese día. No se puede deshacer."
        borrar={() => borrarFichaje(fichaje.id)}
      />
    </>
  );
}
