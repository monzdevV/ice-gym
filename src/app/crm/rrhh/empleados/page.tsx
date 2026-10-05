import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { directorio, listarEmpleados, listarTareasIncorporacion, perfilRrhh, sugerenciasEmpleado } from "@/lib/datos/rrhh";
import { ESTADOS_EMPLEADO, ETIQUETA_ESTADO_EMPLEADO, ETIQUETA_ROL, ROLES, progresoIncorporacion, rutaRrhh, type TareaIncorporacion } from "@/lib/rrhh";
import { numero } from "@/lib/formato";
import { Encabezado } from "@/components/crm/Primitivas";
import { SinFichaRrhh } from "@/components/crm/rrhh/Acceso";
import { FiltrosRrhh } from "@/components/crm/rrhh/Filtros";
import { NuevoEmpleado } from "@/components/crm/rrhh/FormularioEmpleado";
import { VistaEmpleados, type FilaEmpleado } from "@/components/crm/rrhh/VistaEmpleados";

export const metadata: Metadata = { title: "Empleados" };
export const dynamic = "force-dynamic";

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function PaginaEmpleados({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const perfil = await perfilRrhh();
  if (!perfil.empleado) {
    return (
      <main className="flex flex-col px-4 pb-10 lg:px-8">
        <Encabezado titulo="Empleados" className="px-0 lg:px-0" />
        <SinFichaRrhh perfil={perfil} />
      </main>
    );
  }
  // Un empleado sin equipo a cargo sólo puede ver su propia ficha.
  if (!perfil.esGestor) redirect(rutaRrhh.empleado(perfil.empleado.id));

  const sp = await searchParams;
  const [empleados, dir, tareas, sugerencias] = await Promise.all([listarEmpleados(), directorio(), listarTareasIncorporacion(), sugerenciasEmpleado()]);
  const porId = new Map(dir.map((e) => [e.id, e]));
  const tareasDe = new Map<string, TareaIncorporacion[]>();
  for (const t of tareas) tareasDe.set(t.empleado_id, [...(tareasDe.get(t.empleado_id) ?? []), t]);

  const q = normal(sp.q?.trim() ?? "");
  const filas: FilaEmpleado[] = empleados
    .filter((e) => !sp.estado || e.estado === sp.estado)
    .filter((e) => !sp.rol || e.rol === sp.rol)
    .filter((e) => !sp.departamento || e.departamento === sp.departamento)
    .filter((e) => !sp.responsable || e.jefe_id === sp.responsable)
    .filter((e) => !q || normal([e.nombre, e.apellidos, e.email, e.documento, e.puesto, e.departamento, e.usuario].filter(Boolean).join(" ")).includes(q))
    .map((e) => {
      const lista = tareasDe.get(e.id) ?? [];
      return {
        ...e,
        foto_url: porId.get(e.id)?.foto_url ?? null,
        jefe: e.jefe_id ? (porId.get(e.jefe_id) ?? null) : null,
        incorporacion: lista.length ? progresoIncorporacion(lista) : null,
      };
    });

  const activos = empleados.filter((e) => e.estado === "activo").length;
  const enIncorporacion = empleados.filter((e) => {
    const l = tareasDe.get(e.id);
    return e.estado === "activo" && l?.length && !progresoIncorporacion(l).completada;
  }).length;
  const sinCuenta = empleados.filter((e) => e.estado === "activo" && !e.user_id).length;
  const departamentos = [...new Set(empleados.map((e) => e.departamento).filter((d): d is string => !!d))].sort((a, b) => a.localeCompare(b, "es"));
  const responsables = dir.filter((e) => empleados.some((x) => x.jefe_id === e.id));

  const cifras = [
    { k: activos === 1 ? "activo" : "activos", v: activos },
    { k: "en incorporación", v: enIncorporacion },
    { k: "sin cuenta del CRM", v: sinCuenta },
  ];

  return (
    <main className="flex flex-col gap-4 px-4 pb-10 lg:px-8">
      <Encabezado
        titulo="Empleados"
        className="px-0 pb-1 lg:px-0"
        meta={
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {cifras.map((c) => (
              <span key={c.k}>
                <span className="font-medium tabular-nums text-tinta">{numero(c.v)}</span> {c.k}
              </span>
            ))}
          </span>
        }
      >
        {perfil.esAdmin && <NuevoEmpleado directorio={dir} sugerencias={sugerencias} />}
      </Encabezado>

      <FiltrosRrhh
        buscar="Nombre, email, DNI, puesto…"
        pildoras={[
          { clave: "departamento", etiqueta: "Departamento", todos: "Todos", opciones: departamentos.map((d) => ({ valor: d, texto: d })) },
          {
            clave: "responsable",
            etiqueta: "Responsable",
            todos: "Todos",
            opciones: responsables.map((e) => ({ valor: e.id, texto: [e.nombre, e.apellidos].filter(Boolean).join(" ") })),
          },
          { clave: "rol", etiqueta: "Rol", todos: "Todos", opciones: ROLES.map((r) => ({ valor: r, texto: ETIQUETA_ROL[r] })) },
          { clave: "estado", etiqueta: "Estado", todos: "Todos", opciones: ESTADOS_EMPLEADO.map((e) => ({ valor: e, texto: ETIQUETA_ESTADO_EMPLEADO[e] })) },
        ]}
        extra={
          <span className="text-[0.8125rem] tabular-nums text-tinta-2" aria-live="polite">
            {numero(filas.length)} {filas.length === 1 ? "empleado" : "empleados"}
          </span>
        }
      />

      <VistaEmpleados filas={filas} hayFiltros={Boolean(sp.q || sp.estado || sp.rol || sp.departamento || sp.responsable)} />
    </main>
  );
}
