/**
 * TOKENS DE DISEÑO · ICE GYM
 *
 * Única fuente de verdad del sistema visual. Los valores se inyectan como
 * variables CSS en el <html> (ver src/app/layout.tsx) y globals.css sólo los
 * mapea a nombres de Tailwind. Si cambias un color aquí, cambia en toda la app.
 *
 * Dirección: frío, intenso, deportivo. Negro casi puro, blanco hielo y un único
 * acento azul eléctrico. El rojo bengala es señal, no decoración: se reserva
 * para impagos y errores.
 */

export const color = {
  /** Fondo base de toda la aplicación. */
  negro: "#0A0B0D",
  /** Panel sobre el fondo. */
  carbon: "#0F1115",
  /** Panel elevado, filas al pasar el ratón, campos de formulario. */
  grafito: "#161A20",
  /** Líneas de 1px. Nunca sombras difusas. */
  acero: "#252A32",
  /** Texto secundario, etiquetas, ejes de gráficos. */
  niebla: "#868F9B",
  /** Texto principal. */
  hielo: "#F2F7FA",
  /** Acento único: enlaces activos, series de datos, estados de foco. */
  azul: "#5CE1FF",
  /** Fondo tintado del acento, para píldoras y filas seleccionadas. */
  azulHondo: "#0C3743",
  /** Segundo acento. SÓLO impagos y errores. */
  bengala: "#FF4D2E",
} as const;

/** Color por estado de socio. */
export const colorEstadoSocio = {
  activo: color.azul,
  congelado: color.niebla,
  impago: color.bengala,
  baja: "#4A515C",
} as const;

/** Color por estado de lead, de frío a caliente dentro de la gama fría. */
export const colorEstadoLead = {
  nuevo: "#4A515C",
  contactado: "#6E7A88",
  visita_agendada: "#3AA9CC",
  en_prueba: "#5CE1FF",
  convertido: "#A8F0FF",
  perdido: "#3A2F2D",
} as const;

/**
 * Paleta de gráficos.
 *
 * El azul y el bengala de marca son demasiado luminosos para usarse como relleno
 * de datos sobre fondo oscuro, así que los gráficos usan un escalón más profundo
 * de los mismos tonos. Estos valores pasan las seis comprobaciones del validador
 * (banda de luminosidad, croma, separación para daltonismo, suelo de visión
 * normal y contraste sobre #0F1115); no los cambies sin volver a validarlos.
 */
export const colorDato = {
  /** Serie principal: todo lo que es "normal". */
  azul: "#2C9BBF",
  /** Serie de alarma: impagos. Nunca para otra cosa. */
  bengala: "#F0472B",
  /** Serie neutra de apoyo. */
  neutro: "#6E7A88",
} as const;

/** Rampa secuencial de un solo tono para magnitudes ordenadas (el embudo). */
export const rampaAzul = [
  "#11536A",
  "#18728E",
  "#2295B7",
  "#4FB6D4",
  "#82D2E9",
  "#B9E9F7",
] as const;

export const fuente = {
  /** Titulares. Barlow Condensed 800, siempre en MAYÚSCULAS. */
  display: "var(--font-display)",
  /** Texto corrido. Barlow. */
  cuerpo: "var(--font-body)",
  /** Etiquetas, cabeceras de tabla y datos. Barlow Semi Condensed. */
  util: "var(--font-util)",
} as const;

/** Esquinas rectas o casi. Nada de tarjetas redondeadas. */
export const radio = {
  nada: "0px",
  minimo: "2px",
  boton: "2px",
} as const;

/** Ritmo vertical en múltiplos de 4px. */
export const espacio = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "40px",
  xxl: "64px",
} as const;

/** Movimiento: poco y con intención. */
export const movimiento = {
  rapido: 0.18,
  normal: 0.32,
  lento: 0.6,
  /** Curva de salida seca, sin rebote. */
  curva: [0.22, 1, 0.36, 1] as const,
  /** Retraso entre elementos de una entrada escalonada. */
  escalon: 0.045,
} as const;

/** Ángulo del corte diagonal, el gesto que firma la marca. */
export const corte = {
  angulo: "14deg",
  /** clip-path para un panel con la esquina superior derecha cortada. */
  panel: "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)",
  /** Bisel estrecho para indicadores y pestañas activas. */
  marca: "polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)",
} as const;

/**
 * Las variables CSS que consume globals.css. Se aplican en el <html>, así que
 * no hay ningún color escrito a mano en las hojas de estilo ni en los componentes.
 */
export const variablesCss: Record<string, string> = {
  "--ice-negro": color.negro,
  "--ice-carbon": color.carbon,
  "--ice-grafito": color.grafito,
  "--ice-acero": color.acero,
  "--ice-niebla": color.niebla,
  "--ice-hielo": color.hielo,
  "--ice-azul": color.azul,
  "--ice-azul-hondo": color.azulHondo,
  "--ice-bengala": color.bengala,
  "--ice-radio": radio.minimo,
  "--ice-corte-panel": corte.panel,
  "--ice-corte-marca": corte.marca,
};
