"use client";

import { useId, useRef, useState, useTransition, type FormEvent, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { actualizarFactura } from "@/app/crm/acciones/facturas";
import type { DatosFactura } from "@/lib/facturas";
import { dineroExacto } from "@/lib/formato";
import { claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";
import { descuadre, importeEditable, leerImporte } from "./utilidades";

type Campo = keyof DatosFactura;
type Errores = Partial<Record<Campo, string>>;

const IMPORTES = ["base", "iva", "total"] as const;

/** En móvil, controles de 44 px; en escritorio, la densidad del resto del CRM. */
const campo = `${claseCampo} h-11 sm:h-9`;

export const claseBotonSecundarioFactura =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-placa px-3 text-[0.8125rem] font-medium text-tinta shadow-placa transition-[background-color,transform] duration-150 ease-out hover:bg-placa-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 sm:h-8";

/**
 * Corrige lo que Claude leyó mal. Sólo envía los campos que cambian; los vacíos
 * se guardan como null (si un dato no está en la factura, se ve el hueco).
 */
export function FormularioFactura({
  id,
  datos,
  alGuardar,
  alCancelar,
}: {
  id: number;
  datos: DatosFactura;
  alGuardar: (nuevos: DatosFactura) => void;
  alCancelar: () => void;
}) {
  const router = useRouter();
  const uid = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const [vista, setVista] = useState({
    base: importeEditable(datos.base),
    iva: importeEditable(datos.iva),
    total: importeEditable(datos.total),
  });

  const idDe = (c: Campo) => `${uid}-${c}`;
  const idError = (c: Campo) => `${uid}-${c}-error`;

  // Aviso en vivo mientras se corrigen los importes.
  const numeros = Object.fromEntries(
    IMPORTES.map((k) => {
      const v = leerImporte(vista[k]);
      return [k, v === "invalido" ? null : v];
    }),
  ) as Pick<DatosFactura, "base" | "iva" | "total">;
  const dif = descuadre(numeros);

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const texto = (k: Campo) => {
      const v = String(fd.get(k) ?? "").trim();
      return v === "" ? null : v;
    };

    const nuevos: DatosFactura = {
      numero: texto("numero"),
      fecha: texto("fecha"),
      proveedor: texto("proveedor"),
      nif: texto("nif")?.toUpperCase().replace(/[\s-]/g, "") ?? null,
      base: null,
      iva: null,
      total: null,
    };
    const fallos: Errores = {};
    for (const k of IMPORTES) {
      const v = leerImporte(String(fd.get(k) ?? ""));
      if (v === "invalido") fallos[k] = "Escribe un importe como 1.234,56 (máximo dos decimales).";
      else nuevos[k] = v;
    }
    if (nuevos.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(nuevos.fecha)) fallos.fecha = "La fecha no es válida.";
    if (nuevos.nif && !/^[A-Z0-9]{8,10}$/.test(nuevos.nif)) fallos.nif = "Un NIF tiene entre 8 y 10 letras o cifras.";

    setErrores(fallos);
    setErrorGeneral(null);
    const primero = Object.keys(fallos)[0] as Campo | undefined;
    if (primero) {
      formulario.current?.querySelector<HTMLElement>(`#${CSS.escape(idDe(primero))}`)?.focus();
      return;
    }

    const cambios: Partial<DatosFactura> = {};
    for (const k of Object.keys(nuevos) as Campo[]) {
      if (nuevos[k] !== datos[k]) Object.assign(cambios, { [k]: nuevos[k] });
    }
    if (Object.keys(cambios).length === 0) {
      alCancelar();
      return;
    }

    empezar(async () => {
      const r = await actualizarFactura(id, cambios);
      if (r.ok) {
        toast.success(r.mensaje || "Factura corregida.");
        alGuardar(nuevos);
        router.refresh();
      } else setErrorGeneral(r.mensaje);
    });
  }

  /** Campo con su etiqueta, pista y error enlazados (una función, no un componente: no se remonta). */
  function entrada({
    c,
    etiqueta,
    pista,
    ...resto
  }: { c: Campo; etiqueta: string; pista?: string } & InputHTMLAttributes<HTMLInputElement>) {
    const describe = [pista ? `${idDe(c)}-pista` : null, errores[c] ? idError(c) : null].filter(Boolean).join(" ");
    return (
      <div key={c} className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={idDe(c)} className="text-[0.8125rem] font-medium text-tinta">
          {etiqueta}
        </label>
        <input
          id={idDe(c)}
          name={c}
          aria-invalid={errores[c] ? true : undefined}
          aria-describedby={describe || undefined}
          className={campo}
          {...resto}
        />
        {pista && (
          <p id={`${idDe(c)}-pista`} className="text-xs text-tinta-2">
            {pista}
          </p>
        )}
        {errores[c] && (
          <p id={idError(c)} className="text-xs font-semibold text-critico">
            {errores[c]}
          </p>
        )}
      </div>
    );
  }

  const importe = (k: (typeof IMPORTES)[number], etiqueta: string) =>
    entrada({
      c: k,
      etiqueta,
      inputMode: "decimal",
      autoComplete: "off",
      value: vista[k],
      onChange: (e) => setVista((v) => ({ ...v, [k]: e.target.value })),
      className: `${campo} text-right tabular-nums`,
    });

  return (
    <form ref={formulario} onSubmit={enviar} noValidate className="flex flex-col gap-4" aria-label="Corregir datos de la factura">
      <div className="grid gap-3 sm:grid-cols-2">
        {entrada({ c: "numero", etiqueta: "Número", defaultValue: datos.numero ?? "", autoComplete: "off" })}
        {entrada({ c: "fecha", etiqueta: "Fecha", type: "date", defaultValue: datos.fecha ?? "" })}
        {entrada({ c: "proveedor", etiqueta: "Proveedor", defaultValue: datos.proveedor ?? "", autoComplete: "organization" })}
        {entrada({ c: "nif", etiqueta: "NIF", defaultValue: datos.nif ?? "", autoComplete: "off", spellCheck: false })}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {importe("base", "Base")}
        {importe("iva", "IVA")}
        {importe("total", "Total")}
      </div>
      <p className="text-xs text-tinta-2" aria-live="polite">
        {dif != null
          ? `Base + IVA = ${dineroExacto((numeros.base ?? 0) + (numeros.iva ?? 0))}; no cuadra con el total por ${dineroExacto(Math.abs(dif))}.`
          : numeros.base != null && numeros.iva != null && numeros.total != null
            ? "Base + IVA cuadra con el total."
            : "Deja vacío lo que no aparezca en la factura."}
      </p>
      {errorGeneral && (
        <p role="alert" className={claseError}>
          {errorGeneral}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={alCancelar} className={claseBotonSecundarioFactura}>
          Cancelar
        </button>
        <button type="submit" disabled={pendiente} className={`${claseBotonPrincipal} h-11 sm:h-9`}>
          {pendiente ? "Guardando…" : "Guardar corrección"}
        </button>
      </div>
    </form>
  );
}
