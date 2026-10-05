"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeSlash, Key } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";
import { gestionarCuenta } from "@/app/crm/acciones/rrhh";
import type { Resultado } from "@/app/crm/acciones/b2b";
import { usuarioSugerido, type Empleado } from "@/lib/rrhh";
import { claseBotonSecundarioRrhh } from "./Piezas";

/** Crear la cuenta del CRM de un empleado o cambiarle la contraseña (administración). */
export function CuentaEmpleado({ empleado }: { empleado: Pick<Empleado, "id" | "nombre" | "email" | "usuario" | "user_id"> }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [vez, setVez] = useState(0);
  const [ver, setVer] = useState(false);
  const tiene = !!empleado.user_id;
  const [estado, accion, enviando] = useActionState(async (prev: Resultado | null, fd: FormData) => {
    const r = await gestionarCuenta(prev, fd);
    if (r.ok) {
      toast.success(r.mensaje);
      setAbierto(false);
      router.refresh();
    }
    return r;
  }, null);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (v) setVez((n) => n + 1);
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className={claseBotonSecundarioRrhh}>
          <Key className="size-4" aria-hidden /> {tiene ? "Cambiar contraseña" : "Crear cuenta"}
        </button>
      </DialogTrigger>
      <DialogContent className="border border-linea bg-placa p-5 text-tinta sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-tinta">{tiene ? "Cambiar contraseña" : "Crear cuenta del CRM"}</DialogTitle>
          <DialogDescription className="text-tinta-2">
            {tiene
              ? `Nueva contraseña para ${empleado.nombre}. Se guarda cifrada y no se vuelve a mostrar.`
              : `${empleado.nombre} entrará con su usuario o con ${empleado.email}.`}
          </DialogDescription>
        </DialogHeader>
        <form key={vez} action={accion} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={empleado.id} />
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[0.8125rem] font-medium text-tinta">Nombre de usuario</span>
            <input
              name="usuario"
              required={!tiene}
              pattern="[a-z0-9._\-]{3,40}"
              defaultValue={empleado.usuario ?? usuarioSugerido(empleado.email)}
              autoComplete="off"
              spellCheck={false}
              className={claseCampo}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[0.8125rem] font-medium text-tinta">{tiene ? "Nueva contraseña" : "Contraseña inicial"}</span>
            <span className="relative flex items-center">
              <input name="password" type={ver ? "text" : "password"} required minLength={8} autoComplete="new-password" className={`${claseCampo} pr-9`} />
              <button
                type="button"
                onClick={() => setVer((v) => !v)}
                aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-1.5 grid size-6 place-items-center rounded text-tinta-2 hover:bg-placa-2 hover:text-tinta"
              >
                {ver ? <EyeSlash className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </span>
            <span className="text-xs text-tinta-2">Mínimo 8 caracteres con letras y números.</span>
          </label>
          {estado?.ok === false && (
            <p role="alert" className={claseError}>
              {estado.mensaje}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAbierto(false)} className="inline-flex h-9 items-center rounded-md border border-linea px-4 text-sm font-medium text-tinta hover:bg-placa-2">
              Cancelar
            </button>
            <button type="submit" disabled={enviando} className={claseBotonPrincipal}>
              {enviando ? "Guardando…" : tiene ? "Cambiar contraseña" : "Crear cuenta"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
