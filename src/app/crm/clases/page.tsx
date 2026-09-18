import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listarClasesSemana, type ClaseConOcupacion } from "@/lib/datos/clases";
import { centroValido, listarCentros } from "@/lib/datos/comunes";
import { hora, numero } from "@/lib/formato";
import { Encabezado, SinDatos } from "@/components/crm/Primitivas";
import { FiltroCentro } from "@/components/crm/FiltroCentro";

export const metadata: Metadata = { title: "Clases" };
export const dynamic = "force-dynamic";

const NOMBRE_DIA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

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
    <main>
      <Encabezado antetitulo={`Semana del ${diaMes(dias[0])} al ${diaMes(dias[6])}`} titulo="Clases">
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex border border-acero" aria-label="Cambiar de semana">
            <Link href={enlace(offset - 1)} className="grid size-10 place-items-center text-niebla hover:text-azul" aria-label="Semana anterior">
              <ChevronLeft className="size-4" strokeWidth={1.5} />
            </Link>
            <Link
              href={enlace(0)}
              className={`etiqueta grid place-items-center border-x border-acero px-3 text-[0.6rem] ${offset === 0 ? "text-azul" : "hover:text-hielo"}`}
            >
              Esta semana
            </Link>
            <Link href={enlace(offset + 1)} className="grid size-10 place-items-center text-niebla hover:text-azul" aria-label="Semana siguiente">
              <ChevronRight className="size-4" strokeWidth={1.5} />
            </Link>
          </nav>
          <FiltroCentro centros={centros} />
        </div>
      </Encabezado>

      {/* Resumen de la semana */}
      <dl className="grid grid-cols-3 border-b border-acero">
        {[
          { k: "Clases", v: numero(todas.length) },
          { k: "Ocupación", v: plazas > 0 ? `${Math.round((ocupadas / plazas) * 100)} %` : "—" },
          { k: "Completas", v: numero(completas) },
        ].map((d) => (
          <div key={d.k} className="border-r border-acero px-4 py-4 last:border-r-0 lg:px-6">
            <dt className="etiqueta">{d.k}</dt>
            <dd className="cifra mt-2.5 text-[2rem] text-hielo">{d.v}</dd>
          </div>
        ))}
      </dl>

      {todas.length === 0 ? (
        <SinDatos
          titulo="Semana sin clases"
          texto="No hay ninguna clase programada en estas fechas. Prueba con otra semana u otro centro."
          accion={
            <Link href={enlace(0)} className="etiqueta mt-2 text-[0.6rem] text-azul hover:underline">
              Volver a esta semana
            </Link>
          }
        />
      ) : (
        <>
          {/* Atajos de día en móvil */}
          <nav className="scroll-fino sticky top-14 z-30 flex gap-1 overflow-x-auto border-b border-acero bg-negro/95 px-4 py-2 backdrop-blur lg:hidden" aria-label="Ir a un día">
            {dias.map((d, i) => (
              <a
                key={d}
                href={`#dia-${d}`}
                className={`etiqueta shrink-0 border px-3 py-2 text-[0.58rem] ${
                  d === hoy ? "border-azul text-azul" : "border-acero"
                }`}
              >
                {NOMBRE_DIA[i].slice(0, 3)} {diaMes(d).split(" ")[0]}
              </a>
            ))}
          </nav>

          {/* Calendario: una columna por día */}
          <div className="grid gap-px bg-acero lg:grid-cols-7">
            {dias.map((d, i) => {
              const clases = porDia.get(d) ?? [];
              const esHoy = d === hoy;
              return (
                <section key={d} id={`dia-${d}`} className="scroll-mt-28 bg-negro" aria-labelledby={`t-${d}`}>
                  <header
                    className={`sticky top-14 z-20 flex items-baseline justify-between gap-2 border-b px-3 py-3 lg:static ${
                      esHoy ? "border-azul bg-azul-hondo" : "border-acero bg-carbon"
                    }`}
                  >
                    <h2 id={`t-${d}`} className={`titular text-lg ${esHoy ? "text-azul" : "text-hielo"}`}>
                      {NOMBRE_DIA[i]}
                    </h2>
                    <span className="etiqueta text-[0.58rem]">{esHoy ? "Hoy" : diaMes(d)}</span>
                  </header>

                  {clases.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-niebla/70">Sin clases</p>
                  ) : (
                    <ul className="flex flex-col gap-px bg-acero/60">
                      {clases.map((clase) => (
                        <BloqueClase key={clase.id} clase={clase} mostrarCentro={!centro} />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

function BloqueClase({ clase, mostrarCentro }: { clase: ClaseConOcupacion; mostrarCentro: boolean }) {
  const pct = clase.plazas > 0 ? Math.min(100, (clase.ocupadas / clase.plazas) * 100) : 0;
  const completa = clase.ocupadas >= clase.plazas;
  const pasada = new Date(clase.inicio).getTime() + clase.duracion_min * 60_000 < Date.now();

  return (
    <li className={`bg-negro px-3 py-3 ${pasada ? "opacity-45" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-hielo" data-cifra>
          {hora(clase.inicio)}
        </span>
        <span className="text-[0.62rem] text-niebla" data-cifra>
          {clase.duracion_min} min
        </span>
      </div>

      <p className="titular mt-1.5 text-[1.05rem] leading-none text-hielo">{clase.nombre}</p>
      <p className="mt-1 truncate text-[0.7rem] text-niebla">
        {clase.monitor}
        {mostrarCentro && clase.centro && ` · ${clase.centro.nombre.replace("Ice Gym ", "")}`}
      </p>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="h-1 flex-1 bg-grafito">
          <span
            className="block h-full"
            style={{ width: `${pct}%`, backgroundColor: completa ? "var(--ice-azul)" : "#2C9BBF" }}
          />
        </span>
        <span className={`shrink-0 text-[0.65rem] ${completa ? "font-semibold text-azul" : "text-niebla"}`} data-cifra>
          {completa ? "Completa" : `${clase.ocupadas}/${clase.plazas}`}
        </span>
      </div>
    </li>
  );
}
