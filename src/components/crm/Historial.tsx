import {
  ArrowsLeftRight,
  ChatCircle,
  EnvelopeSimple,
  NotePencil,
  Phone,
  UserCheck,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { ETIQUETA_ACTIVIDAD, type Actividad, type TipoActividad } from "@/lib/tipos";
import { fechaHora } from "@/lib/formato";
import { SinDatos } from "./Primitivas";

const ICONO: Record<TipoActividad, Icon> = {
  llamada: Phone,
  email: EnvelopeSimple,
  whatsapp: ChatCircle,
  visita: UserCheck,
  nota: NotePencil,
  cambio_estado: ArrowsLeftRight,
};

/** Línea de tiempo del seguimiento, lo más reciente arriba. */
export function Historial({ actividades }: { actividades: Actividad[] }) {
  if (actividades.length === 0) {
    return <SinDatos titulo="Sin actividad" texto="Apunta la primera llamada o visita para empezar el seguimiento." />;
  }

  return (
    <ol className="flex flex-col">
      {actividades.map((a) => {
        const Icono = ICONO[a.tipo] ?? NotePencil;
        const sistema = a.tipo === "cambio_estado";
        return (
          <li key={a.id} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-linea py-3.5 last:border-b-0">
            <Icono
              className={`mt-0.5 size-5 ${sistema ? "text-tinta-2" : "text-acento-tinta"}`}
              weight="light"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="condensada text-[0.9rem] text-tinta">{ETIQUETA_ACTIVIDAD[a.tipo]}</span>
                <span className="text-[0.8rem] text-tinta-2" data-cifra>
                  {fechaHora(a.created_at)}
                </span>
              </p>
              <p className={`mt-1 whitespace-pre-line text-[0.92rem] leading-relaxed ${sistema ? "text-tinta-2" : "text-tinta"}`}>
                {a.descripcion}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
