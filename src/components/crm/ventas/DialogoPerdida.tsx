"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { accionLoteVentas, marcarPerdidaVentas } from "@/app/crm/acciones/ventas";
import type { MotivoPerdida } from "@/lib/ventas";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";

/**
 * «Marcar como perdido»: razón de pérdida (de la configuración) y nota de cierre.
 * Vale para una oportunidad o para varias a la vez (acción en lote de la lista).
 */
export function DialogoPerdida({
  ids,
  titulo,
  motivos,
  onCerrar,
}: {
  /** Vacío: cerrado. */
  ids: string[];
  /** Nombre de la oportunidad (o «3 oportunidades»), para la descripción. */
  titulo?: string;
  motivos: MotivoPerdida[];
  /** `true` si se ha marcado; `false` si se ha descartado. */
  onCerrar: (marcada: boolean) => void;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [motivo, setMotivo] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [para, setPara] = useState("");
  const clave = ids.join(",");
  if (clave !== para) {
    setPara(clave);
    setMotivo(null);
    setNota("");
  }

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    empezar(async () => {
      const r =
        ids.length === 1
          ? await marcarPerdidaVentas(ids[0], motivo, nota)
          : await accionLoteVentas(ids, { tipo: "perdida", motivo, nota });
      if (r.ok) {
        toast.success(ids.length === 1 && titulo ? `${titulo}: marcada como perdida` : r.mensaje);
        onCerrar(true);
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  return (
    <Dialog open={ids.length > 0} onOpenChange={(v) => !v && !pendiente && onCerrar(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como perdido</DialogTitle>
          <DialogDescription>{titulo ? `${titulo}. ` : ""}La razón y la nota quedan en el historial.</DialogDescription>
        </DialogHeader>
        <form onSubmit={confirmar} className="flex flex-col gap-3">
          {motivos.length > 0 && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-[0.8125rem] font-medium text-tinta">Razón de pérdida (opcional)</legend>
              <div className="flex flex-wrap gap-1.5">
                {motivos.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMotivo((actual) => (actual === m.id ? null : m.id))}
                    aria-pressed={motivo === m.id}
                    className={`h-7 rounded-full border px-2.5 text-xs transition-colors ${
                      motivo === m.id ? "border-acento bg-acento/10 text-acento-tinta" : "border-linea text-tinta-2 hover:text-tinta"
                    }`}
                  >
                    {m.nombre}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.8125rem] font-medium text-tinta">Nota de cierre</span>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              maxLength={2000}
              autoFocus
              placeholder="Qué ha pasado, para aprender de ello"
              className={`${claseCampo} h-auto py-2`}
            />
          </label>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => onCerrar(false)}
              disabled={pendiente}
              className="h-9 rounded-md border border-linea px-4 text-sm font-medium text-tinta hover:bg-placa-2"
            >
              Descartar
            </button>
            <button type="submit" disabled={pendiente} className={claseBotonPrincipal}>
              {pendiente ? "Guardando…" : "Marcar como perdido"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
