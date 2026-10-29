"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, PencilSimple, Plus, Trophy } from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import { borrarEtapaVentas, guardarEtapaVentas, ordenarEtapasVentas, plegarEtapaVentas } from "@/app/crm/acciones/ventas";
import { numero } from "@/lib/formato";
import type { EtapaVentas } from "@/lib/ventas";
import { SinDatos, claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { BorrarConConfirmacion, Campo, DialogoFormulario, claseIcono, claseSecundario, useAccion } from "./Comun";

function FormularioEtapa({ etapa, onCerrar }: { etapa: EtapaVentas | null; onCerrar: () => void }) {
  const { ejecutar, pendiente } = useAccion();
  const [ganada, setGanada] = useState(etapa?.ganada ?? false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        ejecutar(
          () =>
            guardarEtapaVentas({
              id: etapa?.id,
              nombre: String(fd.get("nombre") ?? ""),
              probabilidad: String(fd.get("probabilidad") ?? ""),
              ganada,
              requisitos: String(fd.get("requisitos") ?? ""),
            }),
          onCerrar
        );
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Campo etiqueta="Nombre de la etapa">
          <input name="nombre" required maxLength={60} defaultValue={etapa?.nombre ?? ""} autoFocus className={claseCampo} />
        </Campo>
        <Campo etiqueta="Probabilidad (%)">
          <input
            name="probabilidad"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={etapa?.probabilidad ?? 10}
            className={`${claseCampo} tabular-nums`}
          />
        </Campo>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-lg bg-placa-2 px-3 py-2.5">
        <span className="flex flex-col">
          <span className="text-sm font-medium text-tinta">Etapa de ganado</span>
          <span className="text-[0.8125rem] text-tinta-2">Mover aquí una oportunidad la marca como ganada.</span>
        </span>
        <Switch checked={ganada} onCheckedChange={setGanada} aria-label="Etapa de ganado" />
      </label>
      <Campo etiqueta="Requisitos">
        <textarea
          name="requisitos"
          rows={3}
          maxLength={1000}
          defaultValue={etapa?.requisitos ?? ""}
          placeholder="Qué tiene que pasar para llegar a esta etapa (se ve como ayuda en el tablero)"
          className={`${claseCampo} h-auto py-2`}
        />
      </Campo>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCerrar} className={claseSecundario}>
          Cancelar
        </button>
        <button type="submit" disabled={pendiente} className={claseBotonPrincipal}>
          {pendiente ? "Guardando…" : etapa ? "Guardar" : "Añadir etapa"}
        </button>
      </div>
    </form>
  );
}

/** Etapas del flujo: orden (el de las columnas del Kanban), probabilidad, ganado, plegada y requisitos. */
export function Etapas({ etapas, conteo }: { etapas: EtapaVentas[]; conteo: Record<string, number> }) {
  const { ejecutar, pendiente } = useAccion();
  const [orden, setOrden] = useState(etapas);
  const [origen, setOrigen] = useState(etapas);
  const [editando, setEditando] = useState<EtapaVentas | "nueva" | null>(null);
  const [destino, setDestino] = useState("");
  if (etapas !== origen) {
    setOrigen(etapas);
    setOrden(etapas);
  }

  function mover(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= orden.length) return;
    const nuevo = [...orden];
    [nuevo[i], nuevo[j]] = [nuevo[j], nuevo[i]];
    setOrden(nuevo);
    ejecutar(() => ordenarEtapasVentas(nuevo.map((e) => e.id)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-tinta-2">
          Las columnas de Mi flujo, en este orden. Al mover una oportunidad, toma la probabilidad de su etapa salvo que se haya puesto a mano.
        </p>
        <button type="button" onClick={() => setEditando("nueva")} className={`${claseBotonPrincipal} h-8 px-3`}>
          <Plus className="size-4" weight="bold" aria-hidden />
          Añadir etapa
        </button>
      </div>

      {orden.length === 0 ? (
        <SinDatos titulo="Sin etapas" texto="Añade al menos una etapa para que el flujo tenga columnas." />
      ) : (
        <ol className="overflow-hidden rounded-2xl bg-placa shadow-placa">
          {orden.map((e, i) => {
            const n = conteo[e.id] ?? 0;
            const otras = orden.filter((x) => x.id !== e.id);
            const pasan = otras.some((o) => o.id === destino) ? destino : (otras[0]?.id ?? "");
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-linea/70 px-3 py-3 last:border-0 sm:flex-nowrap sm:px-4">
                <span className="flex shrink-0 flex-col">
                  <button type="button" onClick={() => mover(i, -1)} disabled={i === 0 || pendiente} className={`${claseIcono} size-6`} aria-label={`Subir ${e.nombre}`}>
                    <ArrowUp className="size-3.5" weight="bold" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    disabled={i === orden.length - 1 || pendiente}
                    className={`${claseIcono} size-6`}
                    aria-label={`Bajar ${e.nombre}`}
                  >
                    <ArrowDown className="size-3.5" weight="bold" aria-hidden />
                  </button>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-tinta">{e.nombre}</span>
                    {e.ganada && (
                      <span className="inline-flex items-center gap-1 rounded bg-exito-suave px-1.5 text-[0.6875rem] font-medium text-[color-mix(in_oklab,var(--exito)_80%,var(--tinta))]">
                        <Trophy className="size-3" weight="fill" aria-hidden />
                        Ganado
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-tinta-2">
                    {numero(n)} {n === 1 ? "oportunidad" : "oportunidades"}
                    {e.requisitos ? ` · ${e.requisitos}` : ""}
                  </span>
                </span>
                <span className="flex w-28 shrink-0 items-center gap-2">
                  <span className="sr-only">Probabilidad:</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-placa-2" aria-hidden>
                    <span className="block h-full rounded-full bg-acento" style={{ width: `${e.probabilidad}%` }} />
                  </span>
                  <span className="w-9 text-right text-xs tabular-nums text-tinta">{e.probabilidad}%</span>
                </span>
                <label className="flex shrink-0 items-center gap-2 text-[0.8125rem] text-tinta-2">
                  Plegada
                  <Switch
                    checked={e.plegada}
                    onCheckedChange={(v) => ejecutar(() => plegarEtapaVentas(e.id, v))}
                    aria-label={`Plegar la columna ${e.nombre} en el tablero`}
                  />
                </label>
                <span className="flex shrink-0 items-center">
                  <button type="button" onClick={() => setEditando(e)} className={claseIcono} aria-label={`Editar ${e.nombre}`} title="Editar">
                    <PencilSimple className="size-4" aria-hidden />
                  </button>
                  <BorrarConConfirmacion
                    titulo={`¿Borrar la etapa ${e.nombre}?`}
                    descripcion={
                      n
                        ? `Tiene ${numero(n)} ${n === 1 ? "oportunidad" : "oportunidades"}: elige a qué etapa pasan.`
                        : "No tiene oportunidades. No se puede deshacer."
                    }
                    etiqueta={`Borrar ${e.nombre}`}
                    onBorrar={() => borrarEtapaVentas(e.id, pasan || null)}
                  >
                    {n > 0 && (
                      <Campo etiqueta="Pasan a">
                        <select value={pasan} onChange={(ev) => setDestino(ev.target.value)} className={claseCampo}>
                          {otras.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.nombre}
                            </option>
                          ))}
                        </select>
                      </Campo>
                    )}
                  </BorrarConConfirmacion>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <DialogoFormulario
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        titulo={editando === "nueva" ? "Nueva etapa" : "Editar etapa"}
      >
        {editando !== null && (
          <FormularioEtapa key={editando === "nueva" ? "nueva" : editando.id} etapa={editando === "nueva" ? null : editando} onCerrar={() => setEditando(null)} />
        )}
      </DialogoFormulario>
    </div>
  );
}
