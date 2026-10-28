import type { Metadata } from "next";
import { listarFacturas, urlFirmadaFactura } from "@/lib/datos/facturas";
import { dineroExacto, numero } from "@/lib/formato";
import { Encabezado } from "@/components/crm/Primitivas";
import { LectorFacturas } from "@/components/crm/facturas/LectorFacturas";
import { TablaFacturas } from "@/components/crm/facturas/TablaFacturas";
import { descuadre } from "@/components/crm/facturas/utilidades";

export const metadata: Metadata = { title: "Facturas" };
export const dynamic = "force-dynamic";

export default async function PaginaFacturas() {
  const facturas = await listarFacturas();

  // El bucket es privado: cada original se abre con una URL firmada y temporal.
  // Las de origen «carpeta» guardan una ruta del disco del servidor, no del bucket: no tienen enlace.
  const firmadas = await Promise.all(
    facturas.map(
      async (f) => [f.id, f.origen === "crm" && f.archivo ? await urlFirmadaFactura(f.archivo) : null] as const,
    ),
  );
  const urls = Object.fromEntries(firmadas) as Record<number, string | null>;

  const total = facturas.reduce((s, f) => s + (f.total ?? 0), 0);
  const descuadradas = facturas.filter((f) => descuadre(f) != null).length;

  return (
    <main className="flex flex-col px-4 pb-10 lg:px-8">
      <Encabezado
        titulo="Facturas"
        meta={
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            <span>
              <span className="font-medium tabular-nums text-tinta">{numero(facturas.length)}</span> guardada
              {facturas.length === 1 ? "" : "s"}
            </span>
            <span>
              <span className="mr-3 text-linea" aria-hidden>
                ·
              </span>
              <span className="font-medium tabular-nums text-tinta">{dineroExacto(total)}</span> en total
            </span>
            {descuadradas > 0 && (
              <span>
                <span className="mr-3 text-linea" aria-hidden>
                  ·
                </span>
                <span className="font-medium tabular-nums text-tinta">{numero(descuadradas)}</span> con importes que no cuadran
              </span>
            )}
          </span>
        }
        className="px-0 lg:px-0"
      />

      <LectorFacturas guardadas={facturas} />

      <section aria-labelledby="titulo-guardadas" className="mt-8 flex flex-col gap-3">
        <h2 id="titulo-guardadas" className="text-sm font-semibold text-tinta">
          Facturas guardadas
        </h2>
        <TablaFacturas facturas={facturas} urls={urls} />
      </section>
    </main>
  );
}
