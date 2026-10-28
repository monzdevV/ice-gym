"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { aplicarPlanVentas, guardarActividadVentas, marcarActividadHecha } from "@/app/crm/acciones/ventas";
import { nombreCompleto, type Miembro } from "@/lib/b2b";
import { hoyISO, sumarDias, type ActividadVentasCompleta, type PlanActividad, type TipoActividadVentas } from "@/lib/ventas";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { ICONO_ACTIVIDAD } from "./Piezas";

const claseEtiqueta = "text-[0.8125rem] font-medium text-tinta";
const claseSecundario = "h-9 rounded-md border border-linea px-4 text-sm font-medium text-tinta hover:bg-placa-2 disabled:opacity-50";

/**
 * «Planificar actividad»: tipo, vencimiento, resumen, a quién y una nota; o un
 * plan entero de una vez. Con `actividad` edita una que ya existe.
 */
export function DialogoActividad({
  abierto,
  onCerrar,
  donde,
  actividad = null,
  tipos,
  planes = [],
  comerciales,
  asignado = null,
  tipoInicial = null,
}: {
  abierto: boolean;
  onCerrar: () => void;
  donde: { oportunidad?: string; cliente?: string };
  actividad?: ActividadVentasCompleta | null;
  tipos: TipoActividadVentas[];
  planes?: PlanActividad[];
  comerciales: Miembro[];
  /** Asignado por defecto en una nueva (el comercial de la oportunidad o yo). */
  asignado?: string | null;
  /** Tipo elegido al abrir una nueva (si no, el primero). */
  tipoInicial?: string | null;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [plan, setPlan] = useState("");
  const [tipo, setTipo] = useState("");
  const [vence, setVence] = useState("");
  const [resumen, setResumen] = useState("");
  const [nota, setNota] = useState("");
  const [quien, setQuien] = useState("");

  // Al abrir, se rellena con la actividad que se edita o con los valores por defecto.
  const [abiertoPara, setAbiertoPara] = useState<string | null>(null);
  const clave = abierto ? (actividad?.id ?? "nueva") : null;
  if (clave !== abiertoPara) {
    setAbiertoPara(clave);
    if (clave) {
      const t = tipos.find((x) => x.id === (actividad ? actividad.tipo_id : tipoInicial)) ?? (actividad ? undefined : tipos[0]);
      setPlan("");
      setTipo(t?.id ?? "");
      setVence(actividad?.vence ?? sumarDias(hoyISO(), t?.dias ?? 0));
      setResumen(actividad?.resumen ?? t?.resumen ?? "");
      setNota(actividad?.nota ?? "");
      setQuien(actividad?.asignado_id ?? asignado ?? "");
    }
  }

  function elegirTipo(id: string) {
    const t = tipos.find((x) => x.id === id);
    setTipo(id);
    if (!actividad && t) {
      setVence(sumarDias(hoyISO(), t.dias));
      if (!resumen || tipos.some((x) => x.resumen === resumen)) setResumen(t.resumen ?? "");
    }
  }

  // Un plan empieza hoy; al volver a una sola actividad, vence según su tipo.
  function elegirPlan(id: string) {
    setPlan(id);
    setVence(id ? hoyISO() : sumarDias(hoyISO(), tipos.find((x) => x.id === tipo)?.dias ?? 0));
  }

  const planElegido = planes.find((p) => p.id === plan);

  function guardar(hecha: boolean) {
    empezar(async () => {
      if (planElegido) {
        const r = await aplicarPlanVentas(planElegido.id, donde, vence || undefined);
        if (!r.ok) return void toast.error(r.mensaje);
        toast.success(r.mensaje);
      } else {
        const r = await guardarActividadVentas({
          id: actividad?.id,
          oportunidad_id: donde.oportunidad ?? actividad?.oportunidad_id,
          cliente_id: donde.cliente ?? actividad?.cliente_id,
          tipo_id: tipo || null,
          resumen,
          nota,
          vence,
          asignado_id: quien || null,
        });
        if (!r.ok) return void toast.error(r.mensaje);
        if (hecha && r.id) {
          const h = await marcarActividadHecha(r.id);
          if (!h.ok) return void toast.error(h.mensaje);
          toast.success("Actividad registrada como hecha.");
        } else toast.success(r.mensaje);
      }
      onCerrar();
      router.refresh();
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && !pendiente && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{actividad ? "Editar actividad" : "Planificar actividad"}</DialogTitle>
          <DialogDescription className="sr-only">Tipo, vencimiento, resumen, responsable y nota de la actividad.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            guardar(false);
          }}
          className="flex flex-col gap-4"
        >
          {!actividad && planes.length > 0 && (
            <label className="flex flex-col gap-1.5">
              <span className={claseEtiqueta}>Plan</span>
              <select value={plan} onChange={(e) => elegirPlan(e.target.value)} className={claseCampo}>
                <option value="">Una sola actividad</option>
                {planes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {p.pasos.length} {p.pasos.length === 1 ? "actividad" : "actividades"}
                  </option>
                ))}
              </select>
            </label>
          )}

          {planElegido ? (
            <>
              <ol className="flex flex-col gap-1.5 rounded-lg bg-placa-2 p-3 text-sm">
                {planElegido.pasos.map((p) => {
                  const t = tipos.find((x) => x.id === p.tipo_id);
                  const Icono = ICONO_ACTIVIDAD[t?.icono ?? "tarea"];
                  const m = comerciales.find((c) => c.id === p.asignado_id);
                  return (
                    <li key={p.id} className="flex items-center gap-2">
                      <Icono className="size-4 text-tinta-2" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-tinta">{p.resumen || t?.nombre || "Actividad"}</span>
                      <span className="shrink-0 text-xs text-tinta-2">
                        {p.dias === 0 ? "el mismo día" : `+${p.dias} días`}
                        {m ? ` · ${m.nombre}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <label className="flex flex-col gap-1.5">
                <span className={claseEtiqueta}>A partir del</span>
                <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className={claseCampo} required />
              </label>
            </>
          ) : (
            <>
              <fieldset className="flex flex-col gap-1.5">
                <legend className={`${claseEtiqueta} mb-1.5`}>Tipo de actividad</legend>
                <div className="flex flex-wrap gap-1.5">
                  {tipos.map((t) => {
                    const Icono = ICONO_ACTIVIDAD[t.icono];
                    const on = tipo === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => elegirTipo(t.id)}
                        aria-pressed={on}
                        className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] transition-colors ${
                          on ? "border-acento bg-acento/10 text-acento-tinta" : "border-linea text-tinta-2 hover:text-tinta"
                        }`}
                      >
                        <Icono className="size-4" weight={on ? "fill" : "regular"} aria-hidden />
                        {t.nombre}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={claseEtiqueta}>Fecha de vencimiento</span>
                  <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className={claseCampo} required />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={claseEtiqueta}>Asignado a</span>
                  <select value={quien} onChange={(e) => setQuien(e.target.value)} className={claseCampo}>
                    <option value="">Sin asignar</option>
                    {comerciales
                      .filter((c) => c.activo || c.id === quien)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {nombreCompleto(c)}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className={claseEtiqueta}>Resumen</span>
                <input
                  value={resumen}
                  onChange={(e) => setResumen(e.target.value)}
                  maxLength={200}
                  placeholder="p. ej. Hablar de la propuesta"
                  className={claseCampo}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={claseEtiqueta}>Nota</span>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={3}
                  maxLength={5000}
                  placeholder="Escribe una nota…"
                  className={`${claseCampo} h-auto py-2`}
                />
              </label>
            </>
          )}

          <DialogFooter className="gap-2 sm:justify-start">
            <button type="submit" disabled={pendiente || (!planElegido && !tipo)} className={claseBotonPrincipal}>
              {pendiente ? "Guardando…" : actividad ? "Guardar" : "Planificar"}
            </button>
            {!actividad && !planElegido && (
              <button type="button" onClick={() => guardar(true)} disabled={pendiente || !tipo} className={claseSecundario}>
                Marcar como hecho
              </button>
            )}
            <button type="button" onClick={onCerrar} disabled={pendiente} className={`${claseSecundario} sm:ml-auto`}>
              Descartar
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
