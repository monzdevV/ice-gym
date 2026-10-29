"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { datosRellenos, ejecutarAgente, normalizarDatos, normalizarNif } from "@/lib/agente-facturas/agente";
import { SELECT_FACTURA, aFactura, type FilaFactura } from "@/lib/datos/facturas";
import {
  BUCKET_FACTURAS,
  MAX_BYTES_FACTURA,
  MAX_BYTES_FOTO,
  RUTA_CRM,
  TIPOS_FACTURA,
  type DatosFactura,
  type PasoAgente,
  type ResultadoLectura,
} from "@/lib/facturas";
import type { Resultado } from "./b2b";

/**
 * Acciones del agente lector de facturas.
 * Los tres pasos del esquema: disco (descargar del bucket) → Claude (leer) → INSERT (guardar_factura).
 * Claude solo propone los datos; el INSERT lo ejecuta este código.
 */

const CAMPOS: (keyof DatosFactura)[] = ["numero", "fecha", "proveedor", "nif", "base", "iva", "total"];

const MIME_POR_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

function refrescar() {
  revalidatePath("/crm/facturas");
}

function tamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : "Error desconocido.");

/** Busca la empresa cuyo CIF coincide con el NIF (comparando ambos normalizados). */
async function empresaPorNif(supabase: Awaited<ReturnType<typeof createClient>>, nif: string | null) {
  if (!nif) return null;
  const { data } = await supabase
    .from("empresas")
    .select("id, nombre, cif")
    .not("cif", "is", null)
    .returns<{ id: string; nombre: string; cif: string }[]>();
  return (data ?? []).find((e) => normalizarNif(e.cif) === nif) ?? null;
}

/**
 * Quita del bucket un original que no ha llegado a guardarse, salvo que ya lo use una
 * factura (p. ej. un reintento tras un INSERT que sí se hizo): así no quedan huérfanos.
 */
async function quitarHuerfano(supabase: Awaited<ReturnType<typeof createClient>>, ruta: string) {
  const { data: usada } = await supabase.from("facturas").select("id").eq("archivo", ruta).maybeSingle<{ id: number }>();
  if (usada) return false;
  const { error } = await supabase.storage.from(BUCKET_FACTURAS).remove([ruta]);
  return !error;
}

/**
 * Lee una factura que la UI ya ha subido al bucket «facturas» en `ruta`.
 * Devuelve la factura guardada y el detalle de cada paso (o hasta dónde llegó si falla).
 * Si falla después de la descarga, borra el original del bucket para no dejarlo huérfano.
 */
export async function leerFactura(ruta: string): Promise<ResultadoLectura> {
  const pasos: PasoAgente[] = [];
  const fallo = (paso: PasoAgente["paso"], mensaje: string, archivoBorrado = false): ResultadoLectura => {
    pasos.push({ paso, ok: false, detalle: mensaje });
    return { ok: false, mensaje, pasos, archivoBorrado };
  };

  /* 1 · Disco: descargar el archivo del bucket. */
  if (typeof ruta !== "string" || !RUTA_CRM.test(ruta)) {
    return fallo("disco", "El archivo no tiene una ruta válida. Vuelve a subirlo.", true);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fallo("disco", "Tu sesión ha caducado. Vuelve a entrar.");

  // Reintento de un INSERT que sí llegó a hacerse (p. ej. se cortó la red): se devuelve la fila.
  const { data: existente } = await supabase
    .from("facturas")
    .select(SELECT_FACTURA)
    .eq("archivo", ruta)
    .maybeSingle<FilaFactura>();
  if (existente) {
    pasos.push(
      { paso: "disco", ok: true, detalle: "El archivo ya estaba subido" },
      { paso: "claude", ok: true, detalle: "Ya se había leído antes" },
      { paso: "insert", ok: true, detalle: `La factura ya estaba guardada · fila ${existente.id}` },
    );
    return { ok: true, factura: aFactura(existente), pasos };
  }

  const { data: blob, error: errorDescarga } = await supabase.storage.from(BUCKET_FACTURAS).download(ruta);
  if (errorDescarga || !blob) {
    return fallo("disco", "No se encuentra el archivo en el almacén. Vuelve a subirlo.", true);
  }
  const nombre = ruta.split("/").pop() || ruta;
  const extension = nombre.split(".").pop()?.toLowerCase() ?? "";
  const tipo = (TIPOS_FACTURA as readonly string[]).includes(blob.type)
    ? blob.type
    : (MIME_POR_EXTENSION[extension] ?? blob.type);
  const descartar = async (mensaje: string) => fallo("disco", mensaje, await quitarHuerfano(supabase, ruta));
  if (!(TIPOS_FACTURA as readonly string[]).includes(tipo)) {
    return descartar("Formato no admitido: sube una foto (JPG, PNG, WebP) o un PDF.");
  }
  const bytes = await blob.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES_FACTURA) {
    return descartar(`El archivo pesa ${tamano(bytes.byteLength)} y el máximo es 10 MB.`);
  }
  if (tipo !== "application/pdf" && bytes.byteLength > MAX_BYTES_FOTO) {
    return descartar(
      `La foto pesa ${tamano(bytes.byteLength)} y Claude solo lee fotos de hasta 5 MB. Hazla más pequeña o súbela en PDF.`,
    );
  }
  pasos.push({ paso: "disco", ok: true, detalle: `Leído ${nombre} (${tamano(bytes.byteLength)})` });

  /* 2 · Claude: leer la factura y devolver la llamada a guardar_factura. */
  let datos: DatosFactura;
  let modelo: string;
  try {
    ({ datos, modelo } = await ejecutarAgente({ bytes, tipo, nombre }));
  } catch (e) {
    return fallo("claude", mensajeDe(e), await quitarHuerfano(supabase, ruta));
  }
  pasos.push({
    paso: "claude",
    ok: true,
    detalle: `Claude ha sacado ${datosRellenos(datos)} de ${CAMPOS.length} datos y ha llamado a guardar_factura`,
  });

  /* 3 · INSERT: el agente (este código) ejecuta guardar_factura. Aquí termina el bucle. */
  const empresa = await empresaPorNif(supabase, datos.nif);
  const { data: fila, error } = await supabase
    .from("facturas")
    .insert({ ...datos, empresa_id: empresa?.id ?? null, archivo: ruta, origen: "crm", modelo })
    .select(SELECT_FACTURA)
    .single<FilaFactura>();
  if (error || !fila) {
    // 23505: otra petición ya guardó este mismo archivo (índice único de `archivo`): no es un fallo.
    if (error?.code === "23505") {
      const { data: ya } = await supabase
        .from("facturas")
        .select(SELECT_FACTURA)
        .eq("archivo", ruta)
        .maybeSingle<FilaFactura>();
      if (ya) {
        pasos.push({ paso: "insert", ok: true, detalle: `La factura ya estaba guardada · fila ${ya.id}` });
        refrescar();
        return { ok: true, factura: aFactura(ya), pasos };
      }
    }
    console.error("[facturas] INSERT fallido", error);
    return fallo(
      "insert",
      "Claude ha leído la factura, pero no se ha podido guardar en la base de datos. Pulsa Reintentar.",
      await quitarHuerfano(supabase, ruta),
    );
  }

  pasos.push({
    paso: "insert",
    ok: true,
    detalle: `INSERT hecho · fila ${fila.id}${empresa ? ` · vinculada a ${empresa.nombre}` : ""}`,
  });
  refrescar();
  return { ok: true, factura: aFactura(fila), pasos };
}

/** Borra la factura y, si se subió desde el CRM, su original del bucket (los de carpeta siguen en el disco). */
export async function borrarFactura(id: number): Promise<Resultado> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, mensaje: "Esa factura no existe." };
  const supabase = await createClient();
  const { data: fila } = await supabase
    .from("facturas")
    .select("archivo, origen")
    .eq("id", id)
    .maybeSingle<{ archivo: string | null; origen: "crm" | "carpeta" }>();
  if (!fila) {
    refrescar();
    return { ok: false, mensaje: "Esa factura ya no existe: puede que otra persona la haya borrado." };
  }
  const { error } = await supabase.from("facturas").delete().eq("id", id);
  if (error) {
    console.error("[facturas] DELETE fallido", error);
    return { ok: false, mensaje: "No se ha podido borrar la factura. Prueba otra vez en un momento." };
  }

  if (fila.origen === "crm" && fila.archivo) {
    const quitar = await supabase.storage.from(BUCKET_FACTURAS).remove([fila.archivo]);
    if (quitar.error) {
      refrescar();
      return { ok: true, mensaje: "Factura borrada, pero el archivo original sigue en el almacén." };
    }
  }
  refrescar();
  return { ok: true, mensaje: "Factura borrada." };
}

/** Corrige a mano los datos que Claude leyó mal (y revincula la empresa si cambia el NIF). */
export async function actualizarFactura(id: number, datos: Partial<DatosFactura>): Promise<Resultado> {
  if (!Number.isInteger(id) || id <= 0 || !datos || typeof datos !== "object") {
    return { ok: false, mensaje: "Esa factura no existe." };
  }
  const campos = Object.fromEntries(CAMPOS.filter((c) => c in datos).map((c) => [c, datos[c]]));
  if (Object.keys(campos).length === 0) return { ok: false, mensaje: "No hay nada que cambiar." };
  // Misma normalización que lo que llega de Claude, solo para los campos enviados.
  const limpios = normalizarDatos(campos);
  const cambios: Record<string, unknown> = Object.fromEntries(Object.keys(campos).map((c) => [c, limpios[c as keyof DatosFactura]]));

  const supabase = await createClient();
  if ("nif" in cambios) {
    const empresa = await empresaPorNif(supabase, limpios.nif);
    cambios.empresa_id = empresa?.id ?? null;
  }
  const { error } = await supabase.from("facturas").update(cambios).eq("id", id);
  if (error) {
    console.error("[facturas] UPDATE fallido", error);
    return { ok: false, mensaje: "No se ha podido guardar la corrección. Prueba otra vez en un momento." };
  }
  refrescar();
  return { ok: true, mensaje: "Factura actualizada.", id: String(id) };
}
