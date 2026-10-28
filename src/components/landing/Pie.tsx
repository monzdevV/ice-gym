"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { ArrowUp, ArrowUpRight } from "@phosphor-icons/react";
import type { DatosLanding } from "@/lib/datos/publico";
import { codigoCentro } from "@/design/tokens";
import { Revelar } from "./Movimiento";
import { irA } from "./ScrollSuave";

const SECCIONES = [
  { id: "instalaciones", texto: "Instalaciones" },
  { id: "tarifas", texto: "Tarifas" },
  { id: "centros", texto: "Centros" },
  { id: "clases", texto: "Clases" },
  { id: "visita", texto: "Reserva tu visita" },
];

const sinMarca = (nombre: string) => nombre.replace(/^Ice Gym\s+/i, "");

export function Pie({ datos }: { datos: DatosLanding }) {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  // El rótulo sube desde debajo del borde a medida que se llega al final de la página.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const y = useTransform(scrollYProgress, [0.35, 1], reducido ? ["0%", "0%"] : ["75%", "0%"]);
  const yGym = useTransform(scrollYProgress, [0.45, 1], reducido ? ["0%", "0%"] : ["95%", "0%"]);

  const volverArriba = () => {
    irA("portada");
  };

  return (
    <footer ref={ref} className="relative overflow-hidden border-t border-linea bg-fondo" aria-labelledby="pie-titulo">
      <h2 id="pie-titulo" className="sr-only">
        Ice Gym: centros y contacto
      </h2>

      <div className="mx-auto max-w-[1600px] px-4 pt-20 md:px-10 md:pt-28">
        <div className="grid grid-cols-1 gap-y-12 md:grid-cols-12 md:gap-x-8">
          {/* Centros */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 md:col-span-9 md:gap-8">
            {datos.centros.map((c, i) => (
              <Revelar key={c.id} retraso={i * 0.06} className="border-t border-linea pt-5">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="cifra text-5xl text-acento-tinta">{codigoCentro(c.slug)}</span>
                  <span className="condensada text-xs tracking-[0.18em] text-tinta-2">{c.ciudad}</span>
                </p>
                <h3 className="rotulo mt-4 text-2xl text-tinta">{sinMarca(c.nombre)}</h3>
                <address className="mt-3 text-sm not-italic leading-relaxed text-tinta-2">{c.direccion}</address>
                {c.telefono && (
                  <a
                    href={`tel:${c.telefono.replace(/\s+/g, "")}`}
                    className="cifra mt-3 inline-flex min-h-11 items-center text-lg text-tinta transition-colors hover:text-acento-tinta"
                  >
                    {c.telefono}
                  </a>
                )}
                {c.horario && (
                  <p className="mt-1 text-sm leading-relaxed text-tinta-2">
                    <span className="condensada mr-2 text-xs tracking-[0.18em] text-tinta">Horario</span>
                    {c.horario}
                  </p>
                )}
              </Revelar>
            ))}
          </div>

          {/* Navegación */}
          <nav aria-label="Secciones" className="md:col-span-3 md:pl-8">
            <p className="condensada border-t border-linea pt-5 text-xs tracking-[0.18em] text-tinta-2">La web</p>
            <ul className="mt-4">
              {SECCIONES.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      irA(s.id);
                    }}
                    className="condensada group flex min-h-11 items-center justify-between gap-3 border-b border-linea/60 text-lg tracking-[0.04em] text-tinta transition-colors hover:text-acento-tinta"
                  >
                    {s.texto}
                    <ArrowUpRight
                      weight="bold"
                      aria-hidden
                      className="size-4 text-tinta-2 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-acento-tinta"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Barra final */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-linea py-4 text-sm text-tinta-2">
          <p>
            © <span className="cifra">{new Date().getFullYear()}</span> Ice Gym · Madrid, Barcelona y Valencia
          </p>
          <div className="flex items-center gap-6">
            <Link href="/crm" className="inline-flex min-h-11 items-center text-xs text-tinta-2/70 transition-colors hover:text-tinta">
              Acceso equipo
            </Link>
            <button
              type="button"
              onClick={volverArriba}
              className="condensada group inline-flex min-h-11 items-center gap-2 tracking-[0.14em] text-tinta transition-colors hover:text-acento-tinta active:scale-[0.97]"
            >
              Volver arriba
              <ArrowUp
                weight="bold"
                aria-hidden
                className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-1"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Rótulo gigante a todo el ancho */}
      <div className="mt-2 flex select-none items-end justify-between overflow-hidden px-2 md:px-4" aria-hidden>
        <motion.span style={{ y }} className="cifra block text-[28vw] leading-[0.78] text-tinta will-change-transform">
          ICE
        </motion.span>
        <motion.span
          style={{ y: yGym }}
          className="cifra block text-[28vw] leading-[0.78] tracking-[0.02em] text-acento-tinta will-change-transform"
        >
          GYM
        </motion.span>
      </div>
    </footer>
  );
}
