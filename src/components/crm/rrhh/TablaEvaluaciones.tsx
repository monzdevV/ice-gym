import { EyeSlash } from "@phosphor-icons/react/dist/ssr";
import { fecha } from "@/lib/formato";
import { etiquetaTrimestre, type EmpleadoMini, type Evaluacion } from "@/lib/rrhh";
import { AccionesEvaluacion } from "./Evaluaciones";
import { EnlaceEmpleado, MarcoTabla, PersonaRrhh, Puntuacion, claseCabeceraTabla, claseFilaTabla } from "./Piezas";

/** Histórico de evaluaciones trimestrales. Nadie edita las suyas. */
export function TablaEvaluaciones({
  lista,
  personas,
  yoId,
  esAdmin,
  gestionaEmpleado,
  empleados,
  conEmpleado = true,
  enSeccion = false,
}: {
  lista: Evaluacion[];
  personas: Map<string, EmpleadoMini>;
  yoId: string;
  esAdmin: boolean;
  gestionaEmpleado: (id: string) => boolean;
  empleados: EmpleadoMini[];
  conEmpleado?: boolean;
  enSeccion?: boolean;
}) {
  const conAcciones = lista.some((ev) => ev.empleado_id !== yoId && gestionaEmpleado(ev.empleado_id));
  return (
    <MarcoTabla titulo="Evaluaciones trimestrales" enSeccion={enSeccion} minimo="min-w-[820px]">
      <thead>
        <tr className={claseCabeceraTabla}>
          {conEmpleado && <th scope="col" className="py-2.5 pl-4 pr-3 font-normal">Empleado</th>}
          <th scope="col" className={`py-2.5 pr-3 font-normal ${conEmpleado ? "" : "pl-4"}`}>Trimestre</th>
          <th scope="col" className="py-2.5 pr-3 font-normal">Evaluación</th>
          <th scope="col" className="py-2.5 pr-3 font-normal">Puntuación</th>
          <th scope="col" className="py-2.5 pr-3 font-normal">Evaluador</th>
          <th scope="col" className="py-2.5 pr-4 font-normal">Comentarios</th>
          {conAcciones && (
            <th scope="col" className="w-12 py-2.5 pr-3 font-normal">
              <span className="sr-only">Acciones</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {lista.map((ev) => {
          const editable = ev.empleado_id !== yoId && gestionaEmpleado(ev.empleado_id);
          return (
            <tr key={ev.id} className={claseFilaTabla}>
              {conEmpleado && (
                <td className="max-w-[220px] py-2.5 pl-4 pr-3">
                  <EnlaceEmpleado e={personas.get(ev.empleado_id)} />
                </td>
              )}
              <td className={`whitespace-nowrap py-2.5 pr-3 text-sm font-medium tabular-nums text-tinta ${conEmpleado ? "" : "pl-4"}`}>{etiquetaTrimestre(ev.trimestre, ev.anio)}</td>
              <td className="py-2.5 pr-3 text-sm text-tinta">
                Evaluación trimestral
                <span className="flex items-center gap-1.5 text-xs tabular-nums text-tinta-2">
                  {fecha(ev.fecha)}
                  {!ev.visible_empleado && (
                    <span className="inline-flex items-center gap-1" title="No visible para el empleado">
                      <EyeSlash className="size-3.5" aria-hidden /> Oculta
                    </span>
                  )}
                </span>
              </td>
              <td className="py-2.5 pr-3">
                <Puntuacion valor={ev.puntuacion} />
              </td>
              <td className="max-w-[180px] py-2.5 pr-3">
                <PersonaRrhh e={ev.evaluador_id ? personas.get(ev.evaluador_id) : null} />
              </td>
              <td className="max-w-[320px] py-2.5 pr-4 text-[0.8125rem] text-tinta-2">
                <span className="line-clamp-3 whitespace-pre-line">{ev.comentarios ?? "—"}</span>
              </td>
              {conAcciones && (
                <td className="py-2.5 pr-3">{editable && <AccionesEvaluacion evaluacion={ev} empleados={empleados} puedeBorrar={esAdmin} />}</td>
              )}
            </tr>
          );
        })}
      </tbody>
    </MarcoTabla>
  );
}
