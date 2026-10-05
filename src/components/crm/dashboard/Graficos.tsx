"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DIRECCION_TIPO,
  ETIQUETA_ETAPA,
  ETIQUETA_TIPO_OPORTUNIDAD,
  TONO_DIRECCION,
  type Etapa,
  type TipoOportunidad,
} from "@/lib/b2b";
import { dinero, mesCorto, numero } from "@/lib/formato";

const eje = { tickLine: false, axisLine: false } as const;
const rejilla = <CartesianGrid vertical={false} stroke="var(--linea)" />;
const euroCorto = (v: number) =>
  v >= 1_000_000 ? `${Math.round(v / 100_000) / 10}M` : v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${v}`;
const cursor = { fill: "var(--placa-2)" };

/** Fila del tooltip: nombre a la izquierda, cifra tabular a la derecha. */
function Linea({ nombre, valor, tono }: { nombre: string; valor: string; tono?: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      {tono && <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: tono }} aria-hidden />}
      <span className="text-tinta-2">{nombre}</span>
      <span className="ml-auto pl-3 font-medium tabular-nums text-tinta">{valor}</span>
    </div>
  );
}

/* ------------------------------ Por etapa ------------------------------ */

const tonoEtapa = (e: Etapa) => (e === "ganada" ? "var(--exito)" : e === "perdida" ? "var(--critico)" : "var(--serie-1)");
const configEtapa = { valor: { label: "Valor", color: "var(--serie-1)" } } satisfies ChartConfig;

/** Valor por etapa; encima de cada barra, cuántas oportunidades hay. */
export function GraficoEtapas({ datos }: { datos: { etapa: Etapa; n: number; valor: number; esperado: number }[] }) {
  const filas = datos.map((d) => ({ ...d, etiqueta: ETIQUETA_ETAPA[d.etapa] }));
  return (
    <ChartContainer config={configEtapa} className="aspect-auto h-64 w-full">
      <BarChart data={filas} margin={{ left: 0, right: 4, top: 20 }} barCategoryGap="24%">
        {rejilla}
        <XAxis dataKey="etiqueta" {...eje} tickMargin={8} interval={0} fontSize={11} />
        <YAxis {...eje} width={44} tickFormatter={euroCorto} />
        <ChartTooltip
          cursor={cursor}
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(_v, _n, item) => {
                const p = item.payload as (typeof filas)[number];
                return (
                  <div className="grid w-full gap-1">
                    <Linea nombre="Valor" valor={dinero(p.valor)} tono={tonoEtapa(p.etapa)} />
                    <Linea nombre="Esperado" valor={dinero(p.esperado)} />
                    <Linea nombre="Oportunidades" valor={numero(p.n)} />
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
          {filas.map((d) => (
            <Cell key={d.etapa} fill={tonoEtapa(d.etapa)} />
          ))}
          <LabelList dataKey="n" position="top" className="fill-tinta-2" fontSize={11} formatter={(v) => (Number(v) ? `${v}` : "")} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/* ------------------------------- Por tipo ------------------------------- */

const configTipo = { valor: { label: "Valor", color: "var(--serie-1)" } } satisfies ChartConfig;
const DIRECCIONES = [
  { clave: "venta", texto: "Venta" },
  { clave: "compra", texto: "Compra" },
  { clave: "alianza", texto: "Alianza" },
] as const;

/** Barras horizontales: los tipos con más valor abierto arriba, coloreados por dirección del dinero. */
export function GraficoTipos({ datos }: { datos: { tipo: TipoOportunidad; n: number; valor: number }[] }) {
  const filas = datos.map((d) => ({ ...d, etiqueta: ETIQUETA_TIPO_OPORTUNIDAD[d.tipo] }));
  const alto = Math.max(160, filas.length * 30 + 20);
  return (
    <div>
      <ChartContainer config={configTipo} className="aspect-auto w-full" style={{ height: alto }}>
        <BarChart data={filas} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }} barCategoryGap="22%">
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="etiqueta" {...eje} width={148} fontSize={11} interval={0} />
          <ChartTooltip
            cursor={cursor}
            content={
              <ChartTooltipContent
                hideIndicator
                formatter={(_v, _n, item) => {
                  const p = item.payload as (typeof filas)[number];
                  return (
                    <div className="grid w-full gap-1">
                      <Linea nombre="Valor abierto" valor={dinero(p.valor)} tono={TONO_DIRECCION[DIRECCION_TIPO[p.tipo]]} />
                      <Linea nombre="Oportunidades" valor={numero(p.n)} />
                    </div>
                  );
                }}
              />
            }
          />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
            {filas.map((d) => (
              <Cell key={d.tipo} fill={TONO_DIRECCION[DIRECCION_TIPO[d.tipo]]} />
            ))}
            <LabelList dataKey="valor" position="right" className="fill-tinta-2" fontSize={11} formatter={(v) => euroCorto(Number(v))} />
          </Bar>
        </BarChart>
      </ChartContainer>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-2">
        {DIRECCIONES.map((d) => (
          <li key={d.clave} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px]" style={{ background: TONO_DIRECCION[d.clave] }} aria-hidden />
            {d.texto}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------- Series por mes ---------------------------- */

type Mes = { mes: string; creadas: number; valorCreado: number; ganadas: number; perdidas: number; valorGanado: number; pipeline: number };
const conEtiqueta = (datos: Mes[]) => datos.map((d) => ({ ...d, etiqueta: mesCorto(d.mes) }));

const configCreadas = { creadas: { label: "Creadas", color: "var(--serie-1)" } } satisfies ChartConfig;

export function GraficoCreadas({ datos }: { datos: Mes[] }) {
  const filas = conEtiqueta(datos);
  return (
    <ChartContainer config={configCreadas} className="aspect-auto h-56 w-full">
      <BarChart data={filas} margin={{ left: 0, right: 4, top: 8 }} barCategoryGap="28%">
        {rejilla}
        <XAxis dataKey="etiqueta" {...eje} tickMargin={8} />
        <YAxis {...eje} width={28} allowDecimals={false} />
        <ChartTooltip
          cursor={cursor}
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(_v, _n, item) => {
                const p = item.payload as (typeof filas)[number];
                return (
                  <div className="grid w-full gap-1">
                    <Linea nombre="Creadas" valor={numero(p.creadas)} tono="var(--serie-1)" />
                    <Linea nombre="Valor" valor={dinero(p.valorCreado)} />
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="creadas" fill="var(--color-creadas)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

const configCierres = {
  ganadas: { label: "Ganadas", color: "var(--exito)" },
  perdidas: { label: "Perdidas", color: "var(--critico)" },
} satisfies ChartConfig;

export function GraficoGanadasPerdidas({ datos }: { datos: Mes[] }) {
  const filas = conEtiqueta(datos);
  return (
    <ChartContainer config={configCierres} className="aspect-auto h-56 w-full">
      <BarChart data={filas} margin={{ left: 0, right: 4, top: 8 }} barGap={2} barCategoryGap="26%">
        {rejilla}
        <XAxis dataKey="etiqueta" {...eje} tickMargin={8} />
        <YAxis {...eje} width={28} allowDecimals={false} />
        <ChartTooltip cursor={cursor} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
        <Bar dataKey="ganadas" fill="var(--color-ganadas)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="perdidas" fill="var(--color-perdidas)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

const configPipeline = { pipeline: { label: "Pipeline abierto", color: "var(--serie-1)" } } satisfies ChartConfig;

/** Valor abierto al cierre de cada mes (el último, a día de hoy). */
export function GraficoPipeline({ datos }: { datos: Mes[] }) {
  const filas = conEtiqueta(datos);
  return (
    <ChartContainer config={configPipeline} className="aspect-auto h-56 w-full">
      <AreaChart data={filas} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="relleno-pipeline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-pipeline)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-pipeline)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {rejilla}
        <XAxis dataKey="etiqueta" {...eje} tickMargin={8} />
        <YAxis {...eje} width={44} tickFormatter={euroCorto} />
        <ChartTooltip
          cursor={{ stroke: "var(--linea)" }}
          content={<ChartTooltipContent formatter={(v) => <Linea nombre="Pipeline abierto" valor={dinero(Number(v))} tono="var(--serie-1)" />} />}
        />
        <Area
          dataKey="pipeline"
          type="monotone"
          stroke="var(--color-pipeline)"
          strokeWidth={2}
          fill="url(#relleno-pipeline)"
          dot={{ r: 2.5, fill: "var(--color-pipeline)", strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
