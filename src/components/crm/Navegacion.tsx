"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { URL_WEB } from "@/lib/enlaces";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AddressBook,
  AirplaneTilt,
  ArrowSquareOut,
  Buildings,
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretDown,
  ChartBar,
  CheckSquare,
  Clock,
  DotsThreeOutline,
  FileText,
  GearSix,
  Handshake,
  IdentificationBadge,
  Lightning,
  ListChecks,
  Star,
  Target,
  type Icon,
} from "@phosphor-icons/react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Contador = "oportunidades" | "tareas" | "vacaciones";
export type Contadores = Record<Contador, number>;
/** `filtro`: parámetros de la URL que distinguen una sección de otra con la misma ruta (Clientes dentro de Empresas). */
type Seccion = { href: string; texto: string; corto?: string; Icono: Icon; contador?: Contador; filtro?: Record<string, string> };
/** Los grupos con `desplegable` se pliegan y despliegan desde su título. */
type Grupo = { titulo: string; desplegable?: boolean; secciones: Seccion[] };

const GRUPOS: Grupo[] = [
  {
    titulo: "General",
    secciones: [{ href: "/crm", texto: "Dashboard", Icono: ChartBar }],
  },
  {
    titulo: "Oportunidades",
    desplegable: true,
    secciones: [
      { href: "/crm/oportunidades", texto: "Oportunidades", corto: "Pipeline", Icono: Target, contador: "oportunidades" },
      { href: "/crm/empresas", texto: "Empresas", Icono: Buildings },
      { href: "/crm/empresas?tipo=cliente", texto: "Clientes", Icono: Handshake, filtro: { tipo: "cliente" } },
      { href: "/crm/contactos", texto: "Contactos", Icono: AddressBook },
      { href: "/crm/actividades", texto: "Actividades", Icono: Lightning },
      { href: "/crm/tareas", texto: "Tareas", Icono: CheckSquare, contador: "tareas" },
    ],
  },
  {
    titulo: "RRHH",
    desplegable: true,
    secciones: [
      { href: "/crm/rrhh/empleados", texto: "Empleados", Icono: IdentificationBadge },
      { href: "/crm/rrhh/horarios", texto: "Horarios", Icono: Clock },
      { href: "/crm/rrhh/vacaciones", texto: "Vacaciones", Icono: AirplaneTilt, contador: "vacaciones" },
      { href: "/crm/rrhh/incorporacion", texto: "Tareas de incorporación", corto: "Incorporación", Icono: ListChecks },
      { href: "/crm/rrhh/evaluaciones", texto: "Evaluaciones", Icono: Star },
      { href: "/crm/rrhh/nominas", texto: "Nóminas", Icono: FileText },
    ],
  },
];

const CONFIGURACION: Seccion = { href: "/crm/configuracion", texto: "Configuración", Icono: GearSix };
const TODAS = [...GRUPOS.flatMap((g) => g.secciones), CONFIGURACION];

/** Secciones fijas de la barra inferior en móvil; el resto va en «Más». */
const MOVIL = ["/crm", "/crm/oportunidades", "/crm/empresas", "/crm/contactos", "/crm/tareas"];

/**
 * La sección activa es la de ruta más larga que encaja; el dashboard sólo en /crm exacto.
 * Una sección con `filtro` (Clientes) gana a la de su misma ruta si la URL lleva ese filtro.
 */
function useSeccionActiva() {
  const pathname = usePathname();
  const params = useSearchParams();
  let mejor: Seccion | null = null;
  const peso = (s: Seccion) => s.href.split("?")[0].length + (s.filtro ? 1000 : 0);
  for (const s of TODAS) {
    const ruta = s.href.split("?")[0];
    const encaja = ruta === "/crm" ? pathname === "/crm" : pathname === ruta || pathname.startsWith(`${ruta}/`);
    const filtroOk = !s.filtro || Object.entries(s.filtro).every(([k, v]) => params.get(k) === v);
    if (encaja && filtroOk && (!mejor || peso(s) > peso(mejor))) mejor = s;
  }
  return mejor?.href ?? null;
}

/** Suscripción a cambios de una preferencia en localStorage: de otra pestaña (`storage`) o de ésta (`aviso`). */
function suscribir(aviso: string) {
  return (avisar: () => void) => {
    window.addEventListener("storage", avisar);
    window.addEventListener(aviso, avisar);
    return () => {
      window.removeEventListener("storage", avisar);
      window.removeEventListener(aviso, avisar);
    };
  };
}

/** Grupos plegados, recordados en este navegador. */
const CLAVE_PLEGADOS = "ice-menu-plegados";
const AVISO_PLEGADOS = "ice-menu-plegados-cambio";
const suscribirPlegados = suscribir(AVISO_PLEGADOS);
function leerPlegados() {
  try {
    return localStorage.getItem(CLAVE_PLEGADOS) ?? "[]";
  } catch {
    return "[]";
  }
}
function usePlegados() {
  // En el servidor (y al hidratar) todos los grupos salen desplegados.
  const crudo = useSyncExternalStore(suscribirPlegados, leerPlegados, () => "[]");
  const plegados = useMemo(() => {
    try {
      const v: unknown = JSON.parse(crudo);
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }, [crudo]);
  function alternar(titulo: string) {
    const siguiente = plegados.includes(titulo) ? plegados.filter((t) => t !== titulo) : [...plegados, titulo];
    try {
      localStorage.setItem(CLAVE_PLEGADOS, JSON.stringify(siguiente));
    } catch {}
    window.dispatchEvent(new Event(AVISO_PLEGADOS));
  }
  return { plegados, alternar };
}

/** Menú lateral estrecho (sólo iconos), recordado en este navegador. */
const CLAVE_ESTRECHO = "ice-menu-estrecho";
const AVISO_ESTRECHO = "ice-menu-estrecho-cambio";
const suscribirEstrecho = suscribir(AVISO_ESTRECHO);
function leerEstrecho() {
  try {
    return localStorage.getItem(CLAVE_ESTRECHO) === "1";
  } catch {
    return false;
  }
}
function useEstrecho() {
  // En el servidor (y al hidratar) el menú sale ancho.
  const estrecho = useSyncExternalStore(suscribirEstrecho, leerEstrecho, () => false);
  function alternar() {
    try {
      localStorage.setItem(CLAVE_ESTRECHO, estrecho ? "0" : "1");
    } catch {}
    window.dispatchEvent(new Event(AVISO_ESTRECHO));
  }
  return { estrecho, alternar };
}

function Enlace({ s, on, n, onClick, estrecho }: { s: Seccion; on: boolean; n?: number | null; onClick?: () => void; estrecho?: boolean }) {
  const { href, texto, Icono } = s;
  const pendientes = n != null && n > 0;
  const enlace = (
    <Link
      href={href}
      onClick={onClick}
      aria-current={on ? "page" : undefined}
      aria-label={estrecho ? (pendientes ? `${texto}, ${n} pendientes` : texto) : undefined}
      className={`relative flex h-8 items-center gap-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
        estrecho ? "justify-center" : "px-2.5"
      } ${on ? "bg-placa-2 text-tinta" : "text-tinta-2 hover:bg-placa-2/60 hover:text-tinta"}`}
    >
      <Icono className="size-[18px] shrink-0" weight={on ? "fill" : "regular"} aria-hidden />
      {estrecho ? (
        pendientes && <span className="absolute right-1.5 top-1 size-1.5 rounded-full bg-acento" aria-hidden />
      ) : (
        <>
          <span className="flex-1 truncate">{texto}</span>
          {pendientes && (
            <span className="rounded-md bg-placa-2 px-1.5 text-xs tabular-nums text-tinta-2">
              {n}
              <span className="sr-only"> pendientes</span>
            </span>
          )}
        </>
      )}
    </Link>
  );
  if (!estrecho) return enlace;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{enlace}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {texto}
        {pendientes && <span className="tabular-nums opacity-70">· {n}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

function Grupos({
  contadores,
  activa,
  onNavegar,
  estrecho,
}: {
  contadores: Contadores;
  activa: string | null;
  onNavegar?: () => void;
  estrecho?: boolean;
}) {
  const { plegados, alternar } = usePlegados();
  if (estrecho) {
    // Sin títulos: los grupos se separan con una línea y se ven todas las secciones.
    return (
      <>
        {GRUPOS.map((g, i) => (
          <div key={g.titulo} className={`flex flex-col gap-0.5 ${i > 0 ? "border-t border-linea pt-3" : ""}`}>
            {g.secciones.map((s) => (
              <Enlace key={s.href} s={s} on={activa === s.href} n={s.contador ? contadores[s.contador] : null} estrecho />
            ))}
          </div>
        ))}
      </>
    );
  }
  return (
    <>
      {GRUPOS.map((g) => {
        // Un grupo plegado se abre solo si contiene la sección en la que estás.
        const abierto = !g.desplegable || !plegados.includes(g.titulo) || g.secciones.some((s) => s.href === activa);
        const idLista = `menu-${g.titulo.toLowerCase()}`;
        return (
          <div key={g.titulo}>
            {g.desplegable ? (
              <button
                type="button"
                onClick={() => alternar(g.titulo)}
                aria-expanded={abierto}
                aria-controls={idLista}
                className="mb-1 flex w-full items-center gap-1 rounded-md px-2.5 text-left text-[0.7rem] font-medium uppercase tracking-wider text-tinta-2 transition-colors hover:text-tinta"
              >
                <span className="flex-1">{g.titulo}</span>
                <CaretDown className={`size-3 transition-transform duration-150 ${abierto ? "" : "-rotate-90"}`} weight="bold" aria-hidden />
              </button>
            ) : (
              <p className="mb-1 px-2.5 text-[0.7rem] font-medium uppercase tracking-wider text-tinta-2">{g.titulo}</p>
            )}
            {abierto && (
              <div id={idLista} className="flex flex-col gap-0.5">
                {g.secciones.map((s) => (
                  <Enlace key={s.href} s={s} on={activa === s.href} n={s.contador ? contadores[s.contador] : null} onClick={onNavegar} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/**
 * Caja del menú lateral de escritorio: ancha o estrecha (sólo iconos).
 * Marca `data-estrecho` para que el contenido pintado en el servidor se adapte con `group-data-estrecho/menu:`.
 */
export function CajaMenuLateral({ children }: { children: React.ReactNode }) {
  const { estrecho } = useEstrecho();
  return (
    <aside
      data-estrecho={estrecho || undefined}
      className={`group/menu sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-linea bg-placa py-4 md:flex ${
        estrecho ? "w-16 px-2" : "w-60 px-3"
      }`}
    >
      {children}
    </aside>
  );
}

/** Botón para estrechar el menú lateral a sólo iconos, o volver a ensancharlo. */
export function BotonEstrecho() {
  const { estrecho, alternar } = useEstrecho();
  const texto = estrecho ? "Expandir menú" : "Contraer menú";
  const Icono = estrecho ? CaretDoubleRight : CaretDoubleLeft;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={alternar}
          aria-label={texto}
          aria-expanded={!estrecho}
          className="grid size-8 shrink-0 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
        >
          <Icono className="size-4" weight="bold" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {texto}
      </TooltipContent>
    </Tooltip>
  );
}

/** Menú lateral de escritorio, agrupado. */
export function MenuLateral({ contadores }: { contadores: Contadores }) {
  const activa = useSeccionActiva();
  const { estrecho } = useEstrecho();
  return (
    <nav
      className={`-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-3 ${estrecho ? "gap-3" : "gap-5"}`}
      aria-label="Secciones del CRM"
    >
      <Grupos contadores={contadores} activa={activa} estrecho={estrecho} />
    </nav>
  );
}

/** Enlace a configuración para el pie del menú lateral. */
export function EnlaceConfiguracion() {
  const activa = useSeccionActiva();
  const { estrecho } = useEstrecho();
  return <Enlace s={CONFIGURACION} on={activa === CONFIGURACION.href} estrecho={estrecho} />;
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
              <a href={URL_WEB}
                className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-tinta-2 hover:bg-placa-2/60 hover:text-tinta"
              >
                <ArrowSquareOut className="size-[18px]" aria-hidden />
                Web pública
              </a>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
