import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Acceso, Actividad, EstadoSocio, Pago, Socio } from "@/lib/tipos";
import { esEstadoSocio } from "@/lib/tipos";

export const POR_PAGINA = 25;

export type SocioFila = Socio & {
  centro: { id: string; nombre: string } | null;
  tarifa: { id: string; nombre: string; cuota_mensual: number } | null;
};

const SELECT_SOCIO =
  "*, centro:centros(id, nombre), tarifa:tarifas(id, nombre, cuota_mensual)";

export type FiltrosSocios = {
  q?: string;
  centro?: string | null;
  tarifa?: string | null;
  estado?: string | null;
  pagina?: number;
};

/** Quita los caracteres que tienen significado en los filtros de PostgREST. */
function limpiarBusqueda(texto: string) {
  return texto.replace(/[,()%*\\]/g, " ").trim().slice(0, 60);
}

export async function listarSocios(filtros: FiltrosSocios) {
  const supabase = await createClient();
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const desde = (pagina - 1) * POR_PAGINA;

  let consulta = supabase
    .from("socios")
    .select(SELECT_SOCIO, { count: "exact" })
    .order("apellidos")
    .range(desde, desde + POR_PAGINA - 1);

  const q = limpiarBusqueda(filtros.q ?? "");
  if (q) {
    const patron = `%${q}%`;
    consulta = consulta.or(
      `nombre.ilike.${patron},apellidos.ilike.${patron},email.ilike.${patron},numero_socio.ilike.${patron}`
    );
  }
  if (filtros.centro) consulta = consulta.eq("centro_id", filtros.centro);
  if (filtros.tarifa) consulta = consulta.eq("tarifa_id", filtros.tarifa);
  if (esEstadoSocio(filtros.estado)) consulta = consulta.eq("estado", filtros.estado);

  const { data, count } = await consulta.returns<SocioFila[]>();
  return { socios: data ?? [], total: count ?? 0, pagina };
}

/** Cuántos socios hay en cada estado (para las pestañas de filtro). */
export async function contarPorEstado(centro: string | null) {
  const supabase = await createClient();
  let consulta = supabase.from("socios").select("estado");
  if (centro) consulta = consulta.eq("centro_id", centro);
  const { data } = await consulta.returns<{ estado: EstadoSocio }[]>();

  const conteo: Record<string, number> = { todos: 0, activo: 0, congelado: 0, impago: 0, baja: 0 };
  for (const fila of data ?? []) {
    conteo.todos += 1;
    conteo[fila.estado] = (conteo[fila.estado] ?? 0) + 1;
  }
  return conteo;
}

export async function obtenerSocio(id: string) {
  const supabase = await createClient();
  const hace30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [socio, pagos, accesos, accesos30, actividades] = await Promise.all([
    supabase.from("socios").select(SELECT_SOCIO).eq("id", id).maybeSingle<SocioFila>(),
    supabase
      .from("pagos")
      .select("*")
      .eq("socio_id", id)
      .order("periodo", { ascending: false })
      .order("concepto")
      .returns<Pago[]>(),
    supabase
      .from("accesos")
      .select("*, centro:centros(nombre)")
      .eq("socio_id", id)
      .order("entrada", { ascending: false })
      .limit(12)
      .returns<(Acceso & { centro: { nombre: string } | null })[]>(),
    supabase
      .from("accesos")
      .select("id", { count: "exact", head: true })
      .eq("socio_id", id)
      .gte("entrada", hace30),
    supabase
      .from("actividades")
      .select("*")
      .eq("socio_id", id)
      .order("created_at", { ascending: false })
      .returns<Actividad[]>(),
  ]);

  return {
    socio: socio.data ?? null,
    pagos: pagos.data ?? [],
    accesos: accesos.data ?? [],
    visitas30: accesos30.count ?? 0,
    actividades: actividades.data ?? [],
  };
}
