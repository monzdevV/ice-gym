import type { Metadata } from "next";
import { listarLeads } from "@/lib/datos/leads";
import { centroValido, listarCentros } from "@/lib/datos/comunes";
import { Encabezado } from "@/components/crm/Primitivas";
import { FiltroCentro } from "@/components/crm/FiltroCentro";
import { Tablero } from "@/components/crm/leads/Tablero";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

export default async function PaginaLeads({
  searchParams,
}: {
  searchParams: Promise<{ centro?: string }>;
}) {
  const { centro } = await searchParams;
  const centros = await listarCentros();
  const centroId = centroValido(centros, centro);
  const leads = await listarLeads(centroId);

  return (
    <main>
      <Encabezado antetitulo="Embudo comercial" titulo="Leads">
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-niebla sm:block">
            Arrastra una tarjeta para cambiar su estado
          </p>
          <FiltroCentro centros={centros} />
        </div>
      </Encabezado>

      <Tablero leads={leads} />
    </main>
  );
}
