import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Tag } from "@/components/crm/b2b/Piezas";
import { fecha, hora, mesLargo } from "@/lib/formato";
import { duracion, horasDecimal, type EmpleadoMini, type Fichaje } from "@/lib/rrhh";
import { AccionesFichaje } from "./Horarios";
import { EnlaceEmpleado, MarcoTabla, claseCabeceraTabla, claseFilaTabla } from "./Piezas";

/** Estado visible de un registro: incidencia, sin salida (abierto) o correcto. */
function EstadoFichaje({ f, hoy }: { f: Fichaje; hoy: string }) {
  if (f.estado === "incidencia") return <Tag tono="var(--relleno-rosa)">Incidencia</Tag>;
  if (!f.salida) return f.fecha < hoy ? <Tag tono="var(--relleno-ambar)">Sin salida</Tag> : <Tag tono="var(--relleno-azul)">En curso</Tag>;
  return <Tag tono="var(--relleno-verde)">Correcto</Tag>;
}

/** Registros diarios de entrada y salida. */
export function TablaFichajes({
  fichajes,
  personas,
  conEmpleado = true,
  editable = false,
  empleados = [],
  enSeccion = false,
  hoy,
}: {
  fichajes: Fichaje[];
  personas: Map<string, EmpleadoMini>;
  conEmpleado?: boolean;
  editable?: boolean;
  empleados?: EmpleadoMini[];
  enSeccion?: boolean;
  hoy: string;
}) {
  return (
    <MarcoTabla titulo="Registros de entrada y salida" enSeccion={enSeccion} minimo={conEmpleado ? "min-w-[860px]" : "min-w-[620px]"}>
      <thead>
        <tr className={claseCabeceraTabla}>
          {conEmpleado && <th scope="col" className="py-2.5 pl-4 pr-3 font-normal">Empleado</th>}
          <th scope="col" className={`py-2.5 pr-3 font-normal ${conEmpleado ? "" : "pl-4"}`}>Fecha</th>
          <th scope="col" className="py-2.5 pr-3 font-normal">Entrada</th>
          <th scope="col" className="py-2.5 pr-3 font-normal">Salida</th>
          <th scope="col" className="py-2.5 pr-3 text-right font-normal">Total</th>
          <th scope="col" className="py-2.5 pr-3 font-normal">Estado</th>
          <th scope="col" className="py-2.5 pr-4 font-normal">Observaciones</th>
          {editable && (
            <th scope="col" className="w-12 py-2.5 pr-3 font-normal">
              <span className="sr-only">Acciones</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {fichajes.map((f) => (
          <tr key={f.id} className={claseFilaTabla}>
            {conEmpleado && (
              <td className="max-w-[220px] py-2.5 pl-4 pr-3">
                <EnlaceEmpleado e={personas.get(f.empleado_id)} />
              </td>
            )}
            <td className={`py-2.5 pr-3 text-sm tabular-nums text-tinta ${conEmpleado ? "" : "pl-4"}`}>{fecha(f.fecha)}</td>
            <td className="py-2.5 pr-3 text-sm tabular-nums text-tinta">{hora(f.entrada)}</td>
            <td className="py-2.5 pr-3 text-sm tabular-nums text-tinta">{f.salida ? hora(f.salida) : <span className="text-tinta-2">—</span>}</td>
            <td className="py-2.5 pr-3 text-right text-sm font-medium tabular-nums text-tinta">{duracion(f.minutos)}</td>
            <td className="py-2.5 pr-3">
              <EstadoFichaje f={f} hoy={hoy} />
            </td>
            <td className="max-w-[260px] py-2.5 pr-4 text-[0.8125rem] text-tinta-2">
              <span className="line-clamp-2">
                {f.origen === "manual" && <span className="mr-1 font-medium text-tinta">Manual.</span>}
                {f.incidencia ?? (f.origen === "manual" ? "" : "—")}
              </span>
            </td>
            {editable && (
              <td className="py-2.5 pr-3">
                <AccionesFichaje fichaje={f} empleados={empleados} />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </MarcoTabla>
  );
}

/** «octubre de 2026» → «Octubre de 2026» (capitalize de CSS pondría «De»). */
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

type FilaResumen = { empleadoId: string; mes: string; dias: number; minutos: number; incidencias: number; abiertos: number };

/** Agrupa los registros por persona y mes. */
export function resumirPorMes(fichajes: Fichaje[], hoy: string): FilaResumen[] {
  const m = new Map<string, FilaResumen & { fechas: Set<string> }>();
  for (const f of fichajes) {
    const mes = f.fecha.slice(0, 7);
    const k = `${f.empleado_id}|${mes}`;
    const r = m.get(k) ?? { empleadoId: f.empleado_id, mes, dias: 0, minutos: 0, incidencias: 0, abiertos: 0, fechas: new Set<string>() };
    r.fechas.add(f.fecha);
    r.minutos += f.minutos ?? 0;
    if (f.estado === "incidencia") r.incidencias += 1;
    if (!f.salida && f.fecha < hoy) r.abiertos += 1;
    m.set(k, r);
  }
  return [...m.values()]
    .map(({ fechas, ...r }) => ({ ...r, dias: fechas.size }))
    .sort((a, b) => b.mes.localeCompare(a.mes) || a.empleadoId.localeCompare(b.empleadoId));
}

/** Resumen mensual: días trabajados, horas, media diaria e incidencias. */
export function TablaResumenMensual({ filas, personas, conEmpleado = true }: { filas: FilaResumen[]; personas: Map<string, EmpleadoMini>; conEmpleado?: boolean }) {
  return (
    <MarcoTabla titulo="Resumen mensual de horas" minimo="min-w-[760px]">
      <thead>
        <tr className={claseCabeceraTabla}>
          <th scope="col" className="py-2.5 pl-4 pr-3 font-normal">Mes</th>
          {conEmpleado && <th scope="col" className="py-2.5 pr-3 font-normal">Empleado</th>}
          <th scope="col" className="py-2.5 pr-3 text-right font-normal">Días trabajados</th>
          <th scope="col" className="py-2.5 pr-3 text-right font-normal">Horas</th>
          <th scope="col" className="py-2.5 pr-3 text-right font-normal">Media diaria</th>
          <th scope="col" className="py-2.5 pr-4 font-normal">Incidencias</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((r) => (
          <tr key={`${r.empleadoId}-${r.mes}`} className={claseFilaTabla}>
            <td className="py-2.5 pl-4 pr-3 text-sm text-tinta">{mayuscula(mesLargo(`${r.mes}-15T12:00:00Z`))}</td>
            {conEmpleado && (
              <td className="max-w-[220px] py-2.5 pr-3">
                <EnlaceEmpleado e={personas.get(r.empleadoId)} />
              </td>
            )}
            <td className="py-2.5 pr-3 text-right text-sm tabular-nums text-tinta">{r.dias}</td>
            <td className="py-2.5 pr-3 text-right text-sm font-medium tabular-nums text-tinta">{horasDecimal(r.minutos)}</td>
            <td className="py-2.5 pr-3 text-right text-sm tabular-nums text-tinta-2">{r.dias ? duracion(Math.round(r.minutos / r.dias)) : "—"}</td>
            <td className="py-2.5 pr-4 text-sm">
              {r.incidencias + r.abiertos > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-alarma-tinta">
                  <WarningCircle className="size-4" weight="fill" aria-hidden />
                  {[r.incidencias ? `${r.incidencias} incidencia${r.incidencias > 1 ? "s" : ""}` : "", r.abiertos ? `${r.abiertos} sin salida` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ) : (
                <span className="text-tinta-2">Ninguna</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </MarcoTabla>
  );
}
