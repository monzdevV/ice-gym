import { numero, porcentaje } from "@/lib/formato";
import type { FilaOcupacion } from "@/lib/datos/panel";
import { SinDatos } from "@/components/crm/Primitivas";

/**
 * Cuánta gente hay ahora mismo en cada centro sobre su aforo.
 * No es un gráfico: son medidores, porque cada uno se lee por separado.
 */
export function Ocupacion({ filas }: { filas: FilaOcupacion[] }) {
  if (filas.length === 0) {
    return <SinDatos titulo="Sin centros" texto="Todavía no hay ningún centro dado de alta." />;
  }

  return (
    <ul className="divide-y divide-acero">
      {filas.map((fila) => {
        const pct = fila.aforo > 0 ? (fila.dentro_ahora / fila.aforo) * 100 : 0;
        const lleno = pct >= 80;
        return (
          <li key={fila.centro_id} className="px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-medium text-hielo">{fila.nombre}</p>
              <p className="shrink-0 text-xs text-niebla" data-cifra>
                {numero(fila.socios_activos)} socios
              </p>
            </div>

            <div className="mt-2.5 flex items-center gap-3">
              <span className="h-1.5 flex-1 bg-grafito">
                <span
                  className="block h-full rounded-r-[4px]"
                  style={{
                    width: `${Math.max(pct, fila.dentro_ahora > 0 ? 2 : 0)}%`,
                    backgroundColor: lleno ? "var(--ice-bengala)" : "var(--ice-azul)",
                  }}
                />
              </span>
              <span className="cifra w-16 shrink-0 text-right text-lg text-hielo">
                {numero(fila.dentro_ahora)}
                <span className="etiqueta ml-1 text-[0.6rem]">/{fila.aforo}</span>
              </span>
            </div>

            <p className="mt-1.5 text-[0.7rem] text-niebla" data-cifra>
              {porcentaje(pct)} del aforo
            </p>
          </li>
        );
      })}
    </ul>
  );
}
