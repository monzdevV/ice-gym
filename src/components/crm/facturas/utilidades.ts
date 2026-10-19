import { MAX_BYTES_FACTURA, TIPOS_FACTURA, type DatosFactura } from "@/lib/facturas";

/** Extensión con la que se guarda cada tipo admitido en el bucket. */
const EXTENSION: Record<(typeof TIPOS_FACTURA)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const ACEPTA = TIPOS_FACTURA.join(",");

export function esTipoFactura(tipo: string): tipo is (typeof TIPOS_FACTURA)[number] {
  return (TIPOS_FACTURA as readonly string[]).includes(tipo);
}

export function extension(tipo: (typeof TIPOS_FACTURA)[number]) {
  return EXTENSION[tipo];
}

export function tamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export const LIMITE = tamano(MAX_BYTES_FACTURA);

/** Devuelve el motivo por el que no se puede leer el archivo, o null si vale. */
export function validarArchivo(archivo: File): string | null {
  if (!esTipoFactura(archivo.type)) {
    return `«${archivo.name}» no es una foto ni un PDF. Sube un JPG, PNG, WEBP o PDF.`;
  }
  if (archivo.size > MAX_BYTES_FACTURA) {
    return `«${archivo.name}» pesa ${tamano(archivo.size)} y el máximo es ${LIMITE}. Reduce la foto o exporta el PDF más ligero.`;
  }
  if (archivo.size === 0) return `«${archivo.name}» está vacío.`;
  return null;
}

/** Diferencia entre base + IVA y total, o null si falta algún dato o cuadra (±0,02 €). */
export function descuadre(d: Pick<DatosFactura, "base" | "iva" | "total">): number | null {
  if (d.base == null || d.iva == null || d.total == null) return null;
  const dif = Math.round((d.base + d.iva - d.total) * 100) / 100;
  return Math.abs(dif) > 0.02 ? dif : null;
}

/** Lee un importe escrito a la española («1.234,56», «1234.5», «12 €»). */
export function leerImporte(texto: string): number | null | "invalido" {
  const limpio = texto.replace(/[€\s]/g, "");
  if (limpio === "") return null;
  let normal = limpio;
  if (limpio.includes(",")) normal = limpio.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normal)) return "invalido";
  return Number(normal);
}

/** Importe para un campo editable: «1234,56». */
export function importeEditable(valor: number | null) {
  return valor == null ? "" : valor.toFixed(2).replace(".", ",");
}

/** Fecha AAAA-MM-DD como día, sin desplazar por zona horaria. */
export function fechaFactura(iso: string | null) {
  if (!iso) return null;
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return iso;
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, d)),
  );
}
