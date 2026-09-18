"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { ESTADOS_SOCIO, ETIQUETA_SOCIO, COLOR_SOCIO, type Centro, type Tarifa } from "@/lib/tipos";

/**
 * Buscador y filtros de la tabla de socios. Todo vive en la URL, así una
 * búsqueda se puede compartir o volver a ella con el botón de atrás.
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

  const estadoActual = params.get("estado") ?? "";

  function aplicar(cambios: Record<string, string | null>) {
    const siguientes = new URLSearchParams(params.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) siguientes.set(clave, valor);
      else siguientes.delete(clave);
    }
    siguientes.delete("pagina"); // cualquier filtro nuevo vuelve a la primera página
    empezar(() => router.replace(`${pathname}?${siguientes.toString()}`, { scroll: false }));
  }

  // Búsqueda mientras se escribe, con un pequeño respiro para no lanzar una consulta por tecla.
  useEffect(() => {
    const actual = params.get("q") ?? "";
    if (texto === actual) return;
    const t = setTimeout(() => aplicar({ q: texto || null }), 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const select =
    "etiqueta h-10 appearance-none border border-acero bg-grafito pl-3 pr-9 text-[0.62rem] text-hielo outline-none focus:border-azul";

  return (
    <div className={`border-b border-acero transition-opacity ${pendiente ? "opacity-70" : ""}`}>
      {/* Pestañas de estado con su recuento */}
      <div className="scroll-fino flex overflow-x-auto border-b border-acero px-4 lg:px-6" role="tablist">
        {[{ valor: "", texto: "Todos", clave: "todos", color: null as string | null }, ...ESTADOS_SOCIO.map((e) => ({
          valor: e,
          texto: ETIQUETA_SOCIO[e],
          clave: e,
          color: COLOR_SOCIO[e] as string,
        }))].map((pestana) => {
          const activa = estadoActual === pestana.valor;
          return (
            <button
              key={pestana.clave}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => aplicar({ estado: pestana.valor || null })}
              className={`relative flex shrink-0 items-center gap-2 px-4 py-3 transition-colors ${
                activa ? "text-hielo" : "text-niebla hover:text-hielo"
              }`}
            >
              {pestana.color && (
                <span className="size-1.5" style={{ backgroundColor: pestana.color }} aria-hidden />
              )}
              <span className="etiqueta text-[0.62rem] text-current">{pestana.texto}</span>
              <span className="cifra text-sm">{conteo[pestana.clave] ?? 0}</span>
              {activa && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-azul" aria-hidden />}
            </button>
          );
        })}
      </div>

      {/* Buscador y desplegables */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 lg:px-6">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-niebla" strokeWidth={1.5} aria-hidden />
          <label htmlFor="buscar-socio" className="sr-only">
            Buscar socio
          </label>
          <input
            id="buscar-socio"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Nombre, email o número de socio"
            className="h-10 w-full border border-acero bg-grafito pl-9 pr-9 text-sm text-hielo outline-none transition-colors placeholder:text-niebla focus:border-azul [&::-webkit-search-cancel-button]:hidden"
          />
          {texto && (
            <button
              type="button"
              onClick={() => setTexto("")}
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center text-niebla hover:text-hielo"
              aria-label="Borrar búsqueda"
            >
              <X className="size-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="relative">
          <label htmlFor="f-centro" className="sr-only">Centro</label>
          <select
            id="f-centro"
            value={params.get("centro") ?? ""}
            onChange={(e) => aplicar({ centro: e.target.value || null })}
            className={select}
          >
            <option value="">Todos los centros</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre.replace("Ice Gym ", "")}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-niebla" strokeWidth={1.5} aria-hidden />
        </div>

        <div className="relative">
          <label htmlFor="f-tarifa" className="sr-only">Tarifa</label>
          <select
            id="f-tarifa"
            value={params.get("tarifa") ?? ""}
            onChange={(e) => aplicar({ tarifa: e.target.value || null })}
            className={select}
          >
            <option value="">Todas las tarifas</option>
            {tarifas.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-niebla" strokeWidth={1.5} aria-hidden />
        </div>
      </div>
    </div>
  );
}
