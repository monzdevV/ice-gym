"use client";

import { forwardRef, useState } from "react";
import Link from "next/link";
import { ArrowSquareOut, Buildings, FilePdf, PencilSimple, Warning } from "@phosphor-icons/react";
import type { DatosFactura, Factura } from "@/lib/facturas";
import { dineroExacto } from "@/lib/formato";
import { FormularioFactura, claseBotonSecundarioFactura } from "./FormularioFactura";
import { descuadre, fechaFactura } from "./utilidades";

export type VistaPrevia = { url: string; esPdf: boolean; nombre: string };

/** Hueco honesto: si Claude no encontró el dato, se dice. */
function Hueco() {
  return <span className="font-normal text-tinta-2">No aparece</span>;
}

export function AvisoDescuadre({ datos }: { datos: Pick<DatosFactura, "base" | "iva" | "total"> }) {
  const dif = descuadre(datos);
  if (dif == null) return null;
  return (
    <div className="flex gap-2.5 rounded-xl bg-aviso-suave px-3 py-2.5 text-[0.8125rem] leading-snug text-tinta">
      <Warning className="mt-0.5 size-4 shrink-0 text-aviso" weight="fill" aria-hidden />
      <p>
        <span className="font-semibold">Los importes no cuadran.</span> Base + IVA suman{" "}
        <span className="tabular-nums">{dineroExacto((datos.base ?? 0) + (datos.iva ?? 0))}</span> y el total leído es{" "}
        <span className="tabular-nums">{dineroExacto(datos.total)}</span> (diferencia de{" "}
        <span className="tabular-nums">{dineroExacto(Math.abs(dif))}</span>). Revísalo con el original y corrígelo si hace falta.
      </p>
    </div>
  );
}

export function Previa({ vista, className = "" }: { vista: VistaPrevia; className?: string }) {
  return (
    <a
      href={vista.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex min-h-48 items-center justify-center overflow-hidden rounded-xl bg-fondo ${className}`}
    >
      {vista.esPdf ? (
        <span className="flex flex-col items-center gap-2 p-6 text-center text-sm text-tinta-2">
          <FilePdf className="size-10 text-tinta" weight="light" aria-hidden />
          <span className="max-w-full break-all">{vista.nombre}</span>
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- URL local (blob) o firmada y temporal: next/image no aporta nada.
        <img src={vista.url} alt={`Original: ${vista.nombre}`} className="max-h-80 w-full object-contain" />
      )}
      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-placa px-2 py-1 text-xs font-medium text-tinta shadow-placa">
        <ArrowSquareOut className="size-3.5" aria-hidden />
        Ver original
        <span className="sr-only"> (se abre en otra pestaña)</span>
      </span>
    </a>
  );
}

/**
 * Lo que el agente acaba de guardar, junto al original para comprobarlo de un vistazo.
 * El título recibe el foco al terminar para que el lector de pantalla lo anuncie.
 */
type Vinculo = Pick<Factura, "empresa_id" | "empresa_nombre">;

export const TarjetaFactura = forwardRef<
  HTMLHeadingElement,
  { factura: Factura; vista: VistaPrevia | null; vinculo?: Vinculo }
>(function TarjetaFactura({ factura, vista, vinculo = factura }, refTitulo) {
    const [datos, setDatos] = useState<DatosFactura>(factura);
    const [editando, setEditando] = useState(false);

    const filas: { k: string; v: React.ReactNode; ancho?: boolean }[] = [
      { k: "Número", v: datos.numero ?? <Hueco /> },
      { k: "Fecha", v: fechaFactura(datos.fecha) ?? <Hueco /> },
      { k: "Proveedor", v: datos.proveedor ?? <Hueco />, ancho: true },
      { k: "NIF", v: datos.nif ? <span className="font-mono text-[0.8125rem]">{datos.nif}</span> : <Hueco /> },
      {
        k: "Empresa en el CRM",
        v:
          vinculo.empresa_id ? (
            <Link
              href={`/crm/empresas/${vinculo.empresa_id}`}
              className="inline-flex items-center gap-1.5 text-acento-tinta underline-offset-4 hover:underline"
            >
              <Buildings className="size-4 shrink-0" aria-hidden />
              {vinculo.empresa_nombre ?? "Abrir ficha"}
            </Link>
          ) : (
            <span className="font-normal text-tinta-2">Sin vincular (no hay empresa con ese NIF)</span>
          ),
      },
    ];

    return (
      <article className="grid gap-5 rounded-2xl bg-placa p-4 shadow-placa sm:p-5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        {vista && <Previa vista={vista} className="md:self-start" />}

        <div className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 ref={refTitulo} tabIndex={-1} className="text-base font-semibold text-tinta outline-none focus-visible:underline">
                Factura guardada
              </h2>
              <p className="text-[0.8125rem] text-tinta-2">
                Fila nº <span className="tabular-nums">{factura.id}</span>
                {factura.modelo && <> · leída por {factura.modelo}</>}
              </p>
            </div>
            {!editando && (
              <button type="button" onClick={() => setEditando(true)} className={claseBotonSecundarioFactura}>
                <PencilSimple className="size-4" aria-hidden />
                Corregir datos
              </button>
            )}
          </header>

          {editando ? (
            <FormularioFactura
              id={factura.id}
              datos={datos}
              alGuardar={(d) => {
                setDatos(d);
                setEditando(false);
              }}
              alCancelar={() => setEditando(false)}
            />
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {filas.map((f) => (
                  <div key={f.k} className={`flex min-w-0 flex-col gap-0.5 ${f.ancho || f.k.startsWith("Empresa") ? "col-span-2 sm:col-span-1" : ""}`}>
                    <dt className="text-[0.8125rem] text-tinta-2">{f.k}</dt>
                    <dd className="break-words font-medium text-tinta">{f.v}</dd>
                  </div>
                ))}
              </dl>

              <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-linea/70">
                {(
                  [
                    ["Base", datos.base],
                    ["IVA", datos.iva],
                    ["Total", datos.total],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex min-w-0 flex-col gap-1 bg-fondo px-3 py-2.5">
                    <dt className="text-[0.8125rem] text-tinta-2">{k}</dt>
                    <dd
                      className={`cifra truncate tabular-nums text-tinta ${k === "Total" ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"}`}
                    >
                      {v == null ? <span className="text-sm font-normal text-tinta-2">No aparece</span> : dineroExacto(v)}
                    </dd>
                  </div>
                ))}
              </dl>

              <AvisoDescuadre datos={datos} />
            </>
          )}
        </div>
      </article>
    );
});
