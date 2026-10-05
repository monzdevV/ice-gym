"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

/** Observa el atributo data-tema de <html>, que es la fuente de verdad del tema. */
function suscribir(aviso: () => void) {
  const observador = new MutationObserver(aviso);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
  return () => observador.disconnect();
}
const esClaro = () => document.documentElement.getAttribute("data-tema") === "claro";

/**
 * El CRM es oscuro por defecto; este botón alterna a claro y lo recuerda en
 * este navegador. Comparte la preferencia (ice-tema) con la web pública.
 */
export function InterruptorTema() {
  const claro = useSyncExternalStore(suscribir, esClaro, () => false);

  function alternar() {
    const siguiente = claro ? "oscuro" : "claro";
    document.documentElement.setAttribute("data-tema", siguiente);
    try {
      localStorage.setItem("ice-tema", siguiente);
    } catch {
      // Sin almacenamiento: vale para esta visita.
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={claro ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
      title={claro ? "Tema oscuro" : "Tema claro"}
      className="grid size-8 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
    >
      {claro ? <Moon className="size-[18px]" aria-hidden /> : <Sun className="size-[18px]" aria-hidden />}
    </button>
  );
}
