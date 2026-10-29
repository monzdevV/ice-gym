import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_TIPO_EMPRESA, ruta, type Empresa, type MiembroMini } from "@/lib/b2b";
import { listarEquipo } from "@/lib/datos/b2b";
import { usuarioActual } from "@/lib/datos/interacciones";
import {
  DEFECTO_VENTAS,
  SELECT_ACTIVIDAD_VENTAS,
  SELECT_OPORTUNIDAD_VENTAS,
  hoyISO,
  instanteMadrid,
  normalizarTexto,
  plazoMasUrgente,
  quienVenta,
  rutaVentas,
  type ActividadMini,
  type ActividadVentasCompleta,
  type ClienteCompleto,
  type ClienteMini,
  type EmpresaVentas,
  type EquipoVentas,
  type EtapaVentas,
  type EtiquetaVentas,
  type FiltrosVentas,
  type MensajeVentas,
  type MotivoPerdida,
  type OportunidadVentasCompleta,
  type PasoPlan,
  type PlanActividad,
  type TipoActividadVentas,
} from "@/lib/ventas";

/* ------------------------------- Catálogos ------------------------------- */

const num = (v: unknown) => Number(v ?? 0);

export async function listarEtapas(): Promise<EtapaVentas[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("ventas_etapas").select("*").order("orden").order("created_at").returns<EtapaVentas[]>();
  return (data ?? []).map((e) => ({ ...e, probabilidad: num(e.probabilidad) }));
}

export async function listarEtiquetas(): Promise<EtiquetaVentas[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("ventas_etiquetas").select("id, nombre, color").order("nombre").returns<EtiquetaVentas[]>();
  return data ?? [];
}

export async function listarMotivos(): Promise<MotivoPerdida[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("ventas_motivos_perdida").select("id, nombre, orden").order("orden").order("nombre").returns<MotivoPerdida[]>();
  return data ?? [];
}

export async function listarTiposActividad(): Promise<TipoActividadVentas[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("ventas_tipos_actividad").select("*").order("orden").order("nombre").returns<TipoActividadVentas[]>();
  return data ?? [];
}

export async function listarPlanes(): Promise<PlanActividad[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ventas_planes")
    .select("id, nombre, pasos:ventas_plan_pasos(*)")
    .order("nombre")
    .returns<PlanActividad[]>();
  return (data ?? []).map((p) => ({ ...p, pasos: [...(p.pasos ?? [])].sort((a: PasoPlan, b: PasoPlan) => a.orden - b.orden) }));
}

export async function listarEquiposVentas(): Promise<EquipoVentas[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ventas_equipos")
    .select("*, miembros:ventas_equipo_miembros(miembro_id)")
    .order("orden")
    .order("nombre")
    .returns<(Omit<EquipoVentas, "miembros"> & { miembros: { miembro_id: string }[] })[]>();
  return (data ?? []).map((e) => ({
    ...e,
    objetivo: e.objetivo == null ? null : num(e.objetivo),
    miembros: (e.miembros ?? []).map((m) => m.miembro_id),
  }));
}

export async function opcionesClientes(): Promise<ClienteMini[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ventas_clientes")
    .select("id, nombre, empresa_id, email, telefono, ciudad, pais")
    .eq("activo", true)
    .order("nombre")
    .returns<ClienteMini[]>();
  return data ?? [];
}

/** Empresas del CRM (las mismas de Oportunidades y Contactos) para elegir en Ventas. */
export async function opcionesEmpresas(): Promise<EmpresaVentas[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("empresas").select("id, nombre, logo_url, ciudad").order("nombre").returns<EmpresaVentas[]>();
  return data ?? [];
}

/**
 * Todo lo que necesitan los formularios, filtros y vistas del segmento, y quién
 * es el usuario (para «Mis oportunidades» y «Mis actividades»).
 * Con `cache`: varias piezas de la misma petición lo piden y se consulta una vez.
 */
export const catalogosVentas = cache(async () => {
  const [etapas, etiquetas, motivos, tipos, planes, equipos, comerciales, clientes, empresas, usuario] = await Promise.all([
    listarEtapas(),
    listarEtiquetas(),
    listarMotivos(),
    listarTiposActividad(),
    listarPlanes(),
    listarEquiposVentas(),
    listarEquipo(),
    opcionesClientes(),
    opcionesEmpresas(),
    usuarioActual(),
  ]);
  return { etapas, etiquetas, motivos, tipos, planes, equipos, comerciales, clientes, empresas, yo: usuario.miembro?.id ?? null, email: usuario.email };
});
export type CatalogosVentas = Awaited<ReturnType<typeof catalogosVentas>>;

/* ----------------------------- Oportunidades ----------------------------- */

/** PostgREST puede devolver numeric como texto; y las actividades embebidas vienen sin orden. */
function limpiar(o: OportunidadVentasCompleta): OportunidadVentasCompleta {
  return {
    ...o,
    ingresos: num(o.ingresos),
    probabilidad: num(o.probabilidad),
    posicion: num(o.posicion),
    etiquetas: [...(o.etiquetas ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    actividades: (o.actividades ?? []).filter((a) => a.estado === "pendiente").sort((a, b) => a.vence.localeCompare(b.vence)),
  };
}

/**
 * Oportunidades del flujo con sus relaciones, en el orden del Kanban. Los
 * filtros exactos van a la base de datos; los de actividad y la búsqueda de
 * texto (que mira también cliente, email y etiquetas) se resuelven aquí.
 */
export async function listarOportunidadesVentas(
  filtros: Partial<FiltrosVentas> = {},
  yo: string | null = null
): Promise<OportunidadVentasCompleta[]> {
  const f = { ...DEFECTO_VENTAS, ...filtros };
  const supabase = await createClient();
  const activo = new Set(f.f);

  let consulta = supabase.from("ventas_oportunidades").select(SELECT_OPORTUNIDAD_VENTAS);

  consulta = consulta.eq("activa", !activo.has("archivadas"));

  // Estado: sin filtro se ven las abiertas y las ganadas; las perdidas, sólo si se piden.
  const estados = [activo.has("abiertas") && "abierta", activo.has("ganadas") && "ganada", activo.has("perdidas") && "perdida"].filter(
    Boolean
  ) as string[];
  consulta = consulta.in("estado", estados.length ? estados : ["abierta", "ganada"]);

  // Quién: mías y/o sin asignar. Sin ficha en `equipo`, «mías» no encaja con nada.
  const mias = activo.has("mias") && !!yo;
  const sinAsignar = activo.has("sin_asignar") || f.comercial === "sin";
  if (activo.has("mias") && !yo && !sinAsignar) return [];
  if (mias && sinAsignar) consulta = consulta.or(`comercial_id.eq.${yo},comercial_id.is.null`);
  else if (mias) consulta = consulta.eq("comercial_id", yo);
  else if (sinAsignar) consulta = consulta.is("comercial_id", null);
  if (f.comercial && f.comercial !== "sin") consulta = consulta.eq("comercial_id", f.comercial);

  if (f.equipo) consulta = consulta.eq("equipo_id", f.equipo);
  if (f.cliente) consulta = consulta.eq("cliente_id", f.cliente);
  if (f.empresa) consulta = consulta.eq("empresa_id", f.empresa);
  if (f.etapa) consulta = consulta.eq("etapa_id", f.etapa);

  const campo = f.fecha === "cierre" ? "cerrada_at" : f.fecha === "previsto" ? "cierre_previsto" : "created_at";
  // cierre_previsto es una fecha; las otras dos, instantes: se cortan en días de Madrid.
  const conHora = campo !== "cierre_previsto";
  if (f.desde) consulta = consulta.gte(campo, conHora ? instanteMadrid(f.desde) : f.desde);
  if (f.hasta) consulta = consulta.lte(campo, conHora ? instanteMadrid(f.hasta, true) : f.hasta);

  const { data, error } = await consulta
    .order("posicion", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<OportunidadVentasCompleta[]>();
  if (error) throw new Error(`No se pudieron cargar las oportunidades: ${error.message}`);

  let filas = (data ?? []).map(limpiar);

  if (f.etiqueta) filas = filas.filter((o) => o.etiquetas.some((e) => e.id === f.etiqueta));

  // Actividad: en curso = con algo planificado a tiempo; estancada = con algo vencido.
  const enCurso = activo.has("en_curso");
  const estancadas = activo.has("estancadas");
  if (enCurso || estancadas) {
    const hoy = hoyISO();
    filas = filas.filter((o) => {
      const p = plazoMasUrgente(o.actividades, hoy);
      return (estancadas && p === "vencida") || (enCurso && (p === "hoy" || p === "planificada"));
    });
  }

  const q = normalizarTexto(f.q);
  if (q) {
    filas = filas.filter((o) =>
      normalizarTexto(
        [o.nombre, quienVenta(o), o.empresa?.nombre, o.empresa_nombre, o.contacto_nombre, o.email, o.telefono, o.ciudad, o.notas, ...o.etiquetas.map((e) => e.nombre)]
          .filter(Boolean)
          .join(" ")
      ).includes(q)
    );
  }
  return filas;
}

export async function obtenerOportunidadVentas(id: string): Promise<OportunidadVentasCompleta | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ventas_oportunidades")
    .select(SELECT_OPORTUNIDAD_VENTAS)
    .eq("id", id)
    .maybeSingle<OportunidadVentasCompleta>();
  return data ? limpiar(data) : null;
}

/* ------------------------- Actividades e historial ------------------------- */

function limpiarActividad(a: ActividadVentasCompleta): ActividadVentasCompleta {
  return a.oportunidad ? { ...a, oportunidad: { ...a.oportunidad, ingresos: num(a.oportunidad.ingresos) } } : a;
}

/** Actividades de una oportunidad o de un cliente: pendientes (por vencimiento) y hechas (más recientes primero). */
export async function actividadesDe(donde: { oportunidad?: string; cliente?: string }) {
  const supabase = await createClient();
  let consulta = supabase.from("ventas_actividades").select(SELECT_ACTIVIDAD_VENTAS);
  if (donde.oportunidad) consulta = consulta.eq("oportunidad_id", donde.oportunidad);
  if (donde.cliente) consulta = consulta.eq("cliente_id", donde.cliente);
  const { data } = await consulta.order("vence").returns<ActividadVentasCompleta[]>();
  const todas = (data ?? []).map(limpiarActividad);
  return {
    pendientes: todas.filter((a) => a.estado === "pendiente"),
    hechas: todas
      .filter((a) => a.estado === "hecha")
      .sort((a, b) => (b.hecha_at ?? b.created_at).localeCompare(a.hecha_at ?? a.created_at)),
  };
}

export async function mensajesDe(donde: { oportunidad?: string; cliente?: string }): Promise<MensajeVentas[]> {
  const supabase = await createClient();
  let consulta = supabase.from("ventas_mensajes").select("*");
  if (donde.oportunidad) consulta = consulta.eq("oportunidad_id", donde.oportunidad);
  if (donde.cliente) consulta = consulta.eq("cliente_id", donde.cliente);
  const { data } = await consulta.order("created_at", { ascending: false }).limit(200).returns<MensajeVentas[]>();
  return data ?? [];
}

export type FiltroMisActividades = "todas" | "vencidas" | "hoy" | "futuras";

/**
 * Actividades pendientes de un comercial (o de todo el equipo con `asignado = null`),
 * con su oportunidad o cliente. Base de «Mis actividades» y de la vista Actividad.
 */
export async function actividadesPendientes(asignado: string | null, filtro: FiltroMisActividades = "todas") {
  const supabase = await createClient();
  const hoy = hoyISO();
  let consulta = supabase.from("ventas_actividades").select(SELECT_ACTIVIDAD_VENTAS).eq("estado", "pendiente");
  if (asignado) consulta = consulta.eq("asignado_id", asignado);
  if (filtro === "vencidas") consulta = consulta.lt("vence", hoy);
  else if (filtro === "hoy") consulta = consulta.eq("vence", hoy);
  else if (filtro === "futuras") consulta = consulta.gt("vence", hoy);
  const { data, error } = await consulta.order("vence").limit(1000).returns<ActividadVentasCompleta[]>();
  if (error) throw new Error(`No se pudieron cargar las actividades: ${error.message}`);
  return (data ?? []).map(limpiarActividad);
}

/** Actividades pendientes completas de unas oportunidades (las que pinta una vista del flujo). */
export async function actividadesDeOportunidades(ids: string[]): Promise<ActividadVentasCompleta[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  // Por tandas: la lista de ids va en la URL de PostgREST.
  const tandas: string[][] = [];
  for (let i = 0; i < ids.length; i += 150) tandas.push(ids.slice(i, i + 150));
  const resultados = await Promise.all(
    tandas.map((t) =>
      supabase
        .from("ventas_actividades")
        .select(SELECT_ACTIVIDAD_VENTAS)
        .eq("estado", "pendiente")
        .in("oportunidad_id", t)
        .order("vence")
        .returns<ActividadVentasCompleta[]>()
    )
  );
  const error = resultados.find((r) => r.error)?.error;
  if (error) throw new Error(`No se pudieron cargar las actividades: ${error.message}`);
  return resultados.flatMap((r) => r.data ?? []).map(limpiarActividad);
}

/** Contador del menú: mis actividades vencidas o de hoy. 0 si aún no se ha creado el segmento. */
export async function contarActividadesVentasUrgentes(): Promise<number> {
  const { miembro } = await usuarioActual();
  if (!miembro) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("ventas_actividades")
    .select("id", { count: "exact", head: true })
    .eq("estado", "pendiente")
    .eq("asignado_id", miembro.id)
    .lte("vence", hoyISO());
  return count ?? 0;
}

/** Actividades (pendientes y hechas) en un rango de vencimiento: informes de actividad. */
export async function actividadesEntre(desde: string, hasta: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ventas_actividades")
    .select(SELECT_ACTIVIDAD_VENTAS)
    .neq("estado", "cancelada")
    .gte("vence", desde)
    .lte("vence", hasta)
    .order("vence")
    .limit(5000)
    .returns<ActividadVentasCompleta[]>();
  return (data ?? []).map(limpiarActividad);
}

/* -------------------------------- Equipos -------------------------------- */

export type ResumenEquipo = { abiertas: number; ingresos: number; ganadoMes: number; actividadesVencidas: number };

/** Cifras de cada equipo para sus tarjetas: abiertas, importe, ganado este mes y actividades vencidas. */
export async function resumenEquipos(): Promise<Record<string, ResumenEquipo>> {
  const supabase = await createClient();
  const hoy = hoyISO();
  const inicioMes = `${hoy.slice(0, 7)}-01`;
  const { data } = await supabase
    .from("ventas_oportunidades")
    .select("equipo_id, estado, ingresos, cerrada_at, actividades:ventas_actividades(vence, estado)")
    .eq("activa", true)
    .not("equipo_id", "is", null)
    .returns<{ equipo_id: string; estado: string; ingresos: number; cerrada_at: string | null; actividades: { vence: string; estado: string }[] }[]>();

  const r: Record<string, ResumenEquipo> = {};
  for (const o of data ?? []) {
    const e = (r[o.equipo_id] ??= { abiertas: 0, ingresos: 0, ganadoMes: 0, actividadesVencidas: 0 });
    if (o.estado === "abierta") {
      e.abiertas++;
      e.ingresos += num(o.ingresos);
      e.actividadesVencidas += (o.actividades ?? []).filter((a) => a.estado === "pendiente" && a.vence < hoy).length;
    }
    // El día de cierre en Madrid, no en UTC: lo ganado a las 00:30 del día 1 es de este mes.
    if (o.estado === "ganada" && o.cerrada_at && hoyISO(new Date(o.cerrada_at)) >= inicioMes) e.ganadoMes += num(o.ingresos);
  }
  return r;
}

/* -------------------------------- Clientes ------------------------------- */

const SELECT_CLIENTE = "*, empresa:empresas(id, nombre, logo_url, ciudad), comercial:equipo(id, nombre, apellidos, color)";

type Pendiente = Pick<ActividadMini, "vence" | "estado">;

/** Una fila del listado de clientes: una persona de Ventas o una empresa del CRM. */
export type ClienteListado = {
  id: string;
  tipo: "persona" | "empresa";
  /** Ficha: la de Ventas para personas, la del CRM para empresas. */
  href: string;
  nombre: string;
  /** Puesto y empresa de la persona; tipo de la empresa. */
  detalle: string;
  logo_url: string | null;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  pais: string | null;
  comercial: MiembroMini | null;
  etiquetas: string[];
  oportunidades: number;
  pendientes: Pendiente[];
  /** Texto extra para la búsqueda (NIF, móvil…). */
  buscable: string;
};

/** Empresas que se ven en Clientes: clientes y prospectos, y cualquiera con algo en Ventas. */
const TIPOS_EMPRESA_CLIENTE = new Set(["cliente", "prospecto"]);
/** Una empresa archivada en Clientes es una inactiva o bloqueada en el CRM. */
const ESTADOS_EMPRESA_ARCHIVADA = new Set(["inactiva", "bloqueada"]);

const soloPendientes = (a: Pendiente[] | null | undefined) => (a ?? []).filter((x) => x.estado === "pendiente");

export async function listarClientes(q = "", archivados = false): Promise<ClienteListado[]> {
  const supabase = await createClient();
  const [personas, empresas] = await Promise.all([
    supabase
      .from("ventas_clientes")
      .select(`${SELECT_CLIENTE}, ops:ventas_oportunidades(id), pendientes:ventas_actividades(vence, estado)`)
      .eq("activo", !archivados)
      .order("nombre")
      .returns<(ClienteCompleto & { ops: { id: string }[]; pendientes: Pendiente[] })[]>(),
    supabase
      .from("empresas")
      .select(
        "id, nombre, tipo, estado, email, telefono, ciudad, pais, cif, logo_url, responsable:equipo(id, nombre, apellidos, color), personas:ventas_clientes(id), ops:ventas_oportunidades(id, actividades:ventas_actividades(vence, estado))"
      )
      .order("nombre")
      .returns<
        (Pick<Empresa, "id" | "nombre" | "tipo" | "estado" | "email" | "telefono" | "ciudad" | "pais" | "cif" | "logo_url"> & {
          responsable: MiembroMini | null;
          personas: { id: string }[];
          ops: { id: string; actividades: Pendiente[] }[];
        })[]
      >(),
  ]);
  if (personas.error) throw new Error(`No se pudieron cargar los clientes: ${personas.error.message}`);
  if (empresas.error) throw new Error(`No se pudieron cargar las empresas: ${empresas.error.message}`);

  const filasPersonas: ClienteListado[] = (personas.data ?? []).map((c) => ({
    id: c.id,
    tipo: "persona",
    href: rutaVentas.cliente(c.id),
    nombre: c.nombre,
    detalle: [c.puesto, c.empresa?.nombre].filter(Boolean).join(" · ") || "Persona",
    logo_url: null,
    email: c.email,
    telefono: c.telefono || c.movil,
    ciudad: c.ciudad,
    pais: c.pais,
    comercial: c.comercial,
    etiquetas: c.etiquetas,
    oportunidades: c.ops?.length ?? 0,
    pendientes: soloPendientes(c.pendientes),
    buscable: [c.movil, c.nif, c.empresa?.nombre].filter(Boolean).join(" "),
  }));
  const filasEmpresas: ClienteListado[] = (empresas.data ?? [])
    .filter((e) => (TIPOS_EMPRESA_CLIENTE.has(e.tipo) || e.personas.length > 0 || e.ops.length > 0) && ESTADOS_EMPRESA_ARCHIVADA.has(e.estado) === archivados)
    .map((e) => ({
      id: e.id,
      tipo: "empresa",
      href: ruta.empresa(e.id),
      nombre: e.nombre,
      detalle: `Empresa · ${ETIQUETA_TIPO_EMPRESA[e.tipo]}`,
      logo_url: e.logo_url,
      email: e.email,
      telefono: e.telefono,
      ciudad: e.ciudad,
      pais: e.pais,
      comercial: e.responsable,
      etiquetas: [],
      oportunidades: e.ops.length,
      pendientes: soloPendientes(e.ops.flatMap((o) => o.actividades)),
      buscable: e.cif ?? "",
    }));

  let filas = [...filasPersonas, ...filasEmpresas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const t = normalizarTexto(q.trim());
  if (t) {
    filas = filas.filter((c) => normalizarTexto([c.nombre, c.detalle, c.email, c.telefono, c.ciudad, c.pais, c.buscable].filter(Boolean).join(" ")).includes(t));
  }
  return filas;
}

export async function obtenerCliente(id: string): Promise<ClienteCompleto | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("ventas_clientes").select(SELECT_CLIENTE).eq("id", id).maybeSingle<ClienteCompleto>();
  return data ?? null;
}

/** Clientes de Ventas que trabajan en una empresa del CRM. */
export async function clientesDeEmpresa(empresaId: string): Promise<ClienteMini[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ventas_clientes")
    .select("id, nombre, empresa_id, email, telefono, ciudad, pais")
    .eq("empresa_id", empresaId)
    .order("nombre")
    .returns<ClienteMini[]>();
  return data ?? [];
}

/** Oportunidades de Ventas de una empresa del CRM, en cualquier estado. */
export async function oportunidadesDeEmpresa(empresaId: string): Promise<OportunidadVentasCompleta[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ventas_oportunidades")
    .select(SELECT_OPORTUNIDAD_VENTAS)
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false })
    .returns<OportunidadVentasCompleta[]>();
  return (data ?? []).map(limpiar);
}

/** Oportunidades de un cliente, en cualquier estado (smart button de su ficha). */
export async function oportunidadesDeCliente(id: string): Promise<OportunidadVentasCompleta[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ventas_oportunidades")
    .select(SELECT_OPORTUNIDAD_VENTAS)
    .eq("cliente_id", id)
    .order("created_at", { ascending: false })
    .returns<OportunidadVentasCompleta[]>();
  return (data ?? []).map(limpiar);
}
