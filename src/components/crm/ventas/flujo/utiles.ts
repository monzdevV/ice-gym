import { nombreCompleto } from "@/lib/b2b";
import { dinero, mesLargo, numero, porcentaje } from "@/lib/formato";
import {
  ESTADOS_VENTA,
  ETIQUETA_ESTADO_VENTA,
  hoyISO,
  ingresoEsperado,
  quienVenta,
  type AgrupacionVentas,
  type EtapaVentas,
  type MedidaVentas,
  type OportunidadVentasCompleta,
} from "@/lib/ventas";

/** Agrupar, medir y fechas del flujo. Puro: vale en servidor y en cliente. */

export const SIN_VALOR = "—";

export type Grupo = { clave: string; texto: string; filas: OportunidadVentasCompleta[] };

const mesMadrid = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit" });

/** Clave y texto del grupo al que pertenece una oportunidad. */
export function grupoDe(o: OportunidadVentasCompleta, por: AgrupacionVentas, etapas: EtapaVentas[]): { clave: string; texto: string } {
  const t = (v: string | null | undefined) => ({ clave: v?.trim() || "", texto: v?.trim() || SIN_VALOR });
  switch (por) {
    case "comercial":
      return { clave: o.comercial?.id ?? "", texto: o.comercial ? nombreCompleto(o.comercial) : "Sin asignar" };
    case "equipo":
      return { clave: o.equipo?.id ?? "", texto: o.equipo?.nombre ?? "Sin equipo" };
    case "etapa":
      return { clave: o.etapa_id ?? "", texto: etapas.find((e) => e.id === o.etapa_id)?.nombre ?? "Sin etapa" };
    case "estado":
      return { clave: o.estado, texto: ETIQUETA_ESTADO_VENTA[o.estado] };
    case "cliente":
      return t(quienVenta(o));
    case "ciudad":
      return t(o.ciudad);
    case "pais":
      return t(o.pais);
    case "motivo":
      return { clave: o.motivo?.id ?? "", texto: o.motivo?.nombre ?? SIN_VALOR };
    case "campana":
      return t(o.campana);
    case "medio":
      return t(o.medio);
    case "origen":
      return t(o.origen);
    case "creacion_mes": {
      const m = mesMadrid.format(new Date(o.created_at));
      return { clave: m, texto: mesLargo(`${m}-15T12:00:00Z`) };
    }
    case "cierre_mes": {
      const m = o.cierre_previsto?.slice(0, 7) ?? "";
      return { clave: m, texto: m ? mesLargo(`${m}-15T12:00:00Z`) : "Sin fecha" };
    }
  }
}

/** Orden de los grupos: etapas y estados por su orden, meses por fecha, el resto alfabético; lo vacío al final. */
function ordenGrupos(por: AgrupacionVentas, etapas: EtapaVentas[]) {
  return (a: Grupo, b: Grupo) => {
    if (!a.clave !== !b.clave) return a.clave ? -1 : 1;
    if (por === "etapa") return etapas.findIndex((e) => e.id === a.clave) - etapas.findIndex((e) => e.id === b.clave);
    if (por === "estado") return ESTADOS_VENTA.indexOf(a.clave as never) - ESTADOS_VENTA.indexOf(b.clave as never);
    if (por === "creacion_mes" || por === "cierre_mes") return a.clave.localeCompare(b.clave);
    return a.texto.localeCompare(b.texto, "es");
  };
}

export function agrupar(filas: OportunidadVentasCompleta[], por: AgrupacionVentas, etapas: EtapaVentas[]): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const o of filas) {
    const { clave, texto } = grupoDe(o, por, etapas);
    const g = mapa.get(clave) ?? { clave, texto, filas: [] };
    g.filas.push(o);
    mapa.set(clave, g);
  }
  // En etapas se ven todas, aunque estén vacías: es el esqueleto del flujo.
  if (por === "etapa") for (const e of etapas) if (!mapa.has(e.id)) mapa.set(e.id, { clave: e.id, texto: e.nombre, filas: [] });
  return [...mapa.values()].sort(ordenGrupos(por, etapas));
}

export function medir(filas: OportunidadVentasCompleta[], medida: MedidaVentas) {
  if (medida === "n") return filas.length;
  if (medida === "ingresos") return filas.reduce((s, o) => s + o.ingresos, 0);
  if (medida === "esperado") return filas.reduce((s, o) => s + ingresoEsperado(o), 0);
  return filas.length ? filas.reduce((s, o) => s + o.probabilidad, 0) / filas.length : 0;
}

export function formatoMedida(v: number, medida: MedidaVentas) {
  if (medida === "n") return numero(v);
  if (medida === "probabilidad") return porcentaje(v);
  return dinero(v);
}

/* --------------------------------- Fechas --------------------------------- */

export const PERIODOS = {
  este_mes: "Este mes",
  mes_pasado: "Mes pasado",
  este_trimestre: "Este trimestre",
  este_ano: "Este año",
} as const;
export type Periodo = keyof typeof PERIODOS;

const ultimoDia = (a: number, m: number) => new Date(Date.UTC(a, m + 1, 0)).toISOString().slice(0, 10);
const primerDia = (a: number, m: number) => new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10);

/** Desde y hasta (YYYY-MM-DD, en Madrid) de un periodo predefinido. */
export function rangoPeriodo(p: Periodo, hoy = hoyISO()) {
  const a = Number(hoy.slice(0, 4));
  const m = Number(hoy.slice(5, 7)) - 1;
  if (p === "este_mes") return { desde: primerDia(a, m), hasta: ultimoDia(a, m) };
  if (p === "mes_pasado") return { desde: primerDia(a, m - 1), hasta: ultimoDia(a, m - 1) };
  if (p === "este_trimestre") {
    const t = Math.floor(m / 3) * 3;
    return { desde: primerDia(a, t), hasta: ultimoDia(a, t + 2) };
  }
  return { desde: primerDia(a, 0), hasta: ultimoDia(a, 11) };
}

/** El periodo que coincide con un rango, si lo hay (para marcarlo y para el chip). */
export function periodoDe(desde: string, hasta: string): Periodo | null {
  if (!desde || !hasta) return null;
  for (const p of Object.keys(PERIODOS) as Periodo[]) {
    const r = rangoPeriodo(p);
    if (r.desde === desde && r.hasta === hasta) return p;
  }
  return null;
}

/* ---------------------------------- Kanban --------------------------------- */

/** Posición = punto medio entre las vecinas; en los extremos, una unidad más allá. */
export function posicionEntre(lista: { posicion: number }[], i: number) {
  const antes = lista[i - 1]?.posicion;
  const despues = lista[i + 1]?.posicion;
  if (antes == null && despues == null) return 0;
  if (antes == null) return despues! - 1;
  if (despues == null) return antes + 1;
  return (antes + despues) / 2;
}

/* ----------------------------------- CSV ----------------------------------- */

/** Lee un CSV con `;` o `,` (el que más aparezca en la cabecera) y campos entre comillas. */
export function leerCsv(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "");
  const cabecera = limpio.slice(0, limpio.indexOf("\n") >>> 0);
  const sep = (cabecera.match(/;/g)?.length ?? 0) > (cabecera.match(/,/g)?.length ?? 0) ? ";" : ",";
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let comillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (comillas) {
      if (c === '"' && limpio[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(campo);
      if (fila.some((v) => v.trim())) filas.push(fila);
      fila = [];
      campo = "";
    } else campo += c;
  }
  fila.push(campo);
  if (fila.some((v) => v.trim())) filas.push(fila);
  return filas;
}

const celdaCsv = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Descarga una tabla como CSV con `;` (lo que abre bien Excel en español). */
export function descargarCsv(nombre: string, filas: string[][]) {
  const contenido = "﻿" + filas.map((f) => f.map(celdaCsv).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
