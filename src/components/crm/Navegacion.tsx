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

/** Menú lateral de escritorio. La sección activa es una píldora oscura. */
export function MenuLateral() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Secciones del CRM">
      {SECCIONES.map(({ href, texto, Icono }) => {
        const activa = estaActiva(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-150 ${
              activa ? "bg-tinta text-fondo" : "text-tinta-2 hover:bg-placa-2 hover:text-tinta"
            }`}
          >
            <Icono className="size-[18px]" weight={activa ? "fill" : "regular"} aria-hidden />
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}

/** Título de la sección actual para la barra superior. */
export function TituloSeccion() {
  const pathname = usePathname();
  const seccion = SECCIONES.find(({ href }) => estaActiva(pathname, href));
  if (!seccion) return null;
  const { Icono, texto } = seccion;
  return (
    <span className="flex items-center gap-2 text-sm font-medium text-tinta">
      <Icono className="size-[18px] text-tinta-2" aria-hidden />
      {texto}
    </span>
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
            {activa && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-tinta" aria-hidden />}
            <Icono className="size-[22px]" weight={activa ? "fill" : "regular"} aria-hidden />
            <span className="text-[0.72rem] font-medium">{texto}</span>
          </Link>
        );
      })}
    </nav>
  );
}
