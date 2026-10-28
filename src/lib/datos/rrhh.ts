import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Empleado,
  EmpleadoMini,
  Evaluacion,
  Fichaje,
  Nomina,
  PasoPlantilla,
  PerfilRrhh,
  TareaIncorporacion,
  Vacaciones,
} from "@/lib/rrhh";

/**
 * Lecturas de RRHH. Todas pasan por RLS: cada consulta devuelve sólo lo que
 * quien la hace puede ver (lo suyo, su equipo o todo si es administración).
 */

const FOTOS_TTL = 60 * 60;

/** Directorio público (nombre, puesto, foto…) de toda la plantilla, con la URL firmada de cada foto. */
export const directorio = cache(async (): Promise<EmpleadoMini[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rrhh_directorio");
  if (error) return [];
  const lista = (data ?? []) as EmpleadoMini[];
  const rutas = lista.map((e) => e.foto_path).filter((p): p is string => !!p);
  if (rutas.length) {
    const { data: firmadas } = await supabase.storage.from("empleados").createSignedUrls(rutas, FOTOS_TTL);
    const url = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));
    for (const e of lista) e.foto_url = e.foto_path ? (url.get(e.foto_path) ?? null) : null;
  }
  return lista;
});

/** Índice id → empleado del directorio. */
export async function indiceDirectorio() {
  const lista = await directorio();
  return new Map(lista.map((e) => [e.id, e]));
}

/** Quién usa el CRM y su papel en RRHH. Una sola vez por petición. */
export const perfilRrhh = cache(async (): Promise<PerfilRrhh> => {
  const supabase = await createClient();
  const { data: sesion } = await supabase.auth.getClaims();
  const email = (sesion?.claims.email as string | undefined) ?? null;
  const [{ data: yo }, { data: hayAdmin, error }] = await Promise.all([supabase.rpc("rrhh_yo"), supabase.rpc("rrhh_hay_admin")]);
  const empleado = yo ? ((await directorio()).find((e) => e.id === yo) ?? null) : null;
  const rol = empleado?.rol ?? null;
  return {
    email,
    empleado,
    rol,
    esAdmin: rol === "admin",
    esGestor: rol === "admin" || rol === "responsable",
    hayAdmin: !!hayAdmin,
    instalado: !error,
  };
});

/** ¿Gestiona quien llama a este empleado? Admin: a todos; responsable: a su equipo (directo e indirecto). */
export const gestionados = cache(async (): Promise<(id: string) => boolean> => {
  const perfil = await perfilRrhh();
  if (perfil.esAdmin) return () => true;
  if (perfil.rol !== "responsable" || !perfil.empleado) return () => false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("rrhh_subordinados", { p_jefe: perfil.empleado.id });
  const ids = new Set((data ?? []) as string[]);
  return (id: string) => ids.has(id);
});

/* ------------------------------- Empleados ------------------------------- */

export async function listarEmpleados(): Promise<Empleado[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("empleados").select("*").order("nombre").order("apellidos").returns<Empleado[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function obtenerEmpleado(id: string): Promise<Empleado | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("empleados").select("*").eq("id", id).maybeSingle<Empleado>();
  return data ?? null;
}

/** Departamentos y puestos ya usados, para sugerirlos al escribir. */
export async function sugerenciasEmpleado() {
  const lista = await directorio();
  const unicos = (v: (string | null)[]) => [...new Set(v.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "es"));
  return { departamentos: unicos(lista.map((e) => e.departamento)), puestos: unicos(lista.map((e) => e.puesto)) };
}

/* -------------------------------- Fichajes -------------------------------- */

export async function listarFichajes(f: { empleadoId?: string; desde?: string; hasta?: string; limite?: number } = {}): Promise<Fichaje[]> {
  const supabase = await createClient();
  let q = supabase.from("fichajes").select("*").order("fecha", { ascending: false }).order("entrada", { ascending: false });
  if (f.empleadoId) q = q.eq("empleado_id", f.empleadoId);
  if (f.desde) q = q.gte("fecha", f.desde);
  if (f.hasta) q = q.lte("fecha", f.hasta);
  const { data, error } = await q.limit(f.limite ?? 3000).returns<Fichaje[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Fichaje abierto (entrada sin salida) de un empleado. */
export async function fichajeAbierto(empleadoId: string): Promise<Fichaje | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("fichajes").select("*").eq("empleado_id", empleadoId).is("salida", null).maybeSingle<Fichaje>();
  return data ?? null;
}

/* ------------------------------- Vacaciones ------------------------------- */

export async function listarVacaciones(f: { empleadoId?: string; estado?: string; anio?: number } = {}): Promise<Vacaciones[]> {
  const supabase = await createClient();
  let q = supabase.from("vacaciones").select("*").order("inicio", { ascending: false });
  if (f.empleadoId) q = q.eq("empleado_id", f.empleadoId);
  if (f.estado) q = q.eq("estado", f.estado);
  if (f.anio) q = q.lte("inicio", `${f.anio}-12-31`).gte("fin", `${f.anio}-01-01`);
  const { data, error } = await q.limit(2000).returns<Vacaciones[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Solicitudes pendientes que el usuario puede resolver (las de su equipo, nunca las suyas). */
export async function contarVacacionesPorAprobar(): Promise<number> {
  const perfil = await perfilRrhh();
  if (!perfil.esGestor || !perfil.empleado) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("vacaciones")
    .select("id", { count: "exact", head: true })
    .eq("estado", "pendiente")
    .neq("empleado_id", perfil.empleado.id);
  return count ?? 0;
}

/* ----------------------------- Incorporación ------------------------------ */

export async function listarTareasIncorporacion(f: { empleadoId?: string; responsableId?: string } = {}): Promise<TareaIncorporacion[]> {
  const supabase = await createClient();
  let q = supabase.from("tareas_incorporacion").select("*").order("orden").order("created_at");
  if (f.empleadoId) q = q.eq("empleado_id", f.empleadoId);
  if (f.responsableId) q = q.eq("responsable_id", f.responsableId);
  const { data, error } = await q.limit(5000).returns<TareaIncorporacion[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listarPlantilla(): Promise<PasoPlantilla[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("plantilla_incorporacion").select("*").order("orden").returns<PasoPlantilla[]>();
  return data ?? [];
}

/* ------------------------------ Evaluaciones ------------------------------ */

export async function listarEvaluaciones(f: { empleadoId?: string; anio?: number; trimestre?: number } = {}): Promise<Evaluacion[]> {
  const supabase = await createClient();
  let q = supabase.from("evaluaciones").select("*").order("anio", { ascending: false }).order("trimestre", { ascending: false });
  if (f.empleadoId) q = q.eq("empleado_id", f.empleadoId);
  if (f.anio) q = q.eq("anio", f.anio);
  if (f.trimestre) q = q.eq("trimestre", f.trimestre);
  const { data, error } = await q.limit(3000).returns<Evaluacion[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/* -------------------------------- Nóminas --------------------------------- */

export async function listarNominas(f: { empleadoId?: string; anio?: number; firma?: string } = {}): Promise<Nomina[]> {
  const supabase = await createClient();
  let q = supabase
    .from("nominas")
    .select("id, created_at, empleado_id, anio, mes, archivo_path, archivo_nombre, tamano, hash_sha256, subida_por, vista_at, firmada_at, firma_ip, firma_huella, firma_metodo, estado_firma")
    .order("anio", { ascending: false })
    .order("mes", { ascending: false });
  if (f.empleadoId) q = q.eq("empleado_id", f.empleadoId);
  if (f.anio) q = q.eq("anio", f.anio);
  if (f.firma === "firmada") q = q.not("firmada_at", "is", null);
  if (f.firma === "pendiente") q = q.is("firmada_at", null);
  const { data, error } = await q.limit(3000).returns<Nomina[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}
