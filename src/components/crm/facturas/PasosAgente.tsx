"use client";

import { useEffect, useState } from "react";
import {
  CaretRight,
  CheckCircle,
  CircleNotch,
  Database,
  HardDrives,
  ScanSmiley,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import type { PasoAgente } from "@/lib/facturas";

export type EstadoPaso = "espera" | "activo" | "ok" | "error";
export type Paso = { estado: EstadoPaso; detalle?: string; desde?: number };
export type Pasos = Record<PasoAgente["paso"], Paso>;

export const PASOS_EN_ESPERA: Pasos = {
  disco: { estado: "espera" },
  claude: { estado: "espera" },
  insert: { estado: "espera" },
};

const DEFINICION: { paso: PasoAgente["paso"]; titulo: string; que: string; Icono: Icon }[] = [
  { paso: "disco", titulo: "Disco", que: "El archivo llega al bucket privado", Icono: HardDrives },
  { paso: "claude", titulo: "Claude", que: "Lee la factura y devuelve los datos", Icono: ScanSmiley },
  { paso: "insert", titulo: "INSERT", que: "El agente guarda la fila en Supabase", Icono: Database },
];

const TEXTO_ESTADO: Record<EstadoPaso, string> = {
  espera: "En espera",
  activo: "En curso",
  ok: "Hecho",
  error: "Falló",
};

/** Segundos transcurridos desde `desde`: dato real, no una barra de progreso inventada. */
function Cronometro({ desde }: { desde: number }) {
  const [ahora, setAhora] = useState(desde);
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((ahora - desde) / 1000));
  return <span className="tabular-nums">{s} s</span>;
}

function Marca({ estado }: { estado: EstadoPaso }) {
  if (estado === "activo")
    return <CircleNotch className="size-3.5 shrink-0 text-acento-tinta motion-safe:animate-spin" weight="bold" aria-hidden />;
  if (estado === "ok") return <CheckCircle className="size-3.5 shrink-0 text-exito" weight="fill" aria-hidden />;
  if (estado === "error") return <WarningCircle className="size-3.5 shrink-0 text-critico" weight="fill" aria-hidden />;
  return <span className="mx-[3px] size-2 shrink-0 rounded-full border border-tinta-2/60" aria-hidden />;
}

const CAJA: Record<EstadoPaso, string> = {
  espera: "bg-placa-2 text-tinta-2",
  activo: "bg-acento text-sobre-campo",
  ok: "bg-exito-suave text-exito",
  error: "bg-critico-suave text-critico",
};

/**
 * Los tres pasos del agente tal y como ocurren: disco → Claude → INSERT.
 * Claude nunca toca la base de datos; el INSERT lo hace el agente.
 */
export function PasosAgente({ pasos }: { pasos: Pasos }) {
  return (
    <div className="flex flex-col gap-3">
      <ol className="grid gap-2 sm:grid-cols-3 sm:gap-1.5" aria-label="Pasos del agente">
        {DEFINICION.map(({ paso, titulo, que, Icono }, i) => {
          const p = pasos[paso];
          return (
            <li key={paso} className="flex min-w-0 items-stretch gap-1.5">
              {i > 0 && (
                <CaretRight
                  className="hidden size-4 self-center text-tinta-2/70 sm:block"
                  weight="bold"
                  aria-hidden
                />
              )}
              <div
                data-estado={p.estado}
                className={`flex min-w-0 flex-1 gap-3 rounded-xl p-3 transition-colors duration-200 ${
                  p.estado === "activo" ? "bg-acento-suave" : p.estado === "error" ? "bg-critico-suave" : "bg-fondo"
                }`}
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-lg transition-colors duration-200 ${CAJA[p.estado]}`}
                  aria-hidden
                >
                  <Icono className="size-[18px]" weight={p.estado === "espera" ? "regular" : "bold"} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold text-tinta">
                      <span className="sr-only">Paso {i + 1}: </span>
                      {titulo}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-tinta-2">
                      <Marca estado={p.estado} />
                      <span>{TEXTO_ESTADO[p.estado]}</span>
                      {p.estado === "activo" && p.desde != null && (
                        <span aria-hidden>
                          · <Cronometro desde={p.desde} />
                        </span>
                      )}
                    </span>
                  </p>
                  <p className={`text-[0.8125rem] leading-snug ${p.estado === "error" ? "font-medium text-critico" : "text-tinta-2"}`}>
                    {p.detalle ?? que}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-tinta-2">Claude nunca toca la base de datos: sólo lee. El INSERT lo hace el agente.</p>
    </div>
  );
}
