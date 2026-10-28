"use client";

import Link from "next/link";
import { Plus } from "@phosphor-icons/react";
import { dinero } from "@/lib/formato";
import {
  ETIQUETA_PLAZO,
  TONO_PLAZO,
  hoyISO,
  plazoDe,
  quienVenta,
  rutaVentas,
  textoPlazo,
  type ActividadVentasCompleta,
  type OportunidadVentasCompleta,
} from "@/lib/ventas";
import { ICONO_ACTIVIDAD } from "@/components/crm/ventas/Piezas";
import { useFlujo } from "./Contexto";

const OTRAS = "otras";

/**
 * Matriz de actividad: una fila por oportunidad y una columna por tipo. Cada
 * celda enseña la más próxima de ese tipo (en su color de plazo) y la abre;
 * vacía, planifica una de ese tipo.
 */
export function VistaActividad({ filas }: { filas: OportunidadVentasCompleta[] }) {
  const { catalogos, actividadesDe, planificar } = useFlujo();
  const hoy = hoyISO();
  const tipos = catalogos.tipos;
  const conocidos = new Set(tipos.map((t) => t.id));
  const hayOtras = filas.some((o) => actividadesDe(o.id).some((a) => !a.tipo_id || !conocidos.has(a.tipo_id)));

  // Primero lo más urgente; sin nada planificado, al final.
  const ordenadas = [...filas].sort((a, b) => (a.actividades[0]?.vence ?? "9999").localeCompare(b.actividades[0]?.vence ?? "9999"));

  function celda(o: OportunidadVentasCompleta, lista: ActividadVentasCompleta[], tipo: string | null, nombreTipo: string) {
    const a = lista[0];
    if (!a) {
      return tipo ? (
        <button
          type="button"
          onClick={() => planificar({ o, tipo })}
          aria-label={`Planificar ${nombreTipo.toLowerCase()} en ${o.nombre}`}
          className="grid h-9 w-full place-items-center rounded-md text-tinta-2 opacity-0 transition-opacity hover:bg-placa-2 focus-visible:opacity-100 group-hover:opacity-60"
        >
          <Plus className="size-3.5" weight="bold" aria-hidden />
        </button>
      ) : null;
    }
    const plazo = plazoDe(a.vence, hoy);
    return (
      <button
        type="button"
        onClick={() => planificar({ o, actividad: a })}
        title={[a.resumen, a.asignado?.nombre].filter(Boolean).join(" · ") || undefined}
        className="flex h-9 w-full flex-col items-center justify-center rounded-md px-1 text-xs transition-colors hover:bg-placa-2"
        style={{ boxShadow: `inset 0 -3px 0 ${TONO_PLAZO[plazo]}` }}
      >
        <span className="font-semibold" style={{ color: TONO_PLAZO[plazo] }}>
          {textoPlazo(a.vence, hoy)}
          <span className="sr-only"> ({ETIQUETA_PLAZO[plazo]})</span>
        </span>
        {lista.length > 1 && <span className="text-[0.68rem] text-tinta-2">+{lista.length - 1} más</span>}
      </button>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-linea bg-placa">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <caption className="sr-only">Actividades pendientes por oportunidad y tipo</caption>
        <thead className="sticky top-0 z-10 bg-placa">
          <tr className="border-b border-linea text-[0.8125rem] text-tinta-2">
            <th scope="col" className="py-2 pl-4 pr-4 font-normal">
              Oportunidad
            </th>
            {tipos.map((t) => {
              const Icono = ICONO_ACTIVIDAD[t.icono];
              return (
                <th key={t.id} scope="col" className="w-32 px-1 py-2 text-center font-normal">
                  <span className="inline-flex items-center gap-1.5">
                    <Icono className="size-4" aria-hidden />
                    {t.nombre}
                  </span>
                </th>
              );
            })}
            {hayOtras && (
              <th scope="col" className="w-28 px-1 py-2 text-center font-normal">
                Otras
              </th>
            )}
            <th scope="col" className="w-12 pr-2">
              <span className="sr-only">Planificar</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((o) => {
            const todas = actividadesDe(o.id);
            return (
              <tr key={o.id} className="group border-b border-linea/70 last:border-0">
                <th scope="row" className="max-w-[280px] py-1.5 pl-4 pr-4 font-normal">
                  <Link href={rutaVentas.oportunidad(o.id)} className="block truncate font-medium text-tinta hover:text-acento-tinta">
                    {o.nombre}
                  </Link>
                  <span className="block truncate text-xs text-tinta-2">
                    {[quienVenta(o), o.ingresos ? dinero(o.ingresos) : null].filter(Boolean).join(" · ") || "—"}
                  </span>
                </th>
                {tipos.map((t) => (
                  <td key={t.id} className="border-l border-linea/50 px-1 py-1">
                    {celda(o, todas.filter((a) => a.tipo_id === t.id), t.id, t.nombre)}
                  </td>
                ))}
                {hayOtras && (
                  <td className="border-l border-linea/50 px-1 py-1">
                    {celda(o, todas.filter((a) => !a.tipo_id || !conocidos.has(a.tipo_id)), null, OTRAS)}
                  </td>
                )}
                <td className="border-l border-linea/50 pr-2 text-center">
                  <button
                    type="button"
                    onClick={() => planificar({ o })}
                    aria-label={`Planificar actividad en ${o.nombre}`}
                    title="Planificar actividad"
                    className="grid size-8 place-items-center rounded-md text-tinta-2 hover:bg-placa-2 hover:text-acento-tinta"
                  >
                    <Plus className="size-4" weight="bold" aria-hidden />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
