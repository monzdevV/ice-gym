"use server";

import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clienteAdmin } from "@/lib/supabase/admin";
import { textoDe } from "@/lib/acciones";
import { incluye } from "@/lib/b2b";
import { perfilRrhh } from "@/lib/datos/rrhh";
import { ESTADOS_EMPLEADO, ROLES, USUARIO_VALIDO, documentoValido, nombreEmpleado } from "@/lib/rrhh";
import type { Resultado } from "./b2b";

/**
 * Acciones de RRHH. Los permisos los impone la base de datos (RLS y funciones
 * de supabase/rrhh.sql); aquí se valida la entrada y se dan mensajes claros.
 * Lo que toca cuentas de acceso usa la clave de servicio y exige ser administrador.
 */

const nulo = (v: string) => (v === "" ? null : v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function refrescar() {
  revalidatePath("/crm", "layout");
}

/** Mensaje legible para errores de Postgres/PostgREST. */
function explicar(error: { message: string; code?: string; details?: string | null }, accion: string) {
  if (error.code === "23505") {
    const d = `${error.message} ${error.details ?? ""}`;
    if (d.includes("email")) return "Ya hay un empleado con ese email.";
    if (d.includes("documento")) return "Ya hay un empleado con ese DNI/NIE.";
    if (d.includes("usuario")) return "Ese nombre de usuario ya está cogido.";
    if (d.includes("trimestre")) return "Esa persona ya tiene evaluación en ese trimestre: edítala.";
    if (d.includes("mes")) return "Ya hay una nómina de ese mes.";
    if (d.includes("abierto")) return "Ya hay un fichaje abierto para esta persona.";
    return "Ya existe un registro igual.";
  }
  if (error.code === "42501" || /row-level security/i.test(error.message)) return `No tienes permiso para ${accion}.`;
  if (error.code === "23514") return "Algún dato no es válido. Revisa fechas y valores.";
  return error.message;
}

/** Contraseña razonable: 8+ caracteres con letras y números. Nunca se guarda ni se devuelve. */
function validarPassword(p: string) {
  if (p.length < 8) return "La contraseña necesita al menos 8 caracteres.";
  if (!/[a-zA-Z]/.test(p) || !/\d/.test(p)) return "La contraseña necesita letras y números.";
  if (p.length > 72) return "La contraseña es demasiado larga.";
  return null;
}

async function exigirAdmin() {
  const perfil = await perfilRrhh();
  return perfil.esAdmin ? perfil : null;
}

/** Fecha y hora de Madrid (YYYY-MM-DD, HH:MM) → instante ISO en UTC. */
function madridAIso(fecha: string, hora: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  const [h, mi] = hora.split(":").map(Number);
  const supuesto = Date.UTC(a, m - 1, d, h, mi);
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(supuesto));
  const v = (t: string) => Number(partes.find((p) => p.type === t)?.value);
  const enMadrid = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"));
  return new Date(supuesto - (enMadrid - supuesto)).toISOString();
}

/* ------------------------------- Arranque -------------------------------- */

/** Primer administrador de RRHH: sólo mientras no haya ninguno. */
export async function altaPrimerAdmin(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const nombre = textoDe(fd, "nombre");
  const usuario = textoDe(fd, "usuario").toLowerCase();
  if (nombre.length < 2) return { ok: false, mensaje: "Pon tu nombre." };
  if (usuario && !USUARIO_VALIDO.test(usuario)) return { ok: false, mensaje: "Usuario: 3 a 40 letras, números, puntos o guiones." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rrhh_alta_primer_admin", {
    p_nombre: nombre,
    p_apellidos: textoDe(fd, "apellidos"),
    p_usuario: usuario,
  });
  if (error) return { ok: false, mensaje: explicar(error, "configurar RRHH") };
  refrescar();
  return { ok: true, mensaje: "Ya tienes acceso de administrador a RRHH.", id: data as string };
}

/* ------------------------------- Empleados ------------------------------- */

async function subirFoto(supabase: Awaited<ReturnType<typeof createClient>>, empleadoId: string, archivo: File) {
  const tipos: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const ext = tipos[archivo.type];
  if (!ext) return { error: "La foto tiene que ser JPG, PNG o WebP." };
  if (archivo.size > 5 * 1024 * 1024) return { error: "La foto no puede pasar de 5 MB." };
  const ruta = `${empleadoId}/foto-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("empleados").upload(ruta, archivo, { contentType: archivo.type, upsert: true });
  if (error) return { error: `No se pudo subir la foto: ${error.message}` };
  return { ruta };
}

/** Crea (o vincula, si ya existe) la cuenta de Auth de un empleado. Devuelve el id de usuario. */
async function prepararCuenta(email: string, password: string, nombre: string) {
  const admin = clienteAdmin();
  if (!admin) return { error: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local: sin ella no se pueden crear cuentas." };
  const supabase = await createClient();
  const { data: existente } = await supabase.rpc("rrhh_usuario_por_email", { p_email: email });
  if (existente) return { userId: existente as string, vinculada: true, creada: false };
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (error || !data.user) return { error: `No se pudo crear la cuenta: ${error?.message ?? "error desconocido"}` };
  return { userId: data.user.id, vinculada: false, creada: true };
}

/** Bloquea o desbloquea el acceso al CRM (bajas). */
async function bloquearAcceso(userId: string, bloquear: boolean) {
  const admin = clienteAdmin();
  if (!admin) return;
  await admin.auth.admin.updateUserById(userId, { ban_duration: bloquear ? "876000h" : "none" });
}

/** Alta (sin `id`) o edición (con `id`) de un empleado. En el alta puede crear su cuenta del CRM. */
export async function guardarEmpleado(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const perfil = await exigirAdmin();
  if (!perfil) return { ok: false, mensaje: "Sólo administración puede dar de alta o editar empleados." };

  const id = textoDe(fd, "id");
  const nombre = textoDe(fd, "nombre");
  const email = textoDe(fd, "email").toLowerCase();
  const documento = textoDe(fd, "documento").toUpperCase().replace(/[\s-]/g, "");
  const fechaAlta = textoDe(fd, "fecha_alta");
  const fechaBaja = textoDe(fd, "fecha_baja");
  const jefe = textoDe(fd, "jefe_id");
  const rol = textoDe(fd, "rol");
  const estado = textoDe(fd, "estado") || "activo";
  const dias = Number(textoDe(fd, "dias_vacaciones") || 22);

  if (nombre.length < 2) return { ok: false, mensaje: "Pon el nombre." };
  if (!EMAIL.test(email)) return { ok: false, mensaje: "Escribe un email válido." };
  if (documento && !documentoValido(documento)) return { ok: false, mensaje: "El DNI/NIE no es válido (revisa la letra)." };
  if (!FECHA.test(fechaAlta)) return { ok: false, mensaje: "Pon la fecha de alta." };
  if (fechaBaja && (!FECHA.test(fechaBaja) || fechaBaja < fechaAlta)) return { ok: false, mensaje: "La fecha de baja no puede ser anterior al alta." };
  if (jefe && (!UUID.test(jefe) || jefe === id)) return { ok: false, mensaje: "Elige un responsable válido." };
  if (!incluye(ROLES, rol)) return { ok: false, mensaje: "Elige un rol." };
  if (!incluye(ESTADOS_EMPLEADO, estado)) return { ok: false, mensaje: "Estado no válido." };
  if (!Number.isInteger(dias) || dias < 0 || dias > 60) return { ok: false, mensaje: "Días de vacaciones: entre 0 y 60." };

  const foto = fd.get("foto");
  const archivoFoto = foto instanceof File && foto.size > 0 ? foto : null;

  const fila = {
    nombre,
    apellidos: textoDe(fd, "apellidos"),
    email,
    documento: nulo(documento),
    telefono: nulo(textoDe(fd, "telefono")),
    puesto: nulo(textoDe(fd, "puesto")),
    departamento: nulo(textoDe(fd, "departamento")),
    fecha_alta: fechaAlta,
    fecha_baja: nulo(fechaBaja),
    jefe_id: nulo(jefe),
    rol,
    estado: fechaBaja && fechaBaja <= new Date().toISOString().slice(0, 10) ? "inactivo" : estado,
    fecha_nacimiento: nulo(textoDe(fd, "fecha_nacimiento")),
    direccion: nulo(textoDe(fd, "direccion")),
    contacto_emergencia: nulo(textoDe(fd, "contacto_emergencia")),
    dias_vacaciones: dias,
    notas: nulo(textoDe(fd, "notas")),
  };

  const supabase = await createClient();

  /* ------------------------------ Edición ------------------------------ */
  if (id) {
    if (!UUID.test(id)) return { ok: false, mensaje: "Empleado no válido." };
    if (id === perfil.empleado?.id && (fila.rol !== "admin" || fila.estado !== "activo")) {
      return { ok: false, mensaje: "No puedes quitarte el rol de administrador ni darte de baja a ti mismo." };
    }
    if (fila.jefe_id) {
      const { data: subs } = await supabase.rpc("rrhh_subordinados", { p_jefe: id });
      if (((subs ?? []) as string[]).includes(fila.jefe_id)) return { ok: false, mensaje: "Ese responsable depende de esta persona: se formaría un círculo." };
    }
    const { data: antes } = await supabase.from("empleados").select("user_id, estado, foto_path").eq("id", id).maybeSingle();
    if (!antes) return { ok: false, mensaje: "Ese empleado ya no existe." };

    let fotoPath: string | undefined;
    if (archivoFoto) {
      const r = await subirFoto(supabase, id, archivoFoto);
      if (r.error) return { ok: false, mensaje: r.error };
      fotoPath = r.ruta;
    }
    const { error } = await supabase.from("empleados").update({ ...fila, ...(fotoPath ? { foto_path: fotoPath } : {}) }).eq("id", id);
    if (error) return { ok: false, mensaje: explicar(error, "editar empleados") };
    if (fotoPath && antes.foto_path) await supabase.storage.from("empleados").remove([antes.foto_path]);
    if (antes.user_id && antes.estado !== fila.estado) await bloquearAcceso(antes.user_id, fila.estado === "inactivo");
    refrescar();
    return { ok: true, mensaje: `${nombreEmpleado(fila)} actualizado.`, id };
  }

  /* -------------------------------- Alta -------------------------------- */
  const crearCuenta = fd.get("crear_cuenta") === "si";
  const usuario = textoDe(fd, "usuario").toLowerCase();
  const password = String(fd.get("password") ?? "");
  let userId: string | null = null;
  let cuentaCreada = false;
  let cuentaVinculada = false;

  if (crearCuenta) {
    if (!USUARIO_VALIDO.test(usuario)) return { ok: false, mensaje: "Usuario: 3 a 40 letras minúsculas, números, puntos o guiones." };
    const { data: cogido } = await supabase.from("empleados").select("id").eq("usuario", usuario).maybeSingle();
    if (cogido) return { ok: false, mensaje: "Ese nombre de usuario ya está cogido." };
    const fallo = validarPassword(password);
    if (fallo) return { ok: false, mensaje: fallo };
    const cuenta = await prepararCuenta(email, password, nombre);
    if (cuenta.error) return { ok: false, mensaje: cuenta.error };
    userId = cuenta.userId!;
    cuentaCreada = !!cuenta.creada;
    cuentaVinculada = !!cuenta.vinculada;
  }

  const { data, error } = await supabase
    .from("empleados")
    .insert({ ...fila, user_id: userId, usuario: crearCuenta ? usuario : null })
    .select("id")
    .single();

  if (error) {
    // Sin ficha no debe quedar una cuenta huérfana.
    if (cuentaCreada && userId) await clienteAdmin()?.auth.admin.deleteUser(userId);
    return { ok: false, mensaje: explicar(error, "dar de alta empleados") };
  }

  const avisos: string[] = [];
  if (archivoFoto) {
    const r = await subirFoto(supabase, data.id, archivoFoto);
    if (r.error) avisos.push(r.error);
    else await supabase.from("empleados").update({ foto_path: r.ruta }).eq("id", data.id);
  }

  if (crearCuenta) {
    // La tarea «Crear usuario del CRM» de su incorporación queda hecha.
    const { data: tarea } = await supabase
      .from("tareas_incorporacion")
      .select("id")
      .eq("empleado_id", data.id)
      .ilike("nombre", "crear usuario del crm")
      .maybeSingle();
    if (tarea) await supabase.rpc("rrhh_marcar_tarea", { p_id: tarea.id, p_hecha: true });
  }

  if (fd.get("equipo_comercial") === "si") {
    const { data: ya } = await supabase.from("equipo").select("id").ilike("email", email).maybeSingle();
    if (!ya) {
      const { error: e } = await supabase
        .from("equipo")
        .insert({ nombre, apellidos: fila.apellidos, email, puesto: fila.puesto, color: "azul" });
      if (e) avisos.push("No se pudo añadir al equipo comercial.");
    }
  }

  refrescar();
  const cuentaTexto = cuentaVinculada ? " Ya tenía cuenta con ese email: se ha vinculado y su contraseña no cambia." : cuentaCreada ? " Cuenta del CRM creada." : "";
  return { ok: true, mensaje: `${nombreEmpleado(fila)} dado de alta.${cuentaTexto}${avisos.length ? ` ${avisos.join(" ")}` : ""}`, id: data.id };
}

/** Cuenta del CRM de un empleado ya dado de alta: crearla o cambiar la contraseña. */
export async function gestionarCuenta(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const perfil = await exigirAdmin();
  if (!perfil) return { ok: false, mensaje: "Sólo administración gestiona cuentas." };
  const admin = clienteAdmin();
  if (!admin) return { ok: false, mensaje: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local: sin ella no se pueden gestionar cuentas." };

  const id = textoDe(fd, "id");
  const password = String(fd.get("password") ?? "");
  const usuario = textoDe(fd, "usuario").toLowerCase();
  if (!UUID.test(id)) return { ok: false, mensaje: "Empleado no válido." };
  const fallo = validarPassword(password);
  if (fallo) return { ok: false, mensaje: fallo };

  const supabase = await createClient();
  const { data: emp } = await supabase.from("empleados").select("id, nombre, apellidos, email, user_id, usuario, estado").eq("id", id).maybeSingle();
  if (!emp) return { ok: false, mensaje: "Ese empleado ya no existe." };

  if (emp.user_id) {
    const { error } = await admin.auth.admin.updateUserById(emp.user_id, { password });
    if (error) return { ok: false, mensaje: `No se pudo cambiar la contraseña: ${error.message}` };
    if (usuario && usuario !== emp.usuario) {
      if (!USUARIO_VALIDO.test(usuario)) return { ok: false, mensaje: "Usuario: 3 a 40 letras minúsculas, números, puntos o guiones." };
      const { error: e } = await supabase.from("empleados").update({ usuario }).eq("id", id);
      if (e) return { ok: false, mensaje: explicar(e, "cambiar el usuario") };
    }
    refrescar();
    return { ok: true, mensaje: `Contraseña de ${emp.nombre} cambiada.` };
  }

  if (!USUARIO_VALIDO.test(usuario)) return { ok: false, mensaje: "Usuario: 3 a 40 letras minúsculas, números, puntos o guiones." };
  const cuenta = await prepararCuenta(emp.email, password, emp.nombre);
  if (cuenta.error) return { ok: false, mensaje: cuenta.error };
  const { error } = await supabase.from("empleados").update({ user_id: cuenta.userId, usuario }).eq("id", id);
  if (error) {
    if (cuenta.creada) await admin.auth.admin.deleteUser(cuenta.userId!);
    return { ok: false, mensaje: explicar(error, "vincular la cuenta") };
  }
  if (emp.estado === "inactivo") await bloquearAcceso(cuenta.userId!, true);
  const { data: tarea } = await supabase
    .from("tareas_incorporacion")
    .select("id")
    .eq("empleado_id", id)
    .ilike("nombre", "crear usuario del crm")
    .maybeSingle();
  if (tarea) await supabase.rpc("rrhh_marcar_tarea", { p_id: tarea.id, p_hecha: true });
  refrescar();
  return {
    ok: true,
    mensaje: cuenta.vinculada ? `${emp.nombre} ya tenía cuenta con su email: queda vinculada (su contraseña no cambia).` : `Cuenta de ${emp.nombre} creada.`,
  };
}

/* -------------------------------- Fichajes -------------------------------- */

/** Entrada o salida del propio usuario. */
export async function fichar(): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rrhh_fichar");
  if (error) return { ok: false, mensaje: explicar(error, "fichar") };
  refrescar();
  const fila = data as { salida: string | null };
  return { ok: true, mensaje: fila.salida ? "Salida registrada." : "Entrada registrada." };
}

/** Registro manual o corrección (administración). */
export async function guardarFichaje(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const id = textoDe(fd, "id");
  const empleado = textoDe(fd, "empleado_id");
  const fecha = textoDe(fd, "fecha");
  const hEntrada = textoDe(fd, "entrada");
  const hSalida = textoDe(fd, "salida");
  const estado = textoDe(fd, "estado") === "incidencia" ? "incidencia" : "correcto";
  if (!UUID.test(empleado)) return { ok: false, mensaje: "Elige un empleado." };
  if (!FECHA.test(fecha)) return { ok: false, mensaje: "Pon la fecha." };
  if (!HORA.test(hEntrada)) return { ok: false, mensaje: "Pon la hora de entrada." };
  if (hSalida && !HORA.test(hSalida)) return { ok: false, mensaje: "La hora de salida no es válida." };

  const entrada = madridAIso(fecha, hEntrada);
  // Si la salida es anterior a la entrada, es del día siguiente (turno de noche).
  let salida: string | null = null;
  if (hSalida) {
    salida = madridAIso(fecha, hSalida);
    if (salida <= entrada) salida = new Date(new Date(salida).getTime() + 86_400_000).toISOString();
  }

  const perfil = await perfilRrhh();
  const fila = {
    empleado_id: empleado,
    fecha,
    entrada,
    salida,
    estado,
    incidencia: nulo(textoDe(fd, "incidencia")),
    origen: "manual",
    creado_por: perfil.empleado?.id ?? null,
  };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("fichajes").update(fila).eq("id", id) : await supabase.from("fichajes").insert(fila);
  if (error) return { ok: false, mensaje: explicar(error, "gestionar horarios") };
  refrescar();
  return { ok: true, mensaje: id ? "Registro corregido." : "Registro añadido." };
}

export async function borrarFichaje(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("fichajes").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, mensaje: explicar(error, "borrar fichajes") };
  if (!count) return { ok: false, mensaje: "No tienes permiso para borrar este registro." };
  refrescar();
  return { ok: true, mensaje: "Registro borrado." };
}

/* ------------------------------- Vacaciones ------------------------------- */

export async function solicitarVacaciones(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const perfil = await perfilRrhh();
  if (!perfil.empleado) return { ok: false, mensaje: "Tu usuario no tiene ficha de empleado." };
  const inicio = textoDe(fd, "inicio");
  const fin = textoDe(fd, "fin");
  const para = textoDe(fd, "empleado_id");
  if (!FECHA.test(inicio) || !FECHA.test(fin)) return { ok: false, mensaje: "Elige las fechas de inicio y fin." };
  if (fin < inicio) return { ok: false, mensaje: "La fecha de fin no puede ser anterior al inicio." };
  const empleadoId = para && perfil.esAdmin && UUID.test(para) ? para : perfil.empleado.id;

  const supabase = await createClient();
  const { error } = await supabase.from("vacaciones").insert({
    empleado_id: empleadoId,
    inicio,
    fin,
    comentario: nulo(textoDe(fd, "comentario")),
    estado: "pendiente",
    solicitada_por: perfil.empleado.id,
  });
  if (error) return { ok: false, mensaje: explicar(error, "solicitar vacaciones") };
  refrescar();
  return { ok: true, mensaje: "Solicitud enviada: queda pendiente de aprobación." };
}

export async function resolverVacaciones(id: string, aprobar: boolean, respuesta: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rrhh_resolver_vacaciones", { p_id: id, p_aprobar: aprobar, p_respuesta: respuesta });
  if (error) return { ok: false, mensaje: explicar(error, "resolver vacaciones") };
  refrescar();
  return { ok: true, mensaje: aprobar ? "Vacaciones aprobadas." : "Vacaciones denegadas." };
}

export async function cancelarVacaciones(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rrhh_cancelar_vacaciones", { p_id: id });
  if (error) return { ok: false, mensaje: explicar(error, "cancelar la solicitud") };
  refrescar();
  return { ok: true, mensaje: "Solicitud cancelada." };
}

/* ----------------------------- Incorporación ------------------------------ */

export async function marcarTarea(id: string, hecha: boolean): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rrhh_marcar_tarea", { p_id: id, p_hecha: hecha });
  if (error) return { ok: false, mensaje: explicar(error, "marcar la tarea") };
  refrescar();
  return { ok: true, mensaje: hecha ? "Tarea completada." : "Tarea reabierta." };
}

/** Alta o edición de una tarea de incorporación de un empleado (administración). */
export async function guardarTarea(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const id = textoDe(fd, "id");
  const empleado = textoDe(fd, "empleado_id");
  const nombre = textoDe(fd, "nombre");
  const responsable = textoDe(fd, "responsable_id");
  const limite = textoDe(fd, "fecha_limite");
  if (!UUID.test(empleado)) return { ok: false, mensaje: "Falta el empleado." };
  if (nombre.length < 2) return { ok: false, mensaje: "Pon el nombre de la tarea." };
  if (responsable && !UUID.test(responsable)) return { ok: false, mensaje: "Responsable no válido." };
  if (limite && !FECHA.test(limite)) return { ok: false, mensaje: "Fecha límite no válida." };

  const fila = {
    empleado_id: empleado,
    nombre,
    descripcion: nulo(textoDe(fd, "descripcion")),
    responsable_id: nulo(responsable),
    fecha_limite: nulo(limite),
    obligatoria: fd.get("obligatoria") === "si",
  };
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("tareas_incorporacion").update(fila).eq("id", id);
    if (error) return { ok: false, mensaje: explicar(error, "editar tareas de incorporación") };
  } else {
    const { data: ultima } = await supabase
      .from("tareas_incorporacion")
      .select("orden")
      .eq("empleado_id", empleado)
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("tareas_incorporacion").insert({ ...fila, orden: (ultima?.orden ?? 0) + 1 });
    if (error) return { ok: false, mensaje: explicar(error, "añadir tareas de incorporación") };
  }
  refrescar();
  return { ok: true, mensaje: id ? "Tarea actualizada." : "Tarea añadida." };
}

export async function borrarTarea(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("tareas_incorporacion").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, mensaje: explicar(error, "borrar tareas") };
  if (!count) return { ok: false, mensaje: "No tienes permiso para borrar esta tarea." };
  refrescar();
  return { ok: true, mensaje: "Tarea borrada." };
}

/** Pasos de la plantilla que se genera en cada alta (administración). */
export async function guardarPaso(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const id = textoDe(fd, "id");
  const nombre = textoDe(fd, "nombre");
  const plazo = Number(textoDe(fd, "dias_plazo") || 0);
  if (nombre.length < 2) return { ok: false, mensaje: "Pon el nombre de la tarea." };
  if (!Number.isInteger(plazo) || plazo < 0 || plazo > 365) return { ok: false, mensaje: "Plazo: de 0 a 365 días." };
  const fila = {
    nombre,
    descripcion: nulo(textoDe(fd, "descripcion")),
    dias_plazo: plazo,
    obligatoria: fd.get("obligatoria") === "si",
    responsable: textoDe(fd, "responsable") === "rrhh" ? "rrhh" : "jefe",
  };
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("plantilla_incorporacion").update(fila).eq("id", id);
    if (error) return { ok: false, mensaje: explicar(error, "editar la plantilla") };
  } else {
    const { data: ultima } = await supabase.from("plantilla_incorporacion").select("orden").order("orden", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("plantilla_incorporacion").insert({ ...fila, orden: (ultima?.orden ?? 0) + 1 });
    if (error) return { ok: false, mensaje: explicar(error, "editar la plantilla") };
  }
  refrescar();
  return { ok: true, mensaje: id ? "Paso actualizado." : "Paso añadido a la plantilla." };
}

export async function borrarPaso(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("plantilla_incorporacion").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, mensaje: explicar(error, "editar la plantilla") };
  if (!count) return { ok: false, mensaje: "No tienes permiso para editar la plantilla." };
  refrescar();
  return { ok: true, mensaje: "Paso quitado de la plantilla." };
}

/* ------------------------------ Evaluaciones ------------------------------ */

export async function guardarEvaluacion(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const perfil = await perfilRrhh();
  if (!perfil.esGestor || !perfil.empleado) return { ok: false, mensaje: "Sólo responsables y administración evalúan." };
  const id = textoDe(fd, "id");
  const empleado = textoDe(fd, "empleado_id");
  const anio = Number(textoDe(fd, "anio"));
  const trimestre = Number(textoDe(fd, "trimestre"));
  const puntuacion = Number(textoDe(fd, "puntuacion"));
  const fecha = textoDe(fd, "fecha");
  if (!UUID.test(empleado)) return { ok: false, mensaje: "Elige a quién evalúas." };
  if (empleado === perfil.empleado.id) return { ok: false, mensaje: "No puedes evaluarte a ti mismo." };
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return { ok: false, mensaje: "Año no válido." };
  if (![1, 2, 3, 4].includes(trimestre)) return { ok: false, mensaje: "Elige el trimestre." };
  if (![1, 2, 3, 4, 5].includes(puntuacion)) return { ok: false, mensaje: "Elige una puntuación de 1 a 5." };
  if (fecha && !FECHA.test(fecha)) return { ok: false, mensaje: "Fecha no válida." };

  const fila = {
    empleado_id: empleado,
    anio,
    trimestre,
    puntuacion,
    comentarios: nulo(textoDe(fd, "comentarios")),
    evaluador_id: perfil.empleado.id,
    fecha: fecha || new Date().toISOString().slice(0, 10),
    visible_empleado: fd.get("visible_empleado") === "si",
  };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("evaluaciones").update(fila).eq("id", id) : await supabase.from("evaluaciones").insert(fila);
  if (error) return { ok: false, mensaje: explicar(error, "evaluar a esta persona") };
  refrescar();
  return { ok: true, mensaje: id ? "Evaluación actualizada." : "Evaluación guardada." };
}

export async function borrarEvaluacion(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("evaluaciones").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, mensaje: explicar(error, "borrar evaluaciones") };
  if (!count) return { ok: false, mensaje: "No tienes permiso para borrar esta evaluación." };
  refrescar();
  return { ok: true, mensaje: "Evaluación borrada." };
}

/* -------------------------------- Nóminas --------------------------------- */

const MAX_PDF = 10 * 1024 * 1024;

/** Sube (o sustituye, si aún no está firmada) la nómina de un mes. */
export async function subirNomina(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const perfil = await exigirAdmin();
  if (!perfil) return { ok: false, mensaje: "Sólo administración sube nóminas." };
  const empleado = textoDe(fd, "empleado_id");
  const anio = Number(textoDe(fd, "anio"));
  const mes = Number(textoDe(fd, "mes"));
  const archivo = fd.get("archivo");
  if (!UUID.test(empleado)) return { ok: false, mensaje: "Elige el empleado." };
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return { ok: false, mensaje: "Año no válido." };
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return { ok: false, mensaje: "Elige el mes." };
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, mensaje: "Adjunta el PDF de la nómina." };
  if (archivo.size > MAX_PDF) return { ok: false, mensaje: "El PDF no puede pasar de 10 MB." };

  const bytes = Buffer.from(await archivo.arrayBuffer());
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return { ok: false, mensaje: "El archivo no es un PDF." };
  const hash = createHash("sha256").update(bytes).digest("hex");

  const supabase = await createClient();
  const { data: previa } = await supabase
    .from("nominas")
    .select("id, archivo_path, firmada_at")
    .eq("empleado_id", empleado)
    .eq("anio", anio)
    .eq("mes", mes)
    .maybeSingle();
  if (previa?.firmada_at) return { ok: false, mensaje: "La nómina de ese mes ya está firmada: no se puede sustituir." };

  const ruta = `${empleado}/${anio}-${String(mes).padStart(2, "0")}-${randomUUID()}.pdf`;
  const { error: errorSubida } = await supabase.storage.from("nominas").upload(ruta, bytes, { contentType: "application/pdf" });
  if (errorSubida) return { ok: false, mensaje: `No se pudo subir el PDF: ${errorSubida.message}` };

  const fila = {
    empleado_id: empleado,
    anio,
    mes,
    archivo_path: ruta,
    archivo_nombre: archivo.name.slice(0, 200) || "nomina.pdf",
    tamano: archivo.size,
    hash_sha256: hash,
    subida_por: perfil.empleado?.id ?? null,
  };
  const { error } = previa
    ? await supabase.from("nominas").update(fila).eq("id", previa.id)
    : await supabase.from("nominas").insert(fila);
  if (error) {
    await supabase.storage.from("nominas").remove([ruta]);
    return { ok: false, mensaje: explicar(error, "subir nóminas") };
  }
  if (previa) await supabase.storage.from("nominas").remove([previa.archivo_path]);
  refrescar();
  return { ok: true, mensaje: previa ? "Nómina sustituida." : "Nómina subida. El empleado ya puede verla y firmarla." };
}

/** Enlace temporal al PDF. Si quien la abre es su dueño, queda registrado que la ha visto. */
export async function abrirNomina(id: string): Promise<Resultado & { url?: string }> {
  const supabase = await createClient();
  const { data: n } = await supabase.from("nominas").select("id, archivo_path, empleado_id").eq("id", id).maybeSingle();
  if (!n) return { ok: false, mensaje: "No tienes acceso a esta nómina." };
  const { data, error } = await supabase.storage.from("nominas").createSignedUrl(n.archivo_path, 120);
  if (error || !data) return { ok: false, mensaje: "No se pudo abrir el PDF." };
  await supabase.rpc("rrhh_marcar_nomina_vista", { p_id: id });
  refrescar();
  return { ok: true, mensaje: "", url: data.signedUrl };
}

/** Firma (confirmación de recepción) del propio empleado. */
export async function firmarNomina(id: string): Promise<Resultado> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("rrhh_firmar_nomina", { p_id: id, p_ip: ip, p_user_agent: h.get("user-agent") });
  if (error) return { ok: false, mensaje: explicar(error, "firmar esta nómina") };
  refrescar();
  return { ok: true, mensaje: "Nómina firmada. Queda registrada la fecha y tu usuario." };
}

export async function borrarNomina(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data: n } = await supabase.from("nominas").select("archivo_path, firmada_at").eq("id", id).maybeSingle();
  if (!n) return { ok: false, mensaje: "Esa nómina ya no existe." };
  if (n.firmada_at) return { ok: false, mensaje: "Una nómina firmada no se puede borrar." };
  const { error, count } = await supabase.from("nominas").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, mensaje: explicar(error, "borrar nóminas") };
  if (!count) return { ok: false, mensaje: "No tienes permiso para borrar nóminas." };
  await supabase.storage.from("nominas").remove([n.archivo_path]);
  refrescar();
  return { ok: true, mensaje: "Nómina borrada." };
}
