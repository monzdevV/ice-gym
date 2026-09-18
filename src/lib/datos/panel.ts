import "server-only";
import { createClient } from "@/lib/supabase/server";
import { inicioDeMes } from "@/lib/formato";
import { ESTADOS_LEAD, type EstadoLead } from "@/lib/tipos";

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

export type DatosPanel = {
  sociosActivos: number;
  altasMes: number;
  bajasMes: number;
  ingresosMes: number;
  pendienteMes: number;
  impagadoMes: number;
  recibosImpagados: number;
  conversion: number;
  leadsPeriodo: number;
  convertidosPeriodo: number;
  ocupacion: FilaOcupacion[];
  afluencia: { hora: number; accesos: number }[];
  ingresosPorMes: { mes: string; cobrado: number; impagado: number }[];
  embudo: { estado: EstadoLead; total: number }[];
};

/**
 * Una sola función para todo el panel: lanza las consultas en paralelo y
 * devuelve ya agregado lo que la pantalla necesita pintar.
 */
export async function cargarPanel(centroId: string | null): Promise<DatosPanel> {
  const supabase = await createClient();
  const mesActual = inicioDeMes(0);
  const hace90 = new Date(Date.now() - 90 * 86_400_000).toISOString();

  // Cada consulta se filtra por centro sólo si hay uno seleccionado.
  let qActivos = supabase
    .from("socios")
    .select("id", { count: "exact", head: true })
    .eq("estado", "activo");
  let qAltas = supabase
    .from("socios")
    .select("id", { count: "exact", head: true })
    .gte("fecha_alta", mesActual);
  let qBajas = supabase
    .from("socios")
    .select("id", { count: "exact", head: true })
    .gte("fecha_baja", mesActual);
  let qIngresos = supabase.from("ingresos_por_mes").select("*").gte("periodo", inicioDeMes(-5));
  let qAfluencia = supabase.from("afluencia_por_hora").select("*");
  let qLeads = supabase.from("leads").select("estado").gte("created_at", hace90);

  if (centroId) {
    qActivos = qActivos.eq("centro_id", centroId);
    qAltas = qAltas.eq("centro_id", centroId);
    qBajas = qBajas.eq("centro_id", centroId);
    qIngresos = qIngresos.eq("centro_id", centroId);
    qAfluencia = qAfluencia.eq("centro_id", centroId);
    qLeads = qLeads.eq("centro_id", centroId);
  }

  const [activos, altas, bajas, ingresos, ocupacion, afluencia, leadsRecientes] = await Promise.all([
    qActivos,
    qAltas,
    qBajas,
    qIngresos.returns<FilaIngresos[]>(),
    supabase.from("ocupacion_centros").select("*").returns<FilaOcupacion[]>(),
    qAfluencia.returns<FilaAfluencia[]>(),
    qLeads.returns<{ estado: EstadoLead }[]>(),
  ]);

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

  const delMes = filasIngresos.filter((f) => f.periodo === mesActual);
  const ingresosMes = delMes.reduce((s, f) => s + Number(f.cobrado ?? 0), 0);
  const pendienteMes = delMes.reduce((s, f) => s + Number(f.pendiente ?? 0), 0);
  const impagadoMes = delMes.reduce((s, f) => s + Number(f.impagado ?? 0), 0);
  const recibosImpagados = delMes.reduce((s, f) => s + Number(f.recibos_impagados ?? 0), 0);

  // Afluencia: sumamos los días de la semana para obtener el perfil por hora
  const porHora = new Map<number, number>();
  for (const fila of afluencia.data ?? []) {
    porHora.set(fila.hora, (porHora.get(fila.hora) ?? 0) + Number(fila.accesos));
  }
  const horasAbiertas = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 a 22:00
  const perfilAfluencia = horasAbiertas.map((hora) => ({
    hora,
    accesos: porHora.get(hora) ?? 0,
  }));

  // Conversión de leads en los últimos 90 días
  const leads = leadsRecientes.data ?? [];
  const convertidosPeriodo = leads.filter((l) => l.estado === "convertido").length;
  const conversion = leads.length > 0 ? (convertidosPeriodo / leads.length) * 100 : 0;

  const conteoEmbudo = new Map<EstadoLead, number>(ESTADOS_LEAD.map((e) => [e, 0]));
  for (const lead of leads) {
    conteoEmbudo.set(lead.estado, (conteoEmbudo.get(lead.estado) ?? 0) + 1);
  }

  return {
    sociosActivos: activos.count ?? 0,
    altasMes: altas.count ?? 0,
    bajasMes: bajas.count ?? 0,
    ingresosMes,
    pendienteMes,
    impagadoMes,
    recibosImpagados,
    conversion,
    leadsPeriodo: leads.length,
    convertidosPeriodo,
    ocupacion: (ocupacion.data ?? []).filter((o) => !centroId || o.centro_id === centroId),
    afluencia: perfilAfluencia,
    ingresosPorMes,
    embudo: ESTADOS_LEAD.map((estado) => ({ estado, total: conteoEmbudo.get(estado) ?? 0 })),
  };
}
