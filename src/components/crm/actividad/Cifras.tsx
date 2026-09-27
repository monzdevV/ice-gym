import type { ReactNode } from "react";
import Link from "next/link";

/** Tarjeta de cifra (server-safe). Con href, toda la tarjeta enlaza. */
export function Cifra({
  etiqueta,
  valor,
  detalle,
  icono,
  tono,
  href,
  alerta = false,
}: {
  etiqueta: string;
  valor: ReactNode;
  detalle?: ReactNode;
  icono?: ReactNode;
  tono?: string;
  href?: string;
  alerta?: boolean;
}) {
  const cuerpo = (
    <>
      <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-tinta-2">
        {icono && (
          <span className="grid size-6 place-items-center rounded-md text-white" style={{ background: tono ?? "var(--relleno-gris)" }} aria-hidden>
            {icono}
          </span>
        )}
        {etiqueta}
      </span>
      <span className={`text-2xl font-semibold tabular-nums tracking-tight ${alerta ? "text-alarma-tinta" : "text-tinta"}`}>{valor}</span>
      {detalle && <span className="text-xs text-tinta-2">{detalle}</span>}
    </>
  );
  const clase = "flex min-w-0 flex-col gap-1.5 rounded-xl border border-linea bg-placa p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]";
  return href ? (
    <Link href={href} className={`${clase} transition-colors hover:border-tinta-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento`}>
      {cuerpo}
    </Link>
  ) : (
    <div className={clase}>{cuerpo}</div>
  );
}
