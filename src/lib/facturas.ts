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
  | { ok: false; mensaje: string; pasos: PasoAgente[] };

export const BUCKET_FACTURAS = "facturas";
export const TIPOS_FACTURA = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const MAX_BYTES_FACTURA = 10 * 1024 * 1024;
