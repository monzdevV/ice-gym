"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, PencilSimple, Plus, X } from "@phosphor-icons/react";
import { borrarPlanVentas, guardarPlanVentas } from "@/app/crm/acciones/ventas";
import { nombreCompleto, type Miembro } from "@/lib/b2b";
import type { PlanActividad, TipoActividadVentas } from "@/lib/ventas";
import { SinDatos, claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { ICONO_ACTIVIDAD } from "@/components/crm/ventas/Piezas";
import { BorrarConConfirmacion, Campo, DialogoFormulario, claseIcono, claseSecundario, useAccion } from "./Comun";

type Paso = { clave: number; tipo_id: string; resumen: string; dias: string; asignado_id: string };

function FormularioPlan({
  plan,
  tipos,
  comerciales,
  onCerrar,
}: {
  plan: PlanActividad | null;
  tipos: TipoActividadVentas[];
  comerciales: Miembro[];
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente } = useAccion();
  const [nombre, setNombre] = useState(plan?.nombre ?? "");
  const [siguiente, setSiguiente] = useState((plan?.pasos.length ?? 0) + 1);
  const [pasos, setPasos] = useState<Paso[]>(() =>
    plan?.pasos.length
      ? plan.pasos.map((p, i) => ({ clave: i, tipo_id: p.tipo_id, resumen: p.resumen ?? "", dias: String(p.dias), asignado_id: p.asignado_id ?? "" }))
      : [{ clave: 0, tipo_id: tipos[0]?.id ?? "", resumen: "", dias: "0", asignado_id: "" }]
  );

  const cambiar = (clave: number, c: Partial<Paso>) => setPasos((l) => l.map((p) => (p.clave === clave ? { ...p, ...c } : p)));
  function mover(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= pasos.length) return;
    const l = [...pasos];
    [l[i], l[j]] = [l[j], l[i]];
    setPasos(l);
  }
  function anadir() {
    setPasos((l) => [...l, { clave: siguiente, tipo_id: tipos[0]?.id ?? "", resumen: "", dias: l.at(-1)?.dias ?? "0", asignado_id: "" }]);
    setSiguiente((n) => n + 1);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ejecutar(() => guardarPlanVentas({ id: plan?.id, nombre, pasos }), onCerrar);
      }}
      className="flex flex-col gap-4"
    >
      <Campo etiqueta="Nombre del plan">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={120} autoFocus placeholder="p. ej. Seguimiento de propuesta" className={claseCampo} />
      </Campo>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[0.8125rem] font-medium text-tinta">Actividades, en orden</legend>
        <ol className="flex flex-col gap-2">
          {pasos.map((p, i) => (
            <li key={p.clave} className="flex flex-col gap-2 rounded-lg bg-placa-2 p-2.5">
              <div className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-xs tabular-nums text-tinta-2">{i + 1}</span>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Tipo de la actividad {i + 1}</span>
                  <select value={p.tipo_id} onChange={(e) => cambiar(p.clave, { tipo_id: e.target.value })} className={claseCampo} required>
                    {tipos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className={claseIcono} aria-label={`Subir la actividad ${i + 1}`}>
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === pasos.length - 1} className={claseIcono} aria-label={`Bajar la actividad ${i + 1}`}>
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setPasos((l) => l.filter((x) => x.clave !== p.clave))}
                  disabled={pasos.length === 1}
                  className={`${claseIcono} hover:text-critico`}
                  aria-label={`Quitar la actividad ${i + 1}`}
                >
                  <X className="size-4" weight="bold" aria-hidden />
                </button>
              </div>
              <div className="grid gap-2 pl-7 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(0,10rem)]">
                <label>
                  <span className="sr-only">Resumen</span>
                  <input value={p.resumen} onChange={(e) => cambiar(p.clave, { resumen: e.target.value })} maxLength={200} placeholder="Resumen (opcional)" className={claseCampo} />
                </label>
                <label className="flex items-center gap-1.5">
                  <span className="text-xs text-tinta-2">+</span>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={p.dias}
                    onChange={(e) => cambiar(p.clave, { dias: e.target.value })}
                    aria-label="Días desde el inicio del plan"
                    className={`${claseCampo} tabular-nums`}
                  />
                  <span className="text-xs text-tinta-2">d</span>
                </label>
                <label>
                  <span className="sr-only">Asignado a</span>
                  <select value={p.asignado_id} onChange={(e) => cambiar(p.clave, { asignado_id: e.target.value })} className={claseCampo}>
                    <option value="">El comercial</option>
                    {comerciales
                      .filter((c) => c.activo || c.id === p.asignado_id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {nombreCompleto(c)}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" onClick={anadir} className={`${claseSecundario} self-start`}>
          <Plus className="size-4" weight="bold" aria-hidden />
          Añadir actividad
        </button>
      </fieldset>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCerrar} className={claseSecundario}>
          Cancelar
        </button>
        <button type="submit" disabled={pendiente} className={claseBotonPrincipal}>
          {pendiente ? "Guardando…" : plan ? "Guardar" : "Crear plan"}
        </button>
      </div>
    </form>
  );
}

/** Planes de actividad: secuencias que se planifican de una vez desde «Planificar actividad». */
export function Planes({ planes, tipos, comerciales }: { planes: PlanActividad[]; tipos: TipoActividadVentas[]; comerciales: Miembro[] }) {
  const [editando, setEditando] = useState<PlanActividad | "nuevo" | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-tinta-2">
          Varias actividades encadenadas (llamar, enviar propuesta, reunión…) que se planifican de golpe. Los días cuentan desde el día en que se aplica.
        </p>
        <button type="button" onClick={() => setEditando("nuevo")} disabled={!tipos.length} className={`${claseBotonPrincipal} h-8 px-3`}>
          <Plus className="size-4" weight="bold" aria-hidden />
          Nuevo plan
        </button>
      </div>
      {planes.length === 0 ? (
        <SinDatos
          titulo="Sin planes"
          texto={tipos.length ? "Crea uno para no tener que planificar cada paso a mano." : "Crea antes algún tipo de actividad."}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {planes.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-2xl bg-placa p-4 shadow-placa">
              <div className="flex items-center gap-2">
                <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-tinta">{p.nombre}</h3>
                <button type="button" onClick={() => setEditando(p)} className={claseIcono} aria-label={`Editar ${p.nombre}`} title="Editar">
                  <PencilSimple className="size-4" aria-hidden />
                </button>
                <BorrarConConfirmacion
                  titulo={`¿Borrar el plan ${p.nombre}?`}
                  descripcion="Las actividades ya planificadas con él no se tocan."
                  etiqueta={`Borrar ${p.nombre}`}
                  onBorrar={() => borrarPlanVentas(p.id)}
                />
              </div>
              <ol className="flex flex-col gap-1.5">
                {p.pasos.map((s) => {
                  const t = tipos.find((x) => x.id === s.tipo_id);
                  const Icono = ICONO_ACTIVIDAD[t?.icono ?? "tarea"];
                  const m = comerciales.find((c) => c.id === s.asignado_id);
                  return (
                    <li key={s.id} className="flex items-center gap-2 text-[0.8125rem]">
                      <Icono className="size-4 shrink-0 text-tinta-2" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-tinta">{s.resumen || t?.nombre || "Actividad"}</span>
                      <span className="shrink-0 text-xs tabular-nums text-tinta-2">
                        {s.dias === 0 ? "día 0" : `+${s.dias} d`}
                        {m ? ` · ${m.nombre}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ul>
      )}
      <DialogoFormulario abierto={editando !== null} onCerrar={() => setEditando(null)} titulo={editando === "nuevo" ? "Nuevo plan de actividad" : "Editar plan"}>
        {editando !== null && (
          <FormularioPlan
            key={editando === "nuevo" ? "n" : editando.id}
            plan={editando === "nuevo" ? null : editando}
            tipos={tipos}
            comerciales={comerciales}
            onCerrar={() => setEditando(null)}
          />
        )}
      </DialogoFormulario>
    </div>
  );
}
