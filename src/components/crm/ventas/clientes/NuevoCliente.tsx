"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import type { Miembro } from "@/lib/b2b";
import { rutaVentas, type ClienteMini } from "@/lib/ventas";
import { claseBotonPrincipal } from "@/components/crm/Primitivas";
import { DialogoFormulario } from "@/components/crm/ventas/configuracion/Comun";
import { FormularioCliente } from "./FormularioCliente";

/** «Nuevo» cliente: diálogo de alta que abre la ficha al crear. Con `empresa`, da de alta una persona de esa empresa. */
export function NuevoCliente({
  empresas,
  comerciales,
  empresa,
  children,
}: {
  empresas: ClienteMini[];
  comerciales: Miembro[];
  empresa?: string;
  /** Botón propio; por defecto, «Nuevo cliente». */
  children?: ReactNode;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [vez, setVez] = useState(0);
  return (
    <>
      <span
        onClick={() => {
          setVez((n) => n + 1);
          setAbierto(true);
        }}
        className="contents"
      >
        {children ?? (
          <button type="button" className={`${claseBotonPrincipal} h-8 px-3`}>
            <Plus className="size-4" weight="bold" aria-hidden />
            Nuevo cliente
          </button>
        )}
      </span>
      <DialogoFormulario
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={empresa ? "Nueva persona de contacto" : "Nuevo cliente"}
        descripcion="Una persona o una empresa a la que vendes."
      >
        <FormularioCliente
          key={vez}
          cliente={null}
          empresas={empresas}
          comerciales={comerciales}
          empresaInicial={empresa}
          onCancelar={() => setAbierto(false)}
          onGuardado={(id) => {
            setAbierto(false);
            if (!empresa) router.push(rutaVentas.cliente(id));
          }}
        />
      </DialogoFormulario>
    </>
  );
}
