import type { Metadata } from "next";
import { directorio, listarVacaciones, obtenerEmpleado, perfilRrhh } from "@/lib/datos/rrhh";
import { ESTADOS_VACACIONES, ETIQUETA_ESTADO_VACACIONES, hoyMadrid, nombreEmpleado } from "@/lib/rrhh";
import { numero } from "@/lib/formato";
import { Encabezado, Seccion, SinDatos } from "@/components/crm/Primitivas";
import { SinFichaRrhh } from "@/components/crm/rrhh/Acceso";
import { FiltrosRrhh, PestanasVista } from "@/components/crm/rrhh/Filtros";
import { Cifras } from "@/components/crm/rrhh/Piezas";
import { SolicitarVacaciones } from "@/components/crm/rrhh/Vacaciones";
import { TablaVacaciones, saldoVacaciones } from "@/components/crm/rrhh/TablaVacaciones";

export const metadata: Metadata = { title: "Vacaciones" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function PaginaVacaciones({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const perfil = await perfilRrhh();
  if (!perfil.empleado) {
    return (
      <main className="flex flex-col px-4 pb-10 lg:px-8">
        <Encabezado titulo="Vacaciones" className="px-0 lg:px-0" />
        <SinFichaRrhh perfil={perfil} />
      </main>
    );
  }

  const sp = await searchParams;
  const yo = perfil.empleado.id;
  const anio = Number(hoyMadrid().slice(0, 4));
  const vistaEquipo = perfil.esGestor && sp.vista === "equipo";
  const anioFiltro = Number(sp.anio) || undefined;

  const [todas, dir, ficha] = await Promise.all([listarVacaciones(), directorio(), obtenerEmpleado(yo)]);
  const personas = new Map(dir.map((e) => [e.id, e]));
  const mias = todas.filter((v) => v.empleado_id === yo);
  const porAprobar = perfil.esGestor ? todas.filter((v) => v.estado === "pendiente" && v.empleado_id !== yo) : [];
  const saldo = saldoVacaciones(mias, ficha?.dias_vacaciones ?? 22, anio);

  const equipo = todas
    .filter((v) => v.empleado_id !== yo)
    .filter((v) => !sp.empleado || !UUID.test(sp.empleado) || v.empleado_id === sp.empleado)
    .filter((v) => !sp.estado || v.estado === sp.estado)
    .filter((v) => !anioFiltro || (v.inicio <= `${anioFiltro}-12-31` && v.fin >= `${anioFiltro}-01-01`));
  const anios = [...new Set(todas.flatMap((v) => [v.inicio.slice(0, 4), v.fin.slice(0, 4)]))].sort().reverse();
  const conSolicitudes = dir.filter((e) => e.id !== yo && todas.some((v) => v.empleado_id === e.id));

  return (
    <main className="flex flex-col gap-4 px-4 pb-10 lg:px-8">
      <Encabezado
        titulo="Vacaciones"
        className="px-0 pb-1 lg:px-0"
        meta={
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            <span>
              <span className="font-medium tabular-nums text-tinta">{saldo.disponibles}</span> días disponibles en {anio}
            </span>
            {perfil.esGestor && (
              <span>
                <span className={`font-medium tabular-nums ${porAprobar.length ? "text-alarma-tinta" : "text-tinta"}`}>{numero(porAprobar.length)}</span>{" "}
                pendientes de tu aprobación
              </span>
            )}
          </span>
        }
      >
        <SolicitarVacaciones disponibles={saldo.disponibles} empleados={perfil.esAdmin ? dir.filter((e) => e.estado === "activo" && e.id !== yo) : undefined} />
      </Encabezado>

      {porAprobar.length > 0 && (
        <Seccion titulo="Pendientes de tu aprobación" id="por-aprobar" extra={<span className="text-xs tabular-nums text-tinta-2">{porAprobar.length}</span>}>
          <TablaVacaciones lista={porAprobar} personas={personas} yoId={yo} esGestor enSeccion />
        </Seccion>
      )}

      {perfil.esGestor && (
        <PestanasVista
          opciones={[
            { valor: "mias", texto: "Mis vacaciones", icono: "yo" },
            { valor: "equipo", texto: "Mi equipo", icono: "equipo" },
          ]}
        />
      )}

      {vistaEquipo ? (
        <>
          <FiltrosRrhh
            pildoras={[
              { clave: "empleado", etiqueta: "Empleado", todos: "Todos", opciones: conSolicitudes.map((e) => ({ valor: e.id, texto: nombreEmpleado(e) })) },
              { clave: "estado", etiqueta: "Estado", todos: "Todos", opciones: ESTADOS_VACACIONES.map((e) => ({ valor: e, texto: ETIQUETA_ESTADO_VACACIONES[e] })) },
              { clave: "anio", etiqueta: "Año", todos: "Todos", opciones: anios.map((a) => ({ valor: a, texto: a })) },
            ]}
          />
          {equipo.length === 0 ? (
            <SinDatos titulo="No hay solicitudes" texto="Cuando alguien de tu equipo solicite vacaciones aparecerá aquí para que la apruebes o la deniegues." />
          ) : (
            <TablaVacaciones lista={equipo} personas={personas} yoId={yo} esGestor={perfil.esGestor} />
          )}
        </>
      ) : (
        <>
          <Cifras
            items={[
              { k: `Días asignados ${anio}`, v: saldo.asignados },
              { k: "Aprobados", v: saldo.aprobados },
              { k: "Pendientes de aprobar", v: saldo.pendientes },
              { k: "Disponibles", v: saldo.disponibles },
            ]}
          />
          {mias.length === 0 ? (
            <SinDatos titulo="Aún no has pedido vacaciones" texto="Solicítalas con el botón de arriba: tu responsable recibirá la solicitud y verás aquí si la aprueba." />
          ) : (
            <TablaVacaciones lista={mias} personas={personas} yoId={yo} esGestor={false} conEmpleado={false} />
          )}
        </>
      )}
    </main>
  );
}
