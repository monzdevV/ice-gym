import "server-only";
import { createClient } from "@/lib/supabase/server";
import { inicioDeMes } from "@/lib/formato";
import { listarLeads, type LeadConResumen } from "@/lib/datos/leads";
import { accionVencida, puntuacion, totales, type Puntuacion } from "@/lib/oportunidad";
import { ESTADOS_LEAD, ORIGENES_LEAD, esAbierto, type EstadoLead, type OrigenLead } from "@/lib/tipos";

export type FilaIngresos = {
  centro_id: string;
  periodo: string;
  cobrado: number | null;
  pendiente: number | null;
  impagado: number | null;
  recibos_impagados: number;
};

export type FilaAfluencia = {
  centro_id: string;
  dia_semana: number;
  hora: number;
  accesos: number;
};

export type FilaOcupacion = {
  centro_id: string;
  nombre: string;
  ciudad: string;
  aforo: number;
  socios_activos: number;
  dentro_ahora: number;
};

type FilaAltasBajas = { centro_id: string; mes: string; altas: number; bajas: number };

export type Tarea = {
  id: string;
  nombre: string;
  motivo: string;
  cuando: string | null;
  tipo: "vencida" | "hoy" | "visita" | "riesgo";
  punt: Puntuacion | null;
};

export type DatosPanel = {
  sociosActivos: number;
  altasMes: number;
  bajasMes: number;
  ingresosMes: number;
  ingresosMesAnterior: number;
  pendienteMes: number;
  impagadoMes: number;
  recibosImpagados: number;
  conversion: number;
  leadsPeriodo: number;
  convertidosPeriodo: number;
  pipeline: { n: number; valor: number; ponderado: number };
  ocupacion: FilaOcupacion[];
  afluencia: { hora: number; accesos: number }[];
  ingresosPorMes: { mes: string; cobrado: number; impagado: number }[];
  altasBajas: { mes: string; altas: number; bajas: number }[];
  embudo: { estado: EstadoLead; total: number; alcanzado: number }[];
  porOrigen: { origen: OrigenLead; total: number; convertidos: number }[];
  paraHoy: Tarea[];
};

function lanzar(nombre: string, error: { message: string } | null) {
  if (error) throw new Error(`No se pudo leer ${nombre}: ${error.message}`);
}

const ZONA = "Europe/Madrid";
const diaMadrid = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d);

/** Lo que hay que hacer hoy: acciones vencidas o de hoy, visitas de hoy y los leads más en riesgo. */
function tareasDeHoy(leads: LeadConResumen[], ahora = Date.now()): Tarea[] {
  const hoy = diaMadrid(new Date(ahora));
  const tareas: Tarea[] = [];
  const vistos = new Set<string>();

  for (const l of leads) {
    if (!esAbierto(l.estado)) continue;
    const punt = puntuacion(l, l.resumen, ahora);
    if (l.proxima_accion_fecha && accionVencida(l, ahora)) {
      tareas.push({ id: l.id, nombre: l.nombre, motivo: l.proxima_accion ?? "Seguimiento", cuando: l.proxima_accion_fecha, tipo: "vencida", punt });
      vistos.add(l.id);
    } else if (l.proxima_accion_fecha && diaMadrid(new Date(l.proxima_accion_fecha)) === hoy) {
      tareas.push({ id: l.id, nombre: l.nombre, motivo: l.proxima_accion ?? "Seguimiento", cuando: l.proxima_accion_fecha, tipo: "hoy", punt });
      vistos.add(l.id);
    } else if (l.fecha_visita && diaMadrid(new Date(l.fecha_visita)) === hoy) {
      tareas.push({ id: l.id, nombre: l.nombre, motivo: "Visita al club", cuando: l.fecha_visita, tipo: "visita", punt });
      vistos.add(l.id);
    }
  }

  // Completa con los leads en riesgo de más valor, sin repetir.
  const riesgo = leads
    .filter((l) => esAbierto(l.estado) && !vistos.has(l.id))
    .map((l) => ({ l, punt: puntuacion(l, l.resumen, ahora) }))
    .filter((x) => x.punt?.nivel === "riesgo")
    .sort((a, b) => b.l.updated_at.localeCompare(a.l.updated_at))
    .slice(0, Math.max(0, 8 - tareas.length));
  for (const { l, punt } of riesgo) {
    tareas.push({ id: l.id, nombre: l.nombre, motivo: punt?.motivos[0] ?? "En riesgo", cuando: null, tipo: "riesgo", punt });
  }

  const orden = { vencida: 0, hoy: 1, visita: 2, riesgo: 3 };
  return tareas.sort((a, b) => orden[a.tipo] - orden[b.tipo] || (a.cuando ?? "").localeCompare(b.cuando ?? ""));
}

/**
 * Una sola función para todo el panel: lanza las consultas en paralelo y
 * devuelve ya agregado lo que la pantalla necesita pintar. Si una consulta
 * falla, lanza el error (lo recoge error.tsx) en vez de pintar ceros falsos.
 */
export async function cargarPanel(centroId: string | null): Promise<DatosPanel> {
  const supabase = await createClient();
  const mesActual = inicioDeMes(0);
  const mesAnterior = inicioDeMes(-1);
  const hace90 = Date.now() - 90 * 86_400_000;

  let qActivos = supabase.from("socios").select("id", { count: "exact", head: true }).eq("estado", "activo");
  let qAltas = supabase.from("socios").select("id", { count: "exact", head: true }).gte("fecha_alta", mesActual);
  let qBajas = supabase.from("socios").select("id", { count: "exact", head: true }).gte("fecha_baja", mesActual);
  let qIngresos = supabase.from("ingresos_por_mes").select("*").gte("periodo", inicioDeMes(-5));
  let qAfluencia = supabase.from("afluencia_por_hora").select("*");
  let qAltasBajas = supabase.from("altas_bajas_por_mes").select("*").gte("mes", inicioDeMes(-5));

  if (centroId) {
    qActivos = qActivos.eq("centro_id", centroId);
    qAltas = qAltas.eq("centro_id", centroId);
    qBajas = qBajas.eq("centro_id", centroId);
    qIngresos = qIngresos.eq("centro_id", centroId);
    qAfluencia = qAfluencia.eq("centro_id", centroId);
    qAltasBajas = qAltasBajas.eq("centro_id", centroId);
  }

  const [activos, altas, bajas, ingresos, ocupacion, afluencia, altasBajas, leads] = await Promise.all([
    qActivos,
    qAltas,
    qBajas,
    qIngresos.returns<FilaIngresos[]>(),
    supabase.from("ocupacion_centros").select("*").returns<FilaOcupacion[]>(),
    qAfluencia.returns<FilaAfluencia[]>(),
    qAltasBajas.returns<FilaAltasBajas[]>(),
    listarLeads(centroId),
  ]);
  lanzar("los socios", activos.error ?? altas.error ?? bajas.error);
  lanzar("los ingresos", ingresos.error);
  lanzar("la ocupación", ocupacion.error);
  lanzar("la afluencia", afluencia.error);
  lanzar("las altas y bajas", altasBajas.error);

  // Ingresos: serie de 6 meses y totales del mes en curso
  const filasIngresos = ingresos.data ?? [];
  const porMes = new Map<string, { cobrado: number; impagado: number }>();
  for (const fila of filasIngresos) {
    const actual = porMes.get(fila.periodo) ?? { cobrado: 0, impagado: 0 };
    actual.cobrado += Number(fila.cobrado ?? 0);
    actual.impagado += Number(fila.impagado ?? 0);
    porMes.set(fila.periodo, actual);
  }
  const ingresosPorMes = [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, ...v }));

  const suma = (periodo: string, campo: keyof FilaIngresos) =>
    filasIngresos.filter((f) => f.periodo === periodo).reduce((s, f) => s + Number(f[campo] ?? 0), 0);

  // Altas y bajas por mes
  const ab = new Map<string, { altas: number; bajas: number }>();
  for (const f of altasBajas.data ?? []) {
    const a = ab.get(f.mes) ?? { altas: 0, bajas: 0 };
    a.altas += Number(f.altas);
    a.bajas += Number(f.bajas);
    ab.set(f.mes, a);
  }
  const serieAltasBajas = Array.from({ length: 6 }, (_, i) => inicioDeMes(i - 5)).map((mes) => ({
    mes,
    ...(ab.get(mes) ?? { altas: 0, bajas: 0 }),
  }));

  // Afluencia: sumamos los días de la semana para obtener el perfil por hora
  const porHora = new Map<number, number>();
  for (const fila of afluencia.data ?? []) {
    porHora.set(fila.hora, (porHora.get(fila.hora) ?? 0) + Number(fila.accesos));
  }
  const perfilAfluencia = Array.from({ length: 18 }, (_, i) => i + 6).map((hora) => ({
    hora,
    accesos: porHora.get(hora) ?? 0,
  }));

  // Leads de los últimos 90 días: conversión, embudo y origen
  const recientes = leads.filter((l) => new Date(l.created_at).getTime() >= hace90);
  const convertidosPeriodo = recientes.filter((l) => l.estado === "convertido").length;
  const conversion = recientes.length > 0 ? (convertidosPeriodo / recientes.length) * 100 : 0;

  // «Alcanzado»: leads que han llegado al menos a esa etapa (los perdidos no cuentan hacia delante).
  const orden: EstadoLead[] = ESTADOS_LEAD.filter((e) => e !== "perdido");
  const embudo = ESTADOS_LEAD.map((estado) => {
    const total = recientes.filter((l) => l.estado === estado).length;
    const i = orden.indexOf(estado);
    const alcanzado =
      estado === "perdido" ? total : recientes.filter((l) => l.estado !== "perdido" && orden.indexOf(l.estado) >= i).length;
    return { estado, total, alcanzado };
  });

  const porOrigen = ORIGENES_LEAD.map((origen) => {
    const grupo = recientes.filter((l) => l.origen === origen);
    return { origen, total: grupo.length, convertidos: grupo.filter((l) => l.estado === "convertido").length };
  }).sort((a, b) => b.total - a.total);

  const pipeline = totales(leads.filter((l) => esAbierto(l.estado)));

  return {
    sociosActivos: activos.count ?? 0,
    altasMes: altas.count ?? 0,
    bajasMes: bajas.count ?? 0,
    ingresosMes: suma(mesActual, "cobrado"),
    ingresosMesAnterior: suma(mesAnterior, "cobrado"),
    pendienteMes: suma(mesActual, "pendiente"),
    impagadoMes: suma(mesActual, "impagado"),
    recibosImpagados: suma(mesActual, "recibos_impagados"),
    conversion,
    leadsPeriodo: recientes.length,
    convertidosPeriodo,
    pipeline: { n: pipeline.n, valor: pipeline.valor, ponderado: pipeline.ponderado },
    ocupacion: (ocupacion.data ?? []).filter((o) => !centroId || o.centro_id === centroId),
    afluencia: perfilAfluencia,
    ingresosPorMes,
    altasBajas: serieAltasBajas,
    embudo,
    porOrigen,
    paraHoy: tareasDeHoy(leads),
  };
}
