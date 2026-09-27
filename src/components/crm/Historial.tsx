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
    <ol className="flex flex-col pt-2">
      {actividades.map((a) => {
        const Icono = ICONO[a.tipo] ?? NotePencil;
        const sistema = a.tipo === "cambio_estado";
        return (
          <li key={a.id} className="group relative grid grid-cols-[2rem_1fr] gap-3 pb-5 last:pb-0">
            {/* Hilo de la línea de tiempo */}
            <span className="absolute bottom-0 left-4 top-8 w-px bg-linea group-last:hidden" aria-hidden />
            <span
              className={`relative grid size-8 place-items-center rounded-full border border-linea ${
                sistema ? "bg-placa text-tinta-2" : "bg-placa-2 text-acento-tinta"
              }`}
            >
              <Icono className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-sm font-medium text-tinta">{ETIQUETA_ACTIVIDAD[a.tipo]}</span>
                <span className="text-[0.8rem] text-tinta-2" data-cifra>
                  {fechaHora(a.created_at)}
                </span>
              </p>
              <p className={`mt-0.5 whitespace-pre-line text-sm leading-relaxed ${sistema ? "text-tinta-2" : "text-tinta"}`}>
                {a.descripcion}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
