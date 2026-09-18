import type { ReactNode } from "react";
import { COLOR_SOCIO, ETIQUETA_SOCIO, type EstadoSocio } from "@/lib/tipos";

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
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-4 pb-5 pt-7 lg:px-8">
      <div className="flex min-w-0 flex-wrap items-end gap-x-5 gap-y-2">
        <h1 className="animate-cortina flex items-stretch">
          <span className="w-2.5 bg-acento" aria-hidden />
          <span className="corte-rotulo rotulo bg-tinta py-2 pl-4 pr-10 text-[clamp(2.1rem,4.4vw,3.4rem)] text-fondo">
            {titulo}
          </span>
        </h1>
        {meta && <div className="pb-1.5 text-sm text-tinta-2">{meta}</div>}
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
    <section className={`flex min-w-0 flex-col ${className}`} aria-labelledby={id}>
      <header className="flex items-baseline gap-3 border-b-2 border-tinta pb-2">
        <h2 id={id} className="rotulo text-[1.35rem] text-tinta">
          {titulo}
        </h2>
        <div className="ml-auto flex items-baseline gap-3">{extra}</div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

/** Estado del socio: texto con una marca sólida. El impago es una placa de penalización. */
export function EstadoSocioMarca({ estado }: { estado: EstadoSocio }) {
  if (estado === "impago") {
    return (
      <span className="corte-d condensada inline-flex items-center bg-alarma py-1 pl-2 pr-4 text-[0.8rem] text-sobre-campo">
        {ETIQUETA_SOCIO.impago}
      </span>
    );
  }

  const marca =
    estado === "activo" ? "bg-acento" : estado === "congelado" ? "bg-tinta-2" : "border border-tinta-2";

  return (
    <span
      className={`condensada inline-flex items-center gap-2 text-[0.8rem] ${
        estado === "activo" ? "text-tinta" : "text-tinta-2"
      } ${estado === "baja" ? "line-through decoration-1" : ""}`}
    >
      <span className={`size-2 shrink-0 ${marca}`} aria-hidden />
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
  const color = COLOR_SOCIO[estado];
  const cifras = numero.replace(/^IG-0*/, "");
  return (
    <span
      className={`corte-d cifra inline-flex shrink-0 items-center justify-start not-italic ${
        grande ? "h-14 min-w-[5.5rem] pl-3 pr-6 text-[2.4rem]" : "h-8 min-w-[3.6rem] pl-2 pr-4 text-[1.2rem]"
      } ${estado === "baja" ? "border border-linea line-through decoration-2" : ""}`}
      style={{ backgroundColor: color.fondo, color: color.texto }}
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
      <p className="rotulo text-[1.6rem] text-tinta-2">{titulo}</p>
      <p className="max-w-md text-sm leading-relaxed text-tinta-2">{texto}</p>
      {accion}
    </div>
  );
}

/** Botón de texto con subrayado: la acción secundaria por defecto. */
export const claseEnlace =
  "condensada text-[0.85rem] text-acento-tinta underline decoration-1 underline-offset-4 transition-colors hover:decoration-2";

/** Botón principal: campo azul, texto negro, corte inclinado. */
export const claseBotonPrincipal =
  "corte-d rotulo inline-flex h-11 items-center justify-center gap-2 bg-acento pl-5 pr-8 text-[1.05rem] text-sobre-campo transition-[filter,transform] hover:brightness-95 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

/** Campo de formulario: placa con línea inferior, sin caja. */
export const claseCampo =
  "h-11 w-full border-0 border-b-2 border-tinta-2 bg-placa px-3 text-[15px] text-tinta outline-none transition-colors placeholder:text-tinta-2 focus:border-acento-tinta";

/** Error de formulario: placa invertida. El rojo se reserva para los impagos. */
export const claseError = "corte-d bg-tinta py-2.5 pl-3 pr-6 text-sm font-medium text-fondo";
