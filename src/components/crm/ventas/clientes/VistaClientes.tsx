"use client";

import { useEffect, useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EnvelopeSimple, MagnifyingGlass, MapPin, Phone, Rows, SquaresFour } from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import type { ClienteListado } from "@/lib/datos/ventas";
import { numero } from "@/lib/formato";
import { plazoMasUrgente } from "@/lib/ventas";
import { SinDatos, claseCampo } from "@/components/crm/Primitivas";
import { Avatar, LogoEmpresa, Responsable } from "@/components/crm/b2b/Piezas";
import { MarcaPlazo } from "@/components/crm/ventas/Piezas";

export type TipoCliente = "todos" | "personas" | "empresas";

const plazoCliente = (c: ClienteListado) => plazoMasUrgente(c.pendientes);

const esControl = (ev: MouseEvent) => (ev.target as HTMLElement).closest("a, button, input") !== null;

function Retrato({ c, tamano = "md" }: { c: Pick<ClienteListado, "nombre" | "tipo" | "logo_url">; tamano?: "sm" | "md" }) {
  return c.tipo === "empresa" ? <LogoEmpresa nombre={c.nombre} url={c.logo_url} tamano={tamano} /> : <Avatar nombre={c.nombre} tamano={tamano} />;
}

function Nombre({ c }: { c: ClienteListado }) {
  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <Link href={c.href} className="truncate font-medium text-tinta outline-none group-hover:text-acento-tinta focus-visible:underline">
        {c.nombre}
      </Link>
      <span className="truncate text-xs text-tinta-2">
        {c.detalle}
      </span>
    </span>
  );
}

function Tabla({ filas }: { filas: ClienteListado[] }) {
  const router = useRouter();
  return (
    <div className="overflow-hidden rounded-2xl bg-placa shadow-placa">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <caption className="sr-only">Clientes de ventas</caption>
          <thead>
            <tr className="text-[0.8125rem] text-tinta-2">
              <th scope="col" className="py-2.5 pl-4 pr-4 font-normal">Nombre</th>
              <th scope="col" className="py-2.5 pr-4 font-normal">Correo electrónico</th>
              <th scope="col" className="py-2.5 pr-4 font-normal">Teléfono</th>
              <th scope="col" className="py-2.5 pr-4 font-normal">Ciudad</th>
              <th scope="col" className="py-2.5 pr-4 font-normal">País</th>
              <th scope="col" className="py-2.5 pr-4 font-normal">Comercial</th>
              <th scope="col" className="py-2.5 pr-4 text-right font-normal">Oport.</th>
              <th scope="col" className="py-2.5 pr-4 font-normal">
                <span className="sr-only">Actividades</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((c) => (
              <tr
                key={c.id}
                onClick={(ev) => !esControl(ev) && router.push(c.href)}
                className="group cursor-pointer border-b border-linea/70 transition-colors last:border-0 hover:bg-placa-2/60"
              >
                <td className="max-w-[300px] py-2.5 pl-4 pr-4">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Retrato c={c} />
                    <Nombre c={c} />
                  </span>
                </td>
                <td className="max-w-[220px] truncate py-2.5 pr-4">
                  {c.email ? (
                    <a href={`mailto:${c.email}`} className="text-tinta hover:underline">
                      {c.email}
                    </a>
                  ) : (
                    <span className="text-tinta-2">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums">
                  {c.telefono ? (
                    <a href={`tel:${c.telefono.replace(/\s/g, "")}`} className="text-tinta hover:underline">
                      {c.telefono}
                    </a>
                  ) : (
                    <span className="text-tinta-2">—</span>
                  )}
                </td>
                <td className="max-w-[140px] truncate py-2.5 pr-4 text-tinta">{c.ciudad ?? <span className="text-tinta-2">—</span>}</td>
                <td className="max-w-[120px] truncate py-2.5 pr-4 text-tinta">{c.pais ?? <span className="text-tinta-2">—</span>}</td>
                <td className="max-w-[150px] py-2.5 pr-4">
                  <Responsable m={c.comercial} />
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-tinta">{c.oportunidades || <span className="text-tinta-2">0</span>}</td>
                <td className="py-2.5 pr-4">
                  <MarcaPlazo plazo={plazoCliente(c)} n={c.pendientes.length} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tarjetas({ filas }: { filas: ClienteListado[] }) {
  const router = useRouter();
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {filas.map((c) => (
        <li
          key={c.id}
          onClick={(ev) => !esControl(ev) && router.push(c.href)}
          className="group flex cursor-pointer flex-col gap-3 rounded-2xl bg-placa p-4 shadow-placa transition-[background-color,transform] duration-150 hover:bg-placa-2/40 active:scale-[0.99]"
        >
          <div className="flex items-start gap-3">
            <Retrato c={c} />
            <div className="min-w-0 flex-1">
              <Nombre c={c} />
            </div>
            <MarcaPlazo plazo={plazoCliente(c)} n={c.pendientes.length} />
          </div>
          <ul className="flex flex-col gap-1 text-[0.8125rem] text-tinta-2">
            {c.email && (
              <li className="flex min-w-0 items-center gap-1.5">
                <EnvelopeSimple className="size-3.5 shrink-0" aria-hidden />
                <a href={`mailto:${c.email}`} className="truncate hover:text-tinta hover:underline">
                  {c.email}
                </a>
              </li>
            )}
            {c.telefono && (
              <li className="flex min-w-0 items-center gap-1.5">
                <Phone className="size-3.5 shrink-0" aria-hidden />
                <a href={`tel:${c.telefono.replace(/\s/g, "")}`} className="truncate tabular-nums hover:text-tinta hover:underline">
                  {c.telefono}
                </a>
              </li>
            )}
            {(c.ciudad || c.pais) && (
              <li className="flex min-w-0 items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{[c.ciudad, c.pais].filter(Boolean).join(", ")}</span>
              </li>
            )}
          </ul>
          {c.etiquetas.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {c.etiquetas.slice(0, 3).map((e) => (
                <span key={e} className="rounded-md bg-placa-2 px-1.5 py-0.5 text-xs text-tinta">
                  {e}
                </span>
              ))}
            </span>
          )}
          <div className="mt-auto flex items-center justify-between gap-2 text-xs text-tinta-2">
            <Responsable m={c.comercial} />
            <span className="tabular-nums">
              {numero(c.oportunidades)} {c.oportunidades === 1 ? "oportunidad" : "oportunidades"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Clientes de ventas: búsqueda, personas o empresas, archivados y vista de lista o tarjetas. Todo en la URL. */
export function VistaClientes({
  filas,
  q,
  tipo,
  archivados,
  vista,
  conteo,
  hayClientes,
}: {
  filas: ClienteListado[];
  q: string;
  tipo: TipoCliente;
  archivados: boolean;
  vista: "lista" | "tarjetas";
  conteo: Record<TipoCliente, number>;
  hayClientes: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();
  const [texto, setTexto] = useState(q);

  function cambiar(c: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(c)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    empezar(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  }

  // La búsqueda va a la URL con una pausa, para no recargar en cada tecla.
  useEffect(() => {
    if (texto.trim() === q) return;
    const t = setTimeout(() => cambiar({ q: texto.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const chips: { valor: TipoCliente; texto: string }[] = [
    { valor: "todos", texto: "Todos" },
    { valor: "personas", texto: "Personas" },
    { valor: "empresas", texto: "Empresas" },
  ];
  const claseVista = (on: boolean) =>
    `grid size-8 place-items-center rounded-md transition-colors ${on ? "bg-placa text-tinta shadow-placa" : "text-tinta-2 hover:text-tinta"}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Buscar clientes</span>
          <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-tinta-2" aria-hidden />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Nombre, email, teléfono, ciudad, NIF…"
            className={`${claseCampo} h-8 pl-8`}
          />
        </label>
        <div role="group" aria-label="Tipo de cliente" className="flex gap-1.5">
          {chips.map((c) => {
            const on = tipo === c.valor;
            return (
              <button
                key={c.valor}
                type="button"
                aria-pressed={on}
                onClick={() => cambiar({ tipo: c.valor === "todos" ? "" : c.valor })}
                className={`flex h-8 items-center gap-2 rounded-full px-3 text-[0.8125rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta ${
                  on ? "bg-acento-suave text-acento-tinta" : "bg-placa text-tinta shadow-placa hover:bg-placa-2"
                }`}
              >
                {c.texto}
                <span className={`tabular-nums ${on ? "" : "text-tinta-2"}`}>{numero(conteo[c.valor])}</span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-[0.8125rem] text-tinta-2">
          <Switch checked={archivados} onCheckedChange={(v) => cambiar({ archivados: v ? "1" : "" })} aria-label="Ver archivados" />
          Archivados
        </label>
        <nav className="ml-auto flex rounded-lg bg-placa-2 p-0.5" aria-label="Vista">
          <button type="button" onClick={() => cambiar({ vista: "" })} aria-pressed={vista === "lista"} className={claseVista(vista === "lista")} title="Lista">
            <Rows className="size-4" aria-hidden />
            <span className="sr-only">Lista</span>
          </button>
          <button type="button" onClick={() => cambiar({ vista: "tarjetas" })} aria-pressed={vista === "tarjetas"} className={claseVista(vista === "tarjetas")} title="Tarjetas">
            <SquaresFour className="size-4" aria-hidden />
            <span className="sr-only">Tarjetas</span>
          </button>
        </nav>
      </div>

      <div className={`transition-opacity ${pendiente ? "opacity-70" : ""}`} aria-busy={pendiente}>
        {!hayClientes ? (
          <SinDatos titulo="Aún no hay clientes" texto="Da de alta a las personas y empresas a las que vendes. También se crean desde una oportunidad." />
        ) : filas.length === 0 ? (
          <SinDatos
            titulo={archivados ? "No hay clientes archivados" : "Nadie con estos filtros"}
            texto="Prueba con otras palabras o quita algún filtro."
          />
        ) : vista === "tarjetas" ? (
          <Tarjetas filas={filas} />
        ) : (
          <Tabla filas={filas} />
        )}
      </div>
    </div>
  );
}
