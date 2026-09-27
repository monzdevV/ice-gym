"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AddressBook,
  ArrowSquareOut,
  Buildings,
  CalendarBlank,
  ChartBar,
  CheckSquare,
  DotsThreeOutline,
  Gauge,
  GearSix,
  Lightning,
  Receipt,
  Target,
  UserPlus,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Contador = "leads" | "oportunidades" | "tareas";
export type Contadores = Record<Contador, number>;
type Seccion = { href: string; texto: string; corto?: string; Icono: Icon; contador?: Contador };

const GRUPOS: { titulo: string; secciones: Seccion[] }[] = [
  {
    titulo: "General",
    secciones: [{ href: "/crm", texto: "Dashboard", Icono: ChartBar }],
  },
  {
    titulo: "Comercial",
    secciones: [
      { href: "/crm/oportunidades", texto: "Oportunidades", corto: "Pipeline", Icono: Target, contador: "oportunidades" },
      { href: "/crm/empresas", texto: "Empresas", Icono: Buildings },
      { href: "/crm/contactos", texto: "Contactos", Icono: AddressBook },
      { href: "/crm/actividades", texto: "Actividades", Icono: Lightning },
      { href: "/crm/tareas", texto: "Tareas", Icono: CheckSquare, contador: "tareas" },
    ],
  },
  {
    titulo: "Club",
    secciones: [
      { href: "/crm/club", texto: "Panel del club", Icono: Gauge },
      { href: "/crm/leads", texto: "Leads del club", Icono: UserPlus, contador: "leads" },
      { href: "/crm/socios", texto: "Socios", Icono: UsersThree },
      { href: "/crm/pagos", texto: "Pagos", Icono: Receipt },
      { href: "/crm/clases", texto: "Clases", Icono: CalendarBlank },
    ],
  },
];

const CONFIGURACION: Seccion = { href: "/crm/configuracion", texto: "Configuración", Icono: GearSix };
const TODAS = [...GRUPOS.flatMap((g) => g.secciones), CONFIGURACION];

/** Secciones fijas de la barra inferior en móvil; el resto va en «Más». */
const MOVIL = ["/crm", "/crm/oportunidades", "/crm/empresas", "/crm/contactos", "/crm/tareas"];

/** La sección activa es la de ruta más larga que encaja; el dashboard sólo en /crm exacto. */
function useSeccionActiva() {
  const pathname = usePathname();
  let mejor: string | null = null;
  for (const { href } of TODAS) {
    const encaja = href === "/crm" ? pathname === "/crm" : pathname === href || pathname.startsWith(`${href}/`);
    if (encaja && (!mejor || href.length > mejor.length)) mejor = href;
  }
  return mejor;
}

function Enlace({ s, on, n, onClick }: { s: Seccion; on: boolean; n?: number | null; onClick?: () => void }) {
  const { href, texto, Icono } = s;
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={on ? "page" : undefined}
      className={`flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-150 ${
        on ? "bg-placa-2 text-tinta" : "text-tinta-2 hover:bg-placa-2/60 hover:text-tinta"
      }`}
    >
      <Icono className="size-[18px] shrink-0" weight={on ? "fill" : "regular"} aria-hidden />
      <span className="flex-1 truncate">{texto}</span>
      {n != null && n > 0 && (
        <span className="rounded-md bg-placa-2 px-1.5 text-xs tabular-nums text-tinta-2">
          {n}
          <span className="sr-only"> pendientes</span>
        </span>
      )}
    </Link>
  );
}

function Grupos({ contadores, activa, onNavegar }: { contadores: Contadores; activa: string | null; onNavegar?: () => void }) {
  return (
    <>
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          <p className="mb-1 px-2.5 text-[0.7rem] font-medium uppercase tracking-wider text-tinta-2">{g.titulo}</p>
          <div className="flex flex-col gap-0.5">
            {g.secciones.map((s) => (
              <Enlace key={s.href} s={s} on={activa === s.href} n={s.contador ? contadores[s.contador] : null} onClick={onNavegar} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Menú lateral de escritorio, agrupado. */
export function MenuLateral({ contadores }: { contadores: Contadores }) {
  const activa = useSeccionActiva();
  return (
    <nav className="-mx-1 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1 pb-3" aria-label="Secciones del CRM">
      <Grupos contadores={contadores} activa={activa} />
    </nav>
  );
}

/** Enlace a configuración para el pie del menú lateral. */
export function EnlaceConfiguracion() {
  const activa = useSeccionActiva();
  return <Enlace s={CONFIGURACION} on={activa === CONFIGURACION.href} />;
}

/** Título de la sección actual para la barra superior (móvil). */
export function TituloSeccion() {
  const activa = useSeccionActiva();
  const seccion = TODAS.find((s) => s.href === activa);
  if (!seccion) return null;
  const { Icono, texto } = seccion;
  return (
    <span className="flex items-center gap-2 text-sm font-medium text-tinta">
      <Icono className="size-[18px] text-tinta-2" aria-hidden />
      {texto}
    </span>
  );
}

function PestanaMovil({ Icono, texto, on, n }: { Icono: Icon; texto: string; on: boolean; n?: number | null }) {
  return (
    <>
      {on && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-acento" aria-hidden />}
      <span className="relative">
        <Icono className="size-[22px]" weight={on ? "fill" : "regular"} aria-hidden />
        {n != null && n > 0 && (
          <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-acento px-1 text-center text-[0.6rem] font-semibold leading-4 tabular-nums text-sobre-campo">
            {n > 99 ? "99+" : n}
          </span>
        )}
      </span>
      <span className="max-w-full truncate px-0.5 text-[0.68rem] font-medium">{texto}</span>
    </>
  );
}

/** Barra inferior en móvil: cinco secciones y «Más» con el resto en una hoja. */
export function NavegacionInferior({ contadores }: { contadores: Contadores }) {
  const activa = useSeccionActiva();
  const [mas, setMas] = useState(false);
  const fijas = MOVIL.map((h) => TODAS.find((s) => s.href === h)!);
  const enMas = activa != null && !MOVIL.includes(activa);
  const clase = "relative flex min-w-0 flex-col items-center gap-1 pb-2.5 pt-3";

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-linea bg-placa pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Secciones del CRM"
      >
        {fijas.map((s) => {
          const on = activa === s.href;
          return (
            <Link key={s.href} href={s.href} aria-current={on ? "page" : undefined} className={`${clase} ${on ? "text-tinta" : "text-tinta-2"}`}>
              <PestanaMovil Icono={s.Icono} texto={s.corto ?? s.texto} on={on} n={s.contador ? contadores[s.contador] : null} />
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMas(true)}
          aria-haspopup="dialog"
          aria-expanded={mas}
          className={`${clase} ${enMas ? "text-tinta" : "text-tinta-2"}`}
        >
          <PestanaMovil Icono={DotsThreeOutline} texto="Más" on={enMas} />
        </button>
      </nav>

      <Sheet open={mas} onOpenChange={setMas}>
        <SheetContent side="bottom" className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl border-linea bg-placa pb-[env(safe-area-inset-bottom)] text-tinta">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-tinta">Todas las secciones</SheetTitle>
            <SheetDescription className="sr-only">Navegación completa del CRM</SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col gap-4 px-4 pb-4" aria-label="Todas las secciones">
            <Grupos contadores={contadores} activa={activa} onNavegar={() => setMas(false)} />
            <div className="flex flex-col gap-0.5 border-t border-linea pt-3">
              <Enlace s={CONFIGURACION} on={activa === CONFIGURACION.href} onClick={() => setMas(false)} />
              <Link
                href="/"
                className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-tinta-2 hover:bg-placa-2/60 hover:text-tinta"
              >
                <ArrowSquareOut className="size-[18px]" aria-hidden />
                Web pública
              </Link>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
