"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import type { Centro } from "@/lib/tipos";

/** Selector de centro. Escribe en la URL, así el filtro se puede compartir. */
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
    empezar(() => router.push(`${pathname}?${siguientes.toString()}`, { scroll: false }));
  }

  return (
    <div
      className={`relative flex items-center border border-acero bg-grafito transition-opacity ${
        pendiente ? "opacity-60" : ""
      }`}
    >
      <MapPin className="pointer-events-none ml-3 size-4 text-azul" strokeWidth={1.5} aria-hidden />
      <label htmlFor="filtro-centro" className="sr-only">
        Filtrar por centro
      </label>
      <select
        id="filtro-centro"
        value={actual}
        onChange={(e) => cambiar(e.target.value)}
        className="etiqueta appearance-none bg-transparent py-2.5 pl-2.5 pr-9 text-[0.65rem] text-hielo outline-none"
      >
        <option value="">Todos los centros</option>
        {centros.map((centro) => (
          <option key={centro.id} value={centro.id}>
            {centro.nombre}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 size-3.5 text-niebla"
        strokeWidth={1.5}
        aria-hidden
      />
    </div>
  );
}
