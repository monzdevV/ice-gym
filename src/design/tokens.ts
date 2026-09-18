/**
 * TOKENS DE DISEÑO · ICE GYM
 *
 * Única fuente de verdad del sistema visual. `cssTemas()` genera las variables
 * de los dos temas y el layout las inyecta en el <head>; globals.css sólo las
 * mapea a nombres de Tailwind. Ningún componente escribe un color a mano.
 *
 * Mundo: grafismo de retransmisión deportiva. Placas opacas y planas, cortes
 * inclinados, condensada gruesa en mayúsculas y cifras tabulares.
 * El azul hielo sólo es campo sólido con texto negro; el bengala sólo marca
 * impagos. Todos los pares de texto pasan WCAG AA en ambos temas.
 */

/** Colores de marca fijados por el cliente. */
export const marca = {
  negro: "#0A0B0D",
  hielo: "#F2F7FA",
  azul: "#5CE1FF",
  bengala: "#FF4D2E",
} as const;

type Tema = {
  /** Suelo de la página. */
  fondo: string;
  /** Placa: filas, paneles, campos. */
  placa: string;
  /** Placa vecina: pasar el ratón, cabeceras de tabla. Siempre opaca. */
  placa2: string;
  /** Líneas de 1 px. */
  linea: string;
  /** Texto principal. */
  tinta: string;
  /** Texto secundario (≥ 6:1 en todas las placas). */
  tinta2: string;
  /** Azul como texto o icono sobre el fondo. */
  acentoTinta: string;
  /** Bengala como texto: sólo en importes impagados. */
  alarmaTinta: string;
  /** Series de gráficos, validadas con la guía de visualización. */
  datoAzul: string;
  datoBengala: string;
  /** Rampa de un solo tono para el embudo, de etapa temprana a avanzada. */
  rampa: readonly string[];
  /** Estado "baja" y cualquier cosa retirada. */
  apagado: string;
};

export const temas: Record<"claro" | "oscuro", Tema> = {
  claro: {
    fondo: "#F2F7FA",
    placa: "#FFFFFF",
    placa2: "#E4ECF1",
    linea: "#CCD6DD",
    tinta: "#0A0B0D",
    tinta2: "#4E5864",
    acentoTinta: "#0A6A87",
    alarmaTinta: "#B5301A",
    datoAzul: "#1C86A8",
    datoBengala: "#D93A1E",
    rampa: ["#5BB8D5", "#3A9FC0", "#2786A6", "#1C6C88", "#13536A", "#0B3A4C"],
    apagado: "#9AA5AF",
  },
  oscuro: {
    fondo: "#0A0B0D",
    placa: "#121418",
    placa2: "#1B1E24",
    linea: "#262A31",
    tinta: "#F2F7FA",
    tinta2: "#949DA8",
    acentoTinta: "#5CE1FF",
    alarmaTinta: "#FF6B4F",
    datoAzul: "#2C9BBF",
    datoBengala: "#F0472B",
    rampa: ["#11536A", "#18728E", "#2295B7", "#4FB6D4", "#82D2E9", "#B9E9F7"],
    apagado: "#4A515C",
  },
};

/** Tipografía: la condensada del logotipo manda en todo lo que no es una frase. */
export const fuente = {
  display: "var(--font-display)",
  cuerpo: "var(--font-body)",
} as const;

/** Desplazamiento horizontal del corte inclinado (≈ 70° en una placa de 32 px). */
export const corte = {
  placa: "12px",
  pestana: "14px",
  rotulo: "22px",
} as const;

/** Movimiento: una cortina al entrar y cifras que suben. Nada más. */
export const movimiento = {
  rapido: 0.16,
  normal: 0.32,
  lento: 0.7,
  /** Ease-out exponencial, sin rebote. */
  curva: [0.23, 1, 0.32, 1] as const,
  /** Para lo que se desplaza por la pantalla (filas que cambian de puesto). */
  curvaMovimiento: [0.77, 0, 0.175, 1] as const,
  escalon: 0.04,
} as const;

/** Códigos de tres letras de los centros, como los de los pilotos. */
export function codigoCentro(slugONombre: string | null | undefined) {
  if (!slugONombre) return "—";
  const limpio = slugONombre.replace(/^Ice Gym\s+/i, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return limpio.slice(0, 3).toUpperCase();
}

function variables(t: Tema) {
  return [
    `--fondo:${t.fondo}`,
    `--placa:${t.placa}`,
    `--placa-2:${t.placa2}`,
    `--linea:${t.linea}`,
    `--tinta:${t.tinta}`,
    `--tinta-2:${t.tinta2}`,
    `--acento:${marca.azul}`,
    `--acento-tinta:${t.acentoTinta}`,
    `--alarma:${marca.bengala}`,
    `--alarma-tinta:${t.alarmaTinta}`,
    `--sobre-campo:${marca.negro}`,
    `--dato-azul:${t.datoAzul}`,
    `--dato-bengala:${t.datoBengala}`,
    `--apagado:${t.apagado}`,
    ...t.rampa.map((c, i) => `--rampa-${i}:${c}`),
  ].join(";");
}

/**
 * CSS de los dos temas. Sin preferencia guardada manda el sistema;
 * `data-tema` en <html> fija uno a mano.
 */
export function cssTemas() {
  const claro = variables(temas.claro);
  const oscuro = variables(temas.oscuro);
  return [
    `:root{${claro};color-scheme:light}`,
    `@media (prefers-color-scheme: dark){:root:not([data-tema="claro"]){${oscuro};color-scheme:dark}}`,
    `:root[data-tema="oscuro"]{${oscuro};color-scheme:dark}`,
    `:root[data-tema="claro"]{${claro};color-scheme:light}`,
    `:root{--corte-placa:${corte.placa};--corte-pestana:${corte.pestana};--corte-rotulo:${corte.rotulo}}`,
  ].join("");
}

/**
 * Se ejecuta antes de pintar para aplicar el tema guardado sin parpadeo.
 * La preferencia es sólo de este navegador: vive en localStorage.
 */
export const scriptTema = `(function(){try{var t=localStorage.getItem("ice-tema");if(t==="claro"||t==="oscuro"){document.documentElement.setAttribute("data-tema",t)}}catch(e){}})();`;
