"use client";

import type { CSSProperties, ReactNode } from "react";
import { Fire, Snowflake, ThermometerSimple, WarningCircle, type Icon } from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ETIQUETA_NIVEL, TONO_NIVEL, type Puntuacion } from "@/lib/oportunidad";
import { ETIQUETA_LEAD, TONO_LEAD, type EstadoLead } from "@/lib/tipos";

/** Etiqueta de color. El tono es una variable CSS (var(--relleno-azul)…). */
export function Tag({ tono, children, className = "" }: { tono?: string; children: ReactNode; className?: string }) {
  return (
    <span className={`tag ${className}`} style={tono ? ({ "--tono": tono } as CSSProperties) : undefined}>
      {children}
    </span>
  );
}

export function TagEtapa({ estado }: { estado: EstadoLead }) {
  return <Tag tono={TONO_LEAD[estado]}>{ETIQUETA_LEAD[estado]}</Tag>;
}

/** Tono de la barra de probabilidad: rojo → ámbar → verde. */
function tonoProbabilidad(p: number) {
  if (p >= 60) return "var(--exito)";
  if (p >= 30) return "var(--aviso)";
  return "var(--critico)";
}

/** Barra segmentada de 12 celdas con el porcentaje al lado. */
export function BarraProbabilidad({ valor, celdas = 12 }: { valor: number; celdas?: number }) {
  const llenas = Math.round((valor / 100) * celdas);
  const tono = tonoProbabilidad(valor);
  return (
    <span className="flex items-center gap-2.5" aria-label={`Probabilidad ${valor} %`}>
      <span className="flex gap-[2px]" aria-hidden>
        {Array.from({ length: celdas }, (_, i) => (
          <span
            key={i}
            className="h-3.5 w-[3px] rounded-[1px]"
            style={{ backgroundColor: i < llenas ? tono : "var(--linea)" }}
          />
        ))}
      </span>
      <span className="w-9 text-right text-sm tabular-nums text-tinta">{valor}%</span>
    </span>
  );
}

/** Minigráfico de barras: interacciones por semana. */
export function Sparkline({ valores, etiqueta }: { valores: number[]; etiqueta: string }) {
  const max = Math.max(1, ...valores);
  return (
    <span className="flex h-5 items-end gap-[2px]" role="img" aria-label={etiqueta} title={etiqueta}>
      {valores.map((v, i) => (
        <span
          key={i}
          className="w-[4px] rounded-t-[1px]"
          style={{
            height: `${v === 0 ? 2 : Math.max(4, (v / max) * 20)}px`,
            backgroundColor: v === 0 ? "var(--linea)" : "var(--exito)",
          }}
        />
      ))}
    </span>
  );
}

const ICONO_NIVEL: Record<Puntuacion["nivel"], Icon> = {
  caliente: Fire,
  templado: ThermometerSimple,
  frio: Snowflake,
  riesgo: WarningCircle,
};

/** Nivel del lead con sus motivos en un tooltip: icono y texto en su color, sin caja. */
export function MarcaNivel({ p, compacta = false }: { p: Puntuacion | null; compacta?: boolean }) {
  if (!p) return <span className="text-sm text-tinta-2">—</span>;
  const Icono = ICONO_NIVEL[p.nivel];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded text-[0.8125rem] font-medium outline-none focus-visible:ring-2 focus-visible:ring-acento"
          style={{ color: TONO_NIVEL[p.nivel] }}
        >
          <Icono className="size-4 shrink-0" weight="bold" aria-hidden />
          <span className={compacta ? "sr-only" : undefined}>{ETIQUETA_NIVEL[p.nivel]}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-64">
        <p className="mb-1 font-semibold">{ETIQUETA_NIVEL[p.nivel]}</p>
        <ul className="list-disc space-y-0.5 pl-4">
          {p.motivos.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
