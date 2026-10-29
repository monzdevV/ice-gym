import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar, Tag } from "@/components/crm/b2b/Piezas";
import {
  ETIQUETA_ESTADO_EMPLEADO,
  ETIQUETA_ESTADO_FIRMA,
  ETIQUETA_ESTADO_TAREA,
  ETIQUETA_ESTADO_VACACIONES,
  ETIQUETA_PUNTUACION,
  ETIQUETA_ROL,
  TONO_ESTADO_FIRMA,
  TONO_ESTADO_TAREA,
  TONO_ESTADO_VACACIONES,
  TONO_PUNTUACION,
  TONO_ROL,
  nombreEmpleado,
  rutaRrhh,
  type EmpleadoMini,
  type EstadoEmpleado,
  type EstadoFirma,
  type EstadoTarea,
  type EstadoVacaciones,
  type Rol,
} from "@/lib/rrhh";

/** Piezas visuales de RRHH (server-safe: sin hooks). Reutilizan Tag y Avatar del CRM. */

export const claseBotonSecundarioRrhh =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-linea bg-placa px-3 text-[0.8125rem] font-medium text-tinta transition-colors hover:bg-placa-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento disabled:cursor-not-allowed disabled:opacity-50";

export const claseBotonAccionRrhh =
  "inline-flex h-8 items-center gap-1.5 rounded-md bg-acento px-3 text-[0.8125rem] font-medium text-sobre-campo shadow-sm transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

export const claseEnlaceSeccion = "inline-flex items-center gap-1 text-[0.8125rem] font-medium text-acento-tinta hover:underline";

type Persona = Pick<EmpleadoMini, "id" | "nombre" | "apellidos"> & { foto_url?: string | null };

export function AvatarEmpleado({ e, tamano = "sm" }: { e: Persona; tamano?: "xs" | "sm" | "md" | "lg" }) {
  return <Avatar nombre={e.nombre} apellidos={e.apellidos} url={e.foto_url} tamano={tamano} />;
}

/** Enlace a la ficha del empleado, con su foto. */
export function EnlaceEmpleado({ e, conAvatar = true, detalle }: { e: Persona | null | undefined; conAvatar?: boolean; detalle?: ReactNode }) {
  if (!e) return <span className="text-sm text-tinta-2">—</span>;
  return (
    <Link href={rutaRrhh.empleado(e.id)} className="inline-flex min-w-0 items-center gap-2 text-sm text-tinta hover:underline">
      {conAvatar && <AvatarEmpleado e={e} tamano="xs" />}
      <span className="min-w-0">
        <span className="block truncate">{nombreEmpleado(e)}</span>
        {detalle && <span className="block truncate text-xs text-tinta-2">{detalle}</span>}
      </span>
    </Link>
  );
}

/** Persona sin enlace (p. ej. el evaluador o quien aprobó). */
export function PersonaRrhh({ e }: { e: Persona | null | undefined }) {
  if (!e) return <span className="text-sm text-tinta-2">—</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5" title={nombreEmpleado(e)}>
      <AvatarEmpleado e={e} tamano="xs" />
      <span className="truncate text-sm text-tinta">{nombreEmpleado(e)}</span>
    </span>
  );
}

export const BadgeRol = ({ rol }: { rol: Rol }) => <Tag tono={TONO_ROL[rol]}>{ETIQUETA_ROL[rol]}</Tag>;

export function EstadoEmpleadoMarca({ estado }: { estado: EstadoEmpleado }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-linea bg-placa px-2 py-0.5 text-xs font-medium ${
        estado === "activo" ? "text-tinta" : "text-tinta-2"
      }`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${estado === "activo" ? "bg-emerald-500" : "bg-apagado"}`} aria-hidden />
      {ETIQUETA_ESTADO_EMPLEADO[estado]}
    </span>
  );
}

export const BadgeVacaciones = ({ estado }: { estado: EstadoVacaciones }) => (
  <Tag tono={TONO_ESTADO_VACACIONES[estado]}>{ETIQUETA_ESTADO_VACACIONES[estado]}</Tag>
);

export const BadgeFirma = ({ estado }: { estado: EstadoFirma }) => <Tag tono={TONO_ESTADO_FIRMA[estado]}>{ETIQUETA_ESTADO_FIRMA[estado]}</Tag>;

export const BadgeTarea = ({ estado }: { estado: EstadoTarea }) => <Tag tono={TONO_ESTADO_TAREA[estado]}>{ETIQUETA_ESTADO_TAREA[estado]}</Tag>;

/** Puntuación 1–5: cinco marcas, la cifra y su significado. */
export function Puntuacion({ valor, conTexto = true }: { valor: number; conTexto?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="sr-only">
        {valor} de 5, {ETIQUETA_PUNTUACION[valor]}
      </span>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className="h-2 w-3 rounded-sm"
            style={{ background: n <= valor ? TONO_PUNTUACION[valor] : "var(--placa-2)" }}
          />
        ))}
      </span>
      <span className="text-sm font-medium tabular-nums text-tinta" aria-hidden>
        {valor}/5
      </span>
      {conTexto && (
        <span className="text-xs text-tinta-2" aria-hidden>
          {ETIQUETA_PUNTUACION[valor]}
        </span>
      )}
    </span>
  );
}

/** Barra de progreso fina con su cifra. */
export function Progreso({
  pct,
  texto,
  completado = false,
  etiqueta = "Progreso de la incorporación",
}: {
  pct: number;
  texto?: ReactNode;
  completado?: boolean;
  etiqueta?: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-placa-2"
        role="progressbar"
        aria-label={etiqueta}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={completado ? "Completada" : `${pct} %`}
      >
        <span
          className="block h-full rounded-full transition-[width]"
          style={{ width: `${pct}%`, background: completado ? "var(--relleno-verde)" : "var(--acento)" }}
        />
      </span>
      {texto && <span className="shrink-0 text-xs tabular-nums text-tinta-2">{texto}</span>}
    </span>
  );
}

/** Fila de cifras de cabecera, como en las fichas de contacto y empresa. */
export function Cifras({ items }: { items: { k: string; v: ReactNode; detalle?: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((c) => (
        <div key={c.k} className="rounded-xl border border-linea bg-placa px-4 py-3">
          <dt className="text-[0.8125rem] text-tinta-2">{c.k}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-tinta">{c.v}</dd>
          {c.detalle && <dd className="mt-0.5 text-xs text-tinta-2">{c.detalle}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Tabla dentro de una Seccion o en caja propia, con el mismo marco que el resto del CRM. `titulo` es su caption (sólo para lectores de pantalla). */
export function MarcoTabla({
  children,
  titulo,
  enSeccion = false,
  minimo = "min-w-[720px]",
}: {
  children: ReactNode;
  titulo: string;
  enSeccion?: boolean;
  minimo?: string;
}) {
  // Dentro de una ficha la columna es estrecha: las celdas se ajustan antes de pedir scroll horizontal.
  const tabla = (
    <table className={`w-full ${enSeccion ? "min-w-[600px]" : minimo} border-collapse text-left`}>
      <caption className="sr-only">{titulo}</caption>
      {children}
    </table>
  );
  if (enSeccion) return <div className="-m-4 overflow-x-auto">{tabla}</div>;
  return <div className="overflow-x-auto rounded-xl border border-linea bg-placa">{tabla}</div>;
}

export const claseCabeceraTabla = "border-b border-linea text-[0.8125rem] text-tinta-2";
export const claseFilaTabla = "border-b border-linea/70 transition-colors last:border-0 hover:bg-placa-2/50";
