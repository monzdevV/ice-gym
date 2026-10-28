"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CatalogosVentas } from "@/lib/datos/ventas";
import type { ActividadVentasCompleta, OportunidadVentasCompleta } from "@/lib/ventas";
import { DialogoActividad } from "@/components/crm/ventas/DialogoActividad";
import { DialogoNueva, type Prefill } from "./DialogoNueva";

/* Contexto del flujo: cualquier vista puede crear una oportunidad o planificar una actividad. */

type Planificar = { o: OportunidadVentasCompleta; tipo?: string; actividad?: ActividadVentasCompleta };

type Ctx = {
  catalogos: CatalogosVentas;
  /** Actividades pendientes completas (con nota), por oportunidad. */
  actividadesDe: (oportunidadId: string) => ActividadVentasCompleta[];
  nueva: (prefill?: Prefill) => void;
  planificar: (p: Planificar) => void;
};

const Contexto = createContext<Ctx | null>(null);

export function useFlujo() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useFlujo fuera de <ProveedorFlujo>");
  return c;
}

export function ProveedorFlujo({
  catalogos,
  actividades,
  prefillInicial,
  alCerrarNueva,
  children,
}: {
  catalogos: CatalogosVentas;
  actividades: ActividadVentasCompleta[];
  /** Abre «Nuevo» al entrar (enlace con ?nuevo=1). */
  prefillInicial: Prefill | null;
  alCerrarNueva: () => void;
  children: ReactNode;
}) {
  const [prefill, setPrefill] = useState<Prefill | null>(prefillInicial);
  const [plan, setPlan] = useState<Planificar | null>(null);

  // El enlace ?nuevo=1 puede llegar estando ya en la página.
  const [inicial, setInicial] = useState(prefillInicial);
  if (prefillInicial !== inicial) {
    setInicial(prefillInicial);
    if (prefillInicial) setPrefill(prefillInicial);
  }

  const porOportunidad = useMemo(() => {
    const m = new Map<string, ActividadVentasCompleta[]>();
    for (const a of actividades) {
      if (!a.oportunidad_id) continue;
      const lista = m.get(a.oportunidad_id) ?? [];
      lista.push(a);
      m.set(a.oportunidad_id, lista);
    }
    return m;
  }, [actividades]);

  const valor: Ctx = {
    catalogos,
    actividadesDe: (id) => porOportunidad.get(id) ?? [],
    nueva: (p = {}) => setPrefill(p),
    planificar: setPlan,
  };

  return (
    <Contexto.Provider value={valor}>
      {children}
      <DialogoNueva
        prefill={prefill}
        catalogos={catalogos}
        onCerrar={() => {
          setPrefill(null);
          alCerrarNueva();
        }}
      />
      <DialogoActividad
        abierto={!!plan}
        onCerrar={() => setPlan(null)}
        donde={{ oportunidad: plan?.o.id }}
        actividad={plan?.actividad ?? null}
        tipos={catalogos.tipos}
        tipoInicial={plan?.tipo ?? null}
        planes={catalogos.planes}
        comerciales={catalogos.comerciales}
        asignado={plan?.o.comercial_id ?? catalogos.yo}
      />
    </Contexto.Provider>
  );
}
