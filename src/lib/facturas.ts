/** Tipos compartidos del agente lector de facturas (servidor y cliente). */

/** Lo que Claude saca de la factura. Si un dato no aparece, va a null. */
export type DatosFactura = {
  numero: string | null;
  fecha: string | null; // AAAA-MM-DD
  proveedor: string | null;
  nif: string | null;
  base: number | null;
  iva: number | null;
  total: number | null;
};

export type Factura = DatosFactura & {
  id: number;
  empresa_id: string | null;
  empresa_nombre: string | null;
  archivo: string | null; // ruta dentro del bucket «facturas»
  origen: "crm" | "carpeta";
  modelo: string | null;
  created_at: string;
};

/** Los tres pasos del agente, como en el esquema: disco → Claude → INSERT. */
export type PasoAgente = {
  paso: "disco" | "claude" | "insert";
  ok: boolean;
  detalle: string;
};

export type ResultadoLectura =
  | { ok: true; factura: Factura; pasos: PasoAgente[] }
  /** `archivoBorrado`: el original ya no está en el bucket; para reintentar hay que volver a subirlo. */
  | { ok: false; mensaje: string; pasos: PasoAgente[]; archivoBorrado?: boolean };

export const BUCKET_FACTURAS = "facturas";
export const TIPOS_FACTURA = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const MAX_BYTES_FACTURA = 10 * 1024 * 1024;
/** La API de Claude no admite imágenes de más de 5 MB (los PDF sí pueden llegar a 10 MB). */
export const MAX_BYTES_FOTO = 5 * 1024 * 1024;

/** Ruta que la pantalla da a cada original en el bucket: crm/<uuid>.<ext>. Única por construcción. */
export const RUTA_CRM = /^crm\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/;
