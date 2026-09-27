import type { Metadata } from "next";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { listarClasesSemana, type ClaseConOcupacion } from "@/lib/datos/clases";
import { centroValido, listarCentros } from "@/lib/datos/comunes";
import { codigoCentro } from "@/design/tokens";
import { hora, numero } from "@/lib/formato";
import { Encabezado, SinDatos, claseEnlace } from "@/components/crm/Primitivas";
import { FiltroCentro } from "@/components/crm/FiltroCentro";

export const metadata: Metadata = { title: "Clases" };
export const dynamic = "force-dynamic";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function diaMes(clave: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${clave}T12:00:00Z`))
    .replace(".", "");
}

export default async function PaginaClases({
  searchParams,
}: {
  searchParams: Promise<{ centro?: string; semana?: string }>;
}) {
  const params = await searchParams;
  const centros = await listarCentros();
  const centro = centroValido(centros, params.centro);
  const offset = Math.max(-8, Math.min(8, Number(params.semana) || 0));
  const { dias, porDia, hoy } = await listarClasesSemana(centro, offset);

  const todas = [...porDia.values()].flat();
  const plazas = todas.reduce((s, c) => s + c.plazas, 0);
  const ocupadas = todas.reduce((s, c) => s + c.ocupadas, 0);
  const completas = todas.filter((c) => c.ocupadas >= c.plazas).length;

  const enlace = (semana: number) => {
    const sp = new URLSearchParams();
    if (centro) sp.set("centro", centro);
    if (semana !== 0) sp.set("semana", String(semana));
    const q = sp.toString();
    return `/crm/clases${q ? `?${q}` : ""}`;
  };

  return (
    <main className="pb-12">
      <Encabezado
        titulo="Clases"
        meta={
          <span className="flex items-center gap-3">
            <Link href={enlace(offset - 1)} className="text-tinta-2 hover:text-tinta" aria-label="Semana anterior">
              <CaretLeft className="size-5" weight="bold" />
            </Link>
            <span className="condensada text-[0.95rem] text-tinta">
              {diaMes(dias[0])} – {diaMes(dias[6])}
            </span>
            <Link href={enlace(offset + 1)} className="text-tinta-2 hover:text-tinta" aria-label="Semana siguiente">
              <CaretRight className="size-5" weight="bold" />
            </Link>
            {offset !== 0 && (
              <Link href={enlace(0)} className={claseEnlace}>
                Volver a esta semana
              </Link>
            )}
          </span>
        }
      >
        <FiltroCentro centros={centros} />
      </Encabezado>

      <div className="mb-8 grid grid-cols-3 gap-[3px] px-4 lg:px-8">
        {[
          { k: "Clases", v: numero(todas.length) },
          { k: "Ocupación", v: plazas > 0 ? `${Math.round((ocupadas / plazas) * 100)} %` : "—" },
          { k: "Completas", v: numero(completas) },
        ].map((d) => (
          <div key={d.k} className="bg-placa px-4 pb-4 pt-5">
            <p className="cifra text-[2.2rem] text-tinta">{d.v}</p>
            <p className="condensada mt-2.5 text-[0.95rem] text-tinta">{d.k}</p>
          </div>
        ))}
      </div>

      {todas.length === 0 ? (
        <div className="px-4 lg:px-8">
          <SinDatos
            titulo="Semana sin clases"
            texto="No hay clases programadas en estas fechas. Prueba otra semana u otro centro."
            accion={
              <Link href={enlace(0)} className={claseEnlace}>
                Volver a esta semana
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid gap-x-3 gap-y-8 px-4 md:grid-cols-2 lg:px-8 xl:grid-cols-7">
          {dias.map((d, i) => {
            const clases = porDia.get(d) ?? [];
            const esHoy = d === hoy;
            return (
              <section key={d} aria-labelledby={`dia-${d}`} className="flex min-w-0 flex-col">
                <header className="flex items-stretch">
                  <span className={`w-2 ${esHoy ? "bg-acento" : "bg-tinta"}`} aria-hidden />
                  <div
                    className={`corte-d flex flex-1 items-baseline justify-between gap-2 py-2 pl-3 pr-5 ${
                      esHoy ? "bg-acento text-sobre-campo" : "bg-tinta text-fondo"
                    }`}
                  >
                    <h2 id={`dia-${d}`} className="rotulo text-[1.15rem]">
                      {DIAS[i]}
                    </h2>
                    <span className="condensada text-[0.8rem]">{esHoy ? "Hoy" : diaMes(d)}</span>
                  </div>
                </header>

                {clases.length === 0 ? (
                  <p className="py-4 text-[0.85rem] text-tinta-2">Sin clases</p>
                ) : (
                  <ol className="mt-[3px] flex flex-col gap-[3px]">
                    {clases.map((c) => (
                      <FilaClase key={c.id} clase={c} mostrarCentro={!centro} />
                    ))}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function FilaClase({ clase, mostrarCentro }: { clase: ClaseConOcupacion; mostrarCentro: boolean }) {
  const pct = clase.plazas > 0 ? Math.min(100, (clase.ocupadas / clase.plazas) * 100) : 0;
  const completa = clase.ocupadas >= clase.plazas;
  // Componente de servidor: se pinta en cada petición, así que leer la hora aquí es correcto.
  // eslint-disable-next-line react-hooks/purity
  const pasada = new Date(clase.inicio).getTime() + clase.duracion_min * 60_000 < Date.now();

  return (
    <li className={`bg-placa px-3 pb-2.5 pt-2 ${pasada ? "text-tinta-2" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`cifra text-[1.15rem] ${pasada ? "text-tinta-2" : "text-tinta"}`}>{hora(clase.inicio)}</span>
        {completa ? (
          <span className="corte-d condensada bg-acento py-0.5 pl-2 pr-4 text-[0.72rem] text-sobre-campo">Completa</span>
        ) : (
          <span className="condensada text-[0.8rem] text-tinta-2" data-cifra>
            {clase.ocupadas}/{clase.plazas}
          </span>
        )}
      </div>
      <p className={`condensada mt-1 truncate text-[1rem] ${pasada ? "text-tinta-2" : "text-tinta"}`}>{clase.nombre}</p>
      <p className="truncate text-[0.78rem] text-tinta-2">
        {clase.monitor}
        {mostrarCentro && clase.centro && ` · ${codigoCentro(clase.centro.nombre)}`}
      </p>
      <span className="mt-2 block h-1 bg-placa-2" aria-hidden>
        <span className={`block h-full ${pasada ? "bg-apagado" : "bg-dato-azul"}`} style={{ width: `${pct}%` }} />
      </span>
    </li>
  );
}
