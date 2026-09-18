"use client";

import { useEffect, useState } from "react";

type Preferencia = "claro" | "oscuro" | "sistema";

const OPCIONES: { valor: Preferencia; texto: string }[] = [
  { valor: "claro", texto: "Claro" },
  { valor: "oscuro", texto: "Oscuro" },
  { valor: "sistema", texto: "Auto" },
];

function aplicar(preferencia: Preferencia) {
  const raiz = document.documentElement;
  if (preferencia === "sistema") raiz.removeAttribute("data-tema");
  else raiz.setAttribute("data-tema", preferencia);
  try {
    if (preferencia === "sistema") localStorage.removeItem("ice-tema");
    else localStorage.setItem("ice-tema", preferencia);
  } catch {
    // Sin almacenamiento: el cambio vale para esta visita.
  }
}

/**
 * Tres palabras, no un interruptor de sol y luna. "Auto" sigue al sistema.
 * La elección se guarda sólo en este navegador.
 */
export function ControlTema({ className = "" }: { className?: string }) {
  const [actual, setActual] = useState<Preferencia>("sistema");

  useEffect(() => {
    const t = document.documentElement.getAttribute("data-tema");
    setActual(t === "claro" || t === "oscuro" ? t : "sistema");
  }, []);

  return (
    <div role="radiogroup" aria-label="Tema" className={`flex items-center ${className}`}>
      {OPCIONES.map((o, i) => {
        const activa = actual === o.valor;
        return (
          <span key={o.valor} className="flex items-center">
            {i > 0 && <span className="px-1 text-linea" aria-hidden>/</span>}
            <button
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => {
                aplicar(o.valor);
                setActual(o.valor);
              }}
              className={`condensada py-1 text-[0.8rem] transition-colors ${
                activa ? "text-tinta underline decoration-2 underline-offset-4" : "text-tinta-2 hover:text-tinta"
              }`}
            >
              {o.texto}
            </button>
          </span>
        );
      })}
    </div>
  );
}
