import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { actividadesDeOportunidades, catalogosVentas, listarOportunidadesVentas } from "@/lib/datos/ventas";
import { dinero, numero } from "@/lib/formato";
import { cuantosFiltrosVentas, ingresoEsperado, leerFiltrosVentas } from "@/lib/ventas";
import { VistaFlujo } from "@/components/crm/ventas/flujo/VistaFlujo";

export const metadata: Metadata = { title: "Flujo" };
export const dynamic = "force-dynamic";

export default async function PaginaFlujo({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filtros = leerFiltrosVentas(await searchParams);
  const catalogos = await catalogosVentas();
  const filas = await listarOportunidadesVentas(filtros, catalogos.yo);
  const actividades = await actividadesDeOportunidades(filas.filter((o) => o.actividades.length).map((o) => o.id));

  let hayAlguna = filas.length > 0;
  if (!hayAlguna && cuantosFiltrosVentas(filtros) > 0) {
    const supabase = await createClient();
    const { count } = await supabase.from("ventas_oportunidades").select("id", { count: "exact", head: true });
    hayAlguna = (count ?? 0) > 0;
  }

  const abiertas = filas.filter((o) => o.estado === "abierta");

  return (
    // En escritorio la pantalla queda fija bajo la barra superior y sólo hacen
    // scroll las columnas del Kanban o el cuerpo de la tabla; en móvil, la página.
    <main className="flex flex-col px-4 pb-10 md:h-[calc(100dvh-4rem)] md:overflow-hidden md:px-8 md:pb-4">
      <VistaFlujo
        filas={filas}
        actividades={actividades}
        catalogos={catalogos}
        hayAlguna={hayAlguna}
        cifras={[
          { etiqueta: "Abiertas", valor: numero(abiertas.length) },
          { etiqueta: "Ingresos esperados", valor: dinero(abiertas.reduce((s, o) => s + o.ingresos, 0)) },
          { etiqueta: "Ponderado", valor: dinero(abiertas.reduce((s, o) => s + ingresoEsperado(o), 0)) },
        ]}
      />
    </main>
  );
}
