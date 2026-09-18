"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";
import { movimiento } from "@/design/tokens";
import { dinero, numero, porcentaje } from "@/lib/formato";

/**
 * Formatos disponibles. Se pasan por nombre y no como función porque este
 * componente vive en el cliente y las funciones no cruzan desde el servidor.
 */
const FORMATOS = {
  numero: (n: number) => numero(Math.round(n)),
  dinero: (n: number) => dinero(n),
  porcentaje: (n: number) => porcentaje(n, 0),
} as const;

type Props = {
  valor: number;
  formato?: keyof typeof FORMATOS;
  className?: string;
  /** Texto que se antepone sin animar, por ejemplo "+". */
  prefijo?: string;
};

/**
 * Cuenta desde cero hasta el valor cuando la cifra entra en pantalla.
 * Es la única animación del panel: señala lo que la persona ha venido a mirar.
 */
export function Cifra({ valor, formato = "numero", className = "", prefijo }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const aLaVista = useInView(ref, { once: true, margin: "-40px" });
  const [mostrado, setMostrado] = useState(0);

  useEffect(() => {
    if (!aLaVista) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMostrado(valor);
      return;
    }

    const control = animate(0, valor, {
      duration: movimiento.lento,
      ease: [...movimiento.curva],
      onUpdate: setMostrado,
    });
    return () => control.stop();
  }, [aLaVista, valor]);

  return (
    <span ref={ref} className={className} data-cifra>
      {prefijo}
      {FORMATOS[formato](mostrado)}
    </span>
  );
}
