/**
 * RRHH: empleados → cuentas del CRM, fichajes, vacaciones, incorporación,
 * evaluaciones trimestrales y nóminas. Tipos, catálogos y cálculos puros; valen
 * en servidor y en cliente. Tablas y permisos: supabase/rrhh.sql.
 */

type Catalogo<T extends string> = Record<T, string>;

/* ------------------------------- Rutas -------------------------------- */

export const rutaRrhh = {
  empleados: "/crm/rrhh/empleados",
  empleado: (id: string) => `/crm/rrhh/empleados/${id}`,
  horarios: "/crm/rrhh/horarios",
  vacaciones: "/crm/rrhh/vacaciones",
  incorporacion: "/crm/rrhh/incorporacion",
  evaluaciones: "/crm/rrhh/evaluaciones",
  nominas: "/crm/rrhh/nominas",
};

/* ------------------------------ Empleados ------------------------------ */

export const ROLES = ["admin", "responsable", "empleado"] as const;
export type Rol = (typeof ROLES)[number];
export const ETIQUETA_ROL: Catalogo<Rol> = { admin: "Administrador", responsable: "Jefe / responsable", empleado: "Empleado" };
export const DESCRIPCION_ROL: Catalogo<Rol> = {
  admin: "Acceso completo al CRM y a RRHH.",
  responsable: "Gestiona a su equipo: horarios, vacaciones, evaluaciones y tareas.",
  empleado: "Consulta lo suyo: ficha, horarios, vacaciones, evaluaciones y nóminas.",
};
export const TONO_ROL: Catalogo<Rol> = {
  admin: "var(--relleno-violeta)",
  responsable: "var(--relleno-azul)",
  empleado: "var(--relleno-gris)",
};

export const ESTADOS_EMPLEADO = ["activo", "inactivo"] as const;
export type EstadoEmpleado = (typeof ESTADOS_EMPLEADO)[number];
export const ETIQUETA_ESTADO_EMPLEADO: Catalogo<EstadoEmpleado> = { activo: "Activo", inactivo: "Inactivo" };

export type Empleado = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  usuario: string | null;
  rol: Rol;
  nombre: string;
  apellidos: string;
  foto_path: string | null;
  documento: string | null;
  email: string;
  telefono: string | null;
  puesto: string | null;
  departamento: string | null;
  fecha_alta: string;
  fecha_baja: string | null;
  jefe_id: string | null;
  estado: EstadoEmpleado;
  fecha_nacimiento: string | null;
  direccion: string | null;
  contacto_emergencia: string | null;
  dias_vacaciones: number;
  notas: string | null;
};

/** Datos públicos de cualquier compañero (directorio): sin nada privado. */
export type EmpleadoMini = {
  id: string;
  nombre: string;
  apellidos: string;
  puesto: string | null;
  departamento: string | null;
  foto_path: string | null;
  foto_url?: string | null;
  estado: EstadoEmpleado;
  rol: Rol;
  jefe_id: string | null;
};

/** Quién está usando el CRM y qué puede hacer en RRHH. */
export type PerfilRrhh = {
  email: string | null;
  empleado: EmpleadoMini | null;
  rol: Rol | null;
  esAdmin: boolean;
  /** Admin o responsable: aprueba, evalúa y consulta a su equipo. */
  esGestor: boolean;
  hayAdmin: boolean;
  /** false si aún no se ha ejecutado supabase/rrhh.sql en la base de datos. */
  instalado: boolean;
};

export const nombreEmpleado = (e: { nombre: string; apellidos?: string | null } | null | undefined) =>
  e ? [e.nombre, e.apellidos].filter(Boolean).join(" ") : "—";

/** Usuario por defecto a partir del email: «ana.garcia». */
export function usuarioSugerido(email: string) {
  return email
    .split("@")[0]
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 40);
}

export const USUARIO_VALIDO = /^[a-z0-9._-]{3,40}$/;

/** DNI (8 cifras + letra) o NIE (X/Y/Z + 7 cifras + letra), con la letra de control. */
export function documentoValido(doc: string) {
  const d = doc.toUpperCase().replace(/[\s-]/g, "");
  const m = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(d);
  if (!m) return false;
  const [, prefijo, cifras, letra] = m;
  if (prefijo && cifras.length !== 7) return false;
  if (!prefijo && cifras.length !== 8) return false;
  const numero = Number(`${prefijo ? "XYZ".indexOf(prefijo) : ""}${cifras}`);
  return "TRWAGMYFPDXBNJZSQVHLCKE"[numero % 23] === letra;
}

/** Años y meses desde una fecha (antigüedad). */
export function antiguedad(desde: string, hasta = new Date()) {
  const d = new Date(`${desde}T00:00:00`);
  let meses = (hasta.getFullYear() - d.getFullYear()) * 12 + hasta.getMonth() - d.getMonth();
  if (hasta.getDate() < d.getDate()) meses -= 1;
  if (meses < 0) return "Aún no ha empezado";
  const a = Math.floor(meses / 12);
  const m = meses % 12;
  if (a === 0) return m === 1 ? "1 mes" : `${m} meses`;
  return `${a} ${a === 1 ? "año" : "años"}${m ? ` y ${m} ${m === 1 ? "mes" : "meses"}` : ""}`;
}

/* ------------------------------- Fichajes ------------------------------- */

export type Fichaje = {
  id: string;
  created_at: string;
  empleado_id: string;
  fecha: string;
  entrada: string;
  salida: string | null;
  minutos: number | null;
  estado: "correcto" | "incidencia";
  incidencia: string | null;
  origen: "fichaje" | "manual";
};

/** «7 h 45 min». */
export function duracion(minutos: number | null | undefined) {
  if (minutos == null) return "—";
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Horas con un decimal para resúmenes: «152,5 h». */
export const horasDecimal = (minutos: number) => `${(minutos / 60).toFixed(1).replace(".", ",")} h`;

/* ------------------------------ Vacaciones ------------------------------ */

export const ESTADOS_VACACIONES = ["pendiente", "aprobada", "denegada", "cancelada"] as const;
export type EstadoVacaciones = (typeof ESTADOS_VACACIONES)[number];
export const ETIQUETA_ESTADO_VACACIONES: Catalogo<EstadoVacaciones> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  denegada: "Denegada",
  cancelada: "Cancelada",
};
export const TONO_ESTADO_VACACIONES: Catalogo<EstadoVacaciones> = {
  pendiente: "var(--relleno-ambar)",
  aprobada: "var(--relleno-verde)",
  denegada: "var(--relleno-rosa)",
  cancelada: "var(--relleno-gris)",
};

export type Vacaciones = {
  id: string;
  created_at: string;
  empleado_id: string;
  inicio: string;
  fin: string;
  dias: number;
  comentario: string | null;
  estado: EstadoVacaciones;
  resuelta_por: string | null;
  resuelta_at: string | null;
  respuesta: string | null;
  cancelada_at: string | null;
};

/** Días laborables (lunes a viernes) entre dos fechas YYYY-MM-DD, ambas incluidas. Igual que en la base de datos. */
export function diasLaborables(inicio: string, fin: string) {
  if (!inicio || !fin || fin < inicio) return 0;
  let n = 0;
  const d = new Date(`${inicio}T12:00:00Z`);
  const f = new Date(`${fin}T12:00:00Z`);
  while (d <= f) {
    const dia = d.getUTCDay();
    if (dia !== 0 && dia !== 6) n += 1;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return n;
}

/** Días aprobados (o pendientes) que caen en un año natural. */
export function diasEnAnio(v: Pick<Vacaciones, "inicio" | "fin">, anio: number) {
  const ini = v.inicio < `${anio}-01-01` ? `${anio}-01-01` : v.inicio;
  const fin = v.fin > `${anio}-12-31` ? `${anio}-12-31` : v.fin;
  return diasLaborables(ini, fin);
}

/* ----------------------------- Incorporación ---------------------------- */

export type TareaIncorporacion = {
  id: string;
  created_at: string;
  empleado_id: string;
  orden: number;
  nombre: string;
  descripcion: string | null;
  responsable_id: string | null;
  fecha_limite: string | null;
  obligatoria: boolean;
  completada: boolean;
  completada_at: string | null;
  completada_por: string | null;
};

export type PasoPlantilla = {
  id: string;
  orden: number;
  nombre: string;
  descripcion: string | null;
  dias_plazo: number;
  obligatoria: boolean;
  responsable: "jefe" | "rrhh";
};

export type EstadoTarea = "completada" | "vencida" | "pendiente";
export const ETIQUETA_ESTADO_TAREA: Catalogo<EstadoTarea> = { completada: "Completada", vencida: "Vencida", pendiente: "Pendiente" };
export const TONO_ESTADO_TAREA: Catalogo<EstadoTarea> = {
  completada: "var(--relleno-verde)",
  vencida: "var(--relleno-rosa)",
  pendiente: "var(--relleno-gris)",
};

export function hoyMadrid() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

export function estadoTarea(t: Pick<TareaIncorporacion, "completada" | "fecha_limite">, hoy = hoyMadrid()): EstadoTarea {
  if (t.completada) return "completada";
  if (t.fecha_limite && t.fecha_limite < hoy) return "vencida";
  return "pendiente";
}

/** Progreso: la incorporación está completada cuando lo están todas las obligatorias. */
export function progresoIncorporacion(tareas: Pick<TareaIncorporacion, "completada" | "obligatoria">[]) {
  const obligatorias = tareas.filter((t) => t.obligatoria);
  const hechas = obligatorias.filter((t) => t.completada).length;
  return {
    total: tareas.length,
    hechasTotal: tareas.filter((t) => t.completada).length,
    obligatorias: obligatorias.length,
    hechas,
    completada: obligatorias.length > 0 && hechas === obligatorias.length,
    pct: obligatorias.length ? Math.round((hechas / obligatorias.length) * 100) : 0,
  };
}

/* ------------------------------ Evaluaciones ----------------------------- */

export const PUNTUACIONES = [1, 2, 3, 4, 5] as const;
export const ETIQUETA_PUNTUACION: Record<number, string> = { 1: "Muy bajo", 2: "Bajo", 3: "Adecuado", 4: "Bueno", 5: "Excelente" };
export const TONO_PUNTUACION: Record<number, string> = {
  1: "var(--relleno-rosa)",
  2: "var(--relleno-ambar)",
  3: "var(--relleno-gris)",
  4: "var(--relleno-azul)",
  5: "var(--relleno-verde)",
};

export type Evaluacion = {
  id: string;
  created_at: string;
  updated_at: string;
  empleado_id: string;
  anio: number;
  trimestre: number;
  puntuacion: number;
  comentarios: string | null;
  evaluador_id: string | null;
  fecha: string;
  visible_empleado: boolean;
};

export const etiquetaTrimestre = (t: number, anio: number) => `Q${t} ${anio}`;

export function trimestreActual(d = new Date()) {
  return { anio: d.getFullYear(), trimestre: Math.floor(d.getMonth() / 3) + 1 };
}

/* -------------------------------- Nóminas -------------------------------- */

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const periodoNomina = (mes: number, anio: number) => `${MESES[mes - 1]} ${anio}`;

export type Nomina = {
  id: string;
  created_at: string;
  empleado_id: string;
  anio: number;
  mes: number;
  archivo_path: string;
  archivo_nombre: string;
  tamano: number;
  hash_sha256: string;
  subida_por: string | null;
  vista_at: string | null;
  firmada_at: string | null;
  firma_ip: string | null;
  firma_huella: string | null;
  firma_metodo: string;
  estado_firma: "pendiente" | "firmada";
};

export type EstadoFirma = "firmada" | "vista" | "pendiente";
export const estadoFirma = (n: Pick<Nomina, "firmada_at" | "vista_at">): EstadoFirma =>
  n.firmada_at ? "firmada" : n.vista_at ? "vista" : "pendiente";
export const ETIQUETA_ESTADO_FIRMA: Catalogo<EstadoFirma> = {
  firmada: "Firmada",
  vista: "Vista, sin firmar",
  pendiente: "Pendiente de firma",
};
export const TONO_ESTADO_FIRMA: Catalogo<EstadoFirma> = {
  firmada: "var(--relleno-verde)",
  vista: "var(--relleno-azul)",
  pendiente: "var(--relleno-ambar)",
};

export function tamanoArchivo(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
