import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { directorio, gestionados, listarEmpleados, listarPlantilla, listarTareasIncorporacion, perfilRrhh } from "@/lib/datos/rrhh";
import { estadoTarea, hoyMadrid, progresoIncorporacion, rutaRrhh, type TareaIncorporacion } from "@/lib/rrhh";
import { fecha, numero } from "@/lib/formato";
import { Encabezado, Seccion, SinDatos } from "@/components/crm/Primitivas";
import { Tag } from "@/components/crm/b2b/Piezas";
import { SinFichaRrhh } from "@/components/crm/rrhh/Acceso";
import { FiltrosRrhh } from "@/components/crm/rrhh/Filtros";
import { AccionesPaso, NuevoPaso } from "@/components/crm/rrhh/Incorporacion";
import { ListaIncorporacion } from "@/components/crm/rrhh/ListaIncorporacion";
import { EnlaceEmpleado, MarcoTabla, Progreso, claseCabeceraTabla, claseFilaTabla } from "@/components/crm/rrhh/Piezas";

export const metadata: Metadata = { title: "Tareas de incorporación" };
export const dynamic = "force-dynamic";

function ProgresoDe({ tareas }: { tareas: TareaIncorporacion[] }) {
  const p = progresoIncorporacion(tareas);
  return (
    <span className="w-40">
      <Progreso pct={p.pct} completado={p.completada} texto={p.completada ? "Completada" : `${p.hechas}/${p.obligatorias}`} />
    </span>
  );
}

export default async function PaginaIncorporacion({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const perfil = await perfilRrhh();
  if (!perfil.empleado) {
    return (
      <main className="flex flex-col px-4 pb-10 lg:px-8">
        <Encabezado titulo="Tareas de incorporación" className="px-0 lg:px-0" />
        <SinFichaRrhh perfil={perfil} />
      </main>
    );
  }

  const sp = await searchParams;
  const yo = perfil.empleado.id;
  const hoy = hoyMadrid();
  const [tareas, dir, gestiona, plantilla, empleados] = await Promise.all([
    listarTareasIncorporacion(),
    directorio(),
    gestionados(),
    perfil.esAdmin ? listarPlantilla() : Promise.resolve([]),
    perfil.esGestor ? listarEmpleados() : Promise.resolve([]),
  ]);
  const personas = new Map(dir.map((e) => [e.id, e]));
  const responsables = dir.filter((e) => e.estado === "activo");

  const asignadas = tareas.filter((t) => t.responsable_id === yo && !t.completada && t.empleado_id !== yo);
  const propias = tareas.filter((t) => t.empleado_id === yo);

  const porEmpleado = new Map<string, TareaIncorporacion[]>();
  for (const t of tareas) if (t.empleado_id !== yo || perfil.esAdmin) porEmpleado.set(t.empleado_id, [...(porEmpleado.get(t.empleado_id) ?? []), t]);
  const incorporaciones = empleados
    .filter((e) => porEmpleado.has(e.id) && gestiona(e.id))
    .map((e) => {
      const lista = porEmpleado.get(e.id)!;
      return {
        e,
        p: progresoIncorporacion(lista),
        vencidas: lista.filter((t) => estadoTarea(t, hoy) === "vencida").length,
        pendientes: lista.filter((t) => !t.completada).length,
      };
    })
    .filter((x) => (sp.estado === "completada" ? x.p.completada : sp.estado === "en_curso" ? !x.p.completada : true))
    .sort((a, b) => Number(a.p.completada) - Number(b.p.completada) || b.e.fecha_alta.localeCompare(a.e.fecha_alta));
  const enCurso = incorporaciones.filter((x) => !x.p.completada).length;

  return (
    <main className="flex flex-col gap-5 px-4 pb-10 lg:px-8">
      <Encabezado
        titulo="Tareas de incorporación"
        className="px-0 pb-0 lg:px-0"
        meta={
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            <span>
              <span className="font-medium tabular-nums text-tinta">{numero(asignadas.length)}</span> asignadas a ti
            </span>
            {perfil.esGestor && (
              <span>
                <span className="font-medium tabular-nums text-tinta">{numero(enCurso)}</span> incorporaciones en curso
              </span>
            )}
          </span>
        }
      />

      {asignadas.length > 0 && (
        <Seccion titulo="Asignadas a ti" id="asignadas" extra={<span className="text-xs tabular-nums text-tinta-2">{asignadas.length}</span>}>
          <ListaIncorporacion
            tareas={asignadas.sort((a, b) => (a.fecha_limite ?? "9999").localeCompare(b.fecha_limite ?? "9999"))}
            personas={personas}
            yoId={yo}
            esAdmin={perfil.esAdmin}
            gestionaEmpleado={gestiona}
            conEmpleado
            responsables={responsables}
          />
        </Seccion>
      )}

      {propias.length > 0 && !perfil.esAdmin && (
        <Seccion
          titulo="Tu incorporación"
          id="propia"
          extra={<ProgresoDe tareas={propias} />}
        >
          <ListaIncorporacion tareas={propias} personas={personas} yoId={yo} esAdmin={perfil.esAdmin} gestionaEmpleado={gestiona} />
        </Seccion>
      )}

      {perfil.esGestor && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-tinta">Incorporaciones</h2>
            <FiltrosRrhh
              pildoras={[
                {
                  clave: "estado",
                  etiqueta: "Estado",
                  todos: "Todas",
                  opciones: [
                    { valor: "en_curso", texto: "En curso" },
                    { valor: "completada", texto: "Completadas" },
                  ],
                },
              ]}
            />
          </div>
          {incorporaciones.length === 0 ? (
            <SinDatos titulo="No hay incorporaciones" texto="Cada vez que se da de alta a alguien se genera su lista de tareas de incorporación a partir de la plantilla." />
          ) : (
            <MarcoTabla minimo="min-w-[760px]">
              <thead>
                <tr className={claseCabeceraTabla}>
                  <th className="py-2.5 pl-4 pr-3 font-normal">Empleado</th>
                  <th className="py-2.5 pr-3 font-normal">Alta</th>
                  <th className="w-56 py-2.5 pr-3 font-normal">Progreso (obligatorias)</th>
                  <th className="py-2.5 pr-3 text-right font-normal">Pendientes</th>
                  <th className="py-2.5 pr-4 font-normal">Estado</th>
                </tr>
              </thead>
              <tbody>
                {incorporaciones.map(({ e, p, vencidas, pendientes }) => (
                  <tr key={e.id} className={claseFilaTabla}>
                    <td className="max-w-[240px] py-2.5 pl-4 pr-3">
                      <EnlaceEmpleado e={personas.get(e.id) ?? e} detalle={e.puesto} />
                    </td>
                    <td className="py-2.5 pr-3 text-sm tabular-nums text-tinta-2">{fecha(e.fecha_alta)}</td>
                    <td className="py-2.5 pr-3">
                      <Progreso pct={p.pct} completado={p.completada} texto={`${p.hechas}/${p.obligatorias}`} />
                    </td>
                    <td className="py-2.5 pr-3 text-right text-sm tabular-nums text-tinta">
                      {pendientes}
                      {vencidas > 0 && <span className="ml-1.5 text-xs font-medium text-critico">{vencidas} vencidas</span>}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center justify-between gap-3">
                        {p.completada ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta">
                            <CheckCircle className="size-4 text-exito" weight="fill" aria-hidden /> Completada
                          </span>
                        ) : (
                          <Tag tono={vencidas ? "var(--relleno-rosa)" : "var(--relleno-ambar)"}>{vencidas ? "Con retraso" : "En curso"}</Tag>
                        )}
                        <Link href={`${rutaRrhh.empleado(e.id)}#incorporacion`} className="text-[0.8125rem] font-medium text-acento-tinta hover:underline">
                          Ver tareas
                        </Link>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </MarcoTabla>
          )}
        </div>
      )}

      {perfil.esAdmin && (
        <Seccion titulo="Plantilla de incorporación" id="plantilla" extra={<NuevoPaso />}>
          <p className="mb-2 text-[0.8125rem] text-tinta-2">Estas tareas se crean automáticamente en la ficha de cada nueva alta. Cambiarlas no afecta a las incorporaciones ya creadas.</p>
          {plantilla.length === 0 ? (
            <p className="py-2 text-sm text-tinta-2">La plantilla está vacía: las nuevas altas no tendrán tareas automáticas.</p>
          ) : (
            <ol className="flex flex-col divide-y divide-linea/70">
              {plantilla.map((p, n) => (
                <li key={p.id} className="flex items-start gap-3 py-2.5">
                  <span className="w-5 pt-0.5 text-xs tabular-nums text-tinta-2">{n + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-tinta">
                      {p.nombre}
                      {!p.obligatoria && <span className="ml-2 text-xs font-normal text-tinta-2">Opcional</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-tinta-2">
                      {p.responsable === "jefe" ? "Su responsable" : "RRHH"} · {p.dias_plazo === 0 ? "el día del alta" : `${p.dias_plazo} ${p.dias_plazo === 1 ? "día" : "días"} desde el alta`}
                      {p.descripcion ? ` · ${p.descripcion}` : ""}
                    </p>
                  </div>
                  <AccionesPaso paso={p} />
                </li>
              ))}
            </ol>
          )}
        </Seccion>
      )}

      {!perfil.esGestor && propias.length === 0 && asignadas.length === 0 && (
        <SinDatos titulo="Nada pendiente" texto="No tienes tareas de incorporación propias ni asignadas." />
      )}
    </main>
  );
}
