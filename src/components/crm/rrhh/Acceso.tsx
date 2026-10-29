"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck } from "@phosphor-icons/react";
import { SinDatos, claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";
import { altaPrimerAdmin } from "@/app/crm/acciones/rrhh";
import type { Resultado } from "@/app/crm/acciones/b2b";
import { usuarioSugerido, type PerfilRrhh } from "@/lib/rrhh";

/** Formulario para el primer administrador de RRHH (sólo cuando aún no hay ninguno). */
function AltaPrimerAdmin({ email }: { email: string | null }) {
  const router = useRouter();
  const [estado, accion, enviando] = useActionState(async (prev: Resultado | null, fd: FormData) => {
    const r = await altaPrimerAdmin(prev, fd);
    if (r.ok) {
      toast.success(r.mensaje);
      router.refresh();
    }
    return r;
  }, null);

  return (
    <form action={accion} className="flex max-w-xl flex-col gap-4 rounded-xl border border-linea bg-placa p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-acento/15 text-acento-tinta">
          <ShieldCheck className="size-5" weight="fill" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-tinta">Configura RRHH</p>
          <p className="mt-0.5 text-[0.8125rem] text-tinta-2">
            Todavía no hay administración de RRHH. Crea tu ficha de empleado como administrador con tu cuenta actual
            {email ? ` (${email})` : ""}; después podrás dar de alta al resto de la plantilla y sus accesos.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.8125rem] font-medium text-tinta">
            Nombre <span className="font-normal text-tinta-2">(obligatorio)</span>
          </span>
          <input name="nombre" required minLength={2} autoComplete="given-name" className={claseCampo} />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.8125rem] font-medium text-tinta">Apellidos</span>
          <input name="apellidos" autoComplete="family-name" className={claseCampo} />
        </label>
      </div>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[0.8125rem] font-medium text-tinta">Nombre de usuario (opcional)</span>
        <input name="usuario" defaultValue={email ? usuarioSugerido(email) : ""} autoComplete="off" className={claseCampo} />
      </label>
      {estado?.ok === false && (
        <p role="alert" className={claseError}>
          {estado.mensaje}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={enviando} className={claseBotonPrincipal}>
          {enviando ? "Configurando…" : "Ser administrador de RRHH"}
        </button>
      </div>
    </form>
  );
}

/** Pantalla para quien entra al CRM sin ficha de empleado. */
export function SinFichaRrhh({ perfil }: { perfil: PerfilRrhh }) {
  if (!perfil.instalado) {
    return (
      <SinDatos
        titulo="RRHH aún no está instalado en la base de datos"
        texto="Ejecuta una vez el archivo supabase/rrhh.sql en el SQL Editor de Supabase y recarga esta página."
      />
    );
  }
  if (!perfil.hayAdmin) return <AltaPrimerAdmin email={perfil.email} />;
  return (
    <SinDatos
      titulo="Tu usuario no tiene ficha de empleado"
      texto={`RRHH funciona con la ficha de cada persona. Pide a administración que te dé de alta en Empleados con tu email${
        perfil.email ? ` (${perfil.email})` : ""
      } y vincule tu cuenta.`}
    />
  );
}
