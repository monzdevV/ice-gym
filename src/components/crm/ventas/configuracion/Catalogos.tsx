"use client";

import { useState } from "react";
import { PencilSimple, Plus } from "@phosphor-icons/react";
import {
  borrarEtiquetaVentas,
  borrarMotivoVentas,
  borrarTipoActividadVentas,
  guardarEtiquetaVentas,
  guardarMotivoVentas,
  guardarTipoActividadVentas,
} from "@/app/crm/acciones/ventas";
import type { ColorEquipo } from "@/lib/b2b";
import {
  ETIQUETA_ICONO_ACTIVIDAD,
  ICONOS_ACTIVIDAD,
  type EtiquetaVentas,
  type IconoActividad,
  type MotivoPerdida,
  type TipoActividadVentas,
} from "@/lib/ventas";
import { SinDatos, claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { EtiquetaChip, ICONO_ACTIVIDAD } from "@/components/crm/ventas/Piezas";
import { BorrarConConfirmacion, Campo, DialogoFormulario, SelectorColor, claseIcono, claseSecundario, useAccion } from "./Comun";

function Cabecera({ texto, boton, onNuevo }: { texto: string; boton: string; onNuevo: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-xl text-sm text-tinta-2">{texto}</p>
      <button type="button" onClick={onNuevo} className={`${claseBotonPrincipal} h-8 px-3`}>
        <Plus className="size-4" weight="bold" aria-hidden />
        {boton}
      </button>
    </div>
  );
}

function Pie({ onCancelar, pendiente, texto }: { onCancelar: () => void; pendiente: boolean; texto: string }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onCancelar} className={claseSecundario}>
        Cancelar
      </button>
      <button type="submit" disabled={pendiente} className={claseBotonPrincipal}>
        {pendiente ? "Guardando…" : texto}
      </button>
    </div>
  );
}

const claseLista = "overflow-hidden rounded-2xl bg-placa shadow-placa";
const claseFila = "flex items-center gap-3 border-b border-linea/70 px-4 py-2.5 last:border-0";

/* -------------------------------- Etiquetas -------------------------------- */

function FormularioEtiqueta({ etiqueta, onCerrar }: { etiqueta: EtiquetaVentas | null; onCerrar: () => void }) {
  const { ejecutar, pendiente } = useAccion();
  const [nombre, setNombre] = useState(etiqueta?.nombre ?? "");
  const [color, setColor] = useState<ColorEquipo | string>(etiqueta?.color ?? "azul");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ejecutar(() => guardarEtiquetaVentas({ id: etiqueta?.id, nombre, color }), onCerrar);
      }}
      className="flex flex-col gap-4"
    >
      <Campo etiqueta="Nombre">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={60} autoFocus className={claseCampo} />
      </Campo>
      <SelectorColor valor={color} onCambio={setColor} />
      <p className="flex items-center gap-2 text-[0.8125rem] text-tinta-2">
        Así se verá: <EtiquetaChip e={{ nombre: nombre || "Etiqueta", color }} />
      </p>
      <Pie onCancelar={onCerrar} pendiente={pendiente} texto={etiqueta ? "Guardar" : "Añadir"} />
    </form>
  );
}

export function Etiquetas({ etiquetas }: { etiquetas: EtiquetaVentas[] }) {
  const [editando, setEditando] = useState<EtiquetaVentas | "nueva" | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <Cabecera texto="Para clasificar oportunidades (sector, producto, interés…). Se pueden filtrar en Mi flujo." boton="Añadir etiqueta" onNuevo={() => setEditando("nueva")} />
      {etiquetas.length === 0 ? (
        <SinDatos titulo="Sin etiquetas" texto="Crea las primeras: por ejemplo «Empresa», «Particular» o «Renovación»." />
      ) : (
        <ul className={claseLista}>
          {etiquetas.map((e) => (
            <li key={e.id} className={claseFila}>
              <span className="min-w-0 flex-1">
                <EtiquetaChip e={e} />
              </span>
              <button type="button" onClick={() => setEditando(e)} className={claseIcono} aria-label={`Editar ${e.nombre}`} title="Editar">
                <PencilSimple className="size-4" aria-hidden />
              </button>
              <BorrarConConfirmacion
                titulo={`¿Borrar la etiqueta ${e.nombre}?`}
                descripcion="Se quita de todas las oportunidades que la llevan. No se puede deshacer."
                etiqueta={`Borrar ${e.nombre}`}
                onBorrar={() => borrarEtiquetaVentas(e.id)}
              />
            </li>
          ))}
        </ul>
      )}
      <DialogoFormulario abierto={editando !== null} onCerrar={() => setEditando(null)} titulo={editando === "nueva" ? "Nueva etiqueta" : "Editar etiqueta"}>
        {editando !== null && (
          <FormularioEtiqueta key={editando === "nueva" ? "n" : editando.id} etiqueta={editando === "nueva" ? null : editando} onCerrar={() => setEditando(null)} />
        )}
      </DialogoFormulario>
    </div>
  );
}

/* ---------------------------- Razones de pérdida ---------------------------- */

export function Razones({ motivos }: { motivos: MotivoPerdida[] }) {
  const { ejecutar, pendiente } = useAccion();
  const [nueva, setNueva] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [texto, setTexto] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-xl text-sm text-tinta-2">Las que se ofrecen al marcar una oportunidad como perdida. Sirven para agrupar en los informes.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ejecutar(() => guardarMotivoVentas({ nombre: nueva }), () => setNueva(""));
        }}
        className="flex max-w-xl gap-2"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Nueva razón de pérdida</span>
          <input value={nueva} onChange={(e) => setNueva(e.target.value)} maxLength={120} placeholder="p. ej. Se fue con la competencia" className={claseCampo} />
        </label>
        <button type="submit" disabled={pendiente || !nueva.trim()} className={claseBotonPrincipal}>
          <Plus className="size-4" weight="bold" aria-hidden />
          Añadir
        </button>
      </form>
      {motivos.length === 0 ? (
        <SinDatos titulo="Sin razones" texto="Sin razones, al marcar una perdida sólo se pide la nota de cierre." />
      ) : (
        <ul className={`${claseLista} max-w-xl`}>
          {motivos.map((m) => (
            <li key={m.id} className={claseFila}>
              {editando === m.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    ejecutar(() => guardarMotivoVentas({ id: m.id, nombre: texto }), () => setEditando(null));
                  }}
                  className="flex min-w-0 flex-1 gap-2"
                >
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Razón de pérdida</span>
                    <input
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      onKeyDown={(e) => e.key === "Escape" && setEditando(null)}
                      maxLength={120}
                      autoFocus
                      className={claseCampo}
                    />
                  </label>
                  <button type="submit" disabled={pendiente} className={`${claseBotonPrincipal} h-9`}>
                    Guardar
                  </button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-tinta">{m.nombre}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(m.id);
                      setTexto(m.nombre);
                    }}
                    className={claseIcono}
                    aria-label={`Editar ${m.nombre}`}
                    title="Editar"
                  >
                    <PencilSimple className="size-4" aria-hidden />
                  </button>
                  <BorrarConConfirmacion
                    titulo="¿Borrar esta razón?"
                    descripcion={`«${m.nombre}». Las oportunidades perdidas por esta razón se quedan sin razón.`}
                    etiqueta={`Borrar ${m.nombre}`}
                    onBorrar={() => borrarMotivoVentas(m.id)}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------- Tipos de actividad ---------------------------- */

function FormularioTipo({ tipo, onCerrar }: { tipo: TipoActividadVentas | null; onCerrar: () => void }) {
  const { ejecutar, pendiente } = useAccion();
  const [icono, setIcono] = useState<IconoActividad>(tipo?.icono ?? "tarea");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        ejecutar(
          () =>
            guardarTipoActividadVentas({
              id: tipo?.id,
              nombre: String(fd.get("nombre") ?? ""),
              icono,
              dias: String(fd.get("dias") ?? "0"),
              resumen: String(fd.get("resumen") ?? ""),
            }),
          onCerrar
        );
      }}
      className="flex flex-col gap-4"
    >
      <Campo etiqueta="Nombre">
        <input name="nombre" required maxLength={60} defaultValue={tipo?.nombre ?? ""} autoFocus className={claseCampo} />
      </Campo>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[0.8125rem] font-medium text-tinta">Icono</legend>
        <div className="flex flex-wrap gap-1.5">
          {ICONOS_ACTIVIDAD.map((i) => {
            const Icono = ICONO_ACTIVIDAD[i];
            const on = icono === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setIcono(i)}
                aria-pressed={on}
                className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] transition-colors ${
                  on ? "border-acento bg-acento/10 text-acento-tinta" : "border-linea text-tinta-2 hover:text-tinta"
                }`}
              >
                <Icono className="size-4" weight={on ? "fill" : "regular"} aria-hidden />
                {ETIQUETA_ICONO_ACTIVIDAD[i]}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <Campo etiqueta="Vence en (días)">
          <input name="dias" type="number" min={0} max={365} defaultValue={tipo?.dias ?? 0} className={`${claseCampo} tabular-nums`} />
        </Campo>
        <Campo etiqueta="Resumen por defecto">
          <input name="resumen" maxLength={200} defaultValue={tipo?.resumen ?? ""} placeholder="Opcional" className={claseCampo} />
        </Campo>
      </div>
      <Pie onCancelar={onCerrar} pendiente={pendiente} texto={tipo ? "Guardar" : "Añadir"} />
    </form>
  );
}

export function TiposActividad({ tipos }: { tipos: TipoActividadVentas[] }) {
  const [editando, setEditando] = useState<TipoActividadVentas | "nuevo" | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <Cabecera
        texto="Lo que se puede planificar en una oportunidad o un cliente. Los días marcan el vencimiento que se propone al elegirlo."
        boton="Añadir tipo"
        onNuevo={() => setEditando("nuevo")}
      />
      {tipos.length === 0 ? (
        <SinDatos titulo="Sin tipos de actividad" texto="Sin tipos no se pueden planificar actividades." />
      ) : (
        <ul className={`${claseLista} max-w-2xl`}>
          {tipos.map((t) => {
            const Icono = ICONO_ACTIVIDAD[t.icono];
            return (
              <li key={t.id} className={claseFila}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-placa-2 text-tinta" aria-hidden>
                  <Icono className="size-4" weight="bold" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-tinta">{t.nombre}</span>
                  <span className="block truncate text-xs text-tinta-2">
                    {t.dias === 0 ? "Vence el mismo día" : `Vence en ${t.dias} ${t.dias === 1 ? "día" : "días"}`}
                    {t.resumen ? ` · «${t.resumen}»` : ""}
                  </span>
                </span>
                <button type="button" onClick={() => setEditando(t)} className={claseIcono} aria-label={`Editar ${t.nombre}`} title="Editar">
                  <PencilSimple className="size-4" aria-hidden />
                </button>
                <BorrarConConfirmacion
                  titulo={`¿Borrar el tipo ${t.nombre}?`}
                  descripcion="Las actividades de este tipo se conservan, sin tipo. Los planes que lo usan pierden ese paso."
                  etiqueta={`Borrar ${t.nombre}`}
                  onBorrar={() => borrarTipoActividadVentas(t.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
      <DialogoFormulario abierto={editando !== null} onCerrar={() => setEditando(null)} titulo={editando === "nuevo" ? "Nuevo tipo de actividad" : "Editar tipo de actividad"}>
        {editando !== null && (
          <FormularioTipo key={editando === "nuevo" ? "n" : editando.id} tipo={editando === "nuevo" ? null : editando} onCerrar={() => setEditando(null)} />
        )}
      </DialogoFormulario>
    </div>
  );
}
