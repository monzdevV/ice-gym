import type { Metadata } from "next";
import { listarLeads } from "@/lib/datos/leads";
import { centroValido, listarCentros } from "@/lib/datos/comunes";
import { numero } from "@/lib/formato";
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
  const abiertos = leads.filter((l) => l.estado !== "convertido" && l.estado !== "perdido").length;

  return (
    <main>
      <Encabezado
        titulo="Leads"
        meta={
          <span>
            <span className="cifra text-[1.2rem] text-tinta">{numero(abiertos)}</span> abiertos · arrastra
            una fila para cambiarla de etapa
          </span>
        }
      >
        <FiltroCentro centros={centros} />
      </Encabezado>

      <Tablero leads={leads} />
    </main>
  );
}
