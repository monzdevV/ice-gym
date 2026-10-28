"use client";

import Link from "next/link";
import { CaretLeft, CaretRight, Plus } from "@phosphor-icons/react";
import { dinero, mesLargo, numero } from "@/lib/formato";
import { hoyISO, rutaVentas, sumarDias, type FiltrosVentas, type OportunidadVentasCompleta } from "@/lib/ventas";
import { useFlujo } from "./Contexto";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function mesVecino(mes: string, delta: number) {
  const d = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Calendario del mes por cierre previsto. Un día vacío crea una oportunidad que cierra ese día. */
export function CalendarioVentas({
  filas,
  filtros: f,
  cambiar,
}: {
  filas: OportunidadVentasCompleta[];
  filtros: FiltrosVentas;
  cambiar: (c: Partial<FiltrosVentas>) => void;
}) {
  const { catalogos, nueva } = useFlujo();
  const hoy = hoyISO();
  const mes = f.mes || hoy.slice(0, 7);
  const primero = `${mes}-01`;
  // Lunes primero: getUTCDay da 0 al domingo.
  const desfase = (new Date(`${primero}T12:00:00Z`).getUTCDay() + 6) % 7;
  const inicio = sumarDias(primero, -desfase);
  const dias = Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
  const semanas = dias[35].slice(0, 7) === mes ? 6 : 5;

  const porDia = new Map<string, OportunidadVentasCompleta[]>();
  let sinFecha = 0;
  for (const o of filas) {
    if (!o.cierre_previsto) {
      sinFecha++;
      continue;
    }
    const lista = porDia.get(o.cierre_previsto) ?? [];
    lista.push(o);
    porDia.set(o.cierre_previsto, lista);
  }
  const delMes = filas.filter((o) => o.cierre_previsto?.startsWith(mes));

  // Color por avance en el flujo: de la rampa clara (primeras etapas) a la intensa.
  const n = Math.max(1, catalogos.etapas.length - 1);
  const tono = (o: OportunidadVentasCompleta) => {
    if (o.estado === "perdida") return "var(--apagado)";
    const i = catalogos.etapas.findIndex((e) => e.id === o.etapa_id);
    return `var(--rampa-${Math.round((Math.max(0, i) / n) * 5)})`;
  };

  const claseNav = "grid size-8 place-items-center rounded-md text-tinta-2 hover:bg-placa-2 hover:text-tinta";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => cambiar({ mes: mesVecino(mes, -1) })} aria-label="Mes anterior" className={claseNav}>
          <CaretLeft className="size-4" weight="bold" aria-hidden />
        </button>
        <button type="button" onClick={() => cambiar({ mes: mesVecino(mes, 1) })} aria-label="Mes siguiente" className={claseNav}>
          <CaretRight className="size-4" weight="bold" aria-hidden />
        </button>
        <h2 className="text-lg font-semibold capitalize text-tinta">{mesLargo(`${mes}-15T12:00:00Z`)}</h2>
        {mes !== hoy.slice(0, 7) && (
          <button type="button" onClick={() => cambiar({ mes: "" })} className="h-8 rounded-md border border-linea px-3 text-[0.8125rem] font-medium text-tinta hover:bg-placa-2">
            Hoy
          </button>
        )}
        <p className="ml-auto text-sm text-tinta-2">
          {numero(delMes.length)} con cierre este mes · {dinero(delMes.reduce((s, o) => s + o.ingresos, 0))}
          {sinFecha > 0 && ` · ${numero(sinFecha)} sin cierre previsto`}
        </p>
      </div>

      <div className="-mx-4 min-h-0 flex-1 overflow-auto px-4 lg:mx-0 lg:px-0">
        <div className="grid min-w-[720px] grid-cols-7 overflow-hidden rounded-xl border border-linea bg-placa" role="grid" aria-label={`Cierres previstos de ${mesLargo(`${mes}-15T12:00:00Z`)}`}>
          {DIAS.map((d) => (
            <div key={d} role="columnheader" className="border-b border-linea px-2 py-1.5 text-xs font-medium text-tinta-2">
              <span className="hidden lg:inline">{d}</span>
              <span className="lg:hidden">{d.slice(0, 3)}</span>
            </div>
          ))}
          {dias.slice(0, semanas * 7).map((dia, i) => {
            const fuera = !dia.startsWith(mes);
            const lista = porDia.get(dia) ?? [];
            return (
              <div
                key={dia}
                role="gridcell"
                className={`group relative flex min-h-28 flex-col gap-1 border-linea p-1.5 ${i % 7 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""} ${fuera ? "bg-placa-2/40" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`grid size-6 place-items-center rounded-full text-xs tabular-nums ${
                      dia === hoy ? "bg-acento font-semibold text-sobre-campo" : fuera ? "text-tinta-2/60" : "text-tinta-2"
                    }`}
                  >
                    {Number(dia.slice(8))}
                  </span>
                  <button
                    type="button"
                    onClick={() => nueva({ cierre_previsto: dia })}
                    aria-label={`Nueva oportunidad que cierra el ${dia}`}
                    className="grid size-6 place-items-center rounded-md text-tinta-2 opacity-0 transition-opacity hover:bg-placa-2 hover:text-tinta focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Plus className="size-3.5" weight="bold" aria-hidden />
                  </button>
                </div>
                <ul className="flex flex-col gap-1">
                  {lista.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={rutaVentas.oportunidad(o.id)}
                        title={`${o.nombre} · ${dinero(o.ingresos)}`}
                        className="flex items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-xs text-sobre-relleno transition-[filter] hover:brightness-95"
                        style={{ background: tono(o) }}
                      >
                        <span className={`truncate font-medium ${o.estado === "perdida" ? "line-through" : ""}`}>{o.nombre}</span>
                        {o.ingresos > 0 && <span className="ml-auto shrink-0 tabular-nums opacity-80">{dinero(o.ingresos)}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
