import {
  diasParado,
  probabilidadDe,
  puntuacion,
  ultimoMovimiento,
  valorDe,
  NIVELES,
  type Puntuacion,
} from "@/lib/oportunidad";
import { esAbierto, esEstadoLead, esOrigenLead, type EstadoLead, type OrigenLead } from "@/lib/tipos";
import type { LeadConResumen } from "@/lib/datos/leads";

export const VISTAS = ["tabla", "tablero", "prevision"] as const;
export type Vista = (typeof VISTAS)[number];

export const ORDENES = {
  valor: "Valor",
  probabilidad: "Probabilidad",
  nivel: "Prioridad",
  actividad: "Última actividad",
  recientes: "Más recientes",
} as const;
export type Orden = keyof typeof ORDENES;

export const PERIODOS = { "7": "7 días", "30": "30 días", "90": "90 días", todo: "Siempre" } as const;
export type Periodo = keyof typeof PERIODOS;

export type Filtros = {
  vista: Vista;
  q: string;
  etapa: "todas" | "abiertas" | EstadoLead;
  origen: "todos" | OrigenLead;
  periodo: Periodo;
  orden: Orden;
};

export function leerFiltros(p: URLSearchParams): Filtros {
  const vista = p.get("vista");
  const etapa = p.get("etapa");
  const origen = p.get("origen");
  const periodo = p.get("periodo");
  const orden = p.get("orden");
  return {
    vista: (VISTAS as readonly string[]).includes(vista ?? "") ? (vista as Vista) : "tabla",
    q: (p.get("q") ?? "").slice(0, 80),
    etapa: etapa === "abiertas" || esEstadoLead(etapa) ? etapa : "todas",
    origen: esOrigenLead(origen) ? origen : "todos",
    periodo: periodo && periodo in PERIODOS ? (periodo as Periodo) : "todo",
    orden: orden && orden in ORDENES ? (orden as Orden) : "nivel",
  };
}

export type FilaLead = LeadConResumen & {
  valor: number;
  prob: number;
  punt: Puntuacion | null;
  parado: number;
};

const PESO_NIVEL: Record<string, number> = Object.fromEntries(
  // riesgo primero: es lo que hay que atender
  ["riesgo", ...NIVELES.filter((n) => n !== "riesgo")].map((n, i) => [n, i])
);

export function enriquecer(leads: LeadConResumen[], ahora = Date.now()): FilaLead[] {
  return leads.map((l) => ({
    ...l,
    valor: valorDe(l),
    prob: probabilidadDe(l),
    punt: puntuacion(l, l.resumen, ahora),
    parado: diasParado(l, l.resumen, ahora),
  }));
}

function normal(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Filtros sin la etapa: el tablero la necesita entera para pintar todas las columnas. */
export function aplicar(filas: FilaLead[], f: Filtros, { conEtapa = true } = {}) {
  const q = normal(f.q.trim());
  const limite = f.periodo === "todo" ? null : Number(f.periodo);

  const resultado = filas.filter((l) => {
    if (conEtapa) {
      if (f.etapa === "abiertas" && !esAbierto(l.estado)) return false;
      if (f.etapa !== "todas" && f.etapa !== "abiertas" && l.estado !== f.etapa) return false;
    }
    if (f.origen !== "todos" && l.origen !== f.origen) return false;
    if (limite != null && l.parado > limite) return false;
    if (q) {
      const texto = normal(
        [l.nombre, l.email, l.telefono ?? "", l.tarifa?.nombre ?? "", l.centro?.nombre ?? "", ...l.etiquetas].join(" ")
      );
      if (!texto.includes(q)) return false;
    }
    return true;
  });

  const ordenar: Record<Orden, (a: FilaLead, b: FilaLead) => number> = {
    valor: (a, b) => b.valor - a.valor,
    probabilidad: (a, b) => b.prob - a.prob,
    actividad: (a, b) => ultimoMovimiento(b, b.resumen) - ultimoMovimiento(a, a.resumen),
    recientes: (a, b) => b.created_at.localeCompare(a.created_at),
    nivel: (a, b) => {
      const pa = a.punt ? PESO_NIVEL[a.punt.nivel] : 9;
      const pb = b.punt ? PESO_NIVEL[b.punt.nivel] : 9;
      return pa - pb || (b.punt?.puntos ?? 0) - (a.punt?.puntos ?? 0) || b.valor - a.valor;
    },
  };
  return resultado.sort(ordenar[f.orden]);
}

/** CSV con separador «;» para que Excel en español lo abra bien. */
export function aCsv(filas: FilaLead[]) {
  const cabecera = ["Nombre", "Email", "Teléfono", "Etapa", "Origen", "Centro", "Tarifa", "Valor", "Probabilidad", "Etiquetas", "Próxima acción", "Fecha próxima acción", "Alta"];
  const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lineas = filas.map((l) =>
    [
      l.nombre,
      l.email,
      l.telefono,
      l.estado,
      l.origen,
      l.centro?.nombre,
      l.tarifa?.nombre,
      l.valor.toFixed(2).replace(".", ","),
      l.prob,
      l.etiquetas.join(", "),
      l.proxima_accion,
      l.proxima_accion_fecha?.slice(0, 10),
      l.created_at.slice(0, 10),
    ]
      .map(celda)
      .join(";")
  );
  return "﻿" + [cabecera.map(celda).join(";"), ...lineas].join("\r\n");
}

export function descargar(nombre: string, contenido: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
