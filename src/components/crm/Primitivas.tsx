import type { ReactNode } from "react";

/** Caja de sección: plana, separada por líneas, nunca por sombras. */
export function Bloque({
  titulo,
  extra,
  children,
  className = "",
}: {
  titulo?: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel flex flex-col ${className}`}>
      {titulo && (
        <header className="flex items-center justify-between gap-3 border-b border-acero px-4 py-3">
          <h2 className="etiqueta">{titulo}</h2>
          {extra}
        </header>
      )}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

/** Encabezado de pantalla: antetítulo, titular y controles a la derecha. */
export function Encabezado({
  antetitulo,
  titulo,
  children,
}: {
  antetitulo: string;
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-acero px-4 py-5 lg:px-6">
      <div>
        <p className="etiqueta">{antetitulo}</p>
        <h1 className="titular mt-2 text-[clamp(1.9rem,4vw,2.75rem)] text-hielo">{titulo}</h1>
      </div>
      {children}
    </header>
  );
}

/** Píldora de estado. El color llega por parámetro desde los tokens. */
export function Pildora({
  texto,
  color,
  tenue = false,
}: {
  texto: string;
  color: string;
  tenue?: boolean;
}) {
  return (
    <span
      className="etiqueta inline-flex shrink-0 items-center gap-1.5 px-2 py-1 text-[0.6rem]"
      style={{
        color,
        backgroundColor: tenue ? "transparent" : `color-mix(in srgb, ${color} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 35%, transparent)`,
      }}
    >
      <span className="size-1.5 shrink-0" style={{ backgroundColor: color }} aria-hidden />
      {texto}
    </span>
  );
}

/** Pantalla de "aquí todavía no hay nada". Una invitación, no una disculpa. */
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
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex items-center gap-2" aria-hidden>
        <span className="h-[2px] w-6 bg-acero" />
        <span className="size-1.5 bg-azul" />
        <span className="h-[2px] w-6 bg-acero" />
      </div>
      <p className="titular text-xl text-hielo">{titulo}</p>
      <p className="max-w-xs text-sm leading-relaxed text-niebla">{texto}</p>
      {accion}
    </div>
  );
}
