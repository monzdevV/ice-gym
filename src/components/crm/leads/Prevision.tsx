"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cierreEsperado, totales, valorPonderado } from "@/lib/oportunidad";
import { dinero, numero } from "@/lib/formato";
import { ETAPAS_ABIERTAS, ETIQUETA_LEAD } from "@/lib/tipos";
import { SinDatos } from "@/components/crm/Primitivas";
import { TagEtapa } from "./Piezas";
import type { FilaLead } from "./filtros";

const MESES = 6;

/** Una serie por etapa abierta, en el orden fijo de la paleta categórica. */
const config = Object.fromEntries(
  ETAPAS_ABIERTAS.map((e, i) => [e, { label: ETIQUETA_LEAD[e], color: `var(--serie-${i + 1})` }])
) satisfies ChartConfig;

const mesCorto = new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit", timeZone: "Europe/Madrid" });

export function Prevision({ filas }: { filas: FilaLead[] }) {
  const abiertas = filas.filter((f) => (ETAPAS_ABIERTAS as readonly string[]).includes(f.estado));

  if (abiertas.length === 0) {
    return (
      <SinDatos
        titulo="No hay oportunidades abiertas"
        texto="La previsión se calcula con los leads que siguen vivos. Cuando entren leads nuevos aparecerán aquí."
      />
    );
  }

  // Meses desde el actual; lo vencido cuenta en el mes en curso.
  const ahora = new Date();
  const base = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1);
  const meses = Array.from({ length: MESES }, (_, i) => {
    const d = new Date(base);
    d.setUTCMonth(d.getUTCMonth() + i);
    return d;
  });
  const datos = meses.map((d) => ({
    mes: mesCorto.format(d).replace(".", ""),
    ...Object.fromEntries(ETAPAS_ABIERTAS.map((e) => [e, 0])),
  })) as ({ mes: string } & Record<string, number>)[];

  let masAlla = 0;
  for (const l of abiertas) {
    const c = new Date(cierreEsperado(l));
    const i = Math.max(0, (c.getUTCFullYear() - ahora.getUTCFullYear()) * 12 + c.getUTCMonth() - ahora.getUTCMonth());
    if (i >= MESES) {
      masAlla += valorPonderado(l);
      continue;
    }
    datos[i][l.estado] += Math.round(valorPonderado(l));
  }

  const t = totales(abiertas);
  const porEtapa = ETAPAS_ABIERTAS.map((e) => {
    const grupo = abiertas.filter((l) => l.estado === e);
    return { estado: e, ...totales(grupo) };
  });

  return (
    <div className="relative grid grid-cols-1 content-start gap-4 md:h-full md:overflow-y-auto xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section className="rounded-xl border border-linea bg-placa p-4">
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-tinta">Previsión ponderada por mes de cierre</h2>
            <p className="text-[0.8125rem] text-tinta-2">
              Valor anual × probabilidad. El mes sale de la próxima acción, la visita o, si no hay, a 30 días.
            </p>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-tinta">{dinero(t.ponderado)}</p>
        </header>
        <ChartContainer config={config} className="aspect-auto h-72 w-full">
          <BarChart data={datos} margin={{ left: 4, right: 4, top: 8 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--linea)" />
            <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k €` : `${v} €`)}
            />
            <ChartTooltip
              cursor={{ fill: "var(--placa-2)" }}
              content={<ChartTooltipContent formatter={(v, n) => `${config[n as keyof typeof config]?.label}: ${dinero(Number(v))}`} />}
            />
            <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
            {ETAPAS_ABIERTAS.map((e, i) => (
              <Bar
                key={e}
                dataKey={e}
                stackId="p"
                fill={`var(--color-${e})`}
                stroke="var(--placa)"
                strokeWidth={2}
                radius={i === ETAPAS_ABIERTAS.length - 1 ? [4, 4, 0, 0] : 0}
              />
            ))}
          </BarChart>
        </ChartContainer>
        {masAlla > 0 && (
          <p className="mt-2 text-[0.8125rem] text-tinta-2">
            Además, {dinero(masAlla)} ponderados con cierre más allá de {MESES} meses.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-linea bg-placa">
        <h2 className="border-b border-linea px-4 py-3 text-sm font-semibold text-tinta">Pipeline por etapa</h2>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] text-sm">
          <thead>
            <tr className="text-left text-[0.8125rem] text-tinta-2">
              <th className="px-4 py-2 font-normal">Etapa</th>
              <th className="px-2 py-2 text-right font-normal">Leads</th>
              <th className="px-2 py-2 text-right font-normal">Valor</th>
              <th className="px-4 py-2 text-right font-normal">Ponderado</th>
            </tr>
          </thead>
          <tbody>
            {porEtapa.map((f) => (
              <tr key={f.estado} className="border-t border-linea/70">
                <td className="px-4 py-2.5">
                  <TagEtapa estado={f.estado} />
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums text-tinta">{numero(f.n)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-tinta-2">{dinero(f.valor)}</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-tinta">{dinero(f.ponderado)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-linea font-semibold">
              <td className="px-4 py-2.5 text-tinta">Total</td>
              <td className="px-2 py-2.5 text-right tabular-nums text-tinta">{numero(t.n)}</td>
              <td className="px-2 py-2.5 text-right tabular-nums text-tinta">{dinero(t.valor)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-tinta">{dinero(t.ponderado)}</td>
            </tr>
          </tfoot>
        </table>
        </div>
      </section>
    </div>
  );
}
