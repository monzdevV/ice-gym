"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { entrar } from "@/app/crm/acciones/sesion";
import { ESTADO_INICIAL } from "@/lib/acciones";

const CAMPO =
  "h-11 w-full border border-acero bg-grafito px-3 text-[15px] text-hielo outline-none transition-colors placeholder:text-niebla focus:border-azul";

function Boton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="titular group flex h-11 w-full items-center justify-center gap-2 bg-azul text-base text-negro transition-colors hover:bg-hielo disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Entrando" : "Entrar"}
      <ArrowRight
        className="size-4 transition-transform group-hover:translate-x-0.5"
        strokeWidth={2}
        aria-hidden
      />
    </button>
  );
}

export function FormularioAcceso({ siguiente }: { siguiente?: string }) {
  const [estado, accion] = useActionState(entrar, ESTADO_INICIAL);

  return (
    <form action={accion} className="mt-8 space-y-4">
      <input type="hidden" name="siguiente" value={siguiente ?? ""} />

      <div>
        <label htmlFor="email" className="etiqueta mb-2 block">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="tu@icegym.com"
          className={CAMPO}
        />
      </div>

      <div>
        <label htmlFor="password" className="etiqueta mb-2 block">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className={CAMPO}
        />
      </div>

      {estado.ok === false && (
        <p
          role="alert"
          className="flex items-start gap-2 border-l-2 border-bengala bg-bengala/8 px-3 py-2.5 text-sm text-bengala"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          {estado.mensaje}
        </p>
      )}

      <Boton />
    </form>
  );
}
