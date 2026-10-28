import type { Metadata } from "next";
import { directorio, fichajeAbierto, listarFichajes, perfilRrhh } from "@/lib/datos/rrhh";
import { duracion, horasDecimal, hoyMadrid, nombreEmpleado } from "@/lib/rrhh";
import { fecha, numero } from "@/lib/formato";
import { Encabezado, SinDatos } from "@/components/crm/Primitivas";
import { SinFichaRrhh } from "@/components/crm/rrhh/Acceso";
import { FiltrosRrhh, PestanasVista } from "@/components/crm/rrhh/Filtros";
import { BotonFichar, NuevoFichaje } from "@/components/crm/rrhh/Horarios";
import { Cifras } from "@/components/crm/rrhh/Piezas";
import { TablaFichajes, TablaResumenMensual, resumirPorMes } from "@/components/crm/rrhh/TablasHorarios";

export const metadata: Metadata = { title: "Horarios" };
export const dynamic = "force-dynamic";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

function restarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

export default async function PaginaHorarios({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const perfil = await perfilRrhh();
  if (!perfil.empleado) {
    return (
      <main className="flex flex-col px-4 pb-10 lg:px-8">
        <Encabezado titulo="Horarios" className="px-0 lg:px-0" />
        <SinFichaRrhh perfil={perfil} />
      </main>
    );
  }

  const sp = await searchParams;
  const hoy = hoyMadrid();
  const mensual = sp.vista === "mensual";
  const desde = FECHA.test(sp.desde ?? "") ? sp.desde! : mensual ? `${restarDias(hoy, 180).slice(0, 7)}-01` : restarDias(hoy, 30);
  const hasta = FECHA.test(sp.hasta ?? "") ? sp.hasta! : hoy;
  // Quien no gestiona a nadie sólo ve lo suyo (RLS lo garantiza igualmente).
  const empleadoId = perfil.esGestor ? (UUID.test(sp.empleado ?? "") ? sp.empleado : undefined) : perfil.empleado.id;

  const [todos, dir, abierto] = await Promise.all([
    listarFichajes({ empleadoId, desde, hasta }),
    directorio(),
    fichajeAbierto(perfil.empleado.id),
  ]);
  const fichajes = sp.estado === "incidencia" ? todos.filter((f) => f.estado === "incidencia" || (!f.salida && f.fecha < hoy)) : todos;
  const personas = new Map(dir.map((e) => [e.id, e]));
  const visibles = [...new Set(todos.map((f) => f.empleado_id))];
  const opcionesEmpleado = dir.filter((e) => e.id === sp.empleado || visibles.includes(e.id) || e.estado === "activo");

  const minutos = fichajes.reduce((s, f) => s + (f.minutos ?? 0), 0);
  const jornadas = new Set(fichajes.map((f) => `${f.empleado_id}|${f.fecha}`)).size;
  const incidencias = fichajes.filter((f) => f.estado === "incidencia" || (!f.salida && f.fecha < hoy)).length;
  const conEmpleado = perfil.esGestor && !empleadoId;
  const nombreFiltro = empleadoId ? nombreEmpleado(personas.get(empleadoId)) : null;

  return (
    <main className="flex flex-col gap-4 px-4 pb-10 lg:px-8">
      <Encabezado
        titulo="Horarios"
        className="px-0 pb-1 lg:px-0"
        meta={
          <span>
            {nombreFiltro ?? (perfil.esGestor ? "Tu equipo" : "Tus registros")} · del {fecha(desde)} al {fecha(hasta)}
          </span>
        }
      >
        {perfil.esAdmin && <NuevoFichaje empleados={dir.filter((e) => e.estado === "activo")} empleadoId={empleadoId} />}
        <BotonFichar abierto={abierto} />
      </Encabezado>

      <Cifras
        items={[
          { k: "Horas trabajadas", v: horasDecimal(minutos) },
          { k: "Jornadas", v: numero(jornadas) },
          { k: "Media por jornada", v: jornadas ? duracion(Math.round(minutos / jornadas)) : "—" },
          { k: "Incidencias", v: numero(incidencias), detalle: incidencias ? "Incluye fichajes sin salida" : undefined },
        ]}
      />

      <PestanasVista
        opciones={[
          { valor: "diario", texto: "Registros diarios", icono: "lista" },
          { valor: "mensual", texto: "Resumen mensual", icono: "calendario" },
        ]}
      />

      <FiltrosRrhh
        fechas
        pildoras={[
          ...(perfil.esGestor
            ? [
                {
                  clave: "empleado",
                  etiqueta: "Empleado",
                  todos: "Todo el equipo",
                  opciones: opcionesEmpleado.map((e) => ({ valor: e.id, texto: nombreEmpleado(e) })),
                },
              ]
            : []),
          { clave: "estado", etiqueta: "Estado", todos: "Todos", opciones: [{ valor: "incidencia", texto: "Con incidencia" }] },
        ]}
      />

      {fichajes.length === 0 ? (
        <SinDatos
          titulo="No hay registros en este periodo"
          texto={
            perfil.esGestor
              ? "Cambia las fechas o el empleado. Los registros aparecen aquí en cuanto alguien ficha su entrada."
              : "Cuando registres tu entrada y tu salida aparecerán aquí, con el total de horas de cada día."
          }
        />
      ) : mensual ? (
        <TablaResumenMensual filas={resumirPorMes(fichajes, hoy)} personas={personas} conEmpleado={conEmpleado} />
      ) : (
        <TablaFichajes
          fichajes={fichajes}
          personas={personas}
          conEmpleado={conEmpleado}
          editable={perfil.esAdmin}
          empleados={dir.filter((e) => e.estado === "activo")}
          hoy={hoy}
        />
      )}
    </main>
  );
}
