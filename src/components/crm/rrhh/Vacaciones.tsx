"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AirplaneTilt, Check, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { claseCampo } from "@/components/crm/Primitivas";
import { cancelarVacaciones, resolverVacaciones, solicitarVacaciones } from "@/app/crm/acciones/rrhh";
import { diasLaborables, hoyMadrid, nombreEmpleado, type EmpleadoMini } from "@/lib/rrhh";
import { CampoRrhh, DialogoFormulario } from "./Comun";
import { claseBotonAccionRrhh, claseBotonSecundarioRrhh } from "./Piezas";

/** Solicitud de vacaciones. Administración puede solicitarlas en nombre de alguien. */
export function SolicitarVacaciones({ disponibles, empleados }: { disponibles?: number; empleados?: EmpleadoMini[] }) {
  const hoy = hoyMadrid();
  const [inicio, setInicio] = useState(hoy);
  const [fin, setFin] = useState(hoy);
  const dias = diasLaborables(inicio, fin);
  const excede = disponibles != null && dias > disponibles;

  return (
    <DialogoFormulario
      disparador={
        <button type="button" className={claseBotonAccionRrhh}>
          <AirplaneTilt className="size-4" weight="bold" aria-hidden /> Solicitar vacaciones
        </button>
      }
      titulo="Solicitar vacaciones"
      descripcion="Tu responsable recibirá la solicitud para aprobarla o denegarla."
      accion={solicitarVacaciones}
      textoEnviar="Enviar solicitud"
      textoPendiente="Enviando…"
      ancho="sm:max-w-md"
    >
      {empleados && empleados.length > 0 && (
        <CampoRrhh etiqueta="Para" ayuda="Vacío: para ti.">
          <select name="empleado_id" defaultValue="" className={`${claseCampo} appearance-none`}>
            <option value="">Para mí</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {nombreEmpleado(e)}
              </option>
            ))}
          </select>
        </CampoRrhh>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoRrhh etiqueta="Desde">
          <input
            type="date"
            name="inicio"
            required
            value={inicio}
            onChange={(e) => {
              setInicio(e.target.value);
              if (e.target.value > fin) setFin(e.target.value);
            }}
            className={claseCampo}
          />
        </CampoRrhh>
        <CampoRrhh etiqueta="Hasta (incluido)">
          <input type="date" name="fin" required min={inicio} value={fin} onChange={(e) => setFin(e.target.value)} className={claseCampo} />
        </CampoRrhh>
      </div>
      <p className={`rounded-md border px-3 py-2 text-sm ${excede ? "border-aviso/40 bg-aviso/[0.07] text-tinta" : "border-linea bg-placa-2/50 text-tinta"}`} aria-live="polite">
        <span className="font-semibold tabular-nums">{dias}</span> {dias === 1 ? "día laborable" : "días laborables"} (lunes a viernes)
        {disponibles != null && (
          <span className="text-tinta-2">
            {" "}
            · te quedan <span className="tabular-nums">{disponibles}</span> este año{excede ? ": supera tu saldo" : ""}
          </span>
        )}
      </p>
      <CampoRrhh etiqueta="Comentario o motivo (opcional)">
        <textarea name="comentario" rows={3} maxLength={500} className={`${claseCampo} h-auto py-2`} />
      </CampoRrhh>
    </DialogoFormulario>
  );
}

/** Aprobar o denegar una solicitud pendiente (responsable o administración, nunca la propia). */
export function ResolverVacaciones({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [denegar, setDenegar] = useState(false);
  const [motivo, setMotivo] = useState("");

  function resolver(aprobar: boolean) {
    empezar(async () => {
      const r = await resolverVacaciones(id, aprobar, aprobar ? "" : motivo);
      if (r.ok) {
        toast.success(r.mensaje);
        setDenegar(false);
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  return (
    <span className="flex items-center gap-1.5">
      <button type="button" disabled={pendiente} onClick={() => resolver(true)} className={claseBotonAccionRrhh}>
        <Check className="size-4" weight="bold" aria-hidden /> Aprobar
      </button>
      <button type="button" disabled={pendiente} onClick={() => setDenegar(true)} className={claseBotonSecundarioRrhh}>
        <X className="size-4" aria-hidden /> Denegar
      </button>
      <Dialog open={denegar} onOpenChange={setDenegar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Denegar las vacaciones de {nombre}?</DialogTitle>
            <DialogDescription>Verá el motivo junto a su solicitud.</DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.8125rem] font-medium text-tinta">Motivo</span>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={500} className={`${claseCampo} h-auto py-2`} />
          </label>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDenegar(false)}
              className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-tinta-2 hover:bg-placa-2 hover:text-tinta"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() => resolver(false)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-alarma px-4 text-sm font-medium text-white shadow-sm transition-[filter] hover:brightness-110 disabled:opacity-50"
            >
              {pendiente ? "Denegando…" : "Denegar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  );
}

/** Cancelar una solicitud propia (pendiente, o aprobada que aún no ha empezado). */
export function CancelarVacaciones({ id }: { id: string }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() =>
        empezar(async () => {
          const r = await cancelarVacaciones(id);
          if (r.ok) {
            toast.success(r.mensaje);
            router.refresh();
          } else toast.error(r.mensaje);
        })
      }
      className="text-[0.8125rem] font-medium text-tinta-2 underline-offset-4 hover:text-alarma-tinta hover:underline disabled:opacity-50"
    >
      {pendiente ? "Cancelando…" : "Cancelar"}
    </button>
  );
}
