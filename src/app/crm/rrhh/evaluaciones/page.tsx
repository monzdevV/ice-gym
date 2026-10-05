import type { Metadata } from "next";
import { directorio, gestionados, listarEvaluaciones, perfilRrhh } from "@/lib/datos/rrhh";
import { nombreEmpleado, trimestreActual } from "@/lib/rrhh";
import { numero } from "@/lib/formato";
import { Encabezado, SinDatos } from "@/components/crm/Primitivas";
import { SinFichaRrhh } from "@/components/crm/rrhh/Acceso";
import { NuevaEvaluacion } from "@/components/crm/rrhh/Evaluaciones";
import { FiltrosRrhh } from "@/components/crm/rrhh/Filtros";
import { Cifras } from "@/components/crm/rrhh/Piezas";
import { TablaEvaluaciones } from "@/components/crm/rrhh/TablaEvaluaciones";

export const metadata: Metadata = { title: "Evaluaciones" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function PaginaEvaluaciones({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const perfil = await perfilRrhh();
  if (!perfil.empleado) {
    return (
      <main className="flex flex-col px-4 pb-10 lg:px-8">
        <Encabezado titulo="Evaluaciones" className="px-0 lg:px-0" />
        <SinFichaRrhh perfil={perfil} />
      </main>
    );
  }

  const sp = await searchParams;
  const yo = perfil.empleado.id;
  const [todas, dir, gestiona] = await Promise.all([listarEvaluaciones(), directorio(), gestionados()]);
  const personas = new Map(dir.map((e) => [e.id, e]));
  // A quién puede evaluar: su equipo activo, nunca a sí mismo.
  const evaluables = dir.filter((e) => e.estado === "activo" && e.id !== yo && gestiona(e.id));

  const lista = todas
    .filter((ev) => (perfil.esGestor ? true : ev.empleado_id === yo))
    .filter((ev) => !sp.empleado || !UUID.test(sp.empleado) || ev.empleado_id === sp.empleado)
    .filter((ev) => !sp.anio || String(ev.anio) === sp.anio)
    .filter((ev) => !sp.trimestre || String(ev.trimestre) === sp.trimestre)
    .filter((ev) => !sp.puntuacion || String(ev.puntuacion) === sp.puntuacion);

  const media = lista.length ? lista.reduce((s, ev) => s + ev.puntuacion, 0) / lista.length : 0;
  const { anio, trimestre } = trimestreActual();
  const evaluadosAhora = new Set(todas.filter((ev) => ev.anio === anio && ev.trimestre === trimestre).map((ev) => ev.empleado_id));
  const sinEvaluar = evaluables.filter((e) => !evaluadosAhora.has(e.id)).length;
  const anios = [...new Set(todas.map((ev) => String(ev.anio)))].sort().reverse();
  const conEvaluaciones = dir.filter((e) => todas.some((ev) => ev.empleado_id === e.id));

  return (
    <main className="flex flex-col gap-4 px-4 pb-10 lg:px-8">
      <Encabezado
        titulo="Evaluaciones"
        className="px-0 pb-1 lg:px-0"
        meta={
          perfil.esGestor ? (
            <span>
              Q{trimestre} {anio}: <span className="font-medium tabular-nums text-tinta">{numero(sinEvaluar)}</span>{" "}
              {sinEvaluar === 1 ? "persona de tu equipo sin evaluar" : "personas de tu equipo sin evaluar"}
            </span>
          ) : (
            <span>Tu histórico de evaluaciones trimestrales</span>
          )
        }
      >
        {evaluables.length > 0 && <NuevaEvaluacion empleados={evaluables} />}
      </Encabezado>

      <Cifras
        items={[
          { k: "Evaluaciones", v: numero(lista.length) },
          { k: "Media", v: lista.length ? `${media.toFixed(1).replace(".", ",")}/5` : "—" },
          { k: "Excelentes (5)", v: numero(lista.filter((ev) => ev.puntuacion === 5).length) },
          { k: "Bajas (1–2)", v: numero(lista.filter((ev) => ev.puntuacion <= 2).length) },
        ]}
      />

      <FiltrosRrhh
        pildoras={[
          ...(perfil.esGestor
            ? [{ clave: "empleado", etiqueta: "Empleado", todos: "Todos", opciones: conEvaluaciones.map((e) => ({ valor: e.id, texto: nombreEmpleado(e) })) }]
            : []),
          { clave: "anio", etiqueta: "Año", todos: "Todos", opciones: anios.map((a) => ({ valor: a, texto: a })) },
          { clave: "trimestre", etiqueta: "Trimestre", todos: "Todos", opciones: [1, 2, 3, 4].map((t) => ({ valor: String(t), texto: `Q${t}` })) },
          { clave: "puntuacion", etiqueta: "Puntuación", todos: "Todas", opciones: [5, 4, 3, 2, 1].map((p) => ({ valor: String(p), texto: `${p}/5` })) },
        ]}
      />

      {lista.length === 0 ? (
        <SinDatos
          titulo="No hay evaluaciones"
          texto={
            perfil.esGestor
              ? "Evalúa a tu equipo cada trimestre de 1 a 5. Quedará en su histórico y, si la marcas como visible, podrán consultarla."
              : "Cuando tu responsable te evalúe, verás aquí la puntuación y sus comentarios."
          }
        />
      ) : (
        <TablaEvaluaciones
          lista={lista}
          personas={personas}
          yoId={yo}
          esAdmin={perfil.esAdmin}
          gestionaEmpleado={gestiona}
          empleados={evaluables}
          conEmpleado={perfil.esGestor}
        />
      )}
    </main>
  );
}
