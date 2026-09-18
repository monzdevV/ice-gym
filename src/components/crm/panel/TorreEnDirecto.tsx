"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { codigoCentro, movimiento } from "@/design/tokens";
import { hora, numero } from "@/lib/formato";
import type { EntradaReciente, FilaOcupacion } from "@/lib/datos/panel";

/** Cada cuánto se refresca la torre, en milisegundos. */
const REFRESCO = 60_000;

/**
 * La torre EN DIRECTO: los centros clasificados por ocupación, como una torre de
 * tiempos, y debajo las últimas entradas por el torno. Se refresca sola cada
 * minuto; si un centro adelanta a otro, su fila se desliza hasta su nuevo puesto.
 */
export function TorreEnDirecto({
  ocupacion,
  entradas,
}: {
  ocupacion: FilaOcupacion[];
  entradas: EntradaReciente[];
}) {
  const router = useRouter();
  const reducido = useReducedMotion();

  useEffect(() => {
    const t = setInterval(() => router.refresh(), REFRESCO);
    return () => clearInterval(t);
  }, [router]);

  const clasificacion = ocupacion
    .map((c) => ({ ...c, pct: c.aforo > 0 ? (c.dentro_ahora / c.aforo) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct || b.dentro_ahora - a.dentro_ahora);

  const totalDentro = clasificacion.reduce((s, c) => s + c.dentro_ahora, 0);
  const transicion = reducido
    ? { duration: 0 }
    : { duration: 0.28, ease: [...movimiento.curvaMovimiento] as [number, number, number, number] };

  return (
    <aside className="flex flex-col gap-[3px]" aria-label="Ocupación en directo">
      {/* Cabecera de la torre */}
      <div className="flex items-stretch">
        <span className="w-2.5 bg-acento" aria-hidden />
        <div className="corte-d flex flex-1 items-baseline justify-between bg-tinta py-2.5 pl-3 pr-6 text-fondo">
          <span className="rotulo text-[1.25rem]">En directo</span>
          <span className="condensada text-[0.8rem] opacity-80" data-cifra>
            {numero(totalDentro)} dentro
          </span>
        </div>
      </div>

      {/* Clasificación de centros */}
      <LayoutGroup>
        <ol className="flex flex-col gap-[3px]">
          {clasificacion.map((c, i) => (
            <motion.li key={c.centro_id} layout transition={transicion}>
              <Link
                href={`/crm/socios?centro=${c.centro_id}`}
                className="group grid h-12 grid-cols-[2.75rem_3.5rem_1fr_auto] items-center bg-placa transition-colors hover:bg-placa-2"
                title={c.nombre}
              >
                <span className="cifra grid h-full place-items-center bg-acento text-[1.4rem] text-sobre-campo">
                  {i + 1}
                </span>
                <span className="rotulo pl-3 text-[1.3rem] text-tinta">{codigoCentro(c.nombre)}</span>
                <span className="relative h-1.5 bg-placa-2" aria-hidden>
                  <span
                    className="absolute inset-y-0 left-0 bg-dato-azul"
                    style={{ width: `${Math.min(100, Math.max(c.pct, c.dentro_ahora > 0 ? 3 : 0))}%` }}
                  />
                </span>
                <span className="flex items-baseline gap-1 pl-3 pr-3">
                  <span className="cifra text-[1.35rem] text-tinta">{numero(c.dentro_ahora)}</span>
                  <span className="condensada text-[0.72rem] text-tinta-2" data-cifra>
                    /{numero(c.aforo)}
                  </span>
                </span>
              </Link>
            </motion.li>
          ))}
        </ol>
      </LayoutGroup>

      {/* Últimas entradas por el torno */}
      <div className="mt-4 flex items-baseline justify-between border-b-2 border-tinta pb-1.5">
        <span className="rotulo text-[1rem] text-tinta">Últimas entradas</span>
        <span className="dato">Torno</span>
      </div>
      {entradas.length === 0 ? (
        <p className="py-4 text-sm text-tinta-2">Nadie ha pasado el torno todavía hoy.</p>
      ) : (
        <ol className="flex flex-col">
          {entradas.map((e) => (
            <li key={e.id}>
              <Link
                href={e.socio ? `/crm/socios/${e.socio.id}` : "#"}
                className="grid grid-cols-[3rem_1fr_2.5rem] items-baseline gap-2 border-b border-linea py-2 transition-colors hover:bg-placa-2"
              >
                <span className="cifra text-[1rem] text-tinta-2">{hora(e.entrada)}</span>
                <span className="condensada truncate text-[0.95rem] text-tinta">
                  {e.socio ? `${e.socio.nombre.charAt(0)}. ${e.socio.apellidos.split(" ")[0]}` : "—"}
                </span>
                <span className="condensada text-right text-[0.8rem] text-tinta-2">
                  {codigoCentro(e.centro?.nombre)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
