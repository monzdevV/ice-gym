"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { entrar } from "@/app/crm/acciones/sesion";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";

function Boton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${claseBotonPrincipal} mt-2 w-full`}>
      {pending ? "Entrando…" : "Entrar"}
      <ArrowRight className="size-4" weight="bold" aria-hidden />
    </button>
  );
}

export function FormularioAcceso({ siguiente }: { siguiente?: string }) {
  const [estado, accion] = useActionState(entrar, ESTADO_INICIAL);
  const hayError = estado.ok === false;
  const error = hayError ? "acceso-error" : undefined;

  return (
    <form action={accion} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="siguiente" value={siguiente ?? ""} />

      <p className="-mb-2 text-xs text-tinta-2">Los dos campos son obligatorios.</p>

      <label className="flex flex-col gap-1.5">
        <span className="condensada text-[0.85rem] text-tinta">Email o usuario</span>
        <input
          name="email"
          aria-invalid={hayError || undefined}
          aria-describedby={error}
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          placeholder="tu@icegym.com"
          className={claseCampo}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="condensada text-[0.85rem] text-tinta">Contraseña</span>
        <input
          name="password"
          type="password"
          required
          aria-invalid={hayError || undefined}
          aria-describedby={error}
          autoComplete="current-password"
          className={claseCampo}
        />
      </label>

      {hayError && (
        <p id="acceso-error" role="alert" className={claseError}>
          {estado.mensaje}
        </p>
      )}

      <Boton />
    </form>
  );
}
