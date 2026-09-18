import type { ReactNode } from "react";
import { ETIQUETA_SOCIO, type EstadoSocio } from "@/lib/tipos";

/**
 * Cabecera de pantalla como rótulo de retransmisión: una franja azul y la
 * placa del título con el corte inclinado. Sin antetítulos: el título manda.
 */
export function Encabezado({
  titulo,
  meta,
  children,
}: {
  titulo: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-4 pb-5 pt-6 lg:px-8">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-tinta">{titulo}</h1>
        {meta && <div className="text-sm text-tinta-2">{meta}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  );
}

/**
 * Sección sin caja: un título condensado y una regla que la separa del resto.
 * La profundidad la dan el espacio y las líneas, nunca una tarjeta.
 */
export function Seccion({
  titulo,
  extra,
  children,
  className = "",
  id,
}: {
  titulo: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-xl border border-linea bg-placa shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${className}`}
      aria-labelledby={id}
    >
      <header className="flex items-center gap-3 border-b border-linea px-4 py-3">
        <h2 id={id} className="text-sm font-semibold text-tinta">
          {titulo}
        </h2>
        <div className="ml-auto flex items-center gap-3">{extra}</div>
      </header>
      <div className="min-h-0 flex-1 p-4">{children}</div>
    </section>
  );
}

/** Estado del socio: texto con una marca sólida. El impago es una placa de penalización. */
export function EstadoSocioMarca({ estado }: { estado: EstadoSocio }) {
  if (estado === "impago") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-alarma/30 bg-alarma/10 px-2 py-0.5 text-xs font-medium text-alarma-tinta">
        <span className="size-1.5 rounded-full bg-alarma" aria-hidden />
        {ETIQUETA_SOCIO.impago}
      </span>
    );
  }

  const marca = estado === "activo" ? "bg-emerald-500" : estado === "congelado" ? "bg-acento" : "bg-apagado";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-linea bg-placa px-2 py-0.5 text-xs font-medium ${
        estado === "activo" ? "text-tinta" : "text-tinta-2"
      }`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${marca}`} aria-hidden />
      {ETIQUETA_SOCIO[estado]}
    </span>
  );
}

/** Número de socio en placa sólida, como el dorsal de un coche. */
export function Dorsal({
  numero,
  estado,
  grande = false,
}: {
  numero: string;
  estado: EstadoSocio;
  grande?: boolean;
}) {
  const cifras = numero.replace(/^IG-0*/, "");
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md border border-linea bg-placa-2 font-mono font-medium tabular-nums ${
        grande ? "h-12 min-w-16 px-3 text-xl" : "h-7 min-w-11 px-2 text-xs"
      } ${estado === "baja" ? "text-tinta-2 line-through" : "text-tinta"}`}
      title={numero}
    >
      <span className="sr-only">Socio </span>
      {cifras}
    </span>
  );
}

/** Pantalla vacía: dice qué falta y qué hacer, sin disculparse. */
export function SinDatos({
  titulo,
  texto,
  accion,
}: {
  titulo: string;
  texto: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 px-1 py-10">
      <p className="text-base font-semibold text-tinta">{titulo}</p>
      <p className="max-w-md text-sm leading-relaxed text-tinta-2">{texto}</p>
      {accion}
    </div>
  );
}

/** Botón de texto con subrayado: la acción secundaria por defecto. */
export const claseEnlace =
  "text-sm font-medium text-acento-tinta underline-offset-4 transition-colors hover:underline";

/** Botón principal. */
export const claseBotonPrincipal =
  "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-acento px-4 text-sm font-medium text-sobre-campo shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

/** Campo de formulario. */
export const claseCampo =
  "h-9 w-full rounded-md border border-linea bg-placa px-3 text-sm text-tinta shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-tinta-2 focus:border-acento focus:ring-3 focus:ring-acento/20";

/** Error de formulario. */
export const claseError =
  "rounded-md border border-alarma/30 bg-alarma/10 px-3 py-2 text-sm font-medium text-alarma-tinta";
