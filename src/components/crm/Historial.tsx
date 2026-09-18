import { ArrowRightLeft, Mail, MessageCircle, Phone, StickyNote, UserCheck } from "lucide-react";
import { ETIQUETA_ACTIVIDAD, type Actividad, type TipoActividad } from "@/lib/tipos";
import { fechaHora } from "@/lib/formato";
import { SinDatos } from "./Primitivas";

const ICONO: Record<TipoActividad, typeof Phone> = {
  llamada: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  visita: UserCheck,
  nota: StickyNote,
  cambio_estado: ArrowRightLeft,
};

/** Línea de tiempo de llamadas, emails y notas. Lo más reciente, arriba. */
export function Historial({ actividades }: { actividades: Actividad[] }) {
  if (actividades.length === 0) {
    return (
      <SinDatos
        titulo="Sin actividad"
        texto="Registra la primera llamada o visita para empezar el seguimiento."
      />
    );
  }

  return (
    <ol className="px-4 py-4">
      {actividades.map((actividad, i) => {
        const Icono = ICONO[actividad.tipo] ?? StickyNote;
        const esUltima = i === actividades.length - 1;
        const esSistema = actividad.tipo === "cambio_estado";

        return (
          <li key={actividad.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!esUltima && (
              <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-acero" aria-hidden />
            )}

            <span
              className={`grid size-8 shrink-0 place-items-center border ${
                esSistema ? "border-acero bg-negro text-niebla" : "border-azul/40 bg-azul/10 text-azul"
              }`}
            >
              <Icono className="size-3.5" strokeWidth={1.5} aria-hidden />
            </span>

            <div className="min-w-0 flex-1 pt-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="etiqueta text-[0.6rem] text-hielo">
                  {ETIQUETA_ACTIVIDAD[actividad.tipo]}
                </span>
                <span className="text-[0.68rem] text-niebla" data-cifra>
                  {fechaHora(actividad.created_at)}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-niebla">
                {actividad.descripcion}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
