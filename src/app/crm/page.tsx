import type { Metadata } from "next";
import Link from "next/link";
import { cargarDashboard } from "@/lib/datos/dashboard";
import { ruta } from "@/lib/b2b";
import { dinero, numero, porcentaje } from "@/lib/formato";
import { Encabezado, claseEnlace } from "@/components/crm/Primitivas";
import { Kpi, Tarjeta } from "@/components/crm/dashboard/Kpi";
import { FiltrosDashboard } from "@/components/crm/dashboard/FiltrosDashboard";
import {
  GraficoCreadas,
  GraficoEtapas,
  GraficoGanadasPerdidas,
  GraficoPipeline,
  GraficoTipos,
} from "@/components/crm/dashboard/Graficos";
import { ActividadReciente, ProximosSeguimientos, TopEmpresas, TopOportunidades } from "@/components/crm/dashboard/Listas";
import { ETIQUETA_PERIODO_DASHBOARD, periodoValido } from "@/components/crm/dashboard/filtros";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const hoy = () =>
  new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  }).format(new Date());

export default async function PaginaDashboard({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; responsable?: string }>;
}) {
  const sp = await searchParams;
  const periodo = periodoValido(sp.periodo);
  const responsableId = sp.responsable && /^[0-9a-f-]{36}$/i.test(sp.responsable) ? sp.responsable : undefined;
  const d = await cargarDashboard({ periodo, responsableId });
  const k = d.kpis;
  const textoPeriodo = ETIQUETA_PERIODO_DASHBOARD[periodo].toLowerCase();
  const responsable = responsableId ? d.equipo.find((m) => m.id === responsableId) : null;

  return (
    <main className="px-4 pb-12 lg:px-8">
      <Encabezado
        titulo="Dashboard"
        meta={
          <span>
            <span className="inline-block first-letter:uppercase">{hoy()}</span>
            {responsable && <> · cartera de {responsable.nombre}</>}
          </span>
        }
        className="px-0 lg:px-0"
      >
        <FiltrosDashboard periodo={periodo} responsable={responsableId ?? ""} equipo={d.equipo} />
      </Encabezado>

      <h2 className="sr-only">Indicadores</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi
          etiqueta="Pipeline abierto"
          valor={dinero(k.valorPipeline)}
          pie={`${numero(k.abiertas)} oportunidades abiertas`}
          href={ruta.oportunidades}
          delta={k.deltaPipeline}
          serie={d.porMes.map((m) => m.pipeline)}
        />
        <Kpi
          etiqueta="Valor esperado"
          valor={dinero(k.valorEsperado)}
          pie={k.valorPipeline > 0 ? `${porcentaje((k.valorEsperado / k.valorPipeline) * 100)} del pipeline, ponderado` : "Ponderado por probabilidad"}
          href={`${ruta.oportunidades}`}
        />
        <Kpi
          etiqueta="Ganadas"
          valor={numero(k.ganadas)}
          pie={`${dinero(k.valorGanado)} · ${textoPeriodo}`}
          href={`${ruta.oportunidades}?etapa=ganada`}
          serie={d.porMes.map((m) => m.ganadas)}
        />
        <Kpi
          etiqueta="Perdidas"
          valor={numero(k.perdidas)}
          pie={`${dinero(k.valorPerdido)} · ${textoPeriodo}`}
          href={`${ruta.oportunidades}?etapa=perdida`}
        />
        <Kpi
          etiqueta="Tasa de conversión"
          valor={k.conversion == null ? "—" : porcentaje(k.conversion)}
          pie={k.conversion == null ? "Sin cierres en el periodo" : `${numero(k.ganadas)} de ${numero(k.ganadas + k.perdidas)} cerradas`}
          href={ruta.oportunidades}
        />
        <Kpi
          etiqueta="Nuevas oportunidades"
          valor={numero(k.creadasPeriodo)}
          pie={textoPeriodo}
          href={ruta.oportunidades}
          serie={d.porMes.map((m) => m.creadas)}
        />
        <Kpi
          etiqueta="Empresas activas"
          valor={numero(k.empresasActivas)}
          pie={`de ${numero(k.empresasTotal)} empresas`}
          href={`${ruta.empresas}?estado=activa`}
        />
        <Kpi etiqueta="Contactos" valor={numero(k.contactos)} pie="Personas activas" href={ruta.contactos} />
        <Kpi
          etiqueta="Tareas pendientes"
          valor={numero(k.pendientes)}
          pie={k.vencidas > 0 ? `${numero(k.vencidas)} vencidas` : "Ninguna vencida"}
          href={ruta.tareas}
          alarma={k.vencidas > 0}
        />
        <Kpi
          etiqueta="Acciones vencidas"
          valor={numero(k.accionesVencidas)}
          pie="Próximas acciones fuera de plazo"
          href={`${ruta.oportunidades}?vista=tabla&etapa=abiertas&orden=accion&dir=asc`}
          alarma={k.accionesVencidas > 0}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Tarjeta
          titulo="Pipeline por etapa"
          subtitulo={`Valor y nº de oportunidades · cerradas: ${textoPeriodo}`}
          className="xl:col-span-2"
          extra={
            <Link href={`${ruta.oportunidades}`} className={claseEnlace}>
              Ver tablero
            </Link>
          }
        >
          <GraficoEtapas datos={d.porEtapa} />
        </Tarjeta>
        <Tarjeta titulo="Por tipo de oportunidad" subtitulo="Valor abierto">
          {d.porTipo.length > 0 ? (
            <GraficoTipos datos={d.porTipo} />
          ) : (
            <p className="py-6 text-center text-sm text-tinta-2">Sin oportunidades abiertas.</p>
          )}
        </Tarjeta>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Tarjeta
          titulo="Próximos seguimientos"
          subtitulo="Próximas acciones y tareas pendientes, las vencidas primero"
          extra={
            <Link href={ruta.tareas} className={claseEnlace}>
              Ver tareas
            </Link>
          }
        >
          <ProximosSeguimientos items={d.seguimientos} />
        </Tarjeta>
        <Tarjeta
          titulo="Oportunidades más grandes"
          subtitulo="Abiertas, por valor"
          extra={
            <Link href={ruta.oportunidades} className={claseEnlace}>
              Ver todas
            </Link>
          }
        >
          <TopOportunidades items={d.topOportunidades} />
        </Tarjeta>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Tarjeta titulo="Oportunidades creadas" subtitulo="Últimos 9 meses">
          <GraficoCreadas datos={d.porMes} />
        </Tarjeta>
        <Tarjeta titulo="Ganadas y perdidas" subtitulo="Cierres por mes">
          <GraficoGanadasPerdidas datos={d.porMes} />
        </Tarjeta>
        <Tarjeta titulo="Evolución del pipeline" subtitulo="Valor abierto a fin de mes" className="lg:col-span-2 xl:col-span-1">
          <GraficoPipeline datos={d.porMes} />
        </Tarjeta>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Tarjeta
          titulo="Actividad reciente"
          subtitulo="Llamadas, reuniones, emails y cambios de etapa"
          extra={
            <Link href={ruta.actividades} className={claseEnlace}>
              Ver actividad
            </Link>
          }
        >
          <ActividadReciente items={d.actividad} />
        </Tarjeta>
        <Tarjeta
          titulo="Empresas con más valor"
          subtitulo="Ganado y abierto"
          extra={
            <Link href={ruta.empresas} className={claseEnlace}>
              Ver empresas
            </Link>
          }
        >
          <TopEmpresas items={d.topEmpresas} />
        </Tarjeta>
      </div>
    </main>
  );
}
