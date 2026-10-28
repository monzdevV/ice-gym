"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { ChartBar, ChartLine, ChartPie, DownloadSimple, Table } from "@phosphor-icons/react";
import {
  AGRUPACIONES_VENTAS,
  GRAFICOS_VENTAS,
  MEDIDAS_VENTAS,
  type AgrupacionVentas,
  type FiltrosVentas,
  type GraficoVentas,
  type MedidaVentas,
  type OportunidadVentasCompleta,
} from "@/lib/ventas";
import { claseCampo } from "@/components/crm/Primitivas";
import { useFlujo } from "./Contexto";
import { agrupar, descargarCsv, formatoMedida, medir } from "./utiles";

ChartJS.register(ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip);

/* El canvas necesita colores reales: se leen de los tokens del CRM y se releen al cambiar de tema. */

const SERIES = ["serie-1", "serie-2", "serie-3", "serie-4", "serie-5", "rampa-1", "rampa-3", "rampa-5"];
type Paleta = { tinta: string; tinta2: string; linea: string; fuente: string; series: string[]; reducido: boolean };

function usePaleta() {
  const ref = useRef<HTMLDivElement>(null);
  const [paleta, setPaleta] = useState<Paleta | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const leer = () => {
      const e = getComputedStyle(el);
      const v = (n: string) => e.getPropertyValue(`--${n}`).trim() || "#888888";
      setPaleta({
        tinta: v("tinta"),
        tinta2: v("tinta-2"),
        linea: v("linea"),
        fuente: e.fontFamily,
        series: SERIES.map(v),
        reducido: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
    };
    leer();
    const obs = new MutationObserver(leer);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    return () => obs.disconnect();
  }, []);
  return { ref, paleta };
}

/** Contenedor del gráfico: entrega la paleta y lo vuelve a montar al cambiar de tema. */
function Lienzo({ etiqueta, children }: { etiqueta: string; children: (p: Paleta) => React.ReactNode }) {
  const { ref, paleta } = usePaleta();
  return (
    <div ref={ref} className="relative min-h-[320px] flex-1 rounded-xl border border-linea bg-placa p-4" role="img" aria-label={etiqueta}>
      {paleta && <Fragment key={paleta.tinta}>{children(paleta)}</Fragment>}
    </div>
  );
}

const ICONO_GRAFICO = { barras: ChartBar, lineas: ChartLine, tarta: ChartPie } as const;
const TEXTO_GRAFICO = { barras: "Barras", lineas: "Líneas", tarta: "Tarta" } as const;

type Pivote = {
  filas: { clave: string; texto: string }[];
  columnas: { clave: string; texto: string }[];
  celda: (fila: string, columna: string) => number;
  totalFila: (fila: string) => number;
  totalColumna: (columna: string) => number;
  total: number;
};

function pivotar(filas: OportunidadVentasCompleta[], porFila: AgrupacionVentas, porColumna: AgrupacionVentas | "", medida: MedidaVentas, etapas: Parameters<typeof agrupar>[2]): Pivote {
  const gf = agrupar(filas, porFila, etapas);
  const gc = porColumna ? agrupar(filas, porColumna, etapas) : [];
  const valores = new Map<string, number>();
  for (const g of gf) {
    for (const c of gc) {
      const ids = new Set(c.filas.map((o) => o.id));
      valores.set(`${g.clave}|${c.clave}`, medir(g.filas.filter((o) => ids.has(o.id)), medida));
    }
  }
  return {
    filas: gf.map(({ clave, texto }) => ({ clave, texto })),
    columnas: gc.map(({ clave, texto }) => ({ clave, texto })),
    celda: (f, c) => valores.get(`${f}|${c}`) ?? 0,
    totalFila: (f) => medir(gf.find((g) => g.clave === f)?.filas ?? [], medida),
    totalColumna: (c) => medir(gc.find((g) => g.clave === c)?.filas ?? [], medida),
    total: medir(filas, medida),
  };
}

export function AnalisisVentas({
  filas,
  filtros: f,
  cambiar,
}: {
  filas: OportunidadVentasCompleta[];
  filtros: FiltrosVentas;
  cambiar: (c: Partial<FiltrosVentas>) => void;
}) {
  const { catalogos } = useFlujo();
  const porFila = f.agrupar[0] ?? "etapa";
  const porColumna = f.columnas && f.columnas !== porFila ? f.columnas : "";
  const p = pivotar(filas, porFila, porColumna, f.medida, catalogos.etapas);
  const fmt = (v: number) => formatoMedida(v, f.medida);

  function descargar() {
    const cabecera = [AGRUPACIONES_VENTAS[porFila], ...p.columnas.map((c) => c.texto), "Total"];
    const cuerpo = p.filas.map((r) => [r.texto, ...p.columnas.map((c) => String(p.celda(r.clave, c.clave))), String(p.totalFila(r.clave))]);
    const pie = ["Total", ...p.columnas.map((c) => String(p.totalColumna(c.clave))), String(p.total)];
    descargarCsv(`flujo-${MEDIDAS_VENTAS[f.medida].toLowerCase().replace(/\s+/g, "-")}.csv`, [cabecera, ...cuerpo, pie]);
  }

  const claseBoton = (on: boolean) =>
    `flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium transition-[background-color,color,box-shadow] ${
      on ? "bg-placa text-tinta shadow-placa" : "text-tinta-2 hover:text-tinta"
    }`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-placa-2 p-0.5" role="group" aria-label="Presentación">
          <button type="button" onClick={() => cambiar({ modo: "grafico" })} aria-pressed={f.modo === "grafico"} className={claseBoton(f.modo === "grafico")}>
            <ChartBar className="size-4" aria-hidden />
            Gráfico
          </button>
          <button type="button" onClick={() => cambiar({ modo: "tabla" })} aria-pressed={f.modo === "tabla"} className={claseBoton(f.modo === "tabla")}>
            <Table className="size-4" aria-hidden />
            Tabla dinámica
          </button>
        </div>
        <label className="flex items-center gap-1.5 text-[0.8125rem] text-tinta-2">
          Medida
          <select value={f.medida} onChange={(e) => cambiar({ medida: e.target.value as MedidaVentas })} className={`${claseCampo} h-8 w-auto`}>
            {Object.entries(MEDIDAS_VENTAS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[0.8125rem] text-tinta-2">
          Filas
          <select value={porFila} onChange={(e) => cambiar({ agrupar: [e.target.value as AgrupacionVentas, ...f.agrupar.slice(1)] })} className={`${claseCampo} h-8 w-auto`}>
            {Object.entries(AGRUPACIONES_VENTAS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[0.8125rem] text-tinta-2">
          Columnas
          <select value={porColumna} onChange={(e) => cambiar({ columnas: e.target.value as AgrupacionVentas | "" })} className={`${claseCampo} h-8 w-auto`}>
            <option value="">Ninguna</option>
            {Object.entries(AGRUPACIONES_VENTAS)
              .filter(([k]) => k !== porFila)
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
        </label>
        {f.modo === "grafico" && (
          <div className="flex rounded-lg bg-placa-2 p-0.5" role="group" aria-label="Tipo de gráfico">
            {GRAFICOS_VENTAS.map((g) => {
              const Icono = ICONO_GRAFICO[g];
              return (
                <button key={g} type="button" onClick={() => cambiar({ grafico: g })} aria-pressed={f.grafico === g} aria-label={TEXTO_GRAFICO[g]} title={TEXTO_GRAFICO[g]} className={claseBoton(f.grafico === g)}>
                  <Icono className="size-4" aria-hidden />
                </button>
              );
            })}
          </div>
        )}
        <button type="button" onClick={descargar} className="ml-auto flex h-8 items-center gap-1.5 rounded-md border border-linea px-3 text-[0.8125rem] font-medium text-tinta hover:bg-placa-2">
          <DownloadSimple className="size-4" aria-hidden />
          Descargar CSV
        </button>
      </div>

      {f.modo === "tabla" ? (
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-linea bg-placa">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">
              {MEDIDAS_VENTAS[f.medida]} por {AGRUPACIONES_VENTAS[porFila].toLowerCase()}
              {porColumna && ` y ${AGRUPACIONES_VENTAS[porColumna].toLowerCase()}`}
            </caption>
            <thead className="sticky top-0 bg-placa">
              <tr className="border-b border-linea text-[0.8125rem] text-tinta-2">
                <th scope="col" className="py-2 pl-4 pr-4 font-normal">
                  {AGRUPACIONES_VENTAS[porFila]}
                </th>
                {p.columnas.map((c) => (
                  <th key={c.clave} scope="col" className="py-2 pr-4 text-right font-normal">
                    {c.texto}
                  </th>
                ))}
                <th scope="col" className="py-2 pr-4 text-right font-medium text-tinta">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {p.filas.map((r) => (
                <tr key={r.clave} className="border-b border-linea/70">
                  <th scope="row" className="py-2 pl-4 pr-4 font-medium text-tinta">
                    {r.texto}
                  </th>
                  {p.columnas.map((c) => (
                    <td key={c.clave} className="py-2 pr-4 text-right tabular-nums text-tinta-2">
                      {fmt(p.celda(r.clave, c.clave))}
                    </td>
                  ))}
                  <td className="py-2 pr-4 text-right font-semibold tabular-nums text-tinta">{fmt(p.totalFila(r.clave))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-linea">
                <th scope="row" className="py-2.5 pl-4 pr-4 font-semibold text-tinta">
                  Total
                </th>
                {p.columnas.map((c) => (
                  <td key={c.clave} className="py-2.5 pr-4 text-right font-semibold tabular-nums text-tinta">
                    {fmt(p.totalColumna(c.clave))}
                  </td>
                ))}
                <td className="py-2.5 pr-4 text-right font-semibold tabular-nums text-tinta">{fmt(p.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <Lienzo
          etiqueta={`${MEDIDAS_VENTAS[f.medida]} por ${AGRUPACIONES_VENTAS[porFila].toLowerCase()}: ${p.filas.map((r) => `${r.texto} ${fmt(p.totalFila(r.clave))}`).join(", ")}`}
        >
          {(paleta) => grafico(f.grafico, p, paleta, fmt)}
        </Lienzo>
      )}
    </div>
  );
}

function grafico(tipo: GraficoVentas, p: Pivote, pal: Paleta, fmt: (v: number) => string) {
  const etiquetas = p.filas.map((r) => r.texto);
  const animacion = pal.reducido ? (false as const) : { duration: 500 };
  const fuente = { family: pal.fuente, size: 12 };

  if (tipo === "tarta") {
    const opciones: ChartOptions<"doughnut"> = {
      maintainAspectRatio: false,
      animation: animacion,
      cutout: "58%",
      plugins: {
        legend: { position: "right", labels: { color: pal.tinta2, font: fuente, usePointStyle: true, boxWidth: 8 } },
        tooltip: { callbacks: { label: (c) => ` ${c.label}: ${fmt(Number(c.raw))}` } },
      },
    };
    return (
      <Doughnut
        data={{
          labels: etiquetas,
          datasets: [{ data: p.filas.map((r) => p.totalFila(r.clave)), backgroundColor: etiquetas.map((_, i) => pal.series[i % pal.series.length]), borderColor: pal.linea, borderWidth: 1 }],
        }}
        options={opciones}
      />
    );
  }

  // Con columnas: una serie por columna; sin ellas, el total de cada fila.
  const series = p.columnas.length
    ? p.columnas.map((c, i) => ({ label: c.texto, data: p.filas.map((r) => p.celda(r.clave, c.clave)), color: pal.series[i % pal.series.length] }))
    : [{ label: "Total", data: p.filas.map((r) => p.totalFila(r.clave)), color: pal.series[0] }];

  const ejes = {
    x: { stacked: tipo === "barras", grid: { display: false }, ticks: { color: pal.tinta2, font: fuente }, border: { color: pal.linea } },
    y: { stacked: tipo === "barras", beginAtZero: true, grid: { color: pal.linea }, ticks: { color: pal.tinta2, font: fuente, callback: (v: string | number) => fmt(Number(v)) }, border: { display: false } },
  };
  const plugins = {
    legend: { display: series.length > 1, position: "bottom" as const, labels: { color: pal.tinta2, font: fuente, usePointStyle: true, boxWidth: 8 } },
    tooltip: { callbacks: { label: (c: { dataset: { label?: string }; raw: unknown }) => ` ${c.dataset.label}: ${fmt(Number(c.raw))}` } },
  };

  if (tipo === "lineas") {
    return (
      <Line
        data={{ labels: etiquetas, datasets: series.map((s) => ({ label: s.label, data: s.data, borderColor: s.color, backgroundColor: s.color, tension: 0.3, pointRadius: 3 })) }}
        options={{ maintainAspectRatio: false, animation: animacion, scales: ejes, plugins }}
      />
    );
  }
  return (
    <Bar
      data={{ labels: etiquetas, datasets: series.map((s) => ({ label: s.label, data: s.data, backgroundColor: s.color, borderRadius: 6, maxBarThickness: 56 })) }}
      options={{ maintainAspectRatio: false, animation: animacion, scales: ejes, plugins }}
    />
  );
}
