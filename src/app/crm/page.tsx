import type { Metadata } from "next";
import Link from "next/link";
import { cargarPanel } from "@/lib/datos/panel";
import { centroValido, listarCentros } from "@/lib/datos/comunes";
import { dinero, numero } from "@/lib/formato";
import { Encabezado, Seccion, claseEnlace } from "@/components/crm/Primitivas";
import { Cifra } from "@/components/crm/Cifra";
import { FiltroCentro } from "@/components/crm/FiltroCentro";
import { TorreEnDirecto } from "@/components/crm/panel/TorreEnDirecto";
import { GraficoAfluencia } from "@/components/crm/panel/GraficoAfluencia";
import { GraficoIngresos } from "@/components/crm/panel/GraficoIngresos";
import { Embudo } from "@/components/crm/panel/Embudo";

export const metadata: Metadata = { title: "Panel" };
export const dynamic = "force-dynamic";

const hoy = () =>
  new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  }).format(new Date());

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

  const cifras = [
    {
      etiqueta: "Socios activos",
      valor: <Cifra valor={datos.sociosActivos} />,
      pie: `${numero(datos.bajasMes)} bajas este mes`,
      href: `/crm/socios?estado=activo${centroId ? `&centro=${centroId}` : ""}`,
    },
    {
      etiqueta: "Altas del mes",
      valor: <Cifra valor={datos.altasMes} prefijo="+" />,
      pie: "desde el día 1",
      href: `/crm/socios${consulta}`,
    },
    {
      etiqueta: "Cobrado este mes",
      valor: <Cifra valor={datos.ingresosMes} formato="dinero" />,
      pie: `${dinero(datos.pendienteMes)} pendiente`,
      href: `/crm/pagos${consulta}`,
    },
    {
      etiqueta: "Conversión",
      valor: <Cifra valor={datos.conversion} formato="porcentaje" />,
      pie: `${numero(datos.convertidosPeriodo)} de ${numero(datos.leadsPeriodo)} leads, 90 días`,
      href: `/crm/leads${consulta}`,
    },
    {
      etiqueta: "Recibos impagados",
      valor: <Cifra valor={datos.recibosImpagados} />,
      pie: `${dinero(datos.impagadoMes)} por reclamar`,
      href: `/crm/pagos?estado=impagado${centroId ? `&centro=${centroId}` : ""}`,
      alarma: datos.recibosImpagados > 0,
    },
  ];

  return (
    <main>
      <Encabezado titulo="Panel" meta={<span className="first-letter:uppercase">{hoy()}</span>}>
        <FiltroCentro centros={centros} />
      </Encabezado>

      <div className="grid gap-x-8 gap-y-10 px-4 pb-12 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8">
        <TorreEnDirecto ocupacion={datos.ocupacion} entradas={datos.ultimasEntradas} />

        <div className="flex min-w-0 flex-col gap-10">
          {/* Rótulo de cifras: cinco placas pegadas, como el marcador de una retransmisión */}
          <div className="grid grid-cols-2 gap-[3px] sm:grid-cols-3 xl:grid-cols-5">
            {cifras.map((c) => (
              <Link
                key={c.etiqueta}
                href={c.href}
                className="group flex flex-col bg-placa px-4 pb-4 pt-5 transition-colors hover:bg-placa-2"
              >
                <span
                  className={`block cifra text-[clamp(2.4rem,3.6vw,3.4rem)] ${c.alarma ? "text-alarma-tinta" : "text-tinta"}`}
                >
                  {c.valor}
                </span>
                <span className="condensada mt-3 text-[0.95rem] text-tinta">{c.etiqueta}</span>
                <span className="mt-1 text-[0.8rem] text-tinta-2" data-cifra>
                  {c.pie}
                </span>
              </Link>
            ))}
          </div>

          <Seccion titulo="Afluencia por hora" extra={<span className="dato">Últimos 90 días</span>}>
            <GraficoAfluencia datos={datos.afluencia} />
          </Seccion>

          <div className="grid gap-10 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Seccion
              titulo="Ingresos"
              extra={
                <Link href={`/crm/pagos${consulta}`} className={claseEnlace}>
                  Ver pagos
                </Link>
              }
            >
              <GraficoIngresos datos={datos.ingresosPorMes} />
            </Seccion>

            <Seccion
              titulo="Embudo"
              extra={
                <Link href={`/crm/leads${consulta}`} className={claseEnlace}>
                  Ver tablero
                </Link>
              }
            >
              <Embudo datos={datos.embudo} centroId={centroId} />
            </Seccion>
          </div>
        </div>
      </div>
    </main>
  );
}
