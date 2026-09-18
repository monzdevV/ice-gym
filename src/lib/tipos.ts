import { colorEstadoLead, colorEstadoSocio } from "@/design/tokens";

/* ------------------------------- Leads -------------------------------- */

export const ESTADOS_LEAD = [
  "nuevo",
  "contactado",
  "visita_agendada",
  "en_prueba",
  "convertido",
  "perdido",
] as const;

export type EstadoLead = (typeof ESTADOS_LEAD)[number];

export const ETIQUETA_LEAD: Record<EstadoLead, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  visita_agendada: "Visita agendada",
  en_prueba: "En prueba",
  convertido: "Convertido",
  perdido: "Perdido",
};

export const COLOR_LEAD = colorEstadoLead;

export const ORIGENES_LEAD = ["web", "visita", "telefono", "recomendacion", "campana"] as const;
export type OrigenLead = (typeof ORIGENES_LEAD)[number];

export const ETIQUETA_ORIGEN: Record<OrigenLead, string> = {
  web: "Web",
  visita: "Visita al club",
  telefono: "Teléfono",
  recomendacion: "Recomendación",
  campana: "Campaña",
};

/* ------------------------------- Socios ------------------------------- */

export const ESTADOS_SOCIO = ["activo", "congelado", "impago", "baja"] as const;
export type EstadoSocio = (typeof ESTADOS_SOCIO)[number];

export const ETIQUETA_SOCIO: Record<EstadoSocio, string> = {
  activo: "Activo",
  congelado: "Congelado",
  impago: "Impago",
  baja: "Baja",
};

export const COLOR_SOCIO = colorEstadoSocio;

/* ------------------------------- Pagos -------------------------------- */

export const ESTADOS_PAGO = ["pagado", "pendiente", "impagado"] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const ETIQUETA_PAGO: Record<EstadoPago, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  impagado: "Impagado",
};

/* ----------------------------- Actividades ---------------------------- */

export const TIPOS_ACTIVIDAD = [
  "llamada",
  "email",
  "whatsapp",
  "visita",
  "nota",
  "cambio_estado",
] as const;
export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

export const ETIQUETA_ACTIVIDAD: Record<TipoActividad, string> = {
  llamada: "Llamada",
  email: "Email",
  whatsapp: "WhatsApp",
  visita: "Visita",
  nota: "Nota",
  cambio_estado: "Cambio de estado",
};

/** Las que puede registrar una persona a mano. El cambio de estado lo anota el sistema. */
export const TIPOS_ACTIVIDAD_MANUAL = ["llamada", "email", "whatsapp", "visita", "nota"] as const;

/* ------------------------------- Filas -------------------------------- */

export type Centro = {
  id: string;
  nombre: string;
  slug: string;
  ciudad: string;
  direccion: string;
  telefono: string | null;
  aforo: number;
  horario: string | null;
  activo: boolean;
};

export type Tarifa = {
  id: string;
  nombre: string;
  slug: string;
  cuota_mensual: number;
  matricula: number;
  descripcion: string | null;
  incluye: string[];
  destacada: boolean;
  orden: number;
  activa: boolean;
};

export type Lead = {
  id: string;
  created_at: string;
  updated_at: string;
  nombre: string;
  email: string;
  telefono: string | null;
  mensaje: string | null;
  notas: string | null;
  origen: OrigenLead;
  estado: EstadoLead;
  centro_id: string | null;
  tarifa_interes_id: string | null;
  socio_id: string | null;
  fecha_visita: string | null;
  motivo_perdida: string | null;
};

export type Socio = {
  id: string;
  created_at: string;
  updated_at: string;
  numero_socio: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  fecha_nacimiento: string | null;
  centro_id: string;
  tarifa_id: string;
  fecha_alta: string;
  fecha_baja: string | null;
  estado: EstadoSocio;
  notas: string | null;
};

export type Pago = {
  id: string;
  created_at: string;
  socio_id: string;
  periodo: string;
  concepto: "cuota" | "matricula";
  importe: number;
  fecha_emision: string;
  fecha_pago: string | null;
  estado: EstadoPago;
  metodo: "domiciliacion" | "tarjeta" | "efectivo" | null;
};

export type Acceso = {
  id: string;
  socio_id: string;
  centro_id: string;
  entrada: string;
  salida: string | null;
};

export type Clase = {
  id: string;
  centro_id: string;
  nombre: string;
  disciplina: string;
  monitor: string;
  sala: string | null;
  inicio: string;
  duracion_min: number;
  plazas: number;
  nivel: "todos" | "iniciacion" | "avanzado";
};

export type Actividad = {
  id: string;
  created_at: string;
  lead_id: string | null;
  socio_id: string | null;
  tipo: TipoActividad;
  descripcion: string;
  creado_por: string | null;
};

/* ----------------------------- Utilidades ----------------------------- */

export function esEstadoLead(valor: unknown): valor is EstadoLead {
  return typeof valor === "string" && (ESTADOS_LEAD as readonly string[]).includes(valor);
}

export function esEstadoSocio(valor: unknown): valor is EstadoSocio {
  return typeof valor === "string" && (ESTADOS_SOCIO as readonly string[]).includes(valor);
}
