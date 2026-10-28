import { fecha, fechaHora } from "@/lib/formato";
import { estadoFirma, nombreEmpleado, periodoNomina, tamanoArchivo, type EmpleadoMini, type Nomina } from "@/lib/rrhh";
import { AbrirNomina, AccionesNomina, FirmarNomina } from "./Nominas";
import { BadgeFirma, EnlaceEmpleado, MarcoTabla, claseCabeceraTabla, claseFilaTabla } from "./Piezas";

/** Nóminas con su estado de firma. Cada cual firma sólo las suyas; administración puede borrar las no firmadas. */
export function TablaNominas({
  lista,
  personas,
  yoId,
  esAdmin,
  conEmpleado = true,
  enSeccion = false,
}: {
  lista: Nomina[];
  personas: Map<string, EmpleadoMini>;
  yoId: string;
  esAdmin: boolean;
  conEmpleado?: boolean;
  enSeccion?: boolean;
}) {
  return (
    <MarcoTabla titulo="Nóminas y estado de firma" enSeccion={enSeccion} minimo="min-w-[820px]">
      <thead>
        <tr className={claseCabeceraTabla}>
          {conEmpleado && <th scope="col" className="py-2.5 pl-4 pr-3 font-normal">Empleado</th>}
          <th scope="col" className={`py-2.5 pr-3 font-normal ${conEmpleado ? "" : "pl-4"}`}>Periodo</th>
          <th scope="col" className="py-2.5 pr-3 font-normal">Archivo</th>
          <th scope="col" className="py-2.5 pr-3 font-normal">Subida</th>
          <th scope="col" className="py-2.5 pr-3 font-normal">Firma</th>
          <th scope="col" className="py-2.5 pr-4 text-right font-normal">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {lista.map((n) => {
          const estado = estadoFirma(n);
          const propia = n.empleado_id === yoId;
          const persona = personas.get(n.empleado_id);
          return (
            <tr key={n.id} className={claseFilaTabla}>
              {conEmpleado && (
                <td className="max-w-[220px] py-2.5 pl-4 pr-3">
                  <EnlaceEmpleado e={persona} />
                </td>
              )}
              <td className={`py-2.5 pr-3 text-sm font-medium text-tinta ${conEmpleado ? "" : "pl-4"}`}>{periodoNomina(n.mes, n.anio)}</td>
              <td className="max-w-[220px] py-2.5 pr-3 text-sm">
                <span className="block truncate text-tinta" title={n.archivo_nombre}>
                  {n.archivo_nombre}
                </span>
                <span className="text-xs tabular-nums text-tinta-2">{tamanoArchivo(n.tamano)}</span>
              </td>
              <td className="py-2.5 pr-3 text-sm tabular-nums text-tinta-2">{fecha(n.created_at)}</td>
              <td className="py-2.5 pr-3">
                <span className="flex flex-col items-start gap-0.5">
                  <BadgeFirma estado={estado} />
                  {n.firmada_at && (
                    <span className="text-xs tabular-nums text-tinta-2" title={n.firma_huella ? `Huella ${n.firma_huella}` : undefined}>
                      {fechaHora(n.firmada_at)}
                    </span>
                  )}
                  {!n.firmada_at && n.vista_at && <span className="text-xs tabular-nums text-tinta-2">Vista {fechaHora(n.vista_at)}</span>}
                </span>
              </td>
              <td className="py-2.5 pr-4">
                <span className="flex items-center justify-end gap-2 whitespace-nowrap">
                  <AbrirNomina id={n.id} periodo={periodoNomina(n.mes, n.anio)} />
                  {propia && !n.firmada_at && <FirmarNomina nomina={n} />}
                  {esAdmin && !n.firmada_at && <AccionesNomina nomina={n} nombre={nombreEmpleado(persona)} />}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </MarcoTabla>
  );
}
