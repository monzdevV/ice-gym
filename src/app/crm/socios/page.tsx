import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { contarPorEstado, listarSocios, POR_PAGINA } from "@/lib/datos/socios";
import { centroValido, listarCentros, listarTarifas } from "@/lib/datos/comunes";
import { COLOR_SOCIO, ETIQUETA_SOCIO } from "@/lib/tipos";
import { fecha, iniciales, numero } from "@/lib/formato";
import { Encabezado, Pildora, SinDatos } from "@/components/crm/Primitivas";
import { FiltrosSocios } from "@/components/crm/socios/Filtros";

export const metadata: Metadata = { title: "Socios" };
export const dynamic = "force-dynamic";

type Params = { q?: string; centro?: string; tarifa?: string; estado?: string; pagina?: string };

export default async function PaginaSocios({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [centros, tarifas] = await Promise.all([listarCentros(), listarTarifas()]);
  const centro = centroValido(centros, params.centro);
  const tarifa = tarifas.some((t) => t.id === params.tarifa) ? params.tarifa! : null;

  const [{ socios, total, pagina }, conteo] = await Promise.all([
    listarSocios({
      q: params.q,
      centro,
      tarifa,
      estado: params.estado,
      pagina: Number(params.pagina) || 1,
    }),
    contarPorEstado(centro),
  ]);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlacePagina = (n: number) => {
    const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    sp.set("pagina", String(n));
    return `/crm/socios?${sp.toString()}`;
  };

  return (
    <main>
      <Encabezado antetitulo="Base de socios" titulo="Socios">
        <p className="text-sm text-niebla" data-cifra>
          <span className="cifra text-2xl text-hielo">{numero(total)}</span>{" "}
          {total === 1 ? "resultado" : "resultados"}
        </p>
      </Encabezado>

      <FiltrosSocios centros={centros} tarifas={tarifas} conteo={conteo} />

      {socios.length === 0 ? (
        <SinDatos
          titulo="Nadie coincide"
          texto="Prueba con otro nombre o quita algún filtro. La búsqueda mira nombre, apellidos, email y número de socio."
          accion={
            <Link href="/crm/socios" className="etiqueta mt-2 text-[0.6rem] text-azul hover:underline">
              Quitar filtros
            </Link>
          }
        />
      ) : (
        <>
          {/* Tabla en escritorio */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-acero">
                  {["Nº socio", "Nombre", "Centro", "Tarifa", "Alta", "Estado"].map((c) => (
                    <th key={c} scope="col" className="etiqueta px-4 py-3 text-[0.6rem] font-semibold first:pl-6 last:pr-6">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {socios.map((s) => (
                  <tr key={s.id} className="group border-b border-acero/70 transition-colors hover:bg-carbon">
                    <td className="px-4 py-3 pl-6 font-mono text-xs text-niebla">{s.numero_socio}</td>
                    <td className="px-4 py-3">
                      <Link href={`/crm/socios/${s.id}`} className="flex items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center border border-acero bg-grafito text-[0.65rem] font-semibold text-niebla group-hover:border-azul group-hover:text-azul">
                          {iniciales(s.nombre, s.apellidos)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-hielo group-hover:text-azul">
                            {s.nombre} {s.apellidos}
                          </span>
                          <span className="block truncate text-xs text-niebla">{s.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-niebla">{s.centro?.nombre.replace("Ice Gym ", "")}</td>
                    <td className="px-4 py-3 text-hielo">{s.tarifa?.nombre}</td>
                    <td className="px-4 py-3 text-niebla">{fecha(s.fecha_alta)}</td>
                    <td className="px-4 py-3 pr-6">
                      <Pildora texto={ETIQUETA_SOCIO[s.estado]} color={COLOR_SOCIO[s.estado]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lista en móvil */}
          <ul className="divide-y divide-acero md:hidden">
            {socios.map((s) => (
              <li key={s.id}>
                <Link href={`/crm/socios/${s.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-carbon">
                  <span className="grid size-10 shrink-0 place-items-center border border-acero bg-grafito text-xs font-semibold text-niebla">
                    {iniciales(s.nombre, s.apellidos)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-hielo">
                      {s.nombre} {s.apellidos}
                    </span>
                    <span className="block truncate text-xs text-niebla">
                      {s.numero_socio} · {s.tarifa?.nombre} · {s.centro?.nombre.replace("Ice Gym ", "")}
                    </span>
                  </span>
                  <Pildora texto={ETIQUETA_SOCIO[s.estado]} color={COLOR_SOCIO[s.estado]} />
                </Link>
              </li>
            ))}
          </ul>

          {/* Paginación */}
          {paginas > 1 && (
            <nav className="flex items-center justify-between gap-4 border-t border-acero px-4 py-3 lg:px-6" aria-label="Paginación">
              <p className="text-xs text-niebla" data-cifra>
                Página {pagina} de {paginas}
              </p>
              <div className="flex gap-1">
                {pagina > 1 ? (
                  <Link href={enlacePagina(pagina - 1)} className="grid size-9 place-items-center border border-acero text-niebla hover:border-azul hover:text-azul" aria-label="Página anterior">
                    <ChevronLeft className="size-4" strokeWidth={1.5} />
                  </Link>
                ) : (
                  <span className="grid size-9 place-items-center border border-acero text-acero" aria-hidden>
                    <ChevronLeft className="size-4" strokeWidth={1.5} />
                  </span>
                )}
                {pagina < paginas ? (
                  <Link href={enlacePagina(pagina + 1)} className="grid size-9 place-items-center border border-acero text-niebla hover:border-azul hover:text-azul" aria-label="Página siguiente">
                    <ChevronRight className="size-4" strokeWidth={1.5} />
                  </Link>
                ) : (
                  <span className="grid size-9 place-items-center border border-acero text-acero" aria-hidden>
                    <ChevronRight className="size-4" strokeWidth={1.5} />
                  </span>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
