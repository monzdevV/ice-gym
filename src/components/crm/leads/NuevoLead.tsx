"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { crearLead } from "@/app/crm/acciones/leads";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { ETIQUETA_ORIGEN, ORIGENES_LEAD, type Centro, type Tarifa } from "@/lib/tipos";
import { claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";

/** Evento que abre este formulario desde la paleta de comandos o el atajo N. */
export const EVENTO_NUEVO_LEAD = "crm:nuevo-lead";

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${claseBotonPrincipal} w-full`}>
      {pending ? "Creando…" : "Crear lead"}
    </button>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.8125rem] font-medium text-tinta">{etiqueta}</span>
      {children}
    </label>
  );
}

export function NuevoLead({ centros, tarifas }: { centros: Centro[]; tarifas: Tarifa[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [abierto, setAbierto] = useState(params.get("nuevo") === "1");
  const [estado, accion] = useActionState(crearLead, ESTADO_INICIAL);

  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener(EVENTO_NUEVO_LEAD, abrir);
    return () => window.removeEventListener(EVENTO_NUEVO_LEAD, abrir);
  }, []);

  function cambiar(v: boolean) {
    setAbierto(v);
    // Quita ?nuevo=1 de la URL al cerrar para que no se reabra al recargar.
    if (!v && params.get("nuevo")) {
      const p = new URLSearchParams(params.toString());
      p.delete("nuevo");
      router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false });
    }
  }

  const select = `${claseCampo} appearance-none`;

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={`${claseBotonPrincipal} h-8 px-3`}>
        <Plus className="size-4" weight="bold" aria-hidden />
        Nuevo lead
        <kbd className="ml-1 hidden rounded border border-white/30 px-1 text-[0.7rem] font-normal opacity-80 sm:inline">N</kbd>
      </button>

      <Sheet open={abierto} onOpenChange={cambiar}>
        <SheetContent className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="border-b border-linea">
            <SheetTitle>Nuevo lead</SheetTitle>
            <SheetDescription>Entra en la columna «Nuevo». Luego podrás darle valor y próxima acción.</SheetDescription>
          </SheetHeader>
          <form action={accion} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <Campo etiqueta="Nombre y apellidos">
              <input name="nombre" required minLength={2} autoComplete="off" className={claseCampo} />
            </Campo>
            <Campo etiqueta="Email">
              <input name="email" type="email" required autoComplete="off" className={claseCampo} />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input name="telefono" type="tel" autoComplete="off" className={claseCampo} />
            </Campo>
            <Campo etiqueta="Origen">
              <select name="origen" defaultValue="visita" className={select}>
                {ORIGENES_LEAD.map((o) => (
                  <option key={o} value={o}>
                    {ETIQUETA_ORIGEN[o]}
                  </option>
                ))}
              </select>
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Centro">
                <select name="centro_id" defaultValue="" className={select}>
                  <option value="">Sin elegir</option>
                  {centros.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre.replace(/^Ice Gym\s+/i, "")}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Tarifa de interés">
                <select name="tarifa_id" defaultValue="" className={select}>
                  <option value="">Sin elegir</option>
                  {tarifas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <Campo etiqueta="Notas">
              <textarea name="notas" rows={3} className={`${claseCampo} h-auto py-2`} placeholder="Qué busca, cuándo puede venir" />
            </Campo>

            {estado.ok === false && (
              <p role="alert" className={claseError}>
                {estado.mensaje}
              </p>
            )}
            <div className="mt-auto pt-2">
              <Enviar />
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
