"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { numero } from "@/lib/formato";
import type { FilaOcupacion } from "@/lib/datos/panel";

/** Cada cuánto se refresca, en milisegundos. */
const REFRESCO = 60_000;

/** Ocupación en directo por centro. Se refresca sola cada minuto. */
export function Ocupacion({ ocupacion }: { ocupacion: FilaOcupacion[] }) {
  const router = useRouter();

  useEffect(() => {
    const t = setInterval(() => router.refresh(), REFRESCO);
    return () => clearInterval(t);
  }, [router]);

  const total = ocupacion.reduce((s, c) => s + c.dentro_ahora, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-[0.8125rem] text-tinta-2">
        <span className="relative flex size-2" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-exito opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-2 rounded-full bg-exito" />
        </span>
        <span>
          <span className="font-medium text-tinta">{numero(total)}</span> personas entrenando ahora
        </span>
      </p>
      <ul className="flex flex-col gap-2.5">
        {ocupacion.map((c) => {
          const pct = c.aforo > 0 ? Math.min(100, (c.dentro_ahora / c.aforo) * 100) : 0;
          return (
            <li key={c.centro_id}>
              <Link href={`/crm/socios?centro=${c.centro_id}`} className="flex flex-col gap-1 rounded-md transition-opacity hover:opacity-80">
                <span className="flex items-baseline justify-between text-[0.8125rem]">
                  <span className="text-tinta">{c.nombre.replace(/^Ice Gym\s+/i, "")}</span>
                  <span className="tabular-nums text-tinta-2">
                    <span className="font-medium text-tinta">{numero(c.dentro_ahora)}</span> / {numero(c.aforo)}
                  </span>
                </span>
                <span className="h-2 rounded-full bg-placa-2" aria-hidden>
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(pct, c.dentro_ahora > 0 ? 2 : 0)}%`,
                      backgroundColor: pct >= 85 ? "var(--aviso)" : "var(--serie-1)",
                    }}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
