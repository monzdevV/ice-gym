"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { UploadSimple, WarningCircle } from "@phosphor-icons/react";
import { ACEPTA, LIMITE } from "./utilidades";

/**
 * Entrada de la factura: un botón real que abre el selector de archivos,
 * la misma superficie como destino de arrastre y, en toda la página,
 * Ctrl/⌘ + V para pegar una captura.
 */
export function ZonaSoltar({
  onArchivo,
  ocupada,
  error,
  compacta = false,
}: {
  onArchivo: (archivo: File) => void;
  ocupada: boolean;
  error: string | null;
  compacta?: boolean;
}) {
  const uid = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  const profundidad = useRef(0);
  const alArchivo = useRef(onArchivo);
  const ocupadaRef = useRef(ocupada);
  useEffect(() => {
    alArchivo.current = onArchivo;
    ocupadaRef.current = ocupada;
  });

  // Pegar desde el portapapeles, salvo que se esté escribiendo en un campo.
  useEffect(() => {
    function pegar(e: ClipboardEvent) {
      const t = e.target as HTMLElement | null;
      if (ocupadaRef.current || t?.closest("input, textarea, [contenteditable=true]")) return;
      const archivo = Array.from(e.clipboardData?.files ?? [])[0];
      if (!archivo) return;
      e.preventDefault();
      alArchivo.current(archivo);
    }
    // Soltar fuera de la zona no debe abrir el archivo en el navegador: también se lee.
    function sobre(e: globalThis.DragEvent) {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    }
    function soltarFuera(e: globalThis.DragEvent) {
      if (!e.dataTransfer?.types.includes("Files") || e.defaultPrevented) return;
      e.preventDefault();
      const archivo = e.dataTransfer.files[0];
      if (archivo && !ocupadaRef.current) alArchivo.current(archivo);
    }
    window.addEventListener("paste", pegar);
    window.addEventListener("dragover", sobre);
    window.addEventListener("drop", soltarFuera);
    return () => {
      window.removeEventListener("paste", pegar);
      window.removeEventListener("dragover", sobre);
      window.removeEventListener("drop", soltarFuera);
    };
  }, []);

  function arrastre(e: DragEvent) {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    if (ocupada) {
      e.dataTransfer.dropEffect = "none";
      return;
    }
    e.dataTransfer.dropEffect = "copy";
    if (e.type === "dragenter") {
      profundidad.current++;
      setEncima(true);
    } else if (e.type === "dragleave") {
      profundidad.current = Math.max(0, profundidad.current - 1);
      if (profundidad.current === 0) setEncima(false);
    }
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    profundidad.current = 0;
    setEncima(false);
    if (ocupada) return;
    const archivo = e.dataTransfer.files[0];
    if (archivo) onArchivo(archivo);
  }

  const idPista = `${uid}-pista`;
  const idError = `${uid}-error`;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => !ocupada && entrada.current?.click()}
        onDragEnter={arrastre}
        onDragOver={arrastre}
        onDragLeave={arrastre}
        onDrop={soltar}
        aria-disabled={ocupada || undefined}
        aria-describedby={error ? `${idPista} ${idError}` : idPista}
        data-encima={encima || undefined}
        className={`group flex w-full items-center gap-4 rounded-2xl border-2 border-dashed text-left transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.99] aria-disabled:cursor-progress aria-disabled:opacity-60 aria-disabled:active:scale-100 ${
          compacta ? "min-h-16 px-4 py-3" : "min-h-36 flex-col justify-center px-5 py-8 text-center sm:min-h-44"
        } ${
          encima
            ? "border-acento-tinta bg-acento-suave"
            : error
              ? "border-critico/60 bg-placa hover:bg-placa-2"
              : "border-linea bg-placa hover:border-tinta-2/50 hover:bg-placa-2"
        }`}
      >
        <span
          className={`grid shrink-0 place-items-center rounded-xl transition-colors duration-150 ${
            compacta ? "size-10" : "size-12"
          } ${encima ? "bg-acento text-sobre-campo" : "bg-placa-2 text-tinta"}`}
          aria-hidden
        >
          <UploadSimple className={compacta ? "size-5" : "size-6"} />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className={`font-semibold text-tinta ${compacta ? "text-sm" : "text-base"}`}>
            {encima ? (
              "Suéltala para leerla"
            ) : compacta ? (
              "Leer otra factura"
            ) : (
              <>
                <span className="pointer-coarse:hidden">Arrastra aquí la factura o elige un archivo</span>
                <span className="hidden pointer-coarse:inline">Haz una foto o elige la factura</span>
              </>
            )}
          </span>
          <span id={idPista} className="text-[0.8125rem] text-tinta-2">
            Foto (JPG, PNG o WEBP) o PDF, hasta {LIMITE}.
            <span className="pointer-coarse:hidden"> También puedes pegar una captura con Ctrl+V.</span>
          </span>
        </span>
      </button>

      <input
        ref={entrada}
        type="file"
        accept={ACEPTA}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          e.target.value = "";
          if (archivo) onArchivo(archivo);
        }}
      />

      {error && (
        <p id={idError} className="flex items-start gap-2 text-sm font-medium text-critico">
          <WarningCircle className="mt-0.5 size-4 shrink-0" weight="fill" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
