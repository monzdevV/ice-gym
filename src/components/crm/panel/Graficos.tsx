"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { dinero, mesCorto, numero } from "@/lib/formato";

const eje = { tickLine: false, axisLine: false } as const;
const rejilla = <CartesianGrid vertical={false} stroke="var(--linea)" />;
const euroCorto = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${v}`);

/* -------------------------------- Ingresos ------------------------------- */

const configIngresos = {
  cobrado: { label: "Cobrado", color: "var(--serie-1)" },
  impagado: { label: "Impagado", color: "var(--critico)" },
} satisfies ChartConfig;

/** Seis meses: cobrado e impagado apilados, con 2 px de hueco entre segmentos. */
export function GraficoIngresos({ datos }: { datos: { mes: string; cobrado: number; impagado: number }[] }) {
  const filas = datos.map((d) => ({ ...d, etiqueta: mesCorto(d.mes) }));
  return (
    <ChartContainer config={configIngresos} className="aspect-auto h-60 w-full">
      <BarChart data={filas} margin={{ left: 0, right: 4, top: 8 }} barCategoryGap="30%">
        {rejilla}
        <XAxis dataKey="etiqueta" {...eje} tickMargin={8} />
        <YAxis {...eje} width={40} tickFormatter={euroCorto} />
        <ChartTooltip
          cursor={{ fill: "var(--placa-2)" }}
          content={<ChartTooltipContent formatter={(v, n) => `${configIngresos[n as keyof typeof configIngresos].label}: ${dinero(Number(v))}`} />}
        />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
        <Bar dataKey="cobrado" stackId="i" fill="var(--color-cobrado)" stroke="var(--placa)" strokeWidth={2} />
        <Bar dataKey="impagado" stackId="i" fill="var(--color-impagado)" stroke="var(--placa)" strokeWidth={2} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

/* ------------------------------ Altas y bajas ---------------------------- */

const configAltas = {
  altas: { label: "Altas", color: "var(--serie-1)" },
  bajas: { label: "Bajas", color: "var(--serie-2)" },
} satisfies ChartConfig;

export function GraficoAltasBajas({ datos }: { datos: { mes: string; altas: number; bajas: number }[] }) {
  const filas = datos.map((d) => ({ ...d, etiqueta: mesCorto(d.mes) }));
  return (
    <ChartContainer config={configAltas} className="aspect-auto h-60 w-full">
      <BarChart data={filas} margin={{ left: 0, right: 4, top: 8 }} barGap={2} barCategoryGap="28%">
        {rejilla}
        <XAxis dataKey="etiqueta" {...eje} tickMargin={8} />
        <YAxis {...eje} width={32} allowDecimals={false} />
        <ChartTooltip cursor={{ fill: "var(--placa-2)" }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
        <Bar dataKey="altas" fill="var(--color-altas)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="bajas" fill="var(--color-bajas)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

/* -------------------------------- Afluencia ------------------------------ */

const configAfluencia = { accesos: { label: "Accesos", color: "var(--serie-1)" } } satisfies ChartConfig;

/** Una serie, sin leyenda: el título la nombra. La hora punta se resalta y se rotula. */
export function GraficoAfluencia({ datos }: { datos: { hora: number; accesos: number }[] }) {
  const punta = datos.reduce((a, b) => (b.accesos > a.accesos ? b : a), datos[0] ?? { hora: 0, accesos: 0 });
  const filas = datos.map((d) => ({ ...d, etiqueta: `${d.hora}h` }));
  return (
    <div>
      <p className="mb-2 text-[0.8125rem] text-tinta-2">
        Hora punta: <span className="font-medium text-tinta">{punta.hora}:00</span> · {numero(punta.accesos)} accesos
      </p>
      <ChartContainer config={configAfluencia} className="aspect-auto h-48 w-full">
        <BarChart data={filas} margin={{ left: 0, right: 4, top: 4 }} barCategoryGap="18%">
          {rejilla}
          <XAxis dataKey="etiqueta" {...eje} tickMargin={6} interval={2} />
          <YAxis {...eje} width={36} tickFormatter={euroCorto} />
          <ChartTooltip cursor={{ fill: "var(--placa-2)" }} content={<ChartTooltipContent hideIndicator />} />
          <Bar dataKey="accesos" radius={[4, 4, 0, 0]}>
            {filas.map((d) => (
              <Cell key={d.hora} fill={d.hora === punta.hora ? "var(--tinta)" : "var(--color-accesos)"} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
