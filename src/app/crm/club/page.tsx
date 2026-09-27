import type { Metadata } from "next";
import Link from "next/link";
import { cargarPanel } from "@/lib/datos/panel";
import { centroValido, listarCentros } from "@/lib/datos/comunes";
import { dinero, numero, porcentaje } from "@/lib/formato";
import { Encabezado, claseEnlace } from "@/components/crm/Primitivas";
import { FiltroCentro } from "@/components/crm/FiltroCentro";
import { Kpi, Tarjeta } from "@/components/crm/panel/Kpi";
import { GraficoAfluencia, GraficoAltasBajas, GraficoIngresos } from "@/components/crm/panel/Graficos";
import { Embudo, PorOrigen } from "@/components/crm/panel/Embudo";
import { Ocupacion } from "@/components/crm/panel/Ocupacion";
import { ParaHoy } from "@/components/crm/panel/ParaHoy";

export const metadata: Metadata = { title: "Panel del club" };
export const dynamic = "force-dynamic";

const hoy = () =>
  new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  }).format(new Date());

export default async function PaginaPanelClub({
  searchParams,
}: {
  searchParams: Promise<{ centro?: string }>;
}) {
  const { centro } = await searchParams;
  const centros = await listarCentros();
  const centroId = centroValido(centros, centro);
  const d = await cargarPanel(centroId);
  const consulta = centroId ? `?centro=${centroId}` : "";
  const y = centroId ? `&centro=${centroId}` : "";

  return (
    <main className="px-4 pb-12 lg:px-8">
      <Encabezado
        titulo="Panel del club"
        meta={<span className="first-letter:uppercase">{hoy()}</span>}
        className="px-0 lg:px-0"
      >
        <FiltroCentro centros={centros} />
      </Encabezado>

      {/* ¿Qué está pasando? */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          etiqueta="Socios activos"
          valor={numero(d.sociosActivos)}
          pie={`+${numero(d.altasMes)} altas · −${numero(d.bajasMes)} bajas este mes`}
          href={`/crm/socios?estado=activo${y}`}
          serie={d.altasBajas.map((m) => m.altas - m.bajas)}
        />
        <Kpi
          etiqueta="Cobrado este mes"
          valor={dinero(d.ingresosMes)}
          pie={`${dinero(d.pendienteMes)} pendiente · ${dinero(d.ingresosMesAnterior)} el mes pasado`}
          href={`/crm/pagos${consulta}`}
          serie={d.ingresosPorMes.map((m) => m.cobrado)}
        />
        <Kpi
          etiqueta="Pipeline ponderado"
          valor={dinero(d.pipeline.ponderado)}
          pie={`${numero(d.pipeline.n)} oportunidades · ${dinero(d.pipeline.valor)} en juego`}
          href={`/crm/leads?vista=prevision${y}`}
        />
        <Kpi
          etiqueta="Conversión a socio"
          valor={porcentaje(d.conversion)}
          pie={`${numero(d.convertidosPeriodo)} de ${numero(d.leadsPeriodo)} leads · 90 días`}
          href={`/crm/leads${consulta}`}
        />
        <Kpi
          etiqueta="Recibos impagados"
          valor={numero(d.recibosImpagados)}
          pie={`${dinero(d.impagadoMes)} por reclamar`}
          href={`/crm/pagos?estado=impagado${y}`}
          alarma={d.recibosImpagados > 0}
        />
      </div>

      {/* ¿Qué requiere mi atención? */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Tarjeta
          titulo="Para hoy"
          subtitulo="Seguimientos vencidos, visitas de hoy y leads que se enfrían"
          extra={
            <Link href={`/crm/leads?orden=nivel${y}`} className={claseEnlace}>
              Ver todos
            </Link>
          }
        >
          <ParaHoy tareas={d.paraHoy} />
        </Tarjeta>
        <Tarjeta
          titulo="Embudo de ventas"
          subtitulo="Leads de los últimos 90 días"
          extra={
            <Link href={`/crm/leads?vista=tablero${y}`} className={claseEnlace}>
              Ver tablero
            </Link>
          }
        >
          <Embudo datos={d.embudo} centroId={centroId} />
        </Tarjeta>
      </div>

      {/* ¿Cómo evoluciona el negocio? */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Tarjeta titulo="Ingresos" subtitulo="Últimos 6 meses" className="xl:col-span-2">
          <GraficoIngresos datos={d.ingresosPorMes} />
        </Tarjeta>
        <Tarjeta titulo="De dónde llegan" subtitulo="Leads por origen · 90 días">
          <PorOrigen datos={d.porOrigen} />
        </Tarjeta>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Tarjeta titulo="Altas y bajas" subtitulo="Socios por mes">
          <GraficoAltasBajas datos={d.altasBajas} />
        </Tarjeta>
        <Tarjeta titulo="Afluencia por hora" subtitulo="Accesos de los últimos 90 días">
          <GraficoAfluencia datos={d.afluencia} />
        </Tarjeta>
        <Tarjeta titulo="Ocupación en directo" subtitulo="Se actualiza cada minuto">
          <Ocupacion ocupacion={d.ocupacion} />
        </Tarjeta>
      </div>
    </main>
  );
}
