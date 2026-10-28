"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EnvelopeSimple, Phone } from "@phosphor-icons/react";
import { SinDatos } from "@/components/crm/Primitivas";
import { useEscritorio, useTramos } from "@/components/crm/MostrarMas";
import { fecha } from "@/lib/formato";
import { nombreEmpleado, rutaRrhh, type Empleado, type EmpleadoMini } from "@/lib/rrhh";
import { PestanasVista } from "./Filtros";
import { AvatarEmpleado, BadgeRol, EstadoEmpleadoMarca, PersonaRrhh, Progreso } from "./Piezas";

export type FilaEmpleado = Empleado & {
  foto_url: string | null;
  jefe: EmpleadoMini | null;
  incorporacion: { pct: number; completada: boolean; hechas: number; obligatorias: number } | null;
};

export function VistaEmpleados({ filas, hayFiltros }: { filas: FilaEmpleado[]; hayFiltros: boolean }) {
  const params = useSearchParams();
  const escritorio = useEscritorio();
  const { visibles, mas } = useTramos(filas, 50);
  const tarjetas = params.get("vista") === "tarjetas" || !escritorio;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PestanasVista
        opciones={[
          { valor: "tabla", texto: "Tabla", icono: "tabla" },
          { valor: "tarjetas", texto: "Tarjetas", icono: "tarjetas" },
        ]}
      />
      {filas.length === 0 ? (
        <SinDatos
          titulo={hayFiltros ? "Nadie coincide con estos filtros" : "Todavía no hay empleados"}
          texto={
            hayFiltros
              ? "Prueba a quitar algún filtro o a buscar por otro dato (email, DNI, puesto o departamento)."
              : "Da de alta a la plantilla: cada ficha puede tener su cuenta del CRM y genera su lista de incorporación."
          }
        />
      ) : tarjetas ? (
        <div className="flex flex-col">
          <Tarjetas filas={visibles} />
          {mas}
        </div>
      ) : (
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-linea bg-placa">
          <div className="relative min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-placa">
                <tr className="border-b border-linea text-[0.8125rem] text-tinta-2">
                  <th className="py-2.5 pl-4 pr-4 font-normal">Empleado</th>
                  <th className="py-2.5 pr-4 font-normal">Departamento</th>
                  <th className="py-2.5 pr-4 font-normal">Email y teléfono</th>
                  <th className="py-2.5 pr-4 font-normal">Responsable</th>
                  <th className="py-2.5 pr-4 font-normal">Rol</th>
                  <th className="py-2.5 pr-4 font-normal">Estado</th>
                  <th className="py-2.5 pr-4 font-normal">Alta</th>
                  <th className="w-40 py-2.5 pr-4 font-normal">Incorporación</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((e) => (
                  <tr key={e.id} className={`border-b border-linea/70 transition-colors last:border-0 hover:bg-placa-2/60 ${e.estado === "inactivo" ? "opacity-60" : ""}`}>
                    <td className="max-w-[260px] py-2.5 pl-4 pr-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <AvatarEmpleado e={e} tamano="md" />
                        <div className="min-w-0">
                          <Link href={rutaRrhh.empleado(e.id)} className="block truncate font-medium text-tinta outline-none hover:text-acento-tinta focus-visible:underline">
                            {nombreEmpleado(e)}
                          </Link>
                          <span className="block truncate text-[0.8125rem] text-tinta-2">{e.puesto ?? "Sin puesto"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[160px] truncate py-2.5 pr-4 text-sm text-tinta">{e.departamento ?? <span className="text-tinta-2">—</span>}</td>
                    <td className="max-w-[230px] py-2.5 pr-4 text-sm">
                      <a href={`mailto:${e.email}`} className="block truncate text-tinta hover:underline">
                        {e.email}
                      </a>
                      {e.telefono && <span className="block truncate tabular-nums text-tinta-2">{e.telefono}</span>}
                    </td>
                    <td className="max-w-[170px] py-2.5 pr-4">
                      <PersonaRrhh e={e.jefe} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <BadgeRol rol={e.rol} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <EstadoEmpleadoMarca estado={e.estado} />
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-sm tabular-nums text-tinta-2">{fecha(e.fecha_alta)}</td>
                    <td className="py-2.5 pr-4">
                      {e.incorporacion ? (
                        <Progreso
                          pct={e.incorporacion.pct}
                          completado={e.incorporacion.completada}
                          texto={e.incorporacion.completada ? "Completada" : `${e.incorporacion.hechas}/${e.incorporacion.obligatorias}`}
                        />
                      ) : (
                        <span className="text-sm text-tinta-2">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mas && <div className="flex pb-3">{mas}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Tarjetas({ filas }: { filas: FilaEmpleado[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {filas.map((e) => (
        <li key={e.id} className={`relative flex flex-col gap-3 rounded-xl border border-linea bg-placa p-4 transition-colors hover:border-tinta-2/30 ${e.estado === "inactivo" ? "opacity-60" : ""}`}>
          <div className="flex items-start gap-3">
            <AvatarEmpleado e={e} tamano="md" />
            <div className="min-w-0 flex-1">
              <Link href={rutaRrhh.empleado(e.id)} className="block truncate font-medium text-tinta hover:text-acento-tinta">
                {nombreEmpleado(e)}
              </Link>
              <p className="truncate text-[0.8125rem] text-tinta-2">{[e.puesto, e.departamento].filter(Boolean).join(" · ") || "Sin puesto"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <BadgeRol rol={e.rol} />
            <EstadoEmpleadoMarca estado={e.estado} />
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href={`mailto:${e.email}`}
              title={e.email}
              className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md border border-linea px-2 text-xs text-tinta hover:bg-placa-2"
            >
              <EnvelopeSimple className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{e.email}</span>
            </a>
            {e.telefono && (
              <a
                href={`tel:${e.telefono.replace(/\s/g, "")}`}
                aria-label={`Llamar a ${e.telefono}`}
                className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-linea px-2 text-xs tabular-nums text-tinta hover:bg-placa-2"
              >
                <Phone className="size-3.5" aria-hidden />
                {e.telefono}
              </a>
            )}
          </div>
          <div className="mt-auto flex flex-col gap-2 border-t border-linea pt-3">
            <div className="flex items-center justify-between gap-2 text-xs text-tinta-2">
              <span>Alta {fecha(e.fecha_alta)}</span>
              <PersonaRrhh e={e.jefe} />
            </div>
            {e.incorporacion && !e.incorporacion.completada && (
              <Progreso pct={e.incorporacion.pct} texto={`Incorporación ${e.incorporacion.hechas}/${e.incorporacion.obligatorias}`} />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
