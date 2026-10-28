"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";
import { useRef, useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";

/** Frase del manifiesto. La palabra marcada con * se enciende en azul hielo. */
const FRASE =
  "Abres el torno, entrenas a tu *ritmo y vuelves mañana. Pesas, cardio, ciclo y funcional en Madrid, Barcelona y Valencia.";

const MARQUESINA = ["Fuerza", "Cardio", "Ciclo", "Funcional", "Peso libre", "Poleas", "Yoga", "Recuperación"];

/** Bloque tipográfico kinético: la frase se enciende palabra a palabra con el scroll. */
export function Manifiesto() {
  const ref = useRef<HTMLDivElement>(null);
  const reducido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const palabras = FRASE.split(" ");
  const total = palabras.length;

  return (
    <section aria-label="Manifiesto" className="relative overflow-hidden bg-fondo py-28 md:py-44">
      <div ref={ref} className="mx-auto max-w-[1400px] px-4 md:px-10">
        <p className="rotulo text-[clamp(2.6rem,7.4vw,8.5rem)] leading-[0.92]">
          <span className="sr-only">{FRASE.replace("*", "")}</span>
          {palabras.map((cruda, i) => {
            const clave = cruda.startsWith("*");
            const palabra = clave ? cruda.slice(1) : cruda;
            return (
              <Palabra
                key={i}
                progreso={scrollYProgress}
                rango={[i / total, (i + 1) / total]}
                clave={clave}
                estatica={!!reducido}
              >
                {palabra}
              </Palabra>
            );
          })}
        </p>
      </div>

      <Marquesina reducido={!!reducido} />
    </section>
  );
}

function Palabra({
  children,
  progreso,
  rango,
  clave,
  estatica,
}: {
  children: string;
  progreso: MotionValue<number>;
  rango: [number, number];
  clave: boolean;
  estatica: boolean;
}) {
  const opacidad = useTransform(progreso, rango, [0, 1]);
  return (
    <span aria-hidden className="relative mr-[0.22em] inline-block">
      <span className="text-apagado">{children}</span>
      <motion.span
        className={`absolute inset-0 ${clave ? "text-acento-tinta" : "text-tinta"}`}
        style={{ opacity: estatica ? 1 : opacidad }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function envolver(min: number, max: number, v: number) {
  const rango = max - min;
  return ((((v - min) % rango) + rango) % rango) + min;
}

/**
 * Marquesina infinita y lenta; acelera y cambia de sentido con la velocidad del scroll.
 * Se mueve sola más de 5 s, así que lleva botón de pausa (WCAG 2.2.2).
 */
function Marquesina({ reducido }: { reducido: boolean }) {
  const [pausada, setPausada] = useState(false);
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocidad = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(velocidad, [0, 1000], [0, 4], { clamp: false });
  const sentido = useRef(-1);
  const x = useTransform(base, (v) => `${envolver(-50, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (reducido || pausada) return;
    const f = factor.get();
    if (f < 0) sentido.current = 1;
    else if (f > 0) sentido.current = -1;
    // 1,2 % de la pista por segundo en reposo.
    let paso = sentido.current * 1.2 * (delta / 1000);
    paso += paso * Math.abs(f);
    base.set(base.get() + paso);
  });

  const serie = (copia: number) =>
    MARQUESINA.map((p) => (
      <span key={`${copia}-${p}`} className="flex items-center">
        <span
          className="rotulo px-[0.35em] text-transparent"
          style={{ WebkitTextStroke: "1.5px var(--tinta-2)" }}
        >
          {p}
        </span>
        <span className="cifra text-acento-tinta">·</span>
      </span>
    ));

  return (
    <div className="relative mt-24 md:mt-36">
      <div aria-hidden className="overflow-hidden border-y border-linea py-5 md:py-7">
        <motion.div
          className="flex w-max whitespace-nowrap text-[clamp(3.5rem,9vw,9rem)] leading-none will-change-transform"
          style={{ x }}
        >
          {serie(0)}
          {serie(1)}
        </motion.div>
      </div>
      {!reducido && (
        <button
          type="button"
          onClick={() => setPausada((v) => !v)}
          className="condensada mt-3 ml-auto mr-4 flex min-h-11 items-center gap-2 px-2 text-sm tracking-[0.14em] text-tinta-2 transition-colors hover:text-tinta md:mr-10"
        >
          {pausada ? <Play weight="bold" aria-hidden className="size-4" /> : <Pause weight="bold" aria-hidden className="size-4" />}
          {pausada ? "Mover la cinta" : "Parar la cinta"}
        </button>
      )}
    </div>
  );
}
