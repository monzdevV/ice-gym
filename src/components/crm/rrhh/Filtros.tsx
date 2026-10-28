"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarBlank, ListBullets, MagnifyingGlass, SquaresFour, Table, User, UsersThree, X } from "@phosphor-icons/react";
import { Pildora, type OpcionPildora } from "@/components/crm/actividad/Pildora";

export type FiltroPildora = { clave: string; etiqueta: string; todos: string; opciones: OpcionPildora[] };

const claseFecha =
  "h-8 rounded-lg border border-linea bg-placa px-2.5 text-[0.8125rem] text-tinta outline-none focus:border-acento focus:ring-2 focus:ring-acento/25";

/**
 * Barra de filtros de RRHH: búsqueda, píldoras y rango de fechas, todo en la URL
 * (igual que contactos y empresas). La primera opción de cada píldora es «Todos».
 */
export function FiltrosRrhh({
  pildoras = [],
  buscar,
  fechas = false,
  extra,
}: {
  pildoras?: FiltroPildora[];
  buscar?: string;
  fechas?: boolean;
  extra?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();
  const [texto, setTexto] = useState(params.get("q") ?? "");

  function cambiar(cambios: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    empezar(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  }

  // La búsqueda se aplica al dejar de escribir.
  useEffect(() => {
    if ((params.get("q") ?? "") === texto) return;
    const t = setTimeout(() => cambiar({ q: texto.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const claves = [...pildoras.map((p) => p.clave), ...(buscar ? ["q"] : []), ...(fechas ? ["desde", "hasta"] : [])];
  const activos = claves.some((k) => params.get(k));

  return (
    <div className={`flex flex-wrap items-center gap-2 transition-opacity ${pendiente ? "opacity-60" : ""}`} aria-busy={pendiente}>
      {buscar && (
        <label className="relative flex h-8 w-full items-center sm:w-64">
          <span className="sr-only">Buscar</span>
          <MagnifyingGlass className="pointer-events-none absolute left-2.5 size-4 text-tinta-2" aria-hidden />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={buscar}
            className="h-8 w-full rounded-lg border border-linea bg-placa pl-8 pr-2 text-[0.8125rem] text-tinta outline-none placeholder:text-tinta-2 focus:border-acento focus:ring-2 focus:ring-acento/25"
          />
        </label>
      )}
      {pildoras.map((p) => (
        <Pildora
          key={p.clave}
          etiqueta={p.etiqueta}
          valor={params.get(p.clave) ?? ""}
          opciones={[{ valor: "", texto: p.todos }, ...p.opciones]}
          onCambio={(v) => cambiar({ [p.clave]: v })}
        />
      ))}
      {fechas && (
        <span className="flex items-center gap-1.5 text-[0.8125rem] text-tinta-2">
          <label className="flex items-center gap-1.5">
            Desde
            <input type="date" value={params.get("desde") ?? ""} onChange={(e) => cambiar({ desde: e.target.value })} className={claseFecha} />
          </label>
          <label className="flex items-center gap-1.5">
            hasta
            <input type="date" value={params.get("hasta") ?? ""} onChange={(e) => cambiar({ hasta: e.target.value })} className={claseFecha} />
          </label>
        </span>
      )}
      {activos && (
        <button
          type="button"
          onClick={() => {
            setTexto("");
            cambiar(Object.fromEntries(claves.map((k) => [k, ""])));
          }}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-medium text-tinta-2 hover:bg-placa-2 hover:text-tinta"
        >
          <X className="size-3.5" aria-hidden />
          Quitar filtros
        </button>
      )}
      {extra && <span className="ml-auto flex items-center gap-2">{extra}</span>}
    </div>
  );
}

/** Iconos de las pestañas por nombre: los componentes no pueden pasar de servidor a cliente. */
const ICONOS_VISTA = { tabla: Table, tarjetas: SquaresFour, lista: ListBullets, calendario: CalendarBlank, yo: User, equipo: UsersThree } as const;
export type IconoVista = keyof typeof ICONOS_VISTA;

/** Pestañas de vista (Diario / Mensual…) en la URL, con el subrayado de las vistas del CRM. */
export function PestanasVista({ clave = "vista", opciones }: { clave?: string; opciones: { valor: string; texto: string; icono?: IconoVista }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const actual = params.get(clave) ?? opciones[0].valor;
  return (
    <nav className="-mx-4 flex gap-1 border-b border-linea px-4 lg:-mx-8 lg:px-8" aria-label="Vistas">
      {opciones.map(({ valor, texto, icono }, i) => {
        const activa = actual === valor;
        const Icono = icono ? ICONOS_VISTA[icono] : null;
        return (
          <button
            key={valor}
            type="button"
            onClick={() => {
              const p = new URLSearchParams(params.toString());
              if (i === 0) p.delete(clave);
              else p.set(clave, valor);
              router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false });
            }}
            aria-current={activa ? "page" : undefined}
            className={`relative flex h-10 items-center gap-1.5 px-2.5 text-sm font-medium transition-colors ${
              activa ? "text-tinta" : "text-tinta-2 hover:text-tinta"
            }`}
          >
            {Icono && <Icono className="size-4" weight={activa ? "fill" : "regular"} aria-hidden />}
            {texto}
            {activa && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-tinta" aria-hidden />}
          </button>
        );
      })}
    </nav>
  );
}
