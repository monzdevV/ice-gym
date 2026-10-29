"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COLORES_EQUIPO, incluye } from "@/lib/b2b";
import { usuarioActual } from "@/lib/datos/interacciones";
import {
  ICONOS_ACTIVIDAD,
  esFechaValida,
  hoyISO,
  leerImporte,
  normalizarTexto,
  sumarDias,
  type EtapaVentas,
  type EstadoVenta,
  type OportunidadVentas,
} from "@/lib/ventas";
import type { Resultado } from "./b2b";

/**
 * Acciones del segmento Ventas. Todas devuelven { ok, mensaje } y, al crear,
 * el id nuevo. Lo que cambia el estado de una oportunidad (etapa, ganada,
 * perdida, restaurada) queda anotado en su historial.
 */

/* -------------------------------- Utilidades ------------------------------- */

const texto = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const nulo = (v: unknown, max = 500) => texto(v, max) || null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idONulo = (v: unknown) => (typeof v === "string" && UUID.test(v) ? v : null);
const fechaONula = (v: unknown) => (esFechaValida(v) ? v : null);
const numero = (v: unknown) => leerImporte(typeof v === "string" ? v.slice(0, 40) : v);
const entre = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const color = (v: unknown) => (incluye(COLORES_EQUIPO, v) ? v : "gris");
const ahora = () => new Date().toISOString();

function refrescar(...extra: (string | null | undefined)[]) {
  for (const r of ["/crm/ventas", "/crm/ventas/actividades", "/crm/ventas/equipos", "/crm/ventas/clientes", ...extra]) if (r) revalidatePath(r);
  // Cualquier ficha de cliente o de empresa puede mostrar la oportunidad que acaba de cambiar.
  revalidatePath("/crm/ventas/clientes/[id]", "page");
  revalidatePath("/crm/empresas/[id]", "page");
}

async function autor() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims.email as string | undefined) ?? null;
}

async function anotar(oportunidadId: string, cuerpo: string, tipo: "sistema" | "nota" | "actividad" = "sistema") {
  const supabase = await createClient();
  await supabase.from("ventas_mensajes").insert({ oportunidad_id: oportunidadId, tipo, cuerpo, autor: await autor() });
}

async function etapa(id: string | null): Promise<EtapaVentas | null> {
  if (!id) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("ventas_etapas").select("*").eq("id", id).maybeSingle<EtapaVentas>();
  return data ? { ...data, probabilidad: Number(data.probabilidad) } : null;
}

async function primeraEtapa(): Promise<EtapaVentas | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ventas_etapas")
    .select("*")
    .eq("ganada", false)
    .order("orden")
    .limit(1)
    .maybeSingle<EtapaVentas>();
  return data ? { ...data, probabilidad: Number(data.probabilidad) } : null;
}

async function etapaGanada(): Promise<EtapaVentas | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("ventas_etapas").select("*").eq("ganada", true).order("orden").limit(1).maybeSingle<EtapaVentas>();
  return data ? { ...data, probabilidad: Number(data.probabilidad) } : null;
}

/** Primera posición libre arriba de una columna del Kanban. */
async function posicionArriba(etapaId: string | null) {
  const supabase = await createClient();
  let consulta = supabase.from("ventas_oportunidades").select("posicion");
  consulta = etapaId ? consulta.eq("etapa_id", etapaId) : consulta.is("etapa_id", null);
  const { data } = await consulta.order("posicion", { ascending: true }).limit(1).maybeSingle();
  return data ? Number(data.posicion) - 1 : 0;
}

/**
 * Deja en una tabla puente exactamente `ids` para `padre`: primero añade lo
 * que falta y después quita lo que sobra, así un fallo nunca vacía la lista.
 */
async function sincronizar(tabla: string, campoPadre: string, padre: string, campoHijo: string, ids: string[]) {
  const supabase = await createClient();
  if (ids.length) {
    const { error } = await supabase
      .from(tabla)
      .upsert(ids.map((hijo) => ({ [campoPadre]: padre, [campoHijo]: hijo })), { onConflict: `${campoPadre},${campoHijo}`, ignoreDuplicates: true });
    if (error) return error.message;
  }
  let sobra = supabase.from(tabla).delete().eq(campoPadre, padre);
  if (ids.length) sobra = sobra.not(campoHijo, "in", `(${ids.join(",")})`);
  const { error } = await sobra;
  return error?.message ?? null;
}

/** Orden para un elemento nuevo de un catálogo: detrás del último. */
async function siguienteOrden(tabla: string) {
  const supabase = await createClient();
  const { data } = await supabase.from(tabla).select("orden").order("orden", { ascending: false }).limit(1).maybeSingle();
  return Number(data?.orden ?? 0) + 10;
}

/** Equipo de ventas de un comercial: el primero al que pertenece. */
async function equipoDe(comercialId: string | null) {
  if (!comercialId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("ventas_equipo_miembros").select("equipo_id").eq("miembro_id", comercialId).limit(1).maybeSingle();
  return (data?.equipo_id as string | undefined) ?? null;
}

/* ------------------------------ Oportunidades ------------------------------ */

export type DatosOportunidad = {
  nombre?: string;
  cliente_id?: string | null;
  /** Empresa del CRM (`empresas`). */
  empresa_id?: string | null;
  contacto_nombre?: string | null;
  empresa_nombre?: string | null;
  email?: string | null;
  telefono?: string | null;
  ciudad?: string | null;
  pais?: string | null;
  ingresos?: number | string | null;
  probabilidad?: number | string | null;
  etapa_id?: string | null;
  comercial_id?: string | null;
  equipo_id?: string | null;
  cierre_previsto?: string | null;
  prioridad?: number;
  notas?: string | null;
  campana?: string | null;
  medio?: string | null;
  origen?: string | null;
  referido?: string | null;
  etiquetas?: string[];
};

/**
 * Alta, desde «Nuevo» o desde el «+» de una columna. Si no se dice etapa, va
 * a la primera. Si llega cliente, rellena email, teléfono y ciudad que falten,
 * y sin empresa elegida, la oportunidad es de la empresa del cliente.
 */
export async function crearOportunidadVentas(d: DatosOportunidad): Promise<Resultado> {
  const nombre = texto(d.nombre, 200) || [texto(d.empresa_nombre), texto(d.contacto_nombre)].filter(Boolean).join(" · ");
  const clienteId = idONulo(d.cliente_id);
  const supabase = await createClient();

  let cliente: { nombre: string; empresa_id: string | null; email: string | null; telefono: string | null; ciudad: string | null; pais: string } | null =
    null;
  if (clienteId) {
    const { data } = await supabase.from("ventas_clientes").select("nombre, empresa_id, email, telefono, ciudad, pais").eq("id", clienteId).maybeSingle();
    cliente = data;
  }
  const empresaId = idONulo(d.empresa_id) ?? cliente?.empresa_id ?? null;
  let empresa: { nombre: string } | null = null;
  if (empresaId && !nombre && !cliente) {
    const { data } = await supabase.from("empresas").select("nombre").eq("id", empresaId).maybeSingle();
    empresa = data;
  }
  const titulo = nombre || (cliente ? `Oportunidad de ${cliente.nombre}` : empresa ? `Oportunidad de ${empresa.nombre}` : "");
  if (titulo.length < 2) return { ok: false, mensaje: "Pon un nombre a la oportunidad o elige un cliente o una empresa." };

  const e = (await etapa(idONulo(d.etapa_id))) ?? (await primeraEtapa());
  // Sin decir comercial, la oportunidad es de quien la crea.
  const comercial = d.comercial_id === undefined ? ((await usuarioActual()).miembro?.id ?? null) : idONulo(d.comercial_id);
  const probabilidad = numero(d.probabilidad);
  const ganada = !!e?.ganada;

  const { data, error } = await supabase
    .from("ventas_oportunidades")
    .insert({
      nombre: titulo,
      cliente_id: clienteId,
      empresa_id: empresaId,
      contacto_nombre: nulo(d.contacto_nombre, 200),
      empresa_nombre: empresaId ? null : nulo(d.empresa_nombre, 200),
      email: nulo(d.email, 200) ?? cliente?.email ?? null,
      telefono: nulo(d.telefono, 60) ?? cliente?.telefono ?? null,
      ciudad: nulo(d.ciudad, 120) ?? cliente?.ciudad ?? null,
      pais: nulo(d.pais, 120) ?? cliente?.pais ?? null,
      ingresos: Math.max(0, numero(d.ingresos) ?? 0),
      probabilidad: probabilidad == null ? (e?.probabilidad ?? 10) : entre(probabilidad, 0, 100),
      probabilidad_manual: probabilidad != null,
      etapa_id: e?.id ?? null,
      posicion: await posicionArriba(e?.id ?? null),
      comercial_id: comercial,
      equipo_id: idONulo(d.equipo_id) ?? (await equipoDe(comercial)),
      cierre_previsto: fechaONula(d.cierre_previsto),
      prioridad: entre(Math.round(numero(d.prioridad) ?? 0), 0, 3),
      notas: nulo(d.notas, 10_000),
      campana: nulo(d.campana, 120),
      medio: nulo(d.medio, 120),
      origen: nulo(d.origen, 120),
      referido: nulo(d.referido, 200),
      estado: ganada ? "ganada" : "abierta",
      cerrada_at: ganada ? ahora() : null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, mensaje: `No se pudo crear la oportunidad: ${error.message}` };

  const etiquetas = (d.etiquetas ?? []).map(idONulo).filter(Boolean) as string[];
  if (etiquetas.length) {
    await supabase.from("ventas_oportunidad_etiquetas").insert(etiquetas.map((etiqueta_id) => ({ oportunidad_id: data.id, etiqueta_id })));
  }
  await anotar(data.id, "Oportunidad creada");

  refrescar(clienteId && `/crm/ventas/clientes/${clienteId}`, empresaId && `/crm/empresas/${empresaId}`);
  return { ok: true, mensaje: `${titulo} creada.`, id: data.id };
}

/**
 * Edición desde la ficha, campo a campo (se guarda al salir de cada campo,
 * como en el flujo de ventas). Sólo toca lo que llega.
 */
export async function actualizarOportunidadVentas(id: string, d: DatosOportunidad): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, mensaje: "Falta la oportunidad." };
  const supabase = await createClient();
  const cambios: Record<string, unknown> = { updated_at: ahora() };

  if (d.nombre !== undefined) {
    const n = texto(d.nombre, 200);
    if (n.length < 2) return { ok: false, mensaje: "Pon un nombre a la oportunidad." };
    cambios.nombre = n;
  }
  for (const [campo, max] of [
    ["contacto_nombre", 200],
    ["empresa_nombre", 200],
    ["email", 200],
    ["telefono", 60],
    ["ciudad", 120],
    ["pais", 120],
    ["campana", 120],
    ["medio", 120],
    ["origen", 120],
    ["referido", 200],
    ["notas", 10_000],
  ] as const) {
    if (d[campo] !== undefined) cambios[campo] = nulo(d[campo], max);
  }
  if (d.cliente_id !== undefined) {
    cambios.cliente_id = idONulo(d.cliente_id);
    // Un cliente nuevo en una oportunidad sin empresa le trae la suya.
    if (cambios.cliente_id && d.empresa_id === undefined) {
      const [{ data: actual }, { data: cliente }] = await Promise.all([
        supabase.from("ventas_oportunidades").select("empresa_id").eq("id", id).maybeSingle(),
        supabase.from("ventas_clientes").select("empresa_id").eq("id", cambios.cliente_id as string).maybeSingle(),
      ]);
      if (!actual?.empresa_id && cliente?.empresa_id) {
        cambios.empresa_id = cliente.empresa_id;
        cambios.empresa_nombre = null;
      }
    }
  }
  if (d.empresa_id !== undefined) {
    cambios.empresa_id = idONulo(d.empresa_id);
    // Elegida una empresa del CRM, el nombre escrito a mano sobra.
    if (cambios.empresa_id) cambios.empresa_nombre = null;
  }
  if (d.equipo_id !== undefined) cambios.equipo_id = idONulo(d.equipo_id);
  if (d.comercial_id !== undefined) {
    cambios.comercial_id = idONulo(d.comercial_id);
    if (d.equipo_id === undefined && cambios.comercial_id) {
      const equipo = await equipoDe(cambios.comercial_id as string);
      if (equipo) cambios.equipo_id = equipo;
    }
  }
  if (d.cierre_previsto !== undefined) cambios.cierre_previsto = fechaONula(d.cierre_previsto);
  if (d.ingresos !== undefined) cambios.ingresos = Math.max(0, numero(d.ingresos) ?? 0);
  if (d.prioridad !== undefined) cambios.prioridad = entre(Math.round(numero(d.prioridad) ?? 0), 0, 3);
  if (d.probabilidad !== undefined) {
    const p = numero(d.probabilidad);
    if (p == null) {
      // Vacía: vuelve a la de la etapa.
      const { data } = await supabase.from("ventas_oportunidades").select("etapa_id").eq("id", id).maybeSingle();
      cambios.probabilidad = (await etapa(data?.etapa_id ?? null))?.probabilidad ?? 10;
      cambios.probabilidad_manual = false;
    } else {
      cambios.probabilidad = entre(p, 0, 100);
      cambios.probabilidad_manual = true;
    }
  }

  const { error } = await supabase.from("ventas_oportunidades").update(cambios).eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  if (d.etiquetas !== undefined) {
    const r = await ponerEtiquetas(id, d.etiquetas);
    if (!r.ok) return r;
  }
  if (d.etapa_id !== undefined && d.etapa_id) {
    const r = await moverOportunidadVentas(id, d.etapa_id);
    if (!r.ok) return r;
  }

  refrescar(`/crm/ventas/${id}`);
  return { ok: true, mensaje: "Guardado." };
}

/**
 * Mueve a otra etapa (arrastrar en el Kanban o la barra de etapas de la ficha).
 * Pasar a la etapa ganada la gana; salir de ella la reabre. Mover una perdida
 * la restaura en la etapa de destino. La probabilidad sigue a la etapa salvo
 * que se haya puesto a mano.
 */
export async function moverOportunidadVentas(id: string, etapaId: string, posicion?: number): Promise<Resultado> {
  if (!UUID.test(id) || !UUID.test(etapaId)) return { ok: false, mensaje: "Falta la oportunidad o la etapa." };
  // Llega del navegador: un NaN o un Infinity dejaría la columna desordenada para siempre.
  if (posicion !== undefined && !Number.isFinite(posicion)) posicion = undefined;
  const supabase = await createClient();
  const { data: antes } = await supabase
    .from("ventas_oportunidades")
    .select("etapa_id, estado, probabilidad_manual")
    .eq("id", id)
    .maybeSingle<Pick<OportunidadVentas, "etapa_id" | "estado" | "probabilidad_manual">>();
  if (!antes) return { ok: false, mensaje: "Esa oportunidad ya no existe." };
  const destino = await etapa(etapaId);
  if (!destino) return { ok: false, mensaje: "Esa etapa ya no existe." };

  const cambia = antes.etapa_id !== destino.id;
  const cambios: Record<string, unknown> = {
    posicion: posicion ?? (cambia ? await posicionArriba(destino.id) : undefined),
    updated_at: ahora(),
  };
  const restaurada = cambia && antes.estado === "perdida";
  if (cambia) {
    cambios.etapa_id = destino.id;
    cambios.etapa_desde = ahora();
    if (!antes.probabilidad_manual || destino.ganada || restaurada) cambios.probabilidad = destino.probabilidad;
    if (restaurada) {
      cambios.probabilidad_manual = false;
      cambios.motivo_perdida_id = null;
      cambios.nota_cierre = null;
    }
    if (destino.ganada) {
      cambios.estado = "ganada";
      cambios.cerrada_at = ahora();
    } else if (antes.estado !== "abierta") {
      cambios.estado = "abierta";
      cambios.cerrada_at = null;
    }
  }
  const { error } = await supabase.from("ventas_oportunidades").update(cambios).eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo mover: ${error.message}` };

  if (cambia) {
    const origen = await etapa(antes.etapa_id);
    await anotar(id, `${restaurada ? "Restaurada. " : ""}Etapa: ${origen?.nombre ?? "—"} → ${destino.nombre}`);
  }
  refrescar(`/crm/ventas/${id}`);
  return { ok: true, mensaje: cambia ? `Movida a ${destino.nombre}.` : "Orden guardado." };
}

/** «Ganado»: pasa a la etapa ganada (si hay) con probabilidad 100. */
export async function marcarGanadaVentas(id: string): Promise<Resultado> {
  const ganada = await etapaGanada();
  if (ganada) {
    const r = await moverOportunidadVentas(id, ganada.id);
    if (!r.ok) return r;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("ventas_oportunidades")
    .update({ estado: "ganada", probabilidad: 100, cerrada_at: ahora(), motivo_perdida_id: null, nota_cierre: null, updated_at: ahora() })
    .eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo marcar como ganada: ${error.message}` };
  await anotar(id, "Oportunidad ganada");
  refrescar(`/crm/ventas/${id}`);
  return { ok: true, mensaje: "¡Oportunidad ganada!" };
}

/** «Perdido»: con razón de pérdida y nota de cierre. Se queda en su etapa. */
export async function marcarPerdidaVentas(id: string, motivoId: string | null, nota: string): Promise<Resultado> {
  const supabase = await createClient();
  const motivo = idONulo(motivoId);
  let nombreMotivo: string | null = null;
  if (motivo) {
    const { data } = await supabase.from("ventas_motivos_perdida").select("nombre").eq("id", motivo).maybeSingle();
    nombreMotivo = data?.nombre ?? null;
  }
  const notaCierre = nulo(nota, 2000);
  const { error } = await supabase
    .from("ventas_oportunidades")
    .update({ estado: "perdida", probabilidad: 0, motivo_perdida_id: motivo, nota_cierre: notaCierre, cerrada_at: ahora(), updated_at: ahora() })
    .eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo marcar como perdida: ${error.message}` };
  // Una perdida ya no tiene nada que hacer: sus actividades pendientes se cancelan.
  await supabase.from("ventas_actividades").update({ estado: "cancelada" }).eq("oportunidad_id", id).eq("estado", "pendiente");
  await anotar(id, ["Oportunidad perdida", nombreMotivo && `Razón: ${nombreMotivo}`, notaCierre].filter(Boolean).join("\n"));
  refrescar(`/crm/ventas/${id}`);
  return { ok: true, mensaje: "Marcada como perdida." };
}

/** Reabre una ganada o perdida: vuelve a «en curso» con la probabilidad de su etapa. */
export async function restaurarOportunidadVentas(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data: antes } = await supabase.from("ventas_oportunidades").select("etapa_id, estado").eq("id", id).maybeSingle();
  if (!antes) return { ok: false, mensaje: "Esa oportunidad ya no existe." };
  let e = await etapa(antes.etapa_id);
  if (!e || e.ganada) e = await primeraEtapa();
  const cambiaEtapa = (e?.id ?? null) !== antes.etapa_id;
  const { error } = await supabase
    .from("ventas_oportunidades")
    .update({
      estado: "abierta" satisfies EstadoVenta,
      etapa_id: e?.id ?? null,
      // Sale de «Ganado» a la primera etapa: el tiempo en la etapa empieza de nuevo.
      ...(cambiaEtapa ? { etapa_desde: ahora(), posicion: await posicionArriba(e?.id ?? null) } : {}),
      probabilidad: e?.probabilidad ?? 10,
      probabilidad_manual: false,
      motivo_perdida_id: null,
      nota_cierre: null,
      cerrada_at: null,
      activa: true,
      updated_at: ahora(),
    })
    .eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo restaurar: ${error.message}` };
  await anotar(id, "Oportunidad restaurada");
  refrescar(`/crm/ventas/${id}`);
  return { ok: true, mensaje: "Restaurada." };
}

export async function archivarOportunidadVentas(id: string, archivar = true): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_oportunidades").update({ activa: !archivar, updated_at: ahora() }).eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo ${archivar ? "archivar" : "desarchivar"}: ${error.message}` };
  await anotar(id, archivar ? "Archivada" : "Desarchivada");
  refrescar(`/crm/ventas/${id}`);
  return { ok: true, mensaje: archivar ? "Archivada." : "Desarchivada." };
}

/**
 * Copia con «(copia)», en curso y sin historial ni actividades. La copia de
 * una cerrada (o de una en la etapa ganada) empieza en la primera etapa.
 */
export async function duplicarOportunidadVentas(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data: o } = await supabase.from("ventas_oportunidades").select("*").eq("id", id).maybeSingle<OportunidadVentas>();
  if (!o) return { ok: false, mensaje: "Esa oportunidad ya no existe." };
  const copia: Partial<OportunidadVentas> = { ...o };
  delete copia.id;
  delete copia.created_at;
  delete copia.updated_at;
  const origen = await etapa(o.etapa_id);
  if (o.estado !== "abierta" || !origen || origen.ganada) {
    const inicio = await primeraEtapa();
    copia.etapa_id = inicio?.id ?? null;
    copia.probabilidad = inicio?.probabilidad ?? 10;
    copia.probabilidad_manual = false;
  }
  const { data, error } = await supabase
    .from("ventas_oportunidades")
    .insert({
      ...copia,
      nombre: `${o.nombre} (copia)`,
      estado: "abierta",
      cerrada_at: null,
      motivo_perdida_id: null,
      nota_cierre: null,
      activa: true,
      etapa_desde: ahora(),
      posicion: await posicionArriba(copia.etapa_id ?? null),
    })
    .select("id")
    .single();
  if (error) return { ok: false, mensaje: `No se pudo duplicar: ${error.message}` };
  const { data: etiquetas } = await supabase.from("ventas_oportunidad_etiquetas").select("etiqueta_id").eq("oportunidad_id", id);
  if (etiquetas?.length) {
    await supabase.from("ventas_oportunidad_etiquetas").insert(etiquetas.map((e) => ({ oportunidad_id: data.id, etiqueta_id: e.etiqueta_id })));
  }
  await anotar(data.id, `Duplicada de «${o.nombre}»`);
  refrescar();
  return { ok: true, mensaje: "Duplicada.", id: data.id };
}

export async function borrarOportunidadVentas(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_oportunidades").delete().eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo borrar: ${error.message}` };
  refrescar();
  return { ok: true, mensaje: "Oportunidad borrada." };
}

/** Acción en lote desde la lista: varias oportunidades a la vez. */
export async function accionLoteVentas(
  ids: string[],
  accion: { tipo: "comercial"; valor: string | null } | { tipo: "etapa"; valor: string } | { tipo: "archivar" } | { tipo: "borrar" } | { tipo: "perdida"; motivo: string | null; nota: string }
): Promise<Resultado> {
  const validos = (Array.isArray(ids) ? ids : []).filter((id) => typeof id === "string" && UUID.test(id));
  if (!validos.length) return { ok: false, mensaje: "No hay nada seleccionado." };
  const supabase = await createClient();
  if (accion.tipo === "comercial") {
    // Como en la ficha: el equipo sigue al comercial cuando éste tiene uno.
    const comercial = idONulo(accion.valor);
    const equipo = await equipoDe(comercial);
    const { error } = await supabase
      .from("ventas_oportunidades")
      .update({ comercial_id: comercial, ...(equipo ? { equipo_id: equipo } : {}), updated_at: ahora() })
      .in("id", validos);
    if (error) return { ok: false, mensaje: error.message };
  } else if (accion.tipo === "archivar") {
    const { error } = await supabase.from("ventas_oportunidades").update({ activa: false, updated_at: ahora() }).in("id", validos);
    if (error) return { ok: false, mensaje: error.message };
  } else if (accion.tipo === "borrar") {
    const { error } = await supabase.from("ventas_oportunidades").delete().in("id", validos);
    if (error) return { ok: false, mensaje: error.message };
  } else {
    for (const id of validos) {
      const r = accion.tipo === "etapa" ? await moverOportunidadVentas(id, accion.valor) : await marcarPerdidaVentas(id, accion.motivo, accion.nota);
      if (!r.ok) return r;
    }
  }
  refrescar();
  return { ok: true, mensaje: `${validos.length} ${validos.length === 1 ? "oportunidad actualizada" : "oportunidades actualizadas"}.` };
}

/* -------------------------------- Etiquetas -------------------------------- */

export async function ponerEtiquetas(id: string, etiquetas: string[]): Promise<Resultado> {
  if (!UUID.test(id) || !Array.isArray(etiquetas)) return { ok: false, mensaje: "Falta la oportunidad." };
  const ids = [...new Set(etiquetas.map(idONulo).filter(Boolean) as string[])];
  const error = await sincronizar("ventas_oportunidad_etiquetas", "oportunidad_id", id, "etiqueta_id", ids);
  if (error) return { ok: false, mensaje: `No se pudieron guardar las etiquetas: ${error}` };
  refrescar(`/crm/ventas/${id}`);
  return { ok: true, mensaje: "Etiquetas guardadas." };
}

export async function guardarEtiquetaVentas(d: { id?: string; nombre: string; color?: string }): Promise<Resultado> {
  const nombre = texto(d.nombre, 60);
  if (!nombre) return { ok: false, mensaje: "Pon un nombre a la etiqueta." };
  const supabase = await createClient();
  const fila = { nombre, color: color(d.color) };
  const { data, error } = d.id
    ? await supabase.from("ventas_etiquetas").update(fila).eq("id", d.id).select("id").single()
    : await supabase.from("ventas_etiquetas").insert(fila).select("id").single();
  if (error) return { ok: false, mensaje: error.code === "23505" ? "Ya hay una etiqueta con ese nombre." : error.message };
  refrescar("/crm/ventas/configuracion");
  return { ok: true, mensaje: "Etiqueta guardada.", id: data.id };
}

export async function borrarEtiquetaVentas(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_etiquetas").delete().eq("id", id);
  if (error) return { ok: false, mensaje: error.message };
  refrescar("/crm/ventas/configuracion");
  return { ok: true, mensaje: "Etiqueta borrada." };
}

/* ------------------------- Historial y actividades ------------------------- */

/** «Registrar una nota» en una oportunidad o en un cliente. */
export async function registrarNotaVentas(donde: { oportunidad?: string; cliente?: string }, cuerpo: string): Promise<Resultado> {
  const t = texto(cuerpo, 10_000);
  if (!t) return { ok: false, mensaje: "Escribe la nota." };
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_mensajes").insert({
    oportunidad_id: idONulo(donde.oportunidad),
    cliente_id: idONulo(donde.cliente),
    tipo: "nota",
    cuerpo: t,
    autor: await autor(),
  });
  if (error) return { ok: false, mensaje: `No se pudo guardar la nota: ${error.message}` };
  refrescar(donde.oportunidad && `/crm/ventas/${donde.oportunidad}`, donde.cliente && `/crm/ventas/clientes/${donde.cliente}`);
  return { ok: true, mensaje: "Nota registrada." };
}

export async function borrarNotaVentas(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_mensajes").delete().eq("id", id).eq("tipo", "nota");
  if (error) return { ok: false, mensaje: error.message };
  refrescar();
  return { ok: true, mensaje: "Nota borrada." };
}

export type DatosActividad = {
  id?: string;
  oportunidad_id?: string | null;
  cliente_id?: string | null;
  tipo_id?: string | null;
  resumen?: string | null;
  nota?: string | null;
  vence?: string | null;
  asignado_id?: string | null;
};

/** Planifica (o edita) una actividad. Sin fecha, vence según los días por defecto de su tipo. */
export async function guardarActividadVentas(d: DatosActividad): Promise<Resultado> {
  const supabase = await createClient();
  const tipoId = idONulo(d.tipo_id);
  let vence = fechaONula(d.vence);
  if (!vence) {
    const { data } = tipoId ? await supabase.from("ventas_tipos_actividad").select("dias").eq("id", tipoId).maybeSingle() : { data: null };
    vence = sumarDias(hoyISO(), Number(data?.dias ?? 0));
  }
  const fila = {
    tipo_id: tipoId,
    resumen: nulo(d.resumen, 200),
    nota: nulo(d.nota, 5000),
    vence,
    asignado_id: idONulo(d.asignado_id),
  };

  if (d.id) {
    const { error } = await supabase.from("ventas_actividades").update(fila).eq("id", d.id);
    if (error) return { ok: false, mensaje: `No se pudo guardar la actividad: ${error.message}` };
    refrescar(d.oportunidad_id && `/crm/ventas/${d.oportunidad_id}`, d.cliente_id && `/crm/ventas/clientes/${d.cliente_id}`);
    return { ok: true, mensaje: "Actividad guardada.", id: d.id };
  }

  const oportunidadId = idONulo(d.oportunidad_id);
  const clienteId = idONulo(d.cliente_id);
  if (!oportunidadId && !clienteId) return { ok: false, mensaje: "Falta dónde planificar la actividad." };
  // Sin asignar: se la queda el comercial de la oportunidad.
  if (!fila.asignado_id && oportunidadId) {
    const { data } = await supabase.from("ventas_oportunidades").select("comercial_id").eq("id", oportunidadId).maybeSingle();
    fila.asignado_id = data?.comercial_id ?? null;
  }
  const { data, error } = await supabase
    .from("ventas_actividades")
    .insert({ ...fila, oportunidad_id: oportunidadId, cliente_id: clienteId })
    .select("id")
    .single();
  if (error) return { ok: false, mensaje: `No se pudo planificar: ${error.message}` };
  refrescar(oportunidadId && `/crm/ventas/${oportunidadId}`, clienteId && `/crm/ventas/clientes/${clienteId}`);
  return { ok: true, mensaje: "Actividad planificada.", id: data.id };
}

/** «Marcar como hecho», con comentario opcional. Queda en el historial. */
export async function marcarActividadHecha(id: string, comentario = ""): Promise<Resultado> {
  const supabase = await createClient();
  const { data: a } = await supabase
    .from("ventas_actividades")
    .select("oportunidad_id, cliente_id, resumen, estado, tipo:ventas_tipos_actividad(nombre)")
    .eq("id", id)
    .maybeSingle<{ oportunidad_id: string | null; cliente_id: string | null; resumen: string | null; estado: string; tipo: { nombre: string } | null }>();
  if (!a) return { ok: false, mensaje: "Esa actividad ya no existe." };
  if (a.estado !== "pendiente") return { ok: false, mensaje: "Esa actividad ya estaba hecha o cancelada." };
  const c = nulo(comentario, 5000);
  // Sólo si sigue pendiente: dos clics seguidos no la marcan (ni la anotan) dos veces.
  const { data: marcada, error } = await supabase
    .from("ventas_actividades")
    .update({ estado: "hecha", hecha_at: ahora(), comentario: c })
    .eq("id", id)
    .eq("estado", "pendiente")
    .select("id");
  if (error) return { ok: false, mensaje: `No se pudo marcar como hecha: ${error.message}` };
  if (!marcada?.length) return { ok: false, mensaje: "Esa actividad ya estaba hecha o cancelada." };
  await supabase.from("ventas_mensajes").insert({
    oportunidad_id: a.oportunidad_id,
    cliente_id: a.cliente_id,
    tipo: "actividad",
    cuerpo: [`${a.tipo?.nombre ?? "Actividad"} hecha${a.resumen ? `: ${a.resumen}` : ""}`, c].filter(Boolean).join("\n"),
    autor: await autor(),
  });
  refrescar(a.oportunidad_id && `/crm/ventas/${a.oportunidad_id}`, a.cliente_id && `/crm/ventas/clientes/${a.cliente_id}`);
  return { ok: true, mensaje: "Actividad hecha." };
}

/** «Hecho y planificar la siguiente»: marca esta y deja planificada otra igual a partir de hoy. */
export async function hechaYSiguiente(id: string, comentario = ""): Promise<Resultado> {
  const supabase = await createClient();
  const { data: a } = await supabase.from("ventas_actividades").select("*").eq("id", id).maybeSingle();
  if (!a) return { ok: false, mensaje: "Esa actividad ya no existe." };
  const r = await marcarActividadHecha(id, comentario);
  if (!r.ok) return r;
  return guardarActividadVentas({ oportunidad_id: a.oportunidad_id, cliente_id: a.cliente_id, tipo_id: a.tipo_id, asignado_id: a.asignado_id });
}

/** «Cancelar»: la actividad desaparece. */
export async function cancelarActividadVentas(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_actividades").delete().eq("id", id);
  if (error) return { ok: false, mensaje: `No se pudo cancelar: ${error.message}` };
  refrescar();
  return { ok: true, mensaje: "Actividad cancelada." };
}

/** Planifica todas las actividades de un plan de una vez. */
export async function aplicarPlanVentas(planId: string, donde: { oportunidad?: string; cliente?: string }, desde?: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data: pasos } = await supabase.from("ventas_plan_pasos").select("*").eq("plan_id", planId).order("orden");
  if (!pasos?.length) return { ok: false, mensaje: "Ese plan no tiene actividades." };
  const base = fechaONula(desde) ?? hoyISO();
  for (const p of pasos) {
    const r = await guardarActividadVentas({
      oportunidad_id: donde.oportunidad,
      cliente_id: donde.cliente,
      tipo_id: p.tipo_id,
      resumen: p.resumen,
      vence: sumarDias(base, Number(p.dias ?? 0)),
      asignado_id: p.asignado_id,
    });
    if (!r.ok) return r;
  }
  return { ok: true, mensaje: `${pasos.length} ${pasos.length === 1 ? "actividad planificada" : "actividades planificadas"}.` };
}

/* --------------------------------- Equipos --------------------------------- */

export type DatosEquipo = {
  id?: string;
  nombre: string;
  email?: string | null;
  color?: string;
  lider_id?: string | null;
  objetivo?: number | string | null;
  miembros?: string[];
};

export async function guardarEquipoVentas(d: DatosEquipo): Promise<Resultado> {
  const nombre = texto(d.nombre, 120);
  if (nombre.length < 2) return { ok: false, mensaje: "Pon un nombre al equipo." };
  const supabase = await createClient();
  const fila = {
    nombre,
    email: nulo(d.email, 200),
    color: color(d.color),
    lider_id: idONulo(d.lider_id),
    objetivo: numero(d.objetivo),
  };
  const { data, error } = d.id
    ? await supabase.from("ventas_equipos").update(fila).eq("id", d.id).select("id").single()
    : await supabase.from("ventas_equipos").insert(fila).select("id").single();
  if (error) return { ok: false, mensaje: `No se pudo guardar el equipo: ${error.message}` };

  if (Array.isArray(d.miembros)) {
    const miembros = [...new Set(d.miembros.map(idONulo).filter(Boolean) as string[])];
    const fallo = await sincronizar("ventas_equipo_miembros", "equipo_id", data.id, "miembro_id", miembros);
    if (fallo) return { ok: false, mensaje: `El equipo se guardó, pero no sus miembros: ${fallo}`, id: data.id };
  }
  refrescar("/crm/ventas/configuracion");
  return { ok: true, mensaje: "Equipo guardado.", id: data.id };
}

export async function colorEquipoVentas(id: string, c: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_equipos").update({ color: color(c) }).eq("id", id);
  if (error) return { ok: false, mensaje: error.message };
  refrescar();
  return { ok: true, mensaje: "Color cambiado." };
}

export async function archivarEquipoVentas(id: string, archivar = true): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_equipos").update({ activo: !archivar }).eq("id", id);
  if (error) return { ok: false, mensaje: error.message };
  refrescar();
  return { ok: true, mensaje: archivar ? "Equipo archivado." : "Equipo restaurado." };
}

export async function borrarEquipoVentas(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_equipos").delete().eq("id", id);
  if (error) return { ok: false, mensaje: error.message };
  refrescar();
  return { ok: true, mensaje: "Equipo borrado." };
}

/* --------------------------------- Clientes -------------------------------- */

export type DatosCliente = {
  id?: string;
  nombre: string;
  empresa_id?: string | null;
  puesto?: string | null;
  email?: string | null;
  telefono?: string | null;
  movil?: string | null;
  web?: string | null;
  nif?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  codigo_postal?: string | null;
  pais?: string | null;
  comercial_id?: string | null;
  etiquetas?: string[];
  notas?: string | null;
};

export async function guardarClienteVentas(d: DatosCliente): Promise<Resultado> {
  const nombre = texto(d.nombre, 200);
  if (nombre.length < 2) return { ok: false, mensaje: "Pon el nombre del cliente." };
  const supabase = await createClient();
  const fila = {
    nombre,
    empresa_id: idONulo(d.empresa_id),
    puesto: nulo(d.puesto, 120),
    email: nulo(d.email, 200),
    telefono: nulo(d.telefono, 60),
    movil: nulo(d.movil, 60),
    web: nulo(d.web, 200),
    nif: nulo(d.nif, 40)?.toUpperCase() ?? null,
    direccion: nulo(d.direccion, 300),
    ciudad: nulo(d.ciudad, 120),
    codigo_postal: nulo(d.codigo_postal, 20),
    pais: texto(d.pais, 120) || "España",
    comercial_id: idONulo(d.comercial_id),
    etiquetas: (Array.isArray(d.etiquetas) ? d.etiquetas : []).map((e) => texto(e, 40)).filter(Boolean),
    notas: nulo(d.notas, 10_000),
    updated_at: ahora(),
  };
  const { data, error } = d.id
    ? await supabase.from("ventas_clientes").update(fila).eq("id", d.id).select("id").single()
    : await supabase.from("ventas_clientes").insert(fila).select("id").single();
  if (error) return { ok: false, mensaje: `No se pudo guardar el cliente: ${error.message}` };
  refrescar(`/crm/ventas/clientes/${data.id}`);
  return { ok: true, mensaje: d.id ? "Cliente guardado." : `${nombre} creado.`, id: data.id };
}

/**
 * Alta rápida de una empresa del CRM desde Ventas (al elegir la empresa de un
 * cliente o de una oportunidad). Entra como prospecto; el resto se completa en su ficha.
 */
export async function crearEmpresaDesdeVentas(nombreEmpresa: string): Promise<Resultado> {
  const nombre = texto(nombreEmpresa, 200);
  if (nombre.length < 2) return { ok: false, mensaje: "Pon el nombre de la empresa." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresas")
    .insert({ nombre, tipo: "prospecto", sector: "otros", pais: "España", estado: "activa", responsable_id: (await usuarioActual()).miembro?.id ?? null })
    .select("id")
    .single();
  if (error) return { ok: false, mensaje: `No se pudo crear la empresa: ${error.message}` };
  refrescar("/crm/empresas", "/crm/oportunidades");
  return { ok: true, mensaje: `${nombre} creada en Empresas.`, id: data.id };
}

export async function archivarClienteVentas(id: string, archivar = true): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_clientes").update({ activo: !archivar, updated_at: ahora() }).eq("id", id);
  if (error) return { ok: false, mensaje: error.message };
  refrescar(`/crm/ventas/clientes/${id}`);
  return { ok: true, mensaje: archivar ? "Cliente archivado." : "Cliente restaurado." };
}

export async function borrarClienteVentas(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_clientes").delete().eq("id", id);
  if (error) return { ok: false, mensaje: error.message };
  refrescar();
  return { ok: true, mensaje: "Cliente borrado." };
}

/* ------------------------------ Configuración ------------------------------ */

export async function guardarEtapaVentas(d: { id?: string; nombre: string; probabilidad?: number | string; ganada?: boolean; requisitos?: string | null }): Promise<Resultado> {
  const nombre = texto(d.nombre, 60);
  if (!nombre) return { ok: false, mensaje: "Pon un nombre a la etapa." };
  const supabase = await createClient();
  const fila: Record<string, unknown> = {
    nombre,
    probabilidad: entre(numero(d.probabilidad) ?? (d.ganada ? 100 : 10), 0, 100),
    ganada: !!d.ganada,
    requisitos: nulo(d.requisitos, 1000),
  };
  if (!d.id) {
    fila.orden = await siguienteOrden("ventas_etapas");
  }
  const { data, error } = d.id
    ? await supabase.from("ventas_etapas").update(fila).eq("id", d.id).select("id").single()
    : await supabase.from("ventas_etapas").insert(fila).select("id").single();
  if (error) return { ok: false, mensaje: `No se pudo guardar la etapa: ${error.message}` };
  refrescar("/crm/ventas/configuracion");
  return { ok: true, mensaje: "Etapa guardada.", id: data.id };
}

/** Plegar o desplegar una columna del Kanban (se guarda en la etapa, para todos). */
export async function plegarEtapaVentas(id: string, plegada: boolean): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_etapas").update({ plegada }).eq("id", id);
  if (error) return { ok: false, mensaje: error.message };
  refrescar("/crm/ventas/configuracion");
  return { ok: true, mensaje: plegada ? "Etapa plegada." : "Etapa desplegada." };
}

/** Nuevo orden de las etapas: el de la lista que llega. */
export async function ordenarEtapasVentas(ids: string[]): Promise<Resultado> {
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string" && UUID.test(id))) return { ok: false, mensaje: "Orden no válido." };
  const supabase = await createClient();
  for (const [i, id] of ids.entries()) {
    const { error } = await supabase.from("ventas_etapas").update({ orden: (i + 1) * 10 }).eq("id", id);
    if (error) return { ok: false, mensaje: error.message };
  }
  refrescar("/crm/ventas/configuracion");
  return { ok: true, mensaje: "Orden guardado." };
}

/** Borra una etapa; sus oportunidades pasan a `destino` (otra etapa). */
export async function borrarEtapaVentas(id: string, destino: string | null): Promise<Resultado> {
  const supabase = await createClient();
  const { count } = await supabase.from("ventas_oportunidades").select("id", { count: "exact", head: true }).eq("etapa_id", id);
  if (count) {
    const otra = idONulo(destino);
    const nueva = otra && otra !== id ? await etapa(otra) : null;
    if (!nueva) return { ok: false, mensaje: "Elige a qué etapa pasan sus oportunidades." };
    // Las mismas reglas que al arrastrar: la etapa ganada gana lo abierto; una
    // normal reabre lo ganado; la probabilidad sigue a la etapa si no es manual.
    const deLaEtapa = (cambios: Record<string, unknown>) => supabase.from("ventas_oportunidades").update(cambios).eq("etapa_id", id);
    const pasos = nueva.ganada
      ? [deLaEtapa({ estado: "ganada", probabilidad: 100, cerrada_at: ahora() }).eq("estado", "abierta")]
      : [
          deLaEtapa({ probabilidad: nueva.probabilidad }).eq("estado", "abierta").eq("probabilidad_manual", false),
          deLaEtapa({ estado: "abierta", cerrada_at: null, probabilidad: nueva.probabilidad, probabilidad_manual: false }).eq("estado", "ganada"),
        ];
    for (const paso of [...pasos, deLaEtapa({ etapa_id: nueva.id, etapa_desde: ahora(), updated_at: ahora() })]) {
      const { error } = await paso;
      if (error) return { ok: false, mensaje: error.message };
    }
  }
  const { error } = await supabase.from("ventas_etapas").delete().eq("id", id);
  if (error) return { ok: false, mensaje: error.message };
  refrescar("/crm/ventas/configuracion");
  return { ok: true, mensaje: "Etapa borrada." };
}

export async function guardarMotivoVentas(d: { id?: string; nombre: string }): Promise<Resultado> {
  const nombre = texto(d.nombre, 120);
  if (!nombre) return { ok: false, mensaje: "Escribe la razón de pérdida." };
  const supabase = await createClient();
  const { data, error } = d.id
    ? await supabase.from("ventas_motivos_perdida").update({ nombre }).eq("id", d.id).select("id").single()
    : await supabase.from("ventas_motivos_perdida").insert({ nombre, orden: await siguienteOrden("ventas_motivos_perdida") }).select("id").single();
  if (error) return { ok: false, mensaje: error.code === "23505" ? "Esa razón ya existe." : error.message };
  refrescar("/crm/ventas/configuracion");
  return { ok: true, mensaje: "Razón guardada.", id: data.id };
}

export async function borrarMotivoVentas(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_motivos_perdida").delete().eq("id", id);
  if (error) return { ok: false, mensaje: error.message };
  refrescar("/crm/ventas/configuracion");
  return { ok: true, mensaje: "Razón borrada." };
}

export async function guardarTipoActividadVentas(d: { id?: string; nombre: string; icono?: string; dias?: number | string; resumen?: string | null }): Promise<Resultado> {
  const nombre = texto(d.nombre, 60);
  if (!nombre) return { ok: false, mensaje: "Pon un nombre al tipo de actividad." };
  const supabase = await createClient();
  const fila = {
    nombre,
    icono: incluye(ICONOS_ACTIVIDAD, d.icono) ? d.icono : "tarea",
    dias: entre(Math.round(numero(d.dias) ?? 0), 0, 365),
    resumen: nulo(d.resumen, 200),
  };
  const { data, error } = d.id
    ? await supabase.from("ventas_tipos_actividad").update(fila).eq("id", d.id).select("id").single()
    : await supabase.from("ventas_tipos_actividad").insert({ ...fila, orden: await siguienteOrden("ventas_tipos_actividad") }).select("id").single();
  if (error) return { ok: false, mensaje: error.message };
  refrescar("/crm/ventas/configuracion");
  return { ok: true, mensaje: "Tipo guardado.", id: data.id };
}

export async function borrarTipoActividadVentas(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_tipos_actividad").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      mensaje: error.code === "23503" ? "Ese tipo se usa en algún plan de actividad: quítalo del plan antes de borrarlo." : error.message,
    };
  }
  refrescar("/crm/ventas/configuracion");
  return { ok: true, mensaje: "Tipo borrado." };
}

export async function guardarPlanVentas(d: {
  id?: string;
  nombre: string;
  pasos: { tipo_id: string; resumen?: string | null; dias?: number | string; asignado_id?: string | null }[];
}): Promise<Resultado> {
  const nombre = texto(d.nombre, 120);
  if (!nombre) return { ok: false, mensaje: "Pon un nombre al plan." };
  const pasos = (Array.isArray(d.pasos) ? d.pasos : []).filter((p) => idONulo(p?.tipo_id));
  if (!pasos.length) return { ok: false, mensaje: "Añade al menos una actividad al plan." };
  const supabase = await createClient();
  const { data, error } = d.id
    ? await supabase.from("ventas_planes").update({ nombre }).eq("id", d.id).select("id").single()
    : await supabase.from("ventas_planes").insert({ nombre }).select("id").single();
  if (error) return { ok: false, mensaje: error.message };
  // Primero los pasos nuevos y después se quitan los viejos: un fallo nunca deja el plan vacío.
  const { data: viejos } = await supabase.from("ventas_plan_pasos").select("id").eq("plan_id", data.id);
  const { error: e2 } = await supabase.from("ventas_plan_pasos").insert(
    pasos.map((p, i) => ({
      plan_id: data.id,
      tipo_id: p.tipo_id,
      resumen: nulo(p.resumen, 200),
      dias: entre(Math.round(numero(p.dias) ?? 0), 0, 365),
      asignado_id: idONulo(p.asignado_id),
      orden: i,
    }))
  );
  if (e2) return { ok: false, mensaje: e2.message };
  if (viejos?.length) {
    const { error: e3 } = await supabase.from("ventas_plan_pasos").delete().in("id", viejos.map((v) => v.id));
    if (e3) return { ok: false, mensaje: e3.message };
  }
  refrescar("/crm/ventas/configuracion");
  return { ok: true, mensaje: "Plan guardado.", id: data.id };
}

export async function borrarPlanVentas(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("ventas_planes").delete().eq("id", id);
  if (error) return { ok: false, mensaje: error.message };
  refrescar("/crm/ventas/configuracion");
  return { ok: true, mensaje: "Plan borrado." };
}

/* -------------------------------- Importar -------------------------------- */

/**
 * «Importar leads desde un archivo CSV o Excel»: filas ya leídas en el
 * navegador, con las columnas emparejadas a campos. Máximo 2.000 por vez.
 */
export async function importarOportunidadesVentas(filas: DatosOportunidad[]): Promise<Resultado> {
  if (!Array.isArray(filas) || !filas.length) return { ok: false, mensaje: "El archivo no tiene filas." };
  if (filas.some((f) => typeof f !== "object" || f === null)) return { ok: false, mensaje: "El archivo no se ha leído bien." };
  if (filas.length > 2000) return { ok: false, mensaje: "Importa como mucho 2.000 filas cada vez." };
  const supabase = await createClient();

  // Todo lo que se consulta por fila al crear una a mano, aquí se carga una vez.
  const [{ data: etapas }, { data: miembros }, { data: empresas }] = await Promise.all([
    supabase.from("ventas_etapas").select("*").order("orden").returns<EtapaVentas[]>(),
    supabase.from("ventas_equipo_miembros").select("equipo_id, miembro_id"),
    supabase.from("empresas").select("id, nombre").returns<{ id: string; nombre: string }[]>(),
  ]);
  // La columna «Empresa» del archivo se enlaza con la empresa del CRM del mismo nombre.
  const empresaPorNombre = new Map((empresas ?? []).map((e) => [normalizarTexto(e.nombre.trim()), e.id]));
  const porId = new Map((etapas ?? []).map((e) => [e.id, { ...e, probabilidad: Number(e.probabilidad) }]));
  const primera = [...porId.values()].find((e) => !e.ganada) ?? null;
  const equipoDeMiembro = new Map<string, string>();
  for (const m of miembros ?? []) if (!equipoDeMiembro.has(m.miembro_id)) equipoDeMiembro.set(m.miembro_id, m.equipo_id);

  const idsCliente = [...new Set(filas.map((f) => idONulo(f.cliente_id)).filter(Boolean) as string[])];
  const { data: clientes } = idsCliente.length
    ? await supabase.from("ventas_clientes").select("id, nombre, empresa_id, email, telefono, ciudad, pais").in("id", idsCliente)
    : { data: [] as { id: string; nombre: string; empresa_id: string | null; email: string | null; telefono: string | null; ciudad: string | null; pais: string }[] };
  const clientePorId = new Map((clientes ?? []).map((c) => [c.id, c]));

  // Las importadas entran arriba de su columna, en el orden del archivo.
  const arriba = new Map<string | null, number>();
  async function siguientePosicion(etapaId: string | null) {
    if (!arriba.has(etapaId)) arriba.set(etapaId, await posicionArriba(etapaId));
    const p = arriba.get(etapaId)!;
    arriba.set(etapaId, p - 1);
    return p;
  }

  const errores: string[] = [];
  // `linea`: la del archivo (cabecera = 1), para que los errores señalen la fila de verdad.
  const nuevas: { fila: Record<string, unknown>; etiquetas: string[]; linea: number }[] = [];
  for (const [i, d] of filas.entries()) {
    const cliente = clientePorId.get(idONulo(d.cliente_id) ?? "") ?? null;
    const titulo =
      texto(d.nombre, 200) ||
      [texto(d.empresa_nombre), texto(d.contacto_nombre)].filter(Boolean).join(" · ") ||
      (cliente ? `Oportunidad de ${cliente.nombre}` : "");
    if (titulo.length < 2) {
      if (errores.length < 5) errores.push(`Fila ${i + 2}: sin nombre ni cliente`);
      continue;
    }
    const e = porId.get(idONulo(d.etapa_id) ?? "") ?? primera;
    const comercial = idONulo(d.comercial_id);
    const probabilidad = numero(d.probabilidad);
    const empresaNombre = nulo(d.empresa_nombre, 200);
    const empresaId = (empresaNombre && empresaPorNombre.get(normalizarTexto(empresaNombre))) || cliente?.empresa_id || null;
    nuevas.push({
      linea: i + 2,
      etiquetas: (Array.isArray(d.etiquetas) ? d.etiquetas : []).map(idONulo).filter(Boolean) as string[],
      fila: {
        nombre: titulo,
        cliente_id: cliente?.id ?? null,
        empresa_id: empresaId,
        contacto_nombre: nulo(d.contacto_nombre, 200),
        empresa_nombre: empresaId ? null : empresaNombre,
        email: nulo(d.email, 200) ?? cliente?.email ?? null,
        telefono: nulo(d.telefono, 60) ?? cliente?.telefono ?? null,
        ciudad: nulo(d.ciudad, 120) ?? cliente?.ciudad ?? null,
        pais: nulo(d.pais, 120) ?? cliente?.pais ?? null,
        ingresos: Math.max(0, numero(d.ingresos) ?? 0),
        probabilidad: probabilidad == null ? (e?.probabilidad ?? 10) : entre(probabilidad, 0, 100),
        probabilidad_manual: probabilidad != null,
        etapa_id: e?.id ?? null,
        posicion: await siguientePosicion(e?.id ?? null),
        comercial_id: comercial,
        equipo_id: idONulo(d.equipo_id) ?? (comercial ? (equipoDeMiembro.get(comercial) ?? null) : null),
        cierre_previsto: fechaONula(d.cierre_previsto),
        prioridad: entre(Math.round(numero(d.prioridad) ?? 0), 0, 3),
        notas: nulo(d.notas, 10_000),
        campana: nulo(d.campana, 120),
        medio: nulo(d.medio, 120),
        origen: nulo(d.origen, 120),
        referido: nulo(d.referido, 200),
        estado: e?.ganada ? "ganada" : "abierta",
        cerrada_at: e?.ganada ? ahora() : null,
      },
    });
  }
  if (!nuevas.length) return { ok: false, mensaje: errores.join(" · ") || "No se importó nada." };

  const quien = await autor();
  let creadas = 0;
  for (let i = 0; i < nuevas.length; i += 500) {
    const tanda = nuevas.slice(i, i + 500);
    const { data, error } = await supabase
      .from("ventas_oportunidades")
      .insert(tanda.map((n) => n.fila))
      .select("id");
    if (error) {
      errores.push(`Filas ${tanda[0].linea}–${tanda[tanda.length - 1].linea}: ${error.message}`);
      continue;
    }
    // PostgREST devuelve las filas en el orden en que se insertaron.
    const ids = (data ?? []).map((r) => r.id as string);
    creadas += ids.length;
    const etiquetas = ids.flatMap((id, k) => tanda[k].etiquetas.map((etiqueta_id) => ({ oportunidad_id: id, etiqueta_id })));
    await Promise.all([
      supabase.from("ventas_mensajes").insert(ids.map((id) => ({ oportunidad_id: id, tipo: "sistema", cuerpo: "Oportunidad importada", autor: quien }))),
      etiquetas.length ? supabase.from("ventas_oportunidad_etiquetas").insert(etiquetas) : null,
    ]);
  }

  refrescar();
  if (!creadas) return { ok: false, mensaje: errores.join(" · ") || "No se importó nada." };
  return {
    ok: true,
    mensaje: `${creadas} ${creadas === 1 ? "oportunidad importada" : "oportunidades importadas"}${errores.length ? `; con errores: ${errores.join(" · ")}` : "."}`,
  };
}
