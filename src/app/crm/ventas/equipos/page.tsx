import type { Metadata } from "next";
import { catalogosVentas, resumenEquipos } from "@/lib/datos/ventas";
import { dinero, numero } from "@/lib/formato";
import { Encabezado } from "@/components/crm/Primitivas";
import { VistaEquipos } from "@/components/crm/ventas/equipos/VistaEquipos";

export const metadata: Metadata = { title: "Equipos de ventas" };
export const dynamic = "force-dynamic";

export default async function PaginaEquiposVentas() {
  const [cats, resumen] = await Promise.all([catalogosVentas(), resumenEquipos()]);
  const activos = cats.equipos.filter((e) => e.activo);
  const abierto = activos.reduce((s, e) => s + (resumen[e.id]?.ingresos ?? 0), 0);
  const ganado = activos.reduce((s, e) => s + (resumen[e.id]?.ganadoMes ?? 0), 0);

  return (
    <main className="flex flex-col px-4 pb-10 lg:px-8">
      <Encabezado
        titulo="Equipos"
        meta={
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            <span>
              <span className="font-medium tabular-nums text-tinta">{numero(activos.length)}</span> equipos
            </span>
            <span>
              <span className="mr-3 text-linea" aria-hidden>·</span>
              <span className="font-medium tabular-nums text-tinta">{dinero(abierto)}</span> abiertos
            </span>
            <span>
              <span className="mr-3 text-linea" aria-hidden>·</span>
              <span className="font-medium tabular-nums text-tinta">{dinero(ganado)}</span> ganados este mes
            </span>
          </span>
        }
        className="px-0 lg:px-0"
      />
      <VistaEquipos equipos={cats.equipos} resumen={resumen} comerciales={cats.comerciales} />
    </main>
  );
}
