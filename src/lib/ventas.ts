/**
 * Ventas: flujo de oportunidades por etapas configurables, actividades
 * planificadas, equipos de ventas y clientes. Tipos, catálogos, filtros y
 * cálculos puros; valen en servidor y en cliente.
 * Tablas Supabase: ventas_* (ver supabase/ventas.sql). Los comerciales son `equipo`.
 */

import type { ColorEquipo, Empresa, MiembroMini } from "@/lib/b2b";
import { incluye } from "@/lib/b2b";

/* ------------------------------- Catálogos ------------------------------- */

export type EtapaVentas = {
  id: string;
  nombre: string;
  orden: number;
  probabilidad: number;
  ganada: boolean;
  plegada: boolean;
  requisitos: string | null;
};

export type EtiquetaVentas = { id: string; nombre: string; color: ColorEquipo | string };

export type MotivoPerdida = { id: string; nombre: string; orden: number };

export const ICONOS_ACTIVIDAD = ["email", "llamada", "reunion", "documento", "tarea"] as const;
export type IconoActividad = (typeof ICONOS_ACTIVIDAD)[number];
export const ETIQUETA_ICONO_ACTIVIDAD: Record<IconoActividad, string> = {
  email: "Correo electrónico",
  llamada: "Llamada",
  reunion: "Reunión",
  documento: "Documento",
  tarea: "Tarea",
};

export type TipoActividadVentas = {
  id: string;
  nombre: string;
  icono: IconoActividad;
  dias: number;
  resumen: string | null;
  orden: number;
};

export type PasoPlan = {
  id: string;
  plan_id: string;
  tipo_id: string;
  resumen: string | null;
  dias: number;
  asignado_id: string | null;
  orden: number;
};
export type PlanActividad = { id: string; nombre: string; pasos: PasoPlan[] };

/* -------------------------------- Equipos -------------------------------- */

export type EquipoVentas = {
  id: string;
  nombre: string;
  email: string | null;
  color: ColorEquipo | string;
  lider_id: string | null;
  objetivo: number | null;
  activo: boolean;
  orden: number;
  /** Ids de `equipo` (comerciales) que forman el equipo. */
  miembros: string[];
};
export type EquipoMini = Pick<EquipoVentas, "id" | "nombre" | "color">;

/* -------------------------------- Clientes ------------------------------- */

export type ClienteVentas = {
  id: string;
  nombre: string;
  empresa_id: string | null;
  puesto: string | null;
  email: string | null;
  telefono: string | null;
  movil: string | null;
  web: string | null;
  nif: string | null;
  direccion: string | null;
  ciudad: string | null;
  codigo_postal: string | null;
  pais: string;
  comercial_id: string | null;
  etiquetas: string[];
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};
export type ClienteMini = Pick<ClienteVentas, "id" | "nombre" | "empresa_id" | "email" | "telefono" | "ciudad" | "pais">;

/** Empresa del CRM (tabla `empresas`, la misma de Oportunidades) tal como la usa Ventas. */
export type EmpresaVentas = Pick<Empresa, "id" | "nombre" | "logo_url" | "ciudad">;

export type ClienteCompleto = ClienteVentas & {
  empresa: EmpresaVentas | null;
  comercial: MiembroMini | null;
};

/* ----------------------------- Oportunidades ----------------------------- */

export const ESTADOS_VENTA = ["abierta", "ganada", "perdida"] as const;
export type EstadoVenta = (typeof ESTADOS_VENTA)[number];
export const ETIQUETA_ESTADO_VENTA: Record<EstadoVenta, string> = { abierta: "En curso", ganada: "Ganada", perdida: "Perdida" };

/** Prioridad en estrellas, como en el flujo de ventas: 0 normal, 3 muy alta. */
export const PRIORIDADES_VENTA = [0, 1, 2, 3] as const;
export const ETIQUETA_PRIORIDAD_VENTA = ["Normal", "Buena", "Muy buena", "Excelente"] as const;

export type OportunidadVentas = {
  id: string;
  nombre: string;
  cliente_id: string | null;
  empresa_id: string | null;
  contacto_nombre: string | null;
  empresa_nombre: string | null;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  pais: string | null;
  ingresos: number;
  probabilidad: number;
  probabilidad_manual: boolean;
  etapa_id: string | null;
  etapa_desde: string;
  posicion: number;
  comercial_id: string | null;
  equipo_id: string | null;
  cierre_previsto: string | null;
  prioridad: number;
  notas: string | null;
  campana: string | null;
  medio: string | null;
  origen: string | null;
  referido: string | null;
  estado: EstadoVenta;
  motivo_perdida_id: string | null;
  nota_cierre: string | null;
  cerrada_at: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
};

/** Próxima actividad pendiente, tal como llega embebida en la oportunidad. */
export type ActividadMini = {
  id: string;
  vence: string;
  resumen: string | null;
  estado: EstadoActividadVentas;
  tipo_id: string | null;
  asignado_id: string | null;
};

export type OportunidadVentasCompleta = OportunidadVentas & {
  cliente: ClienteMini | null;
  empresa: EmpresaVentas | null;
  comercial: MiembroMini | null;
  equipo: EquipoMini | null;
  motivo: Pick<MotivoPerdida, "id" | "nombre"> | null;
  etiquetas: EtiquetaVentas[];
  /** Sólo las pendientes, ordenadas por vencimiento. */
  actividades: ActividadMini[];
};

export const SELECT_OPORTUNIDAD_VENTAS =
  "*, cliente:ventas_clientes(id, nombre, empresa_id, email, telefono, ciudad, pais), empresa:empresas(id, nombre, logo_url, ciudad), comercial:equipo(id, nombre, apellidos, color), equipo:ventas_equipos(id, nombre, color), motivo:ventas_motivos_perdida(id, nombre), etiquetas:ventas_etiquetas(id, nombre, color), actividades:ventas_actividades(id, vence, resumen, estado, tipo_id, asignado_id)";

/** Quién: el cliente, su empresa o lo escrito a mano si aún no está dado de alta. */
export function quienVenta(o: Pick<OportunidadVentasCompleta, "cliente" | "empresa" | "contacto_nombre" | "empresa_nombre">) {
  return o.cliente?.nombre ?? o.empresa?.nombre ?? o.empresa_nombre ?? o.contacto_nombre ?? null;
}

/**
 * Importe escrito a mano o leído de un CSV: «1.234,56 €», «1500», «1,5», «2.000.000».
 * Con coma, la coma es decimal y los puntos son miles; sin coma, un punto que
 * agrupa justo tres cifras es de miles. Lo que no se entienda -> null.
 */
export function leerImporte(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== "string") return null;
  // También «30 %»: las probabilidades de un CSV suelen llevar el signo.
  let t = valor.replace(/[\s €%]|EUR/gi, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/** YYYY-MM-DD que existe de verdad (no 2026-02-31 ni 2026-31-12). */
export function esFechaValida(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [a, m, d] = v.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return a >= 1900 && f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

export const ingresoEsperado =(o: Pick<OportunidadVentas, "ingresos" | "probabilidad">) =>
  (Number(o.ingresos) * Number(o.probabilidad)) / 100;

/* ------------------------------ Actividades ------------------------------ */

export const ESTADOS_ACTIVIDAD_VENTAS = ["pendiente", "hecha", "cancelada"] as const;
export type EstadoActividadVentas = (typeof ESTADOS_ACTIVIDAD_VENTAS)[number];

export type ActividadVentas = {
  id: string;
  oportunidad_id: string | null;
  cliente_id: string | null;
  tipo_id: string | null;
  resumen: string | null;
  nota: string | null;
  vence: string;
  asignado_id: string | null;
  estado: EstadoActividadVentas;
  comentario: string | null;
  hecha_at: string | null;
  created_at: string;
};

export type ActividadVentasCompleta = ActividadVentas & {
  tipo: Pick<TipoActividadVentas, "id" | "nombre" | "icono"> | null;
  asignado: MiembroMini | null;
  oportunidad: Pick<OportunidadVentas, "id" | "nombre" | "ingresos" | "etapa_id" | "estado"> | null;
  cliente: Pick<ClienteVentas, "id" | "nombre"> | null;
};

export const SELECT_ACTIVIDAD_VENTAS =
  "*, tipo:ventas_tipos_actividad(id, nombre, icono), asignado:equipo(id, nombre, apellidos, color), oportunidad:ventas_oportunidades(id, nombre, ingresos, etapa_id, estado), cliente:ventas_clientes(id, nombre)";

/** Vencida (rojo), hoy (ámbar) o planificada (verde), como en el flujo de ventas. */
export const PLAZOS = ["vencida", "hoy", "planificada"] as const;
export type Plazo = (typeof PLAZOS)[number];
export const ETIQUETA_PLAZO: Record<Plazo, string> = { vencida: "Vencida", hoy: "Hoy", planificada: "Planificada" };
export const TONO_PLAZO: Record<Plazo, string> = {
  vencida: "var(--critico)",
  hoy: "var(--aviso)",
  planificada: "var(--exito)",
};
/**
 * El tono del plazo para TEXTO: mezclado con la tinta para pasar 4,5:1 también
 * sobre placa-2 y columna (en claro el ámbar y el verde puros se quedan en 4,2).
 */
export const TINTA_PLAZO: Record<Plazo, string> = {
  vencida: "color-mix(in oklab, var(--critico) 80%, var(--tinta))",
  hoy: "color-mix(in oklab, var(--aviso) 80%, var(--tinta))",
  planificada: "color-mix(in oklab, var(--exito) 80%, var(--tinta))",
};

const ZONA = "Europe/Madrid";
const formatoDia = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });

/** Hoy en Madrid como YYYY-MM-DD. */
export const hoyISO = (ahora: number | Date = Date.now()) => formatoDia.format(new Date(ahora));

/** Suma días a una fecha YYYY-MM-DD. */
export function sumarDias(dia: string, dias: number) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const formatoDesfase = new Intl.DateTimeFormat("en-US", { timeZone: ZONA, timeZoneName: "longOffset" });
/** Minutos que Madrid va por delante de UTC en un instante (60 en invierno, 120 en verano). */
function desfaseMadrid(ms: number) {
  const t = formatoDesfase.formatToParts(new Date(ms)).find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(t);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/**
 * Instante UTC en que empieza (o acaba) un día de Madrid, para filtrar
 * columnas timestamptz por día: la base de datos compara en UTC.
 */
export function instanteMadrid(dia: string, fin = false) {
  const local = Date.parse(`${dia}T00:00:00Z`) + (fin ? 86_400_000 - 1 : 0);
  // Dos pasadas: el desfase del propio instante, también en los días de cambio de hora.
  const aprox = local - desfaseMadrid(local) * 60_000;
  return new Date(local - desfaseMadrid(aprox) * 60_000).toISOString();
}

export function plazoDe(vence: string, hoy = hoyISO()): Plazo {
  if (vence < hoy) return "vencida";
  if (vence === hoy) return "hoy";
  return "planificada";
}

/** El plazo más urgente entre las actividades pendientes (para tarjetas y columnas). */
export function plazoMasUrgente(actividades: Pick<ActividadMini, "vence" | "estado">[], hoy = hoyISO()): Plazo | null {
  let mejor: Plazo | null = null;
  for (const a of actividades) {
    if (a.estado !== "pendiente") continue;
    const p = plazoDe(a.vence, hoy);
    if (p === "vencida") return p;
    if (p === "hoy" || !mejor) mejor = p;
  }
  return mejor;
}

/** "Vence hoy", "Vencida hace 3 días", "En 2 días". */
export function textoPlazo(vence: string, hoy = hoyISO()) {
  const dias = Math.round((new Date(`${vence}T12:00:00Z`).getTime() - new Date(`${hoy}T12:00:00Z`).getTime()) / 86_400_000);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias === -1) return "Ayer";
  return dias < 0 ? `Hace ${-dias} días` : `En ${dias} días`;
}

/* ------------------------------- Historial ------------------------------- */

export const TIPOS_MENSAJE = ["nota", "sistema", "actividad"] as const;
export type TipoMensaje = (typeof TIPOS_MENSAJE)[number];

export type MensajeVentas = {
  id: string;
  oportunidad_id: string | null;
  cliente_id: string | null;
  tipo: TipoMensaje;
  cuerpo: string;
  autor: string | null;
  created_at: string;
};

/* -------------------------------- Filtros -------------------------------- */

/**
 * Búsqueda del flujo: vive en la URL (searchParams) para compartir y recargar.
 * Los filtros de la misma familia se combinan con O; familias distintas, con Y.
 */

export const VISTAS_VENTAS = ["kanban", "lista", "calendario", "analisis", "actividad"] as const;
export type VistaVentas = (typeof VISTAS_VENTAS)[number];
export const ETIQUETA_VISTA_VENTAS: Record<VistaVentas, string> = {
  kanban: "Kanban",
  lista: "Lista",
  calendario: "Calendario",
  analisis: "Análisis",
  actividad: "Actividad",
};

export const FILTROS_VENTAS = {
  mias: { texto: "Mis oportunidades", familia: "quien" },
  sin_asignar: { texto: "No asignado", familia: "quien" },
  abiertas: { texto: "Oportunidades abiertas", familia: "estado" },
  ganadas: { texto: "Ganado", familia: "estado" },
  perdidas: { texto: "Perdido", familia: "estado" },
  en_curso: { texto: "En curso", familia: "actividad" },
  estancadas: { texto: "En espera/estancado", familia: "actividad" },
  archivadas: { texto: "Archivadas", familia: "archivo" },
} as const;
export type FiltroVentas = keyof typeof FILTROS_VENTAS;
export const CLAVES_FILTRO_VENTAS = Object.keys(FILTROS_VENTAS) as FiltroVentas[];

export const CAMPOS_FECHA_VENTAS = { creacion: "Fecha de creación", cierre: "Fecha de cierre", previsto: "Cierre previsto" } as const;
export type CampoFechaVentas = keyof typeof CAMPOS_FECHA_VENTAS;

export const AGRUPACIONES_VENTAS = {
  comercial: "Comercial",
  equipo: "Equipo de ventas",
  etapa: "Etapa",
  estado: "Estado",
  cliente: "Cliente",
  ciudad: "Ciudad",
  pais: "País",
  motivo: "Razón de pérdida",
  campana: "Campaña",
  medio: "Medio",
  origen: "Origen",
  creacion_mes: "Fecha de creación: mes",
  cierre_mes: "Cierre previsto: mes",
} as const;
export type AgrupacionVentas = keyof typeof AGRUPACIONES_VENTAS;

export const MEDIDAS_VENTAS = { n: "Recuento", ingresos: "Ingresos esperados", esperado: "Ingresos ponderados", probabilidad: "Probabilidad media" } as const;
export type MedidaVentas = keyof typeof MEDIDAS_VENTAS;

export const GRAFICOS_VENTAS = ["barras", "lineas", "tarta"] as const;
export type GraficoVentas = (typeof GRAFICOS_VENTAS)[number];

export const COLUMNAS_ORDEN_VENTAS = {
  nombre: "Oportunidad",
  cliente: "Cliente",
  email: "Correo electrónico",
  comercial: "Comercial",
  ingresos: "Ingresos esperados",
  probabilidad: "Probabilidad",
  etapa: "Etapa",
  cierre: "Cierre previsto",
  actividad: "Próxima actividad",
  creada: "Creada",
} as const;
export type OrdenVentas = keyof typeof COLUMNAS_ORDEN_VENTAS;

export type FiltrosVentas = {
  vista: VistaVentas;
  q: string;
  f: FiltroVentas[];
  equipo: string;
  comercial: string;
  cliente: string;
  empresa: string;
  etiqueta: string;
  etapa: string;
  fecha: CampoFechaVentas;
  desde: string;
  hasta: string;
  /** Agrupar por (lista y análisis); hasta dos niveles. */
  agrupar: AgrupacionVentas[];
  /** Análisis. */
  medida: MedidaVentas;
  columnas: AgrupacionVentas | "";
  grafico: GraficoVentas;
  modo: "tabla" | "grafico";
  /** Calendario: YYYY-MM. */
  mes: string;
  orden: OrdenVentas;
  dir: "asc" | "desc";
};

export const DEFECTO_VENTAS: FiltrosVentas = {
  vista: "kanban",
  q: "",
  f: [],
  equipo: "",
  comercial: "",
  cliente: "",
  empresa: "",
  etiqueta: "",
  etapa: "",
  fecha: "creacion",
  desde: "",
  hasta: "",
  agrupar: [],
  medida: "ingresos",
  columnas: "",
  grafico: "barras",
  modo: "grafico",
  mes: "",
  orden: "creada",
  dir: "desc",
};

// Mes 01-12 y uuid completo: un «2026-13» o un id cortado en la URL rompían la página.
const MES_ISO = /^\d{4}-(0[1-9]|1[0-2])$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Fuente = URLSearchParams | Record<string, string | string[] | undefined>;

export function leerFiltrosVentas(fuente: Fuente): FiltrosVentas {
  const get = (k: string) => {
    const v = fuente instanceof URLSearchParams ? fuente.get(k) : fuente[k];
    return (Array.isArray(v) ? v[0] : v ?? "").trim();
  };
  const lista = (k: string) => get(k).split(",").map((s) => s.trim()).filter(Boolean);
  const id = (k: string) => (UUID.test(get(k)) ? get(k) : "");

  const vista = get("vista");
  const fecha = get("fecha");
  const medida = get("medida");
  const columnas = get("columnas");
  const grafico = get("grafico");
  const orden = get("orden");
  const comercial = get("comercial");

  return {
    vista: incluye(VISTAS_VENTAS, vista) ? vista : DEFECTO_VENTAS.vista,
    q: get("q").slice(0, 80),
    f: [...new Set(lista("f").filter((x): x is FiltroVentas => Object.hasOwn(FILTROS_VENTAS, x)))],
    equipo: id("equipo"),
    comercial: comercial === "sin" ? "sin" : id("comercial"),
    cliente: id("cliente"),
    empresa: id("empresa"),
    etiqueta: id("etiqueta"),
    etapa: id("etapa"),
    fecha: Object.hasOwn(CAMPOS_FECHA_VENTAS, fecha) ? (fecha as CampoFechaVentas) : DEFECTO_VENTAS.fecha,
    // Una fecha que no existe (2026-02-31) hacía fallar instanteMadrid y la página entera.
    desde: esFechaValida(get("desde")) ? get("desde") : "",
    hasta: esFechaValida(get("hasta")) ? get("hasta") : "",
    agrupar: [...new Set(lista("agrupar").filter((x): x is AgrupacionVentas => Object.hasOwn(AGRUPACIONES_VENTAS, x)))].slice(0, 2),
    medida: Object.hasOwn(MEDIDAS_VENTAS, medida) ? (medida as MedidaVentas) : DEFECTO_VENTAS.medida,
    columnas: Object.hasOwn(AGRUPACIONES_VENTAS, columnas) ? (columnas as AgrupacionVentas) : "",
    grafico: incluye(GRAFICOS_VENTAS, grafico) ? grafico : DEFECTO_VENTAS.grafico,
    modo: get("modo") === "tabla" ? "tabla" : "grafico",
    mes: MES_ISO.test(get("mes")) ? get("mes") : "",
    orden: Object.hasOwn(COLUMNAS_ORDEN_VENTAS, orden) ? (orden as OrdenVentas) : DEFECTO_VENTAS.orden,
    dir: get("dir") === "asc" ? "asc" : "desc",
  };
}

/** Escribe los filtros en una query string, sin los valores por defecto. */
export function escribirFiltrosVentas(f: Partial<FiltrosVentas>, base = new URLSearchParams()) {
  const p = new URLSearchParams(base.toString());
  for (const [k, v] of Object.entries(f)) {
    const defecto = DEFECTO_VENTAS[k as keyof FiltrosVentas];
    const texto = Array.isArray(v) ? v.join(",") : String(v ?? "");
    const textoDefecto = Array.isArray(defecto) ? defecto.join(",") : String(defecto ?? "");
    if (texto === "" || texto === textoDefecto) p.delete(k);
    else p.set(k, texto);
  }
  return p;
}

/** Filtros de datos activos (sin vista, orden ni opciones de análisis). */
export function cuantosFiltrosVentas(f: FiltrosVentas) {
  return [f.q, f.f.length, f.equipo, f.comercial, f.cliente, f.empresa, f.etiqueta, f.etapa, f.desde || f.hasta].filter(Boolean).length;
}

export function normalizarTexto(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/* --------------------------------- Rutas --------------------------------- */

export const rutaVentas = {
  flujo: "/crm/ventas",
  oportunidad: (id: string) => `/crm/ventas/${id}`,
  actividades: "/crm/ventas/actividades",
  equipos: "/crm/ventas/equipos",
  clientes: "/crm/ventas/clientes",
  cliente: (id: string) => `/crm/ventas/clientes/${id}`,
  configuracion: "/crm/ventas/configuracion",
};
