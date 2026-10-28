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
    if (!data) return { ok: false, mensaje: "Usuario o contraseña incorrectos." };
    email = data.email;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      ok: false,
      mensaje:
        error.message === "Invalid login credentials"
          ? "Usuario o contraseña incorrectos."
          : error.message,
    };
  }

  revalidatePath("/crm", "layout");
  redirect(siguiente.startsWith("/crm") ? siguiente : "/crm");
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/crm", "layout");
  redirect("/crm/acceso");
}
