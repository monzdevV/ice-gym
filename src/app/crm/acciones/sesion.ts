"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { textoDe, type EstadoAccion } from "@/lib/acciones";
import { clienteAdmin } from "@/lib/supabase/admin";

export async function entrar(_anterior: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const identificador = textoDe(formData, "email");
  const password = textoDe(formData, "password");
  const siguiente = textoDe(formData, "siguiente");

  if (!identificador || !password) {
    return { ok: false, mensaje: "Escribe tu email o usuario y tu contraseña." };
  }

  // Sin «@» es un nombre de usuario de RRHH: se traduce a su email en el servidor.
  let email = identificador;
  if (!identificador.includes("@")) {
    const admin = clienteAdmin();
    const { data } = admin
      ? await admin.from("empleados").select("email").eq("usuario", identificador.toLowerCase()).maybeSingle()
      : { data: null };
    // Si el usuario no existe se intenta igualmente con una dirección imposible:
    // misma respuesta y tiempo parecido, para no revelar qué usuarios existen.
    email = data?.email ?? `${crypto.randomUUID()}@usuario.invalid`;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Nunca se reenvía el mensaje de Supabase tal cual: «Email not confirmed»
    // u otros revelarían que la cuenta existe (y van en inglés).
    const demasiados = error.status === 429 || /rate limit|too many/i.test(error.message);
    return {
      ok: false,
      mensaje: demasiados
        ? "Demasiados intentos seguidos. Espera un minuto y vuelve a probar."
        : "Usuario o contraseña incorrectos. Revisa los dos campos y vuelve a probar.",
    };
  }

  revalidatePath("/crm", "layout");
  // Sólo rutas internas del CRM: nada de «//otro-dominio» ni «/crm.evil».
  const destinoValido = /^\/crm(\/|\?|$)/.test(siguiente) && !siguiente.includes("//") && !siguiente.includes("\\");
  redirect(destinoValido ? siguiente : "/crm");
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/crm", "layout");
  redirect("/crm/acceso");
}
