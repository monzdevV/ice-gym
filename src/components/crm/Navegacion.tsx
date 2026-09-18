"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarBlank, ChartBar, Receipt, Target, UsersThree } from "@phosphor-icons/react";

export const SECCIONES = [
  { href: "/crm", texto: "Panel", Icono: ChartBar },
  { href: "/crm/leads", texto: "Leads", Icono: Target },
  { href: "/crm/socios", texto: "Socios", Icono: UsersThree },
  { href: "/crm/pagos", texto: "Pagos", Icono: Receipt },
  { href: "/crm/clases", texto: "Clases", Icono: CalendarBlank },
] as const;

function estaActiva(pathname: string, href: string) {
  return href === "/crm" ? pathname === "/crm" : pathname.startsWith(href);
}

/**
 * Pestañas de la banda superior. La activa es un campo azul con el corte
 * inclinado de los rótulos; el resto es sólo texto.
 */
export function PestanasSecciones() {
  const pathname = usePathname();

  return (
    <nav className="hidden h-full items-stretch md:flex" aria-label="Secciones del CRM">
      {SECCIONES.map(({ href, texto }) => {
        const activa = estaActiva(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={`corte-a -mx-[5px] flex items-center px-6 text-[1.05rem] transition-colors duration-150 active:translate-y-px ${
              activa
                ? "rotulo bg-acento text-sobre-campo"
                : "condensada text-tinta-2 hover:bg-placa-2 hover:text-tinta"
            }`}
          >
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barra inferior en móvil. */
export function NavegacionInferior() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-linea bg-placa md:hidden"
      aria-label="Secciones del CRM"
    >
      {SECCIONES.map(({ href, texto, Icono }) => {
        const activa = estaActiva(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1 pb-2.5 pt-3 ${
              activa ? "text-tinta" : "text-tinta-2"
            }`}
          >
            {activa && <span className="corte-a absolute inset-x-3 top-0 h-[3px] bg-acento" aria-hidden />}
            <Icono className="size-[22px]" weight={activa ? "regular" : "light"} aria-hidden />
            <span className="condensada text-[0.72rem]">{texto}</span>
          </Link>
        );
      })}
    </nav>
  );
}
