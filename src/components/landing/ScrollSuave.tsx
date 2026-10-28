"use client";

import Lenis from "lenis";
import { cancelFrame, frame, MotionConfig } from "motion/react";
import { useEffect } from "react";

let lenis: Lenis | null = null;

const movimientoReducido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Desplaza a una sección con la misma inercia que la rueda (o de golpe si se pidió
 * reducir movimiento) y le pasa el foco, como haría un enlace de ancla normal.
 */
export function irA(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.4 });
  else el.scrollIntoView({ behavior: movimientoReducido() ? "auto" : "smooth" });
  if (!el.matches("a[href], button, input, select, textarea, [tabindex]")) {
    el.setAttribute("tabindex", "-1");
    el.classList.add("outline-none");
  }
  el.focus({ preventScroll: true });
  if (history.replaceState) history.replaceState(null, "", `#${id}`);
}

export function bloquearScroll(bloqueado: boolean) {
  if (bloqueado) lenis?.stop();
  else lenis?.start();
  document.body.style.overflow = bloqueado ? "hidden" : "";
}

export function ScrollSuave({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Con «reducir movimiento» no hay scroll con inercia: el del navegador, tal cual.
    if (movimientoReducido()) return;
    lenis = new Lenis({ autoRaf: false, lerp: 0.1 });
    // Lenis va en el mismo bucle que Motion: scroll y valores ligados al scroll pintan en el mismo frame.
    const actualizar = ({ timestamp }: { timestamp: number }) => lenis?.raf(timestamp);
    frame.update(actualizar, true);
    return () => {
      cancelFrame(actualizar);
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
