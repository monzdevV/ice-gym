import { nombreCompleto, type Miembro } from "@/lib/b2b";
import { numero } from "@/lib/formato";
import type { ActividadVentasCompleta, TipoActividadVentas } from "@/lib/ventas";
import { Seccion } from "@/components/crm/Primitivas";
import { ICONO_ACTIVIDAD } from "@/components/crm/ventas/Piezas";

/** Análisis de actividades de los últimos y los próximos 30 días (server-safe). */

const celda = "px-3 py-2 text-right tabular-nums";
const cabecera = "px-3 py-2 text-xs font-semibold uppercase tracking-[0.04em] text-tinta-2";
const SIN = "sin";

function NombreTipo({ t }: { t: Pick<TipoActividadVentas, "nombre" | "icono"> | undefined }) {
  const Icono = ICONO_ACTIVIDAD[t?.icono ?? "tarea"];
  return (
    <span className="flex items-center gap-2 text-tinta">
      <Icono className="size-4 shrink-0 text-tinta-2" aria-hidden />
      {t?.nombre ?? "Sin tipo"}
    </span>
  );
}

export function AnalisisActividades({
  actividades,
  tipos,
  comerciales,
  hoy,
}: {
  actividades: ActividadVentasCompleta[];
  tipos: TipoActividadVentas[];
  comerciales: Miembro[];
  hoy: string;
}) {
  if (!actividades.length) {
    return <p className="py-10 text-sm text-tinta-2">Ninguna actividad entre hace 30 días y dentro de 30 días.</p>;
  }

  const filasTipo = [...tipos.map((t) => t.id), ...(actividades.some((a) => !a.tipo_id) ? [SIN] : [])].filter((id) =>
    actividades.some((a) => (a.tipo_id ?? SIN) === id)
  );
  const columnas = [...new Set(actividades.map((a) => a.asignado_id ?? SIN))].sort((a, b) => {
    const na = comerciales.find((c) => c.id === a)?.nombre ?? "~";
    const nb = comerciales.find((c) => c.id === b)?.nombre ?? "~";
    return na.localeCompare(nb, "es");
  });
  const cuenta = (filtro: (a: ActividadVentasCompleta) => boolean) => actividades.filter(filtro).length;
  const deTipo = (id: string) => (a: ActividadVentasCompleta) => (a.tipo_id ?? SIN) === id;
  const deComercial = (id: string) => (a: ActividadVentasCompleta) => (a.asignado_id ?? SIN) === id;
  const nombreComercial = (id: string) => {
    const c = comerciales.find((x) => x.id === id);
    return c ? nombreCompleto(c) : "Sin asignar";
  };

  const hechas = (a: ActividadVentasCompleta) => a.estado === "hecha";
  const vencidas = (a: ActividadVentasCompleta) => a.estado === "pendiente" && a.vence < hoy;
  const proximas = (a: ActividadVentasCompleta) => a.estado === "pendiente" && a.vence >= hoy;

  return (
    <div className="flex flex-col gap-5">
      <Seccion titulo="Por tipo y comercial" id="analisis-comercial">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-linea">
                <th scope="col" className={`${cabecera} text-left`}>
                  Tipo
                </th>
                {columnas.map((c) => (
                  <th key={c} scope="col" className={`${cabecera} text-right`}>
                    {nombreComercial(c)}
                  </th>
                ))}
                <th scope="col" className={`${cabecera} text-right`}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {filasTipo.map((t) => (
                <tr key={t} className="border-b border-linea/60">
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    <NombreTipo t={tipos.find((x) => x.id === t)} />
                  </th>
                  {columnas.map((c) => {
                    const n = cuenta((a) => deTipo(t)(a) && deComercial(c)(a));
                    return (
                      <td key={c} className={`${celda} ${n ? "text-tinta" : "text-tinta-2/60"}`}>
                        {n ? numero(n) : "·"}
                      </td>
                    );
                  })}
                  <td className={`${celda} font-semibold text-tinta`}>{numero(cuenta(deTipo(t)))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="px-3 py-2 text-left font-semibold text-tinta">
                  Total
                </th>
                {columnas.map((c) => (
                  <td key={c} className={`${celda} font-semibold text-tinta`}>
                    {numero(cuenta(deComercial(c)))}
                  </td>
                ))}
                <td className={`${celda} cifra text-base text-tinta`}>{numero(actividades.length)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Seccion>

      <Seccion titulo="Hechas y pendientes" id="analisis-estado">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-linea">
                <th scope="col" className={`${cabecera} text-left`}>
                  Tipo
                </th>
                <th scope="col" className={`${cabecera} text-right`}>
                  Hechas
                </th>
                <th scope="col" className={`${cabecera} text-right`}>
                  Vencidas
                </th>
                <th scope="col" className={`${cabecera} text-right`}>
                  Próximas
                </th>
              </tr>
            </thead>
            <tbody>
              {filasTipo.map((t) => {
                const v = cuenta((a) => deTipo(t)(a) && vencidas(a));
                return (
                  <tr key={t} className="border-b border-linea/60">
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      <NombreTipo t={tipos.find((x) => x.id === t)} />
                    </th>
                    <td className={`${celda} text-tinta`}>{numero(cuenta((a) => deTipo(t)(a) && hechas(a)))}</td>
                    <td className={`${celda} ${v ? "font-semibold text-critico" : "text-tinta"}`}>{numero(v)}</td>
                    <td className={`${celda} text-tinta`}>{numero(cuenta((a) => deTipo(t)(a) && proximas(a)))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="px-3 py-2 text-left font-semibold text-tinta">
                  Total
                </th>
                <td className={`${celda} font-semibold text-tinta`}>{numero(cuenta(hechas))}</td>
                <td className={`${celda} font-semibold text-critico`}>{numero(cuenta(vencidas))}</td>
                <td className={`${celda} font-semibold text-tinta`}>{numero(cuenta(proximas))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Seccion>
    </div>
  );
}
