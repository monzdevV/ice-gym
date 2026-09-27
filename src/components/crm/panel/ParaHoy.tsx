import Link from "next/link";
import { CalendarCheck, CheckCircle, Clock, Warning } from "@phosphor-icons/react/dist/ssr";
import type { Tarea } from "@/lib/datos/panel";
import { fechaHora, hora } from "@/lib/formato";

const TIPO = {
  vencida: { Icono: Clock, texto: "Vencida", tono: "var(--critico)" },
  hoy: { Icono: CalendarCheck, texto: "Hoy", tono: "var(--tag-azul)" },
  visita: { Icono: CalendarCheck, texto: "Visita hoy", tono: "var(--exito)" },
  riesgo: { Icono: Warning, texto: "En riesgo", tono: "var(--tag-rosa)" },
} as const;

/** Qué hacer ahora: acciones vencidas, las de hoy, visitas y leads que se enfrían. */
export function ParaHoy({ tareas }: { tareas: Tarea[] }) {
  if (tareas.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 py-6">
        <CheckCircle className="size-6 text-exito" aria-hidden />
        <p className="text-sm font-medium text-tinta">Todo al día</p>
        <p className="text-[0.8125rem] text-tinta-2">No hay seguimientos pendientes ni leads en riesgo.</p>
      </div>
    );
  }

  return (
    <ul className="-mx-2 flex flex-col">
      {tareas.map((t) => {
        const { Icono, texto, tono } = TIPO[t.tipo];
        return (
          <li key={`${t.tipo}-${t.id}`}>
            <Link
              href={`/crm/leads/${t.id}`}
              className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-placa-2"
            >
              <Icono className="size-[18px] justify-self-center" weight="bold" style={{ color: tono }} aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-tinta">{t.nombre}</span>
                <span className="block truncate text-[0.8125rem] text-tinta-2">{t.motivo}</span>
              </span>
              <span className="text-right text-xs tabular-nums" style={{ color: tono }}>
                {texto}
                {t.cuando && (
                  <span className="block text-tinta-2">{t.tipo === "vencida" ? fechaHora(t.cuando) : hora(t.cuando)}</span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
