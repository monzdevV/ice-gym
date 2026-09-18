"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CalendarDays, Receipt, Target, Users } from "lucide-react";

export const SECCIONES = [
  { href: "/crm", texto: "Panel", Icono: Activity },
  { href: "/crm/leads", texto: "Leads", Icono: Target },
  { href: "/crm/socios", texto: "Socios", Icono: Users },
  { href: "/crm/pagos", texto: "Pagos", Icono: Receipt },
  { href: "/crm/clases", texto: "Clases", Icono: CalendarDays },
] as const;

function estaActiva(pathname: string, href: string) {
  return href === "/crm" ? pathname === "/crm" : pathname.startsWith(href);
}

/** Barra lateral en escritorio. */
export function NavegacionLateral() {
  const pathname = usePathname();

  return (
    <nav className="hidden w-[190px] shrink-0 flex-col gap-0.5 border-r border-acero p-3 lg:flex" aria-label="Secciones del CRM">
      {SECCIONES.map(({ href, texto, Icono }) => {
        const activa = estaActiva(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={`group relative flex items-center gap-3 px-3 py-2.5 transition-colors ${
              activa ? "bg-grafito text-hielo" : "text-niebla hover:bg-grafito/50 hover:text-hielo"
            }`}
          >
            {activa && (
              <span
                className="corte-marca absolute left-0 top-0 h-full w-[3px] bg-azul"
                aria-hidden
              />
            )}
            <Icono
              className={`size-4 shrink-0 ${activa ? "text-azul" : ""}`}
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="etiqueta text-[0.7rem] text-current">{texto}</span>
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
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-acero bg-negro/95 backdrop-blur lg:hidden"
      aria-label="Secciones del CRM"
    >
      {SECCIONES.map(({ href, texto, Icono }) => {
        const activa = estaActiva(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1.5 py-2.5 transition-colors ${
              activa ? "text-azul" : "text-niebla"
            }`}
          >
            {activa && <span className="absolute inset-x-4 top-0 h-[2px] bg-azul" aria-hidden />}
            <Icono className="size-[18px]" strokeWidth={1.5} aria-hidden />
            <span className="etiqueta text-[0.6rem] text-current">{texto}</span>
          </Link>
        );
      })}
    </nav>
  );
}
