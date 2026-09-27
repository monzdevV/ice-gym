import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

/** Minigráfico de línea en SVG: sólo la forma de la tendencia, sin ejes. */
function Tendencia({ valores, tono }: { valores: number[]; tono: string }) {
  if (valores.length < 2) return null;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const rango = max - min || 1;
  const puntos = valores
    .map((v, i) => `${(i / (valores.length - 1)) * 100},${28 - ((v - min) / rango) * 24}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-24 overflow-visible" aria-hidden>
      <polyline points={puntos} fill="none" stroke={tono} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Tarjeta de cifra: qué es, cuánto, cómo va frente al periodo anterior y a dónde ir.
 * El delta lleva flecha y texto, nunca sólo color.
 */
export function Kpi({
  etiqueta,
  valor,
  pie,
  href,
  delta,
  deltaBueno = "sube",
  serie,
  alarma = false,
}: {
  etiqueta: string;
  valor: ReactNode;
  pie: ReactNode;
  href: string;
  delta?: number | null;
  deltaBueno?: "sube" | "baja";
  serie?: number[];
  alarma?: boolean;
}) {
  const hayDelta = delta != null && Number.isFinite(delta) && delta !== 0;
  const bueno = hayDelta && (deltaBueno === "sube" ? delta! > 0 : delta! < 0);
  const tono = bueno ? "var(--exito)" : "var(--critico)";

  return (
    <Link
      href={href}
      className={`group flex flex-col gap-2 rounded-xl border bg-placa p-4 transition-colors hover:border-tinta-2/40 ${
        alarma ? "border-critico/40" : "border-linea"
      }`}
    >
      <span className="text-[0.8125rem] font-medium text-tinta-2">{etiqueta}</span>
      <span className="flex items-end justify-between gap-2">
        <span className={`text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums ${alarma ? "text-critico" : "text-tinta"}`}>
          {valor}
        </span>
        {serie && <Tendencia valores={serie} tono="var(--serie-1)" />}
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-tinta-2">
        {hayDelta && (
          <span className="inline-flex items-center gap-0.5 font-medium" style={{ color: tono }}>
            {delta! > 0 ? <ArrowUpRight className="size-3.5" weight="bold" aria-hidden /> : <ArrowDownRight className="size-3.5" weight="bold" aria-hidden />}
            {Math.abs(Math.round(delta!))}%
            <span className="sr-only">{delta! > 0 ? "más" : "menos"} que el mes pasado</span>
          </span>
        )}
        <span>{pie}</span>
      </span>
    </Link>
  );
}

/** Tarjeta de sección del panel. */
export function Tarjeta({
  titulo,
  subtitulo,
  extra,
  children,
  className = "",
}: {
  titulo: string;
  subtitulo?: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex min-w-0 flex-col rounded-xl border border-linea bg-placa ${className}`}>
      <header className="flex items-start gap-3 px-4 pb-1 pt-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-tinta">{titulo}</h2>
          {subtitulo && <p className="text-[0.8125rem] text-tinta-2">{subtitulo}</p>}
        </div>
        {extra && <div className="ml-auto shrink-0">{extra}</div>}
      </header>
      <div className="min-h-0 flex-1 px-4 pb-4 pt-2">{children}</div>
    </section>
  );
}
