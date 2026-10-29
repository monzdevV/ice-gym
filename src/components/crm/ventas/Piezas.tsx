import type { CSSProperties } from "react";
import {
  CalendarCheck,
  CheckSquare,
  Clock,
  ClockCountdown,
  EnvelopeSimple,
  FileText,
  Phone,
  Star,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { tonoColor } from "@/lib/b2b";
import {
  ETIQUETA_ESTADO_VENTA,
  ETIQUETA_PLAZO,
  ETIQUETA_PRIORIDAD_VENTA,
  TONO_PLAZO,
  type EstadoVenta,
  type EtiquetaVentas,
  type IconoActividad,
  type Plazo,
} from "@/lib/ventas";
import { Senal, Tag } from "@/components/crm/b2b/Piezas";

/** Piezas visuales del segmento Ventas (server-safe: sin hooks). */

export const ICONO_ACTIVIDAD: Record<IconoActividad, Icon> = {
  email: EnvelopeSimple,
  llamada: Phone,
  reunion: UsersThree,
  documento: FileText,
  tarea: CheckSquare,
};

/**
 * Icono del tipo de actividad, en una placa suave del color de su plazo. El icono
 * va en el tono y la placa en su versión suave: el blanco sobre ámbar o verde del
 * tema oscuro no llegaba a 3:1.
 */
export function IconoActividad({ icono, plazo, className = "" }: { icono: IconoActividad | null | undefined; plazo?: Plazo | null; className?: string }) {
  const Icono = ICONO_ACTIVIDAD[icono ?? "tarea"] ?? CheckSquare;
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center rounded-full ${className}`}
      style={plazo ? { background: FONDO_PLAZO[plazo], color: TONO_PLAZO[plazo] } : { background: "var(--placa-2)", color: "var(--tinta-2)" }}
      aria-hidden
    >
      <Icono className="size-3.5" weight="bold" />
    </span>
  );
}

const FONDO_PLAZO: Record<Plazo, string> = { vencida: "var(--critico-suave)", hoy: "var(--aviso-suave)", planificada: "var(--exito-suave)" };

/** Cada plazo con su propia forma, para que no dependa sólo del rojo, ámbar o verde. */
const ICONO_PLAZO: Record<Plazo, Icon> = { vencida: WarningCircle, hoy: ClockCountdown, planificada: CalendarCheck };

/**
 * Reloj de actividad de las tarjetas y filas: gris sin nada planificado; rojo,
 * ámbar o verde según la más urgente. El color nunca va solo: cada plazo tiene
 * su icono (aviso, cuenta atrás, calendario), título y texto oculto.
 */
export function MarcaPlazo({ plazo, n = 0 }: { plazo: Plazo | null; n?: number }) {
  const texto = plazo ? `${n} ${n === 1 ? "actividad" : "actividades"} · ${ETIQUETA_PLAZO[plazo].toLowerCase()}` : "Sin actividades planificadas";
  const Icono = plazo ? ICONO_PLAZO[plazo] : Clock;
  return (
    <span className="inline-grid size-5 place-items-center" style={{ color: plazo ? TONO_PLAZO[plazo] : "var(--tinta-2)" }} title={texto}>
      <Icono className="size-[18px]" weight={plazo ? "fill" : "regular"} aria-hidden />
      <span className="sr-only">{texto}</span>
    </span>
  );
}

/** Estrellas de prioridad, sólo lectura. Para editarlas, `EstrellasEditables`. */
export function Estrellas({ n, tamano = "size-4" }: { n: number; tamano?: string }) {
  return (
    <span className="inline-flex items-center" title={`Prioridad: ${ETIQUETA_PRIORIDAD_VENTA[n] ?? "Normal"}`}>
      {[1, 2, 3].map((i) => (
        <Star key={i} className={`${tamano} ${i <= n ? "text-aviso" : "text-tinta-2/80"}`} weight={i <= n ? "fill" : "regular"} aria-hidden />
      ))}
      <span className="sr-only">Prioridad {ETIQUETA_PRIORIDAD_VENTA[n] ?? "Normal"}</span>
    </span>
  );
}

export function EtiquetaChip({ e }: { e: Pick<EtiquetaVentas, "nombre" | "color"> }) {
  return <Tag tono={tonoColor(e.color)}>{e.nombre}</Tag>;
}

export function Etiquetas({ lista, max = 3 }: { lista: Pick<EtiquetaVentas, "id" | "nombre" | "color">[]; max?: number }) {
  if (!lista.length) return null;
  const resto = lista.length - max;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {lista.slice(0, max).map((e) => (
        <EtiquetaChip key={e.id} e={e} />
      ))}
      {resto > 0 && <span className="text-xs text-tinta-2">+{resto}</span>}
    </span>
  );
}

export function SenalEstadoVenta({ estado }: { estado: EstadoVenta }) {
  if (estado === "ganada") return <Senal tipo="exito">{ETIQUETA_ESTADO_VENTA.ganada}</Senal>;
  if (estado === "perdida") return <Senal tipo="critico">{ETIQUETA_ESTADO_VENTA.perdida}</Senal>;
  return <Senal tipo="acento">{ETIQUETA_ESTADO_VENTA.abierta}</Senal>;
}

/** Punto de color de un equipo de ventas o etiqueta. */
export function PuntoColor({ color, className = "size-2.5" }: { color: string | null | undefined; className?: string }) {
  return <span className={`${className} shrink-0 rounded-full`} style={{ background: tonoColor(color) } as CSSProperties} aria-hidden />;
}
