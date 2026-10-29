"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowSquareOut, PencilSimple, Trash, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { borrarFactura } from "@/app/crm/acciones/facturas";
import type { Factura } from "@/lib/facturas";
import { dineroExacto, numero, relativo } from "@/lib/formato";
import { SinDatos } from "@/components/crm/Primitivas";
import { FormularioFactura, claseBotonSecundarioFactura } from "./FormularioFactura";
import { descuadre, fechaFactura } from "./utilidades";

/** Botón de icono: 44 px en móvil, 32 px en escritorio (densidad de tabla). */
const claseIcono =
  "grid size-11 shrink-0 place-items-center rounded-lg text-tinta-2 transition-[background-color,color,transform] duration-150 ease-out hover:bg-placa-2 hover:text-tinta active:scale-[0.96] md:size-8";

const nombreDe = (f: Factura) => (f.numero ? `la factura ${f.numero}` : `la factura sin número (fila ${f.id})`);
const suma = (filas: Factura[], k: "base" | "iva" | "total") => filas.reduce((s, f) => s + (f[k] ?? 0), 0);

function Importe({ v }: { v: number | null }) {
  return v == null ? <span className="text-tinta-2">—</span> : <>{dineroExacto(v)}</>;
}

function MarcaDescuadre({ f }: { f: Factura }) {
  const dif = descuadre(f);
  if (dif == null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-tinta" title={`Base + IVA no cuadra con el total (${dineroExacto(Math.abs(dif))})`}>
      <Warning className="size-3.5 shrink-0 text-aviso" weight="fill" aria-hidden />
      Descuadre {dineroExacto(Math.abs(dif))}
    </span>
  );
}

function Proveedor({ f }: { f: Factura }) {
  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <span className="truncate font-medium text-tinta">{f.proveedor ?? <span className="font-normal text-tinta-2">Proveedor sin leer</span>}</span>
      <span className="flex flex-wrap items-center gap-x-2 text-xs text-tinta-2">
        {f.nif && <span className="font-mono">{f.nif}</span>}
        {f.empresa_id && (
          <Link href={`/crm/empresas/${f.empresa_id}`} className="text-acento-tinta underline underline-offset-4 hover:decoration-2">
            {f.empresa_nombre ?? "Ficha de la empresa"}
          </Link>
        )}
      </span>
    </span>
  );
}

/* ------------------------------- Acciones ------------------------------- */

function VerOriginal({ f, url }: { f: Factura; url: string | null | undefined }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ver el original de ${nombreDe(f)} (se abre en otra pestaña)`}
      title="Ver original"
      className={claseIcono}
    >
      <ArrowSquareOut className="size-[18px]" aria-hidden />
    </a>
  );
}

function CorregirFactura({ f }: { f: Factura }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger asChild>
        <button type="button" aria-label={`Corregir ${nombreDe(f)}`} title="Corregir datos" className={claseIcono}>
          <PencilSimple className="size-[18px]" aria-hidden />
        </button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Corregir factura</SheetTitle>
          <SheetDescription>
            {f.proveedor ?? "Proveedor sin leer"}
            {f.numero && ` · ${f.numero}`}
          </SheetDescription>
        </SheetHeader>
        <div className="p-4">
          {abierto && (
            <FormularioFactura id={f.id} datos={f} alGuardar={() => setAbierto(false)} alCancelar={() => setAbierto(false)} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BorrarFactura({ f }: { f: Factura }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  function borrar() {
    setError(null);
    empezar(async () => {
      const r = await borrarFactura(f.id);
      if (r.ok) {
        toast.success(r.mensaje || "Factura borrada.");
        setAbierto(false);
        router.refresh();
      } else setError(r.mensaje);
    });
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (!v) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <button type="button" aria-label={`Borrar ${nombreDe(f)}`} title="Borrar" className={`${claseIcono} hover:bg-critico-suave hover:text-critico`}>
          <Trash className="size-[18px]" aria-hidden />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Borrar {nombreDe(f)}?</DialogTitle>
          <DialogDescription>
            {f.proveedor ? `${f.proveedor}, ` : ""}
            {f.total != null ? `${dineroExacto(f.total)}. ` : ""}
            {f.origen === "crm"
              ? "Se borran la fila y el archivo original. No se puede deshacer."
              : "Se borra la fila; el archivo original sigue en la carpeta del servidor. No se puede deshacer."}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="rounded-lg bg-critico-suave px-3 py-2 text-sm font-semibold text-critico">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2">
          <button type="button" onClick={() => setAbierto(false)} className={claseBotonSecundarioFactura}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={borrar}
            disabled={pendiente}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-critico px-3 text-[0.8125rem] font-semibold text-sobre-critico transition-[filter,transform] duration-150 ease-out hover:brightness-110 active:scale-[0.97] disabled:opacity-50 sm:h-8"
          >
            <Trash className="size-4" aria-hidden />
            {pendiente ? "Borrando…" : "Borrar factura"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Acciones({ f, url }: { f: Factura; url: string | null | undefined }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <VerOriginal f={f} url={url} />
      <CorregirFactura f={f} />
      <BorrarFactura f={f} />
    </div>
  );
}

/* ------------------------------- Tabla ------------------------------- */

const th = "py-2.5 pr-4 text-left font-normal";

/**
 * Facturas guardadas: tabla con totales en escritorio y lista en móvil.
 * Los huecos se ven como huecos: lo que Claude no leyó no se rellena.
 */
export function TablaFacturas({ facturas, urls }: { facturas: Factura[]; urls: Record<number, string | null> }) {
  if (facturas.length === 0) {
    return (
      <div className="rounded-2xl bg-placa px-5 shadow-placa">
        <SinDatos
          titulo="Todavía no hay facturas"
          texto="Sube arriba la foto o el PDF de una factura de proveedor: el agente la lee con Claude y la guarda aquí."
        />
      </div>
    );
  }

  const sinTotal = facturas.filter((f) => f.total == null).length;

  return (
    <div className="overflow-hidden rounded-2xl bg-placa shadow-placa">
      {/* Escritorio */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <caption className="sr-only">
            Facturas guardadas, de la última subida a la primera. Importes en euros; la última fila suma todas.
          </caption>
          <thead>
            <tr className="text-[0.8125rem] text-tinta-2">
              <th scope="col" className={`${th} pl-4`}>Fecha</th>
              <th scope="col" className={th}>Número</th>
              <th scope="col" className={th}>Proveedor</th>
              <th scope="col" className={`${th} text-right`}>Base</th>
              <th scope="col" className={`${th} text-right`}>IVA</th>
              <th scope="col" className={`${th} text-right`}>Total</th>
              <th scope="col" className={th}>Origen</th>
              <th scope="col" className="w-28 py-2.5 pr-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => (
              <tr key={f.id} className="border-t border-linea/70 transition-colors hover:bg-placa-2/60">
                <td className="whitespace-nowrap py-2.5 pl-4 pr-4 text-tinta">
                  {fechaFactura(f.fecha) ?? <span className="text-tinta-2">—</span>}
                </td>
                <th scope="row" className="max-w-[160px] truncate py-2.5 pr-4 text-left font-medium text-tinta">
                  {f.numero ?? <span className="font-normal text-tinta-2">Sin número</span>}
                </th>
                <td className="max-w-[280px] py-2.5 pr-4">
                  <Proveedor f={f} />
                </td>
                <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums text-tinta">
                  <Importe v={f.base} />
                </td>
                <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums text-tinta">
                  <Importe v={f.iva} />
                </td>
                <td className="py-2.5 pr-4 text-right">
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="whitespace-nowrap font-semibold tabular-nums text-tinta">
                      <Importe v={f.total} />
                    </span>
                    <MarcaDescuadre f={f} />
                  </span>
                </td>
                <td className="whitespace-nowrap py-2.5 pr-4 text-tinta-2">
                  <span className="flex flex-col leading-tight">
                    <span className="text-tinta">{f.origen === "carpeta" ? "Carpeta" : "Subida en el CRM"}</span>
                    <span className="text-xs">{relativo(f.created_at)}</span>
                  </span>
                </td>
                <td className="py-1.5 pr-3">
                  <Acciones f={f} url={urls[f.id]} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-linea bg-fondo/60 text-tinta">
              <th scope="row" colSpan={3} className="py-3 pl-4 pr-4 text-left font-semibold">
                Suma de {numero(facturas.length)} factura{facturas.length === 1 ? "" : "s"}
                {sinTotal > 0 && (
                  <span className="ml-2 text-xs font-normal text-tinta-2">
                    ({sinTotal} sin total leído, no cuenta{sinTotal === 1 ? "" : "n"})
                  </span>
                )}
              </th>
              <td className="whitespace-nowrap py-3 pr-4 text-right font-semibold tabular-nums">{dineroExacto(suma(facturas, "base"))}</td>
              <td className="whitespace-nowrap py-3 pr-4 text-right font-semibold tabular-nums">{dineroExacto(suma(facturas, "iva"))}</td>
              <td className="whitespace-nowrap py-3 pr-4 text-right font-bold tabular-nums">{dineroExacto(suma(facturas, "total"))}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Móvil */}
      <div className="md:hidden">
        <ul aria-label="Facturas guardadas" className="flex flex-col">
          {facturas.map((f) => (
            <li key={f.id} className="flex flex-col gap-2 border-b border-linea/70 px-4 py-3 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <Proveedor f={f} />
                <span className="shrink-0 text-right font-semibold tabular-nums text-tinta">
                  <span className="sr-only">Total: </span>
                  <Importe v={f.total} />
                </span>
              </div>
              <p className="flex flex-wrap gap-x-2 text-[0.8125rem] text-tinta-2">
                <span>{fechaFactura(f.fecha) ?? "Sin fecha"}</span>
                <span aria-hidden>·</span>
                <span>{f.numero ?? "Sin número"}</span>
                <span aria-hidden>·</span>
                <span className="tabular-nums">
                  Base <Importe v={f.base} /> + IVA <Importe v={f.iva} />
                </span>
              </p>
              <div className="flex items-center justify-between gap-2">
                <MarcaDescuadre f={f} />
                <div className="ml-auto">
                  <Acciones f={f} url={urls[f.id]} />
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="flex items-baseline justify-between gap-3 border-t border-linea bg-fondo/60 px-4 py-3 text-sm text-tinta">
          <span className="font-semibold">Suma de {numero(facturas.length)}</span>
          <span className="font-bold tabular-nums">{dineroExacto(suma(facturas, "total"))}</span>
        </p>
      </div>
    </div>
  );
}
