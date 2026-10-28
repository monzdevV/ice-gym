"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { datosRellenos, ejecutarAgente, normalizarDatos, normalizarNif } from "@/lib/agente-facturas/agente";
import { SELECT_FACTURA, aFactura, type FilaFactura } from "@/lib/datos/facturas";
import {
  BUCKET_FACTURAS,
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
 * Lee una factura que la UI ya ha subido al bucket «facturas» en `ruta`.
 * Devuelve la factura guardada y el detalle de cada paso (o hasta dónde llegó si falla).
 */
export async function leerFactura(ruta: string): Promise<ResultadoLectura> {
  const pasos: PasoAgente[] = [];
  const fallo = (paso: PasoAgente["paso"], mensaje: string): ResultadoLectura => {
    pasos.push({ paso, ok: false, detalle: mensaje });
    return { ok: false, mensaje, pasos };
  };

  /* 1 · Disco: descargar el archivo del bucket. */
  if (!ruta || ruta.includes("..") || ruta.startsWith("/")) return fallo("disco", "Ruta de archivo no válida.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fallo("disco", "Tu sesión ha caducado. Vuelve a entrar.");

  const { data: blob, error: errorDescarga } = await supabase.storage.from(BUCKET_FACTURAS).download(ruta);
  if (errorDescarga || !blob) {
    return fallo("disco", `No se pudo leer el archivo del almacén: ${errorDescarga?.message ?? "no existe"}.`);
  }
  const nombre = ruta.split("/").pop() || ruta;
  const extension = nombre.split(".").pop()?.toLowerCase() ?? "";
  const tipo = (TIPOS_FACTURA as readonly string[]).includes(blob.type)
    ? blob.type
    : (MIME_POR_EXTENSION[extension] ?? blob.type);
  if (!(TIPOS_FACTURA as readonly string[]).includes(tipo)) {
    return fallo("disco", "Formato no admitido: sube una foto (JPG, PNG, WebP) o un PDF.");
  }
  const bytes = await blob.arrayBuffer();
  pasos.push({ paso: "disco", ok: true, detalle: `Leído ${nombre} (${tamano(bytes.byteLength)})` });

  /* 2 · Claude: leer la factura y devolver la llamada a guardar_factura. */
  let datos: DatosFactura;
  let modelo: string;
  try {
    ({ datos, modelo } = await ejecutarAgente({ bytes, tipo, nombre }));
  } catch (e) {
    return fallo("claude", mensajeDe(e));
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
  if (error || !fila) return fallo("insert", `No se pudo guardar la factura: ${error?.message ?? "sin respuesta"}.`);

  pasos.push({
    paso: "insert",
    ok: true,
    detalle: `INSERT hecho · fila ${fila.id}${empresa ? ` · vinculada a ${empresa.nombre}` : ""}`,
  });
  refrescar();
  return { ok: true, factura: aFactura(fila), pasos };
}

/** Borra la factura y su archivo original del bucket. */
export async function borrarFactura(id: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data: fila } = await supabase
    .from("facturas")
    .select("archivo")
    .eq("id", id)
    .maybeSingle<{ archivo: string | null }>();
  const { error } = await supabase.from("facturas").delete().eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo borrar: ${error.message}` };

  if (fila?.archivo) {
    const quitar = await supabase.storage.from(BUCKET_FACTURAS).remove([fila.archivo]);
    if (quitar.error) {
      refrescar();
      return { ok: true, mensaje: `Factura borrada, pero el archivo se quedó en el almacén: ${quitar.error.message}` };
    }
  }
  refrescar();
  return { ok: true, mensaje: "Factura borrada." };
}

/** Corrige a mano los datos que Claude leyó mal (y revincula la empresa si cambia el NIF). */
export async function actualizarFactura(id: number, datos: Partial<DatosFactura>): Promise<Resultado> {
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
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };
  refrescar();
  return { ok: true, mensaje: "Factura actualizada.", id: String(id) };
}
