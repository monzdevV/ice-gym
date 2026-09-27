import type { Metadata } from "next";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { catalogos } from "@/lib/datos/b2b";
import { listarOportunidades, totalesAbiertas } from "@/lib/datos/oportunidades";
import { dinero, numero } from "@/lib/formato";
import { Encabezado, claseBotonPrincipal } from "@/components/crm/Primitivas";
import { NuevaOportunidad } from "@/components/crm/oportunidades/NuevaOportunidad";
import { VistaOportunidades } from "@/components/crm/oportunidades/VistaOportunidades";
import { cuantosFiltros, leerFiltros } from "@/components/crm/oportunidades/filtros";

export const metadata: Metadata = { title: "Oportunidades" };
export const dynamic = "force-dynamic";

export default async function PaginaOportunidades({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filtros = leerFiltros(await searchParams);
  const [filas, cats] = await Promise.all([listarOportunidades(filtros), catalogos()]);

  let hayAlguna = filas.length > 0;
  if (!hayAlguna && cuantosFiltros(filtros) > 0) {
    const supabase = await createClient();
    const { count } = await supabase.from("oportunidades").select("id", { count: "exact", head: true });
    hayAlguna = (count ?? 0) > 0;
  }

  const t = totalesAbiertas(filas);
  const cifra = "font-semibold tabular-nums text-tinta";

  return (
    <main className="flex flex-col px-4 pb-10 md:h-[calc(100dvh-3.5rem)] md:pb-4 lg:px-8">
      <Encabezado
        titulo="Oportunidades"
        className="px-0 lg:px-0"
        meta={
          <dl className="flex flex-wrap gap-x-5 gap-y-1">
            <div className="flex items-baseline gap-1.5">
              <dd className={cifra}>{numero(t.n)}</dd>
              <dt>abiertas</dt>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dd className={cifra}>{dinero(t.valor)}</dd>
              <dt>en pipeline</dt>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dd className={cifra}>{dinero(t.esperado)}</dd>
              <dt>valor esperado</dt>
            </div>
          </dl>
        }
      >
        <NuevaOportunidad catalogos={cats} />
      </Encabezado>

      <VistaOportunidades
        filas={filas}
        catalogos={cats}
        hayAlguna={hayAlguna}
        accionVacia={
          <NuevaOportunidad catalogos={cats}>
            <button type="button" className={`${claseBotonPrincipal} mt-2`}>
              <Plus className="size-4" weight="bold" aria-hidden />
              Crear la primera oportunidad
            </button>
          </NuevaOportunidad>
        }
      />
    </main>
  );
}
