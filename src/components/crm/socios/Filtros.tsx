"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { codigoCentro } from "@/design/tokens";
import { ESTADOS_SOCIO, ETIQUETA_SOCIO, type Centro, type Tarifa } from "@/lib/tipos";

/**
 * Buscador y filtros de socios. Todo vive en la URL: una búsqueda se puede
 * compartir o recuperar con el botón de atrás. Sin cajas: texto y placas.
 */
export function FiltrosSocios({
  centros,
  tarifas,
  conteo,
}: {
  centros: Centro[];
  tarifas: Tarifa[];
  conteo: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();
  const [texto, setTexto] = useState(params.get("q") ?? "");

  function aplicar(cambios: Record<string, string | null>) {
    const siguientes = new URLSearchParams(params.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) siguientes.set(clave, valor);
      else siguientes.delete(clave);
    }
    siguientes.delete("pagina");
    empezar(() => router.replace(`${pathname}?${siguientes.toString()}`, { scroll: false }));
  }

  useEffect(() => {
    if (texto === (params.get("q") ?? "")) return;
    const t = setTimeout(() => aplicar({ q: texto || null }), 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const opcion = (activa: boolean) =>
    `corte-a -mx-[4px] px-4 py-1.5 text-[0.92rem] transition-colors active:translate-y-px ${
      activa ? "rotulo bg-tinta text-fondo" : "condensada text-tinta-2 hover:bg-placa-2 hover:text-tinta"
    }`;

  const estado = params.get("estado") ?? "";
  const centro = params.get("centro") ?? "";
  const tarifa = params.get("tarifa") ?? "";

  return (
    <div className={`flex flex-col gap-4 px-4 pb-6 transition-opacity lg:px-8 ${pendiente ? "opacity-70" : ""}`}>
      {/* Buscador: una línea, sin caja */}
      <div className="relative max-w-xl">
        <MagnifyingGlass className="pointer-events-none absolute left-0 top-1/2 size-5 -translate-y-1/2 text-tinta-2" weight="light" aria-hidden />
        <label htmlFor="buscar-socio" className="sr-only">
          Buscar socio
        </label>
        <input
          id="buscar-socio"
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nombre, email o número de socio"
          className="h-12 w-full border-0 border-b-2 border-tinta bg-transparent pl-8 pr-8 text-[1.05rem] text-tinta outline-none placeholder:text-tinta-2 focus:border-acento-tinta [&::-webkit-search-cancel-button]:hidden"
        />
        {texto && (
          <button
            type="button"
            onClick={() => setTexto("")}
            className="absolute right-0 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-tinta-2 hover:text-tinta"
            aria-label="Borrar búsqueda"
          >
            <X className="size-4" weight="bold" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div role="radiogroup" aria-label="Estado" className="flex flex-wrap items-center gap-y-1">
          {[{ v: "", t: "Todos", k: "todos" }, ...ESTADOS_SOCIO.map((e) => ({ v: e, t: ETIQUETA_SOCIO[e], k: e }))].map(
            (o) => (
              <button
                key={o.k}
                type="button"
                role="radio"
                aria-checked={estado === o.v}
                onClick={() => aplicar({ estado: o.v || null })}
                className={opcion(estado === o.v)}
              >
                {o.t}
                <span className="ml-1.5 font-semibold not-italic opacity-70" data-cifra>
                  {conteo[o.k] ?? 0}
                </span>
              </button>
            )
          )}
        </div>

        <div role="radiogroup" aria-label="Centro" className="flex flex-wrap items-center gap-y-1">
          {[{ id: "", t: "Todos" }, ...centros.map((c) => ({ id: c.id, t: codigoCentro(c.slug) }))].map((o) => (
            <button
              key={o.id || "todos"}
              type="button"
              role="radio"
              aria-checked={centro === o.id}
              onClick={() => aplicar({ centro: o.id || null })}
              className={opcion(centro === o.id)}
            >
              {o.t}
            </button>
          ))}
        </div>

        <div role="radiogroup" aria-label="Tarifa" className="flex flex-wrap items-center gap-y-1">
          {[{ id: "", t: "Todas" }, ...tarifas.map((t) => ({ id: t.id, t: t.nombre }))].map((o) => (
            <button
              key={o.id || "todas"}
              type="button"
              role="radio"
              aria-checked={tarifa === o.id}
              onClick={() => aplicar({ tarifa: o.id || null })}
              className={opcion(tarifa === o.id)}
            >
              {o.t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
