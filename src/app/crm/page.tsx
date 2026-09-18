import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cargarPanel } from "@/lib/datos/panel";
import { centroValido, listarCentros } from "@/lib/datos/comunes";
import { dinero, numero, porcentaje } from "@/lib/formato";
import { Bloque, Encabezado } from "@/components/crm/Primitivas";
import { Cifra } from "@/components/crm/Cifra";
import { FiltroCentro } from "@/components/crm/FiltroCentro";
import { GraficoAfluencia } from "@/components/crm/panel/GraficoAfluencia";
import { GraficoIngresos } from "@/components/crm/panel/GraficoIngresos";
import { Embudo } from "@/components/crm/panel/Embudo";
import { Ocupacion } from "@/components/crm/panel/Ocupacion";

export const metadata: Metadata = { title: "Panel" };
export const dynamic = "force-dynamic";

export default async function PaginaPanel({
  searchParams,
}: {
  searchParams: Promise<{ centro?: string }>;
}) {
  const { centro } = await searchParams;
  const centros = await listarCentros();
  const centroId = centroValido(centros, centro);
  const datos = await cargarPanel(centroId);

  const consulta = centroId ? `?centro=${centroId}` : "";

  return (
    <main>
      <Encabezado antetitulo="Resumen del club" titulo="Panel">
        <FiltroCentro centros={centros} />
      </Encabezado>

      {/* Rail de indicadores: cifras enormes separadas por líneas */}
      <div className="grid grid-cols-2 border-b border-acero lg:grid-cols-5">
        <Indicador
          etiqueta="Socios activos"
          valor={<Cifra valor={datos.sociosActivos} className="cifra text-[clamp(2.5rem,5vw,3.75rem)] text-hielo" />}
          pie={`${numero(datos.altasMes)} altas este mes`}
        />
        <Indicador
          etiqueta="Altas del mes"
          valor={
            <Cifra
              valor={datos.altasMes}
              prefijo="+"
              className="cifra text-[clamp(2.5rem,5vw,3.75rem)] text-azul"
            />
          }
          pie={`${numero(datos.bajasMes)} bajas en el mismo periodo`}
        />
        <Indicador
          etiqueta="Ingresos del mes"
          valor={
            <Cifra
              valor={datos.ingresosMes}
              formato="dinero"
              className="cifra text-[clamp(2.1rem,4vw,3.1rem)] text-hielo"
            />
          }
          pie={`${dinero(datos.pendienteMes)} aún pendientes`}
        />
        <Indicador
          etiqueta="Conversión de leads"
          valor={
            <Cifra
              valor={datos.conversion}
              formato="porcentaje"
              className="cifra text-[clamp(2.5rem,5vw,3.75rem)] text-hielo"
            />
          }
          pie={`${numero(datos.convertidosPeriodo)} de ${numero(datos.leadsPeriodo)} en 90 días`}
        />
        <Indicador
          etiqueta="Recibos impagados"
          alarma={datos.recibosImpagados > 0}
          valor={
            <Cifra
              valor={datos.recibosImpagados}
              className={`cifra text-[clamp(2.5rem,5vw,3.75rem)] ${
                datos.recibosImpagados > 0 ? "text-bengala" : "text-hielo"
              }`}
            />
          }
          pie={dinero(datos.impagadoMes)}
          enlace={`/crm/pagos${consulta}`}
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 p-4 lg:grid-cols-3 lg:p-6">
        <Bloque titulo="Afluencia por hora" className="lg:col-span-2">
          <GraficoAfluencia datos={datos.afluencia} />
        </Bloque>

        <Bloque
          titulo="Ocupación ahora"
          extra={<span className="text-[0.65rem] text-niebla">En tiempo real</span>}
        >
          <Ocupacion filas={datos.ocupacion} />
        </Bloque>

        <Bloque titulo="Ingresos por mes" className="lg:col-span-2">
          <GraficoIngresos datos={datos.ingresosPorMes} />
        </Bloque>

        <Bloque
          titulo="Embudo de leads"
          extra={
            <Link
              href={`/crm/leads${consulta}`}
              className="etiqueta flex items-center gap-1 text-[0.6rem] transition-colors hover:text-azul"
            >
              Ver tablero
              <ArrowUpRight className="size-3" strokeWidth={1.5} aria-hidden />
            </Link>
          }
        >
          <Embudo datos={datos.embudo} centroId={centroId} />
        </Bloque>
      </div>
    </main>
  );
}

function Indicador({
  etiqueta,
  valor,
  pie,
  enlace,
  alarma = false,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  pie: string;
  enlace?: string;
  alarma?: boolean;
}) {
  const contenido = (
    <>
      <p className="etiqueta">{etiqueta}</p>
      <div className="mt-3">{valor}</div>
      <p className={`mt-2.5 text-[0.72rem] ${alarma ? "text-bengala" : "text-niebla"}`} data-cifra>
        {pie}
      </p>
    </>
  );

  const clases =
    "relative border-b border-r border-acero px-4 py-5 last:border-r-0 lg:border-b-0 lg:px-5";

  if (enlace) {
    return (
      <Link href={enlace} className={`${clases} group transition-colors hover:bg-carbon`}>
        {contenido}
        <ArrowUpRight
          className="absolute right-4 top-5 size-4 text-niebla opacity-0 transition-opacity group-hover:opacity-100"
          strokeWidth={1.5}
          aria-hidden
        />
      </Link>
    );
  }

  return <div className={clases}>{contenido}</div>;
}
