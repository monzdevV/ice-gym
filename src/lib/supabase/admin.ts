import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * Cliente con la clave de servicio, SÓLO para la administración de cuentas
 * (crear usuarios del CRM, cambiar contraseñas, bloquear accesos) y para
 * resolver el nombre de usuario al entrar. Se salta RLS: quien lo use tiene
 * que comprobar antes los permisos. Nunca llega al navegador.
 */
export function clienteAdmin() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clave) return null;
  const { url } = supabaseEnv();
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}
