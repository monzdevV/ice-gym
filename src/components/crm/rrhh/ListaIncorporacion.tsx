import { fecha } from "@/lib/formato";
import { estadoTarea, hoyMadrid, type EmpleadoMini, type TareaIncorporacion } from "@/lib/rrhh";
import { AccionesTareaIncorporacion, CasillaIncorporacion } from "./Incorporacion";
import { BadgeTarea, EnlaceEmpleado, PersonaRrhh } from "./Piezas";

/**
 * Checklist de incorporación. Puede marcar cada tarea quien la tiene asignada,
 * el jefe de la persona o administración (la base de datos lo vuelve a comprobar).
 */
export function ListaIncorporacion({
  tareas,
  personas,
  yoId,
  esAdmin,
  gestionaEmpleado,
  conEmpleado = false,
  responsables = [],
}: {
  tareas: TareaIncorporacion[];
  personas: Map<string, EmpleadoMini>;
  yoId: string;
  esAdmin: boolean;
  /** true si quien mira es jefe (o admin) de la persona de estas tareas. */
  gestionaEmpleado: (empleadoId: string) => boolean;
  conEmpleado?: boolean;
  responsables?: EmpleadoMini[];
}) {
  const hoy = hoyMadrid();
  return (
    <ul className="flex flex-col divide-y divide-linea/70">
      {tareas.map((t) => {
        const estado = estadoTarea(t, hoy);
        const puede = esAdmin || t.responsable_id === yoId || gestionaEmpleado(t.empleado_id);
        return (
          <li key={t.id} className="flex items-start gap-3 py-2.5">
            <CasillaIncorporacion tarea={t} puede={puede} />
            <div className="min-w-0 flex-1">
              <p className={`flex flex-wrap items-center gap-x-2 text-sm font-medium ${t.completada ? "text-tinta-2 line-through decoration-tinta-2/60" : "text-tinta"}`}>
                {t.nombre}
                {!t.obligatoria && <span className="text-xs font-normal text-tinta-2 no-underline">Opcional</span>}
              </p>
              {t.descripcion && <p className="mt-0.5 text-[0.8125rem] text-tinta-2">{t.descripcion}</p>}
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tinta-2">
                <BadgeTarea estado={estado} />
                {conEmpleado && <EnlaceEmpleado e={personas.get(t.empleado_id)} />}
                <span className="inline-flex items-center gap-1.5">
                  Responsable: <PersonaRrhh e={t.responsable_id ? personas.get(t.responsable_id) : null} />
                </span>
                {t.completada ? (
                  <span className="tabular-nums">Hecha {fecha(t.completada_at)}</span>
                ) : (
                  t.fecha_limite && <span className={`tabular-nums ${estado === "vencida" ? "font-medium text-critico" : ""}`}>Límite {fecha(t.fecha_limite)}</span>
                )}
              </p>
            </div>
            {esAdmin && <AccionesTareaIncorporacion tarea={t} responsables={responsables} />}
          </li>
        );
      })}
    </ul>
  );
}
