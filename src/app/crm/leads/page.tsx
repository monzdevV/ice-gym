import type { Metadata } from "next";
import { listarLeads } from "@/lib/datos/leads";
import { centroValido, listarCentros, listarTarifas } from "@/lib/datos/comunes";
import { dinero, numero } from "@/lib/formato";
import { totales } from "@/lib/oportunidad";
import { esAbierto } from "@/lib/tipos";
import { Encabezado } from "@/components/crm/Primitivas";
import { FiltroCentro } from "@/components/crm/FiltroCentro";
import { VistaLeads } from "@/components/crm/leads/VistaLeads";
import { NuevoLead } from "@/components/crm/leads/NuevoLead";

export const metadata: Metadata = { title: "Oportunidades" };
export const dynamic = "force-dynamic";

export default async function PaginaLeads({
  searchParams,
}: {
  searchParams: Promise<{ centro?: string }>;
}) {
  const { centro } = await searchParams;
  const [centros, tarifas] = await Promise.all([listarCentros(), listarTarifas()]);
  const centroId = centroValido(centros, centro);
  const leads = await listarLeads(centroId);
  const abiertos = totales(leads.filter((l) => esAbierto(l.estado)));

  return (
    <main className="flex flex-col px-4 pb-10 md:h-[calc(100dvh-3.5rem)] md:pb-4 lg:px-8">
      <Encabezado
        titulo="Oportunidades"
        meta={
          <span>
            <span className="font-medium text-tinta">{numero(abiertos.n)}</span> abiertas ·{" "}
            <span className="font-medium text-tinta">{dinero(abiertos.ponderado)}</span> ponderados de{" "}
            {dinero(abiertos.valor)} en juego
          </span>
        }
        className="px-0 lg:px-0"
      >
        <FiltroCentro centros={centros} />
        <NuevoLead centros={centros} tarifas={tarifas} />
      </Encabezado>

      <VistaLeads leads={leads} />
    </main>
  );
}
