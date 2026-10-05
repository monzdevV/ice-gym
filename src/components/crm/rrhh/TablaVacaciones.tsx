import { fecha, fechaHora } from "@/lib/formato";
import { diasEnAnio, hoyMadrid, nombreEmpleado, type EmpleadoMini, type Vacaciones } from "@/lib/rrhh";
import { BadgeVacaciones, EnlaceEmpleado, MarcoTabla, PersonaRrhh, claseCabeceraTabla, claseFilaTabla } from "./Piezas";
import { CancelarVacaciones, ResolverVacaciones } from "./Vacaciones";

/** Saldo del año: días asignados, aprobados, pendientes y disponibles. */
export function saldoVacaciones(lista: Vacaciones[], asignados: number, anio: number) {
  const enAnio = (v: Vacaciones) => diasEnAnio(v, anio);
  const aprobados = lista.filter((v) => v.estado === "aprobada").reduce((s, v) => s + enAnio(v), 0);
  const pendientes = lista.filter((v) => v.estado === "pendiente").reduce((s, v) => s + enAnio(v), 0);
  return { asignados, aprobados, pendientes, disponibles: Math.max(0, asignados - aprobados - pendientes) };
}

/** Solicitudes de vacaciones con su estado, quién resolvió y las acciones que tocan a cada cual. */
export function TablaVacaciones({
  lista,
  personas,
  yoId,
  esGestor,
  conEmpleado = true,
  enSeccion = false,
}: {
  lista: Vacaciones[];
  personas: Map<string, EmpleadoMini>;
  yoId: string;
  esGestor: boolean;
  conEmpleado?: boolean;
  enSeccion?: boolean;
}) {
  const hoy = hoyMadrid();
  return (
    <MarcoTabla enSeccion={enSeccion} minimo="min-w-[900px]">
      <thead>
        <tr className={claseCabeceraTabla}>
          {conEmpleado && <th className="py-2.5 pl-4 pr-3 font-normal">Empleado</th>}
          <th className={`py-2.5 pr-3 font-normal ${conEmpleado ? "" : "pl-4"}`}>Periodo</th>
          <th className="py-2.5 pr-3 text-right font-normal">Días</th>
          <th className="py-2.5 pr-3 font-normal">Estado</th>
          <th className="py-2.5 pr-3 font-normal">Comentario</th>
          <th className="py-2.5 pr-3 font-normal">Resuelta por</th>
          <th className="py-2.5 pr-4 text-right font-normal">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {lista.map((v) => {
          const propia = v.empleado_id === yoId;
          const resolver = esGestor && !propia && v.estado === "pendiente";
          const cancelar = propia && (v.estado === "pendiente" || (v.estado === "aprobada" && v.inicio > hoy));
          const persona = personas.get(v.empleado_id);
          return (
            <tr key={v.id} className={claseFilaTabla}>
              {conEmpleado && (
                <td className="max-w-[220px] py-2.5 pl-4 pr-3">
                  <EnlaceEmpleado e={persona} />
                </td>
              )}
              <td className={`py-2.5 pr-3 text-sm tabular-nums text-tinta ${conEmpleado ? "" : "pl-4"}`}>
                {v.inicio === v.fin ? fecha(v.inicio) : `${fecha(v.inicio)} – ${fecha(v.fin)}`}
                <span className="block text-xs text-tinta-2">Solicitada {fecha(v.created_at)}</span>
              </td>
              <td className="py-2.5 pr-3 text-right text-sm font-medium tabular-nums text-tinta">{v.dias}</td>
              <td className="py-2.5 pr-3">
                <BadgeVacaciones estado={v.estado} />
              </td>
              <td className="max-w-[220px] py-2.5 pr-3 text-[0.8125rem] text-tinta-2">
                <span className="line-clamp-2">{v.comentario ?? "—"}</span>
              </td>
              <td className="max-w-[220px] py-2.5 pr-3">
                {v.resuelta_por ? (
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <PersonaRrhh e={personas.get(v.resuelta_por)} />
                    <span className="text-xs tabular-nums text-tinta-2">{fechaHora(v.resuelta_at)}</span>
                    {v.respuesta && <span className="line-clamp-2 text-xs text-tinta-2">«{v.respuesta}»</span>}
                  </span>
                ) : v.estado === "cancelada" ? (
                  <span className="text-xs tabular-nums text-tinta-2">Cancelada {fechaHora(v.cancelada_at)}</span>
                ) : (
                  <span className="text-sm text-tinta-2">—</span>
                )}
              </td>
              <td className="py-2.5 pr-4">
                <span className="flex items-center justify-end gap-3 whitespace-nowrap">
                  {resolver && <ResolverVacaciones id={v.id} nombre={nombreEmpleado(persona)} />}
                  {cancelar && <CancelarVacaciones id={v.id} />}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </MarcoTabla>
  );
}
