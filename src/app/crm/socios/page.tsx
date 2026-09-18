import type { Metadata } from "next";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { contarPorEstado, listarSocios, POR_PAGINA } from "@/lib/datos/socios";
import { centroValido, listarCentros, listarTarifas } from "@/lib/datos/comunes";
import { codigoCentro } from "@/design/tokens";
import { fecha, numero } from "@/lib/formato";
import { Dorsal, Encabezado, EstadoSocioMarca, SinDatos, claseEnlace } from "@/components/crm/Primitivas";
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
    listarSocios({ q: params.q, centro, tarifa, estado: params.estado, pagina: Number(params.pagina) || 1 }),
    contarPorEstado(centro),
  ]);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlacePagina = (n: number) => {
    const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    sp.set("pagina", String(n));
    return `/crm/socios?${sp.toString()}`;
  };

  return (
    <main className="pb-12">
      <Encabezado
        titulo="Socios"
        meta={
          <span>
            <span className="cifra text-[1.2rem] text-tinta">{numero(total)}</span>{" "}
            {total === 1 ? "resultado" : "resultados"}
          </span>
        }
      />

      <FiltrosSocios centros={centros} tarifas={tarifas} conteo={conteo} />

      <div className="px-4 lg:px-8">
        {socios.length === 0 ? (
          <SinDatos
            titulo="Nadie coincide"
            texto="Prueba con otro nombre o quita algún filtro. La búsqueda mira nombre, apellidos, email y número de socio."
            accion={
              <Link href="/crm/socios" className={claseEnlace}>
                Quitar filtros
              </Link>
            }
          />
        ) : (
          <>
            {/* Cabecera de la clasificación */}
            <div className="hidden grid-cols-[4.5rem_minmax(0,1fr)_4rem_6rem_7.5rem_7rem] gap-4 border-b-2 border-tinta pb-2 md:grid">
              {["Nº", "Socio", "Centro", "Tarifa", "Alta", "Estado"].map((c) => (
                <span key={c} className="dato">
                  {c}
                </span>
              ))}
            </div>

            <ol className="mt-[3px] flex flex-col gap-[3px]">
              {socios.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/crm/socios/${s.id}`}
                    className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-1 bg-placa py-2 pr-4 transition-colors hover:bg-placa-2 md:grid-cols-[4.5rem_minmax(0,1fr)_4rem_6rem_7.5rem_7rem]"
                  >
                    <Dorsal numero={s.numero_socio} estado={s.estado} />
                    <span className="min-w-0">
                      <span className="condensada block truncate text-[1.02rem] text-tinta">
                        {s.nombre} {s.apellidos}
                      </span>
                      <span className="block truncate text-[0.8rem] text-tinta-2">
                        {s.email}
                        <span className="md:hidden">
                          {" "}
                          · {codigoCentro(s.centro?.nombre)} · {s.tarifa?.nombre}
                        </span>
                      </span>
                    </span>
                    <span className="rotulo hidden text-[1.05rem] text-tinta md:block">{codigoCentro(s.centro?.nombre)}</span>
                    <span className="condensada hidden text-[0.95rem] text-tinta md:block">{s.tarifa?.nombre}</span>
                    <span className="hidden text-[0.88rem] text-tinta-2 md:block" data-cifra>
                      {fecha(s.fecha_alta)}
                    </span>
                    <span className="col-start-2 md:col-start-auto">
                      <EstadoSocioMarca estado={s.estado} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>

            {paginas > 1 && (
              <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Paginación">
                <p className="text-[0.85rem] text-tinta-2" data-cifra>
                  Página {pagina} de {paginas}
                </p>
                <div className="flex items-center gap-5">
                  {pagina > 1 ? (
                    <Link href={enlacePagina(pagina - 1)} className="condensada flex items-center gap-1 text-[0.9rem] text-tinta hover:underline">
                      <CaretLeft className="size-4" weight="bold" aria-hidden /> Anterior
                    </Link>
                  ) : (
                    <span className="condensada flex items-center gap-1 text-[0.9rem] text-tinta-2 opacity-50">
                      <CaretLeft className="size-4" weight="bold" aria-hidden /> Anterior
                    </span>
                  )}
                  {pagina < paginas ? (
                    <Link href={enlacePagina(pagina + 1)} className="condensada flex items-center gap-1 text-[0.9rem] text-tinta hover:underline">
                      Siguiente <CaretRight className="size-4" weight="bold" aria-hidden />
                    </Link>
                  ) : (
                    <span className="condensada flex items-center gap-1 text-[0.9rem] text-tinta-2 opacity-50">
                      Siguiente <CaretRight className="size-4" weight="bold" aria-hidden />
                    </span>
                  )}
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
