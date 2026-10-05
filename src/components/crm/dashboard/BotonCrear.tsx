"use client";

import { useEffect } from "react";
import {
  Buildings,
  CaretDown,
  CheckSquare,
  Lightning,
  Plus,
  Target,
  UserCircle,
  type Icon,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Catalogos } from "@/lib/datos/b2b";
import { NuevaOportunidad } from "@/components/crm/oportunidades/NuevaOportunidad";
import { NuevaEmpresa } from "@/components/crm/empresas/NuevaEmpresa";
import { NuevoContacto } from "@/components/crm/contactos/NuevoContacto";
import { NuevaInteraccion } from "@/components/crm/actividad/NuevaInteraccion";
import { EVENTO_CREAR, type TipoCrear } from "./eventos";

const OPCIONES: { tipo: TipoCrear; texto: string; Icono: Icon }[] = [
  { tipo: "oportunidad", texto: "Oportunidad", Icono: Target },
  { tipo: "empresa", texto: "Empresa", Icono: Buildings },
  { tipo: "contacto", texto: "Contacto", Icono: UserCircle },
  { tipo: "tarea", texto: "Tarea", Icono: CheckSquare },
  { tipo: "actividad", texto: "Actividad", Icono: Lightning },
];

/**
 * Disparador invisible: los diálogos del contrato se abren con su propio trigger
 * (DialogTrigger asChild), así que ha de ser un elemento nativo, no un componente.
 */
const disparador = (tipo: TipoCrear) => (
  <button type="button" data-crear={tipo} tabIndex={-1} aria-hidden className="hidden" />
);

function abrir(tipo: TipoCrear) {
  // Tras cerrar el menú, para que no le robe el foco al diálogo.
  setTimeout(() => document.querySelector<HTMLButtonElement>(`[data-crear="${tipo}"]`)?.click(), 20);
}

/** Botón global «+ Crear» de la cabecera, con los diálogos de alta del CRM B2B. */
export function BotonCrear({ catalogos }: { catalogos: Catalogos }) {
  useEffect(() => {
    const escuchar = (e: Event) => abrir((e as CustomEvent<TipoCrear>).detail);
    window.addEventListener(EVENTO_CREAR, escuchar);
    return () => window.removeEventListener(EVENTO_CREAR, escuchar);
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Crear"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-acento px-2 text-[0.8125rem] font-medium text-sobre-campo shadow-sm transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 focus-visible:ring-offset-fondo sm:px-3"
          >
            <Plus className="size-4" weight="bold" aria-hidden />
            <span className="hidden sm:inline">Crear</span>
            <CaretDown className="hidden size-3 opacity-80 sm:inline" weight="bold" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel className="text-xs text-tinta-2">Comercial</DropdownMenuLabel>
          {OPCIONES.map(({ tipo, texto, Icono }) => (
            <DropdownMenuItem key={tipo} onSelect={() => abrir(tipo)}>
              <Icono className="size-4" aria-hidden />
              {texto}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <NuevaOportunidad catalogos={catalogos}>
        {disparador("oportunidad")}
      </NuevaOportunidad>
      <NuevaEmpresa catalogos={catalogos}>
        {disparador("empresa")}
      </NuevaEmpresa>
      <NuevoContacto catalogos={catalogos}>
        {disparador("contacto")}
      </NuevoContacto>
      <NuevaInteraccion catalogos={catalogos} tipo="tarea">
        {disparador("tarea")}
      </NuevaInteraccion>
      <NuevaInteraccion catalogos={catalogos}>
        {disparador("actividad")}
      </NuevaInteraccion>
    </>
  );
}
