"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { codigoCentro } from "@/design/tokens";
import type { Centro } from "@/lib/tipos";

/**
 * Selector de centro con los códigos de tres letras, como la barra de sesiones
 * de una retransmisión. Escribe en la URL, así el filtro se puede compartir.
 */
export function FiltroCentro({ centros }: { centros: Centro[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();

  const actual = params.get("centro") ?? "";

  function cambiar(valor: string) {
    const siguientes = new URLSearchParams(params.toString());
    if (valor) siguientes.set("centro", valor);
    else siguientes.delete("centro");
    siguientes.delete("pagina");
    empezar(() => router.push(`${pathname}?${siguientes.toString()}`, { scroll: false }));
  }

  const opciones = [{ id: "", codigo: "Todos", nombre: "Todos los centros" }].concat(
    centros.map((c) => ({ id: c.id, codigo: codigoCentro(c.slug), nombre: c.nombre }))
  );

  return (
    <div
      role="radiogroup"
      aria-label="Centro"
      className={`flex items-stretch transition-opacity ${pendiente ? "opacity-60" : ""}`}
    >
      {opciones.map((o) => {
        const activa = actual === o.id;
        return (
          <button
            key={o.id || "todos"}
            type="button"
            role="radio"
            aria-checked={activa}
            title={o.nombre}
            onClick={() => cambiar(o.id)}
            className={`corte-a -mx-[4px] px-4 py-1.5 text-[0.95rem] transition-colors active:translate-y-px ${
              activa
                ? "rotulo bg-tinta text-fondo"
                : "condensada text-tinta-2 hover:bg-placa-2 hover:text-tinta"
            }`}
          >
            {o.codigo}
          </button>
        );
      })}
    </div>
  );
}
