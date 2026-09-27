import {
  ETIQUETA_LEAD,
  ETIQUETA_ORIGEN,
  PROBABILIDAD_ETAPA,
  esAbierto,
  type Lead,
  type TipoActividad,
} from "@/lib/tipos";

/**
 * Cálculos de oportunidad: funciones puras, valen en servidor y en cliente.
 * Nada de IA: reglas simples que siempre explican su motivo.
 */

const DIA = 86_400_000;

/** Semanas que cubre el minigráfico de actividad. */
export const SEMANAS_ACTIVIDAD = 8;

export type ResumenActividad = {
  ultima: { fecha: string; tipo: TipoActividad } | null;
  /** Interacciones por semana, de la más antigua a la actual. */
  semanas: number[];
  ultimos7: number;
  total: number;
};

export const RESUMEN_VACIO: ResumenActividad = {
  ultima: null,
  semanas: Array(SEMANAS_ACTIVIDAD).fill(0),
  ultimos7: 0,
  total: 0,
};

type LeadValorable = Pick<Lead, "estado" | "valor_estimado" | "probabilidad"> & {
  tarifa?: { cuota_mensual: number } | null;
};

/** Valor anual: el estimado a mano o, si no hay, la cuota de la tarifa × 12. */
export function valorDe(lead: LeadValorable) {
  if (lead.valor_estimado != null) return Number(lead.valor_estimado);
  return Number(lead.tarifa?.cuota_mensual ?? 0) * 12;
}

/** Probabilidad de cierre en %. Las etapas cerradas mandan sobre el ajuste manual. */
export function probabilidadDe(lead: LeadValorable) {
  if (!esAbierto(lead.estado)) return PROBABILIDAD_ETAPA[lead.estado];
  return lead.probabilidad ?? PROBABILIDAD_ETAPA[lead.estado];
}

export function valorPonderado(lead: LeadValorable) {
  return (valorDe(lead) * probabilidadDe(lead)) / 100;
}

/** Última vez que se tocó el lead: su actualización o su última actividad. */
export function ultimoMovimiento(lead: Pick<Lead, "updated_at">, resumen?: ResumenActividad) {
  const a = new Date(lead.updated_at).getTime();
  const b = resumen?.ultima ? new Date(resumen.ultima.fecha).getTime() : 0;
  return Math.max(a, b);
}

export function diasParado(lead: Pick<Lead, "updated_at">, resumen?: ResumenActividad, ahora = Date.now()) {
  return Math.max(0, Math.floor((ahora - ultimoMovimiento(lead, resumen)) / DIA));
}

/** Fecha en la que se espera cerrar: la próxima acción, la visita o, si no, en 30 días. */
export function cierreEsperado(lead: Pick<Lead, "proxima_accion_fecha" | "fecha_visita" | "updated_at">) {
  if (lead.proxima_accion_fecha) return lead.proxima_accion_fecha;
  if (lead.fecha_visita) return lead.fecha_visita;
  return new Date(new Date(lead.updated_at).getTime() + 30 * DIA).toISOString();
}

export function accionVencida(lead: Pick<Lead, "proxima_accion_fecha">, ahora = Date.now()) {
  if (!lead.proxima_accion_fecha) return false;
  return new Date(lead.proxima_accion_fecha).getTime() < ahora - DIA / 2;
}

/* ------------------------------ Puntuación ------------------------------ */

export const NIVELES = ["caliente", "templado", "frio", "riesgo"] as const;
export type Nivel = (typeof NIVELES)[number];

export const ETIQUETA_NIVEL: Record<Nivel, string> = {
  caliente: "Caliente",
  templado: "Templado",
  frio: "Frío",
  riesgo: "En riesgo",
};

export const TONO_NIVEL: Record<Nivel, string> = {
  caliente: "var(--critico)",
  templado: "var(--aviso)",
  frio: "var(--tag-azul)",
  riesgo: "var(--tag-rosa)",
};

export type Puntuacion = { nivel: Nivel; puntos: number; motivos: string[] };

type LeadPuntuable = Pick<
  Lead,
  "estado" | "origen" | "updated_at" | "fecha_visita" | "proxima_accion_fecha"
>;

/**
 * Nivel del lead con sus motivos. Devuelve null si el lead ya está cerrado.
 * - Riesgo: próxima acción vencida, o parado demasiado para su etapa.
 * - Si no, suma puntos por etapa, visita próxima, actividad reciente y origen.
 */
export function puntuacion(
  lead: LeadPuntuable,
  resumen: ResumenActividad = RESUMEN_VACIO,
  ahora = Date.now()
): Puntuacion | null {
  if (!esAbierto(lead.estado)) return null;

  const motivos: string[] = [];
  let puntos = 0;
  const parado = diasParado(lead, resumen, ahora);
  const avanzado = lead.estado === "visita_agendada" || lead.estado === "en_prueba";

  if (avanzado) {
    puntos += 30;
    motivos.push(`Está en «${ETIQUETA_LEAD[lead.estado]}».`);
  }

  if (lead.fecha_visita) {
    const dias = Math.round((new Date(lead.fecha_visita).getTime() - ahora) / DIA);
    if (dias >= 0 && dias <= 7) {
      puntos += 20;
      motivos.push(dias === 0 ? "Tiene la visita hoy." : `Visita en ${dias} día${dias === 1 ? "" : "s"}.`);
    }
  }

  if (resumen.ultimos7 >= 2) {
    puntos += 20;
    motivos.push(`${resumen.ultimos7} interacciones en los últimos 7 días.`);
  } else if (resumen.ultimos7 === 1) {
    puntos += 10;
    motivos.push("1 interacción en los últimos 7 días.");
  }

  if (lead.origen === "recomendacion" || lead.origen === "visita") {
    puntos += 10;
    motivos.push(`Llegó por ${ETIQUETA_ORIGEN[lead.origen].toLowerCase()}, suele cerrar mejor.`);
  }

  const vencida = accionVencida(lead, ahora);
  const enRiesgo = vencida || (avanzado && parado > 7) || parado > 14;

  if (parado > 0) {
    const texto = parado === 1 ? "Sin movimiento desde ayer." : `Sin movimiento desde hace ${parado} días.`;
    // Si es lo que le pone en riesgo, va primero.
    if (enRiesgo && !vencida) motivos.unshift(texto);
    else motivos.push(texto);
  }
  if (vencida) motivos.unshift("La próxima acción está vencida.");

  if (enRiesgo) return { nivel: "riesgo", puntos, motivos };

  const nivel: Nivel = puntos >= 50 ? "caliente" : puntos >= 25 ? "templado" : "frio";
  if (motivos.length === 0) motivos.push("Sin actividad ni señales todavía.");
  return { nivel, puntos, motivos };
}

/* ------------------------------- Agregados ------------------------------ */

export function totales(leads: LeadValorable[]) {
  const valor = leads.reduce((s, l) => s + valorDe(l), 0);
  const ponderado = leads.reduce((s, l) => s + valorPonderado(l), 0);
  const probMedia = leads.length ? leads.reduce((s, l) => s + probabilidadDe(l), 0) / leads.length : 0;
  return { n: leads.length, valor, ponderado, probMedia };
}
