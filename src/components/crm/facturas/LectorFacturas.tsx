"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { leerFactura } from "@/app/crm/acciones/facturas";
import { BUCKET_FACTURAS, type Factura, type ResultadoLectura } from "@/lib/facturas";
import { dineroExacto } from "@/lib/formato";
import { PASOS_EN_ESPERA, PasosAgente, type Pasos } from "./PasosAgente";
import { TarjetaFactura, Previa, type VistaPrevia } from "./TarjetaFactura";
import { ZonaSoltar } from "./ZonaSoltar";
import { claseBotonSecundarioFactura } from "./FormularioFactura";
import { descuadre, esTipoFactura, extension, tamano, validarArchivo } from "./utilidades";

type Fase = "inicio" | "trabajando" | "hecho" | "error";

/** Pasa los pasos que devuelve el agente al estado visible; los que no llegaron, en espera. */
function pasosDesde(r: ResultadoLectura): Pasos {
  const p: Pasos = { ...PASOS_EN_ESPERA };
  for (const paso of r.pasos) {
    p[paso.paso] = { estado: paso.ok ? "ok" : "error", detalle: paso.detalle };
  }
  return p;
}

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * El agente lector: sube el archivo al bucket privado, pide a Claude que lo lea
 * y el servidor hace el INSERT. Cada paso se muestra tal y como va, sin barras
 * inventadas: el de Claude es indeterminado y lleva un cronómetro real.
 */
export function LectorFacturas({ guardadas }: { guardadas: Factura[] }) {
  const router = useRouter();
  const reducir = useReducedMotion();
  const [fase, setFase] = useState<Fase>("inicio");
  const [pasos, setPasos] = useState<Pasos>(PASOS_EN_ESPERA);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [errorAgente, setErrorAgente] = useState<string | null>(null);
  const [factura, setFactura] = useState<Factura | null>(null);
  const [vista, setVista] = useState<VistaPrevia | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const intento = useRef<{ archivo: File; ruta: string | null } | null>(null);
  const tituloResultado = useRef<HTMLHeadingElement>(null);
  const cajaError = useRef<HTMLDivElement>(null);

  // La vista previa es local (blob): se libera al cambiar de archivo o al salir.
  useEffect(() => {
    if (!vista) return;
    const url = vista.url;
    return () => URL.revokeObjectURL(url);
  }, [vista]);

  // Al terminar, el foco va al resultado o al error para que se lea en el acto.
  useEffect(() => {
    if (fase === "hecho") tituloResultado.current?.focus();
    if (fase === "error") cajaError.current?.focus();
  }, [fase]);

  async function leer(ruta: string) {
    setPasos((p) => ({ ...p, claude: { estado: "activo", detalle: "Leyendo número, fecha, proveedor, NIF e importes. Suele tardar entre 5 y 20 s.", desde: Date.now() } }));
    setAnuncio("Archivo subido. Claude está leyendo la factura; suele tardar entre 5 y 20 segundos.");

    let r: ResultadoLectura;
    try {
      r = await leerFactura(ruta);
    } catch {
      setPasos((p) => ({
        ...p,
        claude: { estado: "error", detalle: "Se cortó la conexión con el agente antes de recibir respuesta." },
      }));
      setErrorAgente("Se cortó la conexión con el agente. Comprueba la red y vuelve a intentarlo: el archivo ya está subido.");
      setAnuncio("");
      setFase("error");
      return;
    }

    setPasos(pasosDesde(r));
    if (r.ok) {
      setFactura(r.factura);
      setFase("hecho");
      const dif = descuadre(r.factura);
      setAnuncio(
        `Factura guardada. ${r.factura.proveedor ?? "Proveedor sin leer"}, total ${
          r.factura.total == null ? "sin leer" : dineroExacto(r.factura.total)
        }.${dif != null ? " Atención: base más IVA no cuadra con el total." : ""}`,
      );
      intento.current = null;
      router.refresh();
    } else {
      // Si el servidor ha quitado el original del bucket, Reintentar lo vuelve a subir.
      if (r.archivoBorrado && intento.current) intento.current = { ...intento.current, ruta: null };
      setErrorAgente(r.mensaje);
      setAnuncio("");
      setFase("error");
    }
  }

  async function procesar(archivo: File) {
    const fallo = validarArchivo(archivo);
    setErrorArchivo(fallo);
    if (fallo || !esTipoFactura(archivo.type)) {
      // Se vacía antes para que el lector lo anuncie aunque el mensaje se repita.
      setAnuncio("");
      requestAnimationFrame(() => setAnuncio(fallo ?? ""));
      return;
    }

    setErrorAgente(null);
    setFactura(null);
    setVista({ url: URL.createObjectURL(archivo), esPdf: archivo.type === "application/pdf", nombre: archivo.name || "captura" });
    setFase("trabajando");
    setPasos({
      ...PASOS_EN_ESPERA,
      disco: { estado: "activo", detalle: `Subiendo ${archivo.name || "la captura"} (${tamano(archivo.size)})…`, desde: Date.now() },
    });
    setAnuncio("Subiendo la factura.");

    const ruta = `crm/${crypto.randomUUID()}.${extension(archivo.type)}`;
    intento.current = { archivo, ruta: null };
    const { error } = await createClient()
      .storage.from(BUCKET_FACTURAS)
      .upload(ruta, archivo, { contentType: archivo.type, upsert: false });

    if (error) {
      setPasos((p) => ({ ...p, disco: { estado: "error", detalle: "No se pudo subir el archivo." } }));
      setErrorAgente(
        /exceed|size|large/i.test(error.message)
          ? "El archivo pesa demasiado para el almacén (máximo 10 MB). Reduce la foto o el PDF."
          : "El archivo no llegó al almacenamiento, así que Claude no lo ha leído. Comprueba la conexión y pulsa Reintentar.",
      );
      setAnuncio("");
      setFase("error");
      return;
    }

    intento.current = { archivo, ruta };
    setPasos((p) => ({ ...p, disco: { estado: "ok", detalle: `Guardado en ${BUCKET_FACTURAS}/${ruta}` } }));
    await leer(ruta);
  }

  function reintentar() {
    const i = intento.current;
    if (!i || fase === "trabajando") return;
    setErrorAgente(null);
    setFase("trabajando");
    if (i.ruta) {
      setPasos((p) => ({ ...p, insert: { estado: "espera" } }));
      void leer(i.ruta);
    } else void procesar(i.archivo);
  }

  const trabajando = fase === "trabajando";
  const entrada = reducir
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, transform: "translateY(8px)" }, animate: { opacity: 1, transform: "translateY(0px)" } };

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="titulo-lector" className="flex flex-col gap-4 rounded-2xl bg-placa p-4 shadow-placa sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="titulo-lector" className="text-sm font-semibold text-tinta">
            Leer una factura de proveedor
          </h2>
          <p className="text-[0.8125rem] text-tinta-2">Claude saca número, fecha, proveedor, NIF, base, IVA y total.</p>
        </div>

        <ZonaSoltar onArchivo={procesar} ocupada={trabajando} error={errorArchivo} compacta={fase !== "inicio"} />

        <div
          className={`grid gap-4 ${vista && fase !== "hecho" ? "md:grid-cols-[9rem_minmax(0,1fr)]" : ""}`}
          aria-busy={trabajando || undefined}
        >
          {vista && fase !== "hecho" && <Previa vista={vista} className="hidden min-h-32 md:flex [&_img]:max-h-40" />}
          <PasosAgente pasos={pasos} />
        </div>

        {fase === "error" && errorAgente && (
          <div
            ref={cajaError}
            tabIndex={-1}
            role="group"
            aria-labelledby="titulo-error-factura"
            aria-describedby="texto-error-factura"
            className="flex flex-col gap-3 rounded-xl bg-critico-suave p-4 outline-none focus-visible:ring-2 focus-visible:ring-critico sm:flex-row sm:items-start"
          >
            <WarningCircle className="size-5 shrink-0 text-critico" weight="fill" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p id="titulo-error-factura" className="text-sm font-semibold text-critico">
                La factura no se ha guardado
              </p>
              <p id="texto-error-factura" className="text-sm text-tinta">
                {errorAgente}
              </p>
            </div>
            <button type="button" onClick={reintentar} className={`${claseBotonSecundarioFactura} shrink-0`}>
              <ArrowClockwise className="size-4" aria-hidden />
              Reintentar
            </button>
          </div>
        )}
      </section>

      {fase === "hecho" && factura && (
        <motion.div key={factura.id} {...entrada} transition={{ duration: 0.24, ease: EASE }}>
          <TarjetaFactura
            ref={tituloResultado}
            factura={factura}
            vista={vista}
            // Tras corregir el NIF, el servidor revincula la empresa: se toma de la lista ya refrescada.
            vinculo={guardadas.find((f) => f.id === factura.id) ?? factura}
          />
        </motion.div>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {anuncio}
      </p>
    </div>
  );
}
