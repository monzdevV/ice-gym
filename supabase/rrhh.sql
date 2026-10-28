-- =============================================================================
-- RRHH de Ice Gym: empleados, cuentas, fichajes, vacaciones, incorporación,
-- evaluaciones trimestrales y nóminas con firma de recepción.
--
-- Ejecútalo una vez en el SQL Editor de Supabase (se puede volver a ejecutar).
-- No toca las tablas comerciales (equipo, empresas, contactos, oportunidades,
-- interacciones).
--
-- Seguridad: todas las tablas tienen RLS. Los permisos se deciden aquí, en la
-- base de datos, no en la interfaz:
--   · admin        → todo RRHH.
--   · responsable  → su equipo (subordinados directos e indirectos por jefe_id).
--   · empleado     → sólo lo suyo.
-- Las acciones con reglas propias (fichar, aprobar vacaciones, marcar tareas,
-- firmar nóminas) son funciones `security definer` que validan quién llama.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

/* --------------------------------- Empleados -------------------------------- */

create table if not exists public.empleados (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Cuenta de acceso al CRM (Supabase Auth). La contraseña vive sólo en Auth, cifrada.
  user_id uuid unique references auth.users (id) on delete set null,
  usuario text unique check (usuario ~ '^[a-z0-9._-]{3,40}$'),
  rol text not null default 'empleado' check (rol in ('admin', 'responsable', 'empleado')),
  nombre text not null check (length(trim(nombre)) >= 2),
  apellidos text not null default '',
  foto_path text,
  documento text,
  email text not null,
  telefono text,
  puesto text,
  departamento text,
  fecha_alta date not null default current_date,
  fecha_baja date,
  jefe_id uuid references public.empleados (id) on delete set null,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  fecha_nacimiento date,
  direccion text,
  contacto_emergencia text,
  dias_vacaciones int not null default 22 check (dias_vacaciones between 0 and 60),
  notas text,
  constraint empleados_jefe_distinto check (jefe_id is null or jefe_id <> id),
  constraint empleados_baja_posterior check (fecha_baja is null or fecha_baja >= fecha_alta)
);

create unique index if not exists empleados_email_unico on public.empleados (lower(email));
create unique index if not exists empleados_documento_unico on public.empleados (upper(documento)) where documento is not null;
create index if not exists empleados_jefe on public.empleados (jefe_id);

create or replace function public.rrhh_tocar_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists empleados_updated_at on public.empleados;
create trigger empleados_updated_at before update on public.empleados
  for each row execute function public.rrhh_tocar_updated_at();

/* ------------------------- Funciones de permisos ---------------------------- */

-- Ficha del usuario que llama (sólo si está activo).
create or replace function public.rrhh_yo() returns uuid
language sql stable security definer set search_path = public as $$
  select id from empleados where user_id = auth.uid() and estado = 'activo' limit 1
$$;

create or replace function public.rrhh_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from empleados where user_id = auth.uid() and estado = 'activo' limit 1
$$;

create or replace function public.rrhh_es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.rrhh_rol() = 'admin', false)
$$;

-- Subordinados directos e indirectos de un empleado.
create or replace function public.rrhh_subordinados(p_jefe uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  with recursive s as (
    select id from empleados where jefe_id = p_jefe
    union
    select e.id from empleados e join s on e.jefe_id = s.id
  )
  select id from s
$$;

-- ¿Puede quien llama gestionar a este empleado? Admin: a todos. Responsable: a su equipo.
create or replace function public.rrhh_gestiona(p_empleado uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case public.rrhh_rol()
    when 'admin' then true
    when 'responsable' then exists (select 1 from public.rrhh_subordinados(public.rrhh_yo()) s where s = p_empleado)
    else false
  end
$$;

-- Ver: lo propio o lo que se gestiona.
create or replace function public.rrhh_puede_ver(p_empleado uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_empleado = public.rrhh_yo() or public.rrhh_gestiona(p_empleado)
$$;

create or replace function public.rrhh_hay_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from empleados where rol = 'admin' and estado = 'activo' and user_id is not null)
$$;

-- Directorio con datos NO privados (nombre, puesto, foto…) para pintar jefes,
-- evaluadores y responsables. Nada de DNI, teléfono, dirección ni notas.
create or replace function public.rrhh_directorio()
returns table (id uuid, nombre text, apellidos text, puesto text, departamento text, foto_path text, estado text, rol text, jefe_id uuid)
language sql stable security definer set search_path = public as $$
  select e.id, e.nombre, e.apellidos, e.puesto, e.departamento, e.foto_path, e.estado, e.rol, e.jefe_id
  from empleados e
  where auth.uid() is not null
  order by e.nombre, e.apellidos
$$;

-- Cuenta de Auth ya existente con ese email (para vincularla en vez de crear otra). Sólo admin.
create or replace function public.rrhh_usuario_por_email(p_email text) returns uuid
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.rrhh_es_admin() then raise exception 'Sólo administración puede consultar cuentas.'; end if;
  return (select u.id from auth.users u where lower(u.email) = lower(p_email) limit 1);
end $$;

-- Primer administrador: sólo funciona mientras no haya ninguno.
create or replace function public.rrhh_alta_primer_admin(p_nombre text, p_apellidos text, p_usuario text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_email text := auth.jwt() ->> 'email';
begin
  if auth.uid() is null then raise exception 'Sin sesión.'; end if;
  if public.rrhh_hay_admin() then raise exception 'RRHH ya tiene administración.'; end if;

  select id into v_id from empleados where lower(email) = lower(v_email) limit 1;
  if v_id is null then
    insert into empleados (user_id, usuario, rol, nombre, apellidos, email, puesto, departamento)
    values (auth.uid(), nullif(lower(p_usuario), ''), 'admin', p_nombre, coalesce(p_apellidos, ''), v_email, 'Administración', 'Dirección')
    returning id into v_id;
  else
    update empleados set user_id = auth.uid(), rol = 'admin', estado = 'activo', usuario = coalesce(usuario, nullif(lower(p_usuario), ''))
    where id = v_id;
  end if;
  return v_id;
end $$;

alter table public.empleados enable row level security;

drop policy if exists empleados_ver on public.empleados;
create policy empleados_ver on public.empleados for select to authenticated
  using (public.rrhh_puede_ver(id));

drop policy if exists empleados_crear on public.empleados;
create policy empleados_crear on public.empleados for insert to authenticated
  with check (public.rrhh_es_admin());

drop policy if exists empleados_editar on public.empleados;
create policy empleados_editar on public.empleados for update to authenticated
  using (public.rrhh_es_admin()) with check (public.rrhh_es_admin());

drop policy if exists empleados_borrar on public.empleados;
create policy empleados_borrar on public.empleados for delete to authenticated
  using (public.rrhh_es_admin() and user_id is distinct from auth.uid());

/* --------------------------------- Fichajes --------------------------------- */

create table if not exists public.fichajes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  fecha date not null,
  entrada timestamptz not null,
  salida timestamptz,
  minutos int generated always as (
    case when salida is null then null else floor(extract(epoch from (salida - entrada)) / 60)::int end
  ) stored,
  estado text not null default 'correcto' check (estado in ('correcto', 'incidencia')),
  incidencia text,
  origen text not null default 'fichaje' check (origen in ('fichaje', 'manual')),
  creado_por uuid references public.empleados (id) on delete set null,
  constraint fichajes_salida_posterior check (salida is null or salida > entrada)
);

create index if not exists fichajes_empleado_fecha on public.fichajes (empleado_id, fecha desc);
-- Un único fichaje abierto por persona.
create unique index if not exists fichajes_uno_abierto on public.fichajes (empleado_id) where salida is null;

alter table public.fichajes enable row level security;

drop policy if exists fichajes_ver on public.fichajes;
create policy fichajes_ver on public.fichajes for select to authenticated
  using (public.rrhh_puede_ver(empleado_id));

drop policy if exists fichajes_gestionar on public.fichajes;
create policy fichajes_gestionar on public.fichajes for all to authenticated
  using (public.rrhh_es_admin()) with check (public.rrhh_es_admin());

-- Entrada o salida del propio empleado: abre un fichaje o cierra el abierto.
create or replace function public.rrhh_fichar() returns public.fichajes
language plpgsql security definer set search_path = public as $$
declare
  v_yo uuid := public.rrhh_yo();
  v_fila fichajes;
begin
  if v_yo is null then raise exception 'Tu usuario no tiene ficha de empleado activa.'; end if;

  select * into v_fila from fichajes where empleado_id = v_yo and salida is null for update;
  if found then
    update fichajes set
      salida = greatest(now(), entrada + interval '1 minute'),
      estado = case when now() - entrada > interval '14 hours' then 'incidencia' else estado end,
      incidencia = case when now() - entrada > interval '14 hours'
        then coalesce(incidencia || ' · ', '') || 'Salida registrada más de 14 h después de la entrada.' else incidencia end
    where id = v_fila.id
    returning * into v_fila;
  else
    insert into fichajes (empleado_id, fecha, entrada, origen, creado_por)
    values (v_yo, (now() at time zone 'Europe/Madrid')::date, now(), 'fichaje', v_yo)
    returning * into v_fila;
  end if;
  return v_fila;
end $$;

/* -------------------------------- Vacaciones -------------------------------- */

create table if not exists public.vacaciones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  inicio date not null,
  fin date not null,
  dias int not null default 0,
  comentario text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'denegada', 'cancelada')),
  solicitada_por uuid references public.empleados (id) on delete set null,
  resuelta_por uuid references public.empleados (id) on delete set null,
  resuelta_at timestamptz,
  respuesta text,
  cancelada_at timestamptz,
  constraint vacaciones_fechas check (fin >= inicio)
);

create index if not exists vacaciones_empleado on public.vacaciones (empleado_id, inicio desc);
create index if not exists vacaciones_pendientes on public.vacaciones (estado) where estado = 'pendiente';

-- Días laborables (lunes a viernes) entre dos fechas, ambas incluidas.
create or replace function public.rrhh_dias_laborables(p_inicio date, p_fin date) returns int
language sql immutable as $$
  select count(*)::int from generate_series(p_inicio, p_fin, interval '1 day') d
  where extract(isodow from d) < 6
$$;

create or replace function public.rrhh_vacaciones_validar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.dias := public.rrhh_dias_laborables(new.inicio, new.fin);
  if new.dias = 0 then raise exception 'El periodo elegido no tiene días laborables.'; end if;
  if new.estado in ('pendiente', 'aprobada') and exists (
    select 1 from vacaciones v
    where v.empleado_id = new.empleado_id and v.id <> new.id and v.estado in ('pendiente', 'aprobada')
      and daterange(v.inicio, v.fin, '[]') && daterange(new.inicio, new.fin, '[]')
  ) then
    raise exception 'Ya hay una solicitud pendiente o aprobada que se solapa con esas fechas.';
  end if;
  return new;
end $$;

drop trigger if exists vacaciones_validar on public.vacaciones;
create trigger vacaciones_validar before insert or update of inicio, fin, estado on public.vacaciones
  for each row execute function public.rrhh_vacaciones_validar();

alter table public.vacaciones enable row level security;

drop policy if exists vacaciones_ver on public.vacaciones;
create policy vacaciones_ver on public.vacaciones for select to authenticated
  using (public.rrhh_puede_ver(empleado_id));

-- Se solicita para uno mismo (o administración en nombre de alguien), siempre pendiente.
drop policy if exists vacaciones_solicitar on public.vacaciones;
create policy vacaciones_solicitar on public.vacaciones for insert to authenticated
  with check (
    (empleado_id = public.rrhh_yo() or public.rrhh_es_admin())
    and estado = 'pendiente' and resuelta_por is null and resuelta_at is null
  );

-- Aprobar, denegar y cancelar van por funciones; administración puede borrar.
drop policy if exists vacaciones_borrar on public.vacaciones;
create policy vacaciones_borrar on public.vacaciones for delete to authenticated
  using (public.rrhh_es_admin());

create or replace function public.rrhh_resolver_vacaciones(p_id uuid, p_aprobar boolean, p_respuesta text default null)
returns public.vacaciones
language plpgsql security definer set search_path = public as $$
declare
  v_yo uuid := public.rrhh_yo();
  v_fila vacaciones;
begin
  select * into v_fila from vacaciones where id = p_id for update;
  if not found then raise exception 'La solicitud no existe.'; end if;
  if v_fila.empleado_id = v_yo then raise exception 'No puedes aprobar ni denegar tus propias vacaciones.'; end if;
  if not public.rrhh_gestiona(v_fila.empleado_id) then raise exception 'No eres responsable de esta persona.'; end if;
  if v_fila.estado <> 'pendiente' then raise exception 'La solicitud ya está resuelta.'; end if;

  update vacaciones set
    estado = case when p_aprobar then 'aprobada' else 'denegada' end,
    resuelta_por = v_yo,
    resuelta_at = now(),
    respuesta = nullif(trim(coalesce(p_respuesta, '')), '')
  where id = p_id
  returning * into v_fila;
  return v_fila;
end $$;

create or replace function public.rrhh_cancelar_vacaciones(p_id uuid) returns public.vacaciones
language plpgsql security definer set search_path = public as $$
declare
  v_fila vacaciones;
begin
  select * into v_fila from vacaciones where id = p_id for update;
  if not found then raise exception 'La solicitud no existe.'; end if;
  if not (v_fila.empleado_id = public.rrhh_yo() or public.rrhh_es_admin()) then
    raise exception 'Sólo puedes cancelar tus propias solicitudes.';
  end if;
  if v_fila.estado = 'pendiente' or (v_fila.estado = 'aprobada' and v_fila.inicio > (now() at time zone 'Europe/Madrid')::date) then
    update vacaciones set estado = 'cancelada', cancelada_at = now() where id = p_id returning * into v_fila;
    return v_fila;
  end if;
  raise exception 'Esta solicitud ya no se puede cancelar.';
end $$;

/* ------------------------------- Incorporación ------------------------------ */

-- Plantilla: lo que se genera automáticamente al dar de alta a alguien.
create table if not exists public.plantilla_incorporacion (
  id uuid primary key default gen_random_uuid(),
  orden int not null default 0,
  nombre text not null,
  descripcion text,
  dias_plazo int not null default 7 check (dias_plazo between 0 and 365),
  obligatoria boolean not null default true,
  -- Quién se encarga por defecto: el jefe de la persona o quien la da de alta (RRHH).
  responsable text not null default 'jefe' check (responsable in ('jefe', 'rrhh'))
);

insert into public.plantilla_incorporacion (orden, nombre, descripcion, dias_plazo, obligatoria, responsable)
select * from (values
  (1, 'Entregar portátil', 'Portátil configurado, cargador y funda.', 1, true, 'rrhh'),
  (2, 'Crear cuenta de correo', 'Correo corporativo con firma y listas de distribución.', 1, true, 'rrhh'),
  (3, 'Crear usuario del CRM', 'Cuenta del CRM vinculada a la ficha, con su rol.', 1, true, 'rrhh'),
  (4, 'Entregar credenciales', 'Entregar en persona los accesos (correo, CRM, torno).', 1, true, 'rrhh'),
  (5, 'Presentar al equipo', 'Presentación al equipo del centro y a los responsables.', 2, true, 'jefe'),
  (6, 'Enseñar las instalaciones', 'Recorrido por salas, vestuarios, almacén y salidas de emergencia.', 2, true, 'jefe'),
  (7, 'Explicar el funcionamiento de la empresa', 'Centros, tarifas, horarios, protocolos y a quién acudir.', 5, true, 'jefe'),
  (8, 'Configurar puesto de trabajo', 'Mesa, taquilla, uniforme y herramientas.', 3, true, 'jefe'),
  (9, 'Entregar documentación', 'Manual de bienvenida, prevención de riesgos y protección de datos.', 3, true, 'rrhh'),
  (10, 'Firmar documentación necesaria', 'Contrato, confidencialidad, LOPD y recepción de EPIs.', 7, true, 'rrhh')
) as v(orden, nombre, descripcion, dias_plazo, obligatoria, responsable)
where not exists (select 1 from public.plantilla_incorporacion);

alter table public.plantilla_incorporacion enable row level security;

drop policy if exists plantilla_ver on public.plantilla_incorporacion;
create policy plantilla_ver on public.plantilla_incorporacion for select to authenticated using (true);

drop policy if exists plantilla_gestionar on public.plantilla_incorporacion;
create policy plantilla_gestionar on public.plantilla_incorporacion for all to authenticated
  using (public.rrhh_es_admin()) with check (public.rrhh_es_admin());

create table if not exists public.tareas_incorporacion (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  orden int not null default 0,
  nombre text not null check (length(trim(nombre)) >= 2),
  descripcion text,
  responsable_id uuid references public.empleados (id) on delete set null,
  fecha_limite date,
  obligatoria boolean not null default true,
  completada boolean not null default false,
  completada_at timestamptz,
  completada_por uuid references public.empleados (id) on delete set null
);

create index if not exists tareas_inc_empleado on public.tareas_incorporacion (empleado_id, orden);
create index if not exists tareas_inc_responsable on public.tareas_incorporacion (responsable_id) where not completada;

-- Al dar de alta a alguien se genera su lista de incorporación desde la plantilla.
create or replace function public.rrhh_generar_incorporacion() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_creador uuid := public.rrhh_yo();
begin
  insert into tareas_incorporacion (empleado_id, orden, nombre, descripcion, responsable_id, fecha_limite, obligatoria)
  select new.id, p.orden, p.nombre, p.descripcion,
    case p.responsable when 'jefe' then coalesce(new.jefe_id, v_creador) else coalesce(v_creador, new.jefe_id) end,
    new.fecha_alta + p.dias_plazo,
    p.obligatoria
  from plantilla_incorporacion p
  order by p.orden;
  return new;
end $$;

drop trigger if exists empleados_incorporacion on public.empleados;
create trigger empleados_incorporacion after insert on public.empleados
  for each row execute function public.rrhh_generar_incorporacion();

alter table public.tareas_incorporacion enable row level security;

drop policy if exists tareas_inc_ver on public.tareas_incorporacion;
create policy tareas_inc_ver on public.tareas_incorporacion for select to authenticated
  using (public.rrhh_puede_ver(empleado_id) or responsable_id = public.rrhh_yo());

drop policy if exists tareas_inc_gestionar on public.tareas_incorporacion;
create policy tareas_inc_gestionar on public.tareas_incorporacion for all to authenticated
  using (public.rrhh_es_admin()) with check (public.rrhh_es_admin());

-- Marcar o desmarcar: administración, quien tiene la tarea asignada o el jefe de la persona.
create or replace function public.rrhh_marcar_tarea(p_id uuid, p_hecha boolean) returns public.tareas_incorporacion
language plpgsql security definer set search_path = public as $$
declare
  v_yo uuid := public.rrhh_yo();
  v_fila tareas_incorporacion;
begin
  select * into v_fila from tareas_incorporacion where id = p_id for update;
  if not found then raise exception 'La tarea no existe.'; end if;
  if not (public.rrhh_es_admin() or v_fila.responsable_id = v_yo or public.rrhh_gestiona(v_fila.empleado_id)) then
    raise exception 'Esta tarea no está asignada a ti.';
  end if;
  update tareas_incorporacion set
    completada = p_hecha,
    completada_at = case when p_hecha then now() end,
    completada_por = case when p_hecha then v_yo end
  where id = p_id
  returning * into v_fila;
  return v_fila;
end $$;

/* ------------------------------- Evaluaciones ------------------------------- */

create table if not exists public.evaluaciones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  anio int not null check (anio between 2000 and 2100),
  trimestre int not null check (trimestre between 1 and 4),
  puntuacion int not null check (puntuacion between 1 and 5),
  comentarios text,
  evaluador_id uuid references public.empleados (id) on delete set null,
  fecha date not null default current_date,
  visible_empleado boolean not null default true,
  constraint evaluaciones_una_por_trimestre unique (empleado_id, anio, trimestre)
);

drop trigger if exists evaluaciones_updated_at on public.evaluaciones;
create trigger evaluaciones_updated_at before update on public.evaluaciones
  for each row execute function public.rrhh_tocar_updated_at();

alter table public.evaluaciones enable row level security;

drop policy if exists evaluaciones_ver on public.evaluaciones;
create policy evaluaciones_ver on public.evaluaciones for select to authenticated
  using ((empleado_id = public.rrhh_yo() and visible_empleado) or public.rrhh_gestiona(empleado_id));

-- Nadie crea, edita ni borra su propia evaluación.
drop policy if exists evaluaciones_crear on public.evaluaciones;
create policy evaluaciones_crear on public.evaluaciones for insert to authenticated
  with check (public.rrhh_gestiona(empleado_id) and empleado_id <> public.rrhh_yo() and evaluador_id = public.rrhh_yo());

drop policy if exists evaluaciones_editar on public.evaluaciones;
create policy evaluaciones_editar on public.evaluaciones for update to authenticated
  using (public.rrhh_gestiona(empleado_id) and empleado_id <> public.rrhh_yo())
  with check (public.rrhh_gestiona(empleado_id) and empleado_id <> public.rrhh_yo());

drop policy if exists evaluaciones_borrar on public.evaluaciones;
create policy evaluaciones_borrar on public.evaluaciones for delete to authenticated
  using (public.rrhh_es_admin() and empleado_id <> public.rrhh_yo());

/* --------------------------------- Nóminas ---------------------------------- */

create table if not exists public.nominas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  anio int not null check (anio between 2000 and 2100),
  mes int not null check (mes between 1 and 12),
  archivo_path text not null,
  archivo_nombre text not null,
  tamano int not null default 0,
  -- SHA-256 del PDF al subirlo: prueba de que lo firmado es exactamente ese archivo.
  hash_sha256 text not null,
  subida_por uuid references public.empleados (id) on delete set null,
  vista_at timestamptz,
  firmada_at timestamptz,
  firmada_por uuid references auth.users (id) on delete set null,
  firmada_por_empleado uuid references public.empleados (id) on delete set null,
  firma_ip text,
  firma_user_agent text,
  firma_huella text,
  -- Preparado para un proveedor de firma avanzada/cualificada (eIDAS):
  firma_metodo text not null default 'confirmacion_recepcion',
  firma_proveedor text,
  firma_referencia text,
  estado_firma text generated always as (case when firmada_at is null then 'pendiente' else 'firmada' end) stored,
  constraint nominas_una_por_mes unique (empleado_id, anio, mes)
);

-- Los campos de firma sólo los escriben las funciones de firma; nadie (ni administración) los altera a mano.
create or replace function public.rrhh_nominas_proteger() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('rrhh.firmando', true), '') <> 'si' and (
    new.vista_at is distinct from old.vista_at or new.firmada_at is distinct from old.firmada_at
    or new.firmada_por is distinct from old.firmada_por or new.firmada_por_empleado is distinct from old.firmada_por_empleado
    or new.firma_ip is distinct from old.firma_ip or new.firma_user_agent is distinct from old.firma_user_agent
    or new.firma_huella is distinct from old.firma_huella
  ) then
    raise exception 'Los datos de firma no se pueden modificar.';
  end if;
  if old.firmada_at is not null and (new.archivo_path <> old.archivo_path or new.hash_sha256 <> old.hash_sha256 or new.empleado_id <> old.empleado_id) then
    raise exception 'Una nómina firmada no se puede sustituir.';
  end if;
  return new;
end $$;

drop trigger if exists nominas_proteger on public.nominas;
create trigger nominas_proteger before update on public.nominas
  for each row execute function public.rrhh_nominas_proteger();

alter table public.nominas enable row level security;

-- Cada empleado, sólo las suyas; administración, todas. Los responsables no ven nóminas ajenas.
drop policy if exists nominas_ver on public.nominas;
create policy nominas_ver on public.nominas for select to authenticated
  using (empleado_id = public.rrhh_yo() or public.rrhh_es_admin());

drop policy if exists nominas_subir on public.nominas;
create policy nominas_subir on public.nominas for insert to authenticated
  with check (public.rrhh_es_admin() and firmada_at is null and vista_at is null);

drop policy if exists nominas_editar on public.nominas;
create policy nominas_editar on public.nominas for update to authenticated
  using (public.rrhh_es_admin()) with check (public.rrhh_es_admin());

drop policy if exists nominas_borrar on public.nominas;
create policy nominas_borrar on public.nominas for delete to authenticated
  using (public.rrhh_es_admin() and firmada_at is null);

create or replace function public.rrhh_marcar_nomina_vista(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('rrhh.firmando', 'si', true);
  update nominas set vista_at = coalesce(vista_at, now())
  where id = p_id and empleado_id = public.rrhh_yo();
end $$;

create or replace function public.rrhh_firmar_nomina(p_id uuid, p_ip text default null, p_user_agent text default null)
returns public.nominas
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_yo uuid := public.rrhh_yo();
  v_fila nominas;
  v_ahora timestamptz := now();
begin
  select * into v_fila from nominas where id = p_id for update;
  if not found or v_fila.empleado_id is distinct from v_yo then raise exception 'Sólo puedes firmar tus propias nóminas.'; end if;
  if v_fila.firmada_at is not null then raise exception 'Esta nómina ya está firmada.'; end if;
  if v_fila.vista_at is null then raise exception 'Abre el PDF antes de firmarlo.'; end if;

  perform set_config('rrhh.firmando', 'si', true);
  update nominas set
    firmada_at = v_ahora,
    firmada_por = auth.uid(),
    firmada_por_empleado = v_yo,
    firma_ip = left(p_ip, 64),
    firma_user_agent = left(p_user_agent, 400),
    firma_huella = encode(digest(v_fila.hash_sha256 || '|' || v_fila.id || '|' || auth.uid() || '|' || v_ahora::text, 'sha256'), 'hex')
  where id = p_id
  returning * into v_fila;
  return v_fila;
end $$;

/* --------------------------------- Archivos --------------------------------- */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('nominas', 'nominas', false, 10485760, array['application/pdf']),
  ('empleados', 'empleados', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Nóminas: carpeta = id del empleado. Cada cual lee la suya; sólo administración escribe.
drop policy if exists nominas_leer on storage.objects;
create policy nominas_leer on storage.objects for select to authenticated
  using (bucket_id = 'nominas' and (public.rrhh_es_admin() or (storage.foldername(name))[1] = public.rrhh_yo()::text));

drop policy if exists nominas_escribir on storage.objects;
create policy nominas_escribir on storage.objects for insert to authenticated
  with check (bucket_id = 'nominas' and public.rrhh_es_admin());

drop policy if exists nominas_borrar_archivo on storage.objects;
create policy nominas_borrar_archivo on storage.objects for delete to authenticated
  using (bucket_id = 'nominas' and public.rrhh_es_admin());

-- Fotos: las ve cualquiera del equipo con sesión; sólo administración las cambia.
drop policy if exists fotos_leer on storage.objects;
create policy fotos_leer on storage.objects for select to authenticated
  using (bucket_id = 'empleados');

drop policy if exists fotos_escribir on storage.objects;
create policy fotos_escribir on storage.objects for insert to authenticated
  with check (bucket_id = 'empleados' and public.rrhh_es_admin());

drop policy if exists fotos_actualizar on storage.objects;
create policy fotos_actualizar on storage.objects for update to authenticated
  using (bucket_id = 'empleados' and public.rrhh_es_admin());

drop policy if exists fotos_borrar on storage.objects;
create policy fotos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'empleados' and public.rrhh_es_admin());

/* ------------------------------ Privilegios -------------------------------- */

-- Las funciones sólo para usuarios con sesión.
do $$
declare f text;
begin
  foreach f in array array[
    'rrhh_yo()', 'rrhh_rol()', 'rrhh_es_admin()', 'rrhh_subordinados(uuid)', 'rrhh_gestiona(uuid)',
    'rrhh_puede_ver(uuid)', 'rrhh_hay_admin()', 'rrhh_directorio()', 'rrhh_usuario_por_email(text)',
    'rrhh_alta_primer_admin(text, text, text)', 'rrhh_fichar()', 'rrhh_resolver_vacaciones(uuid, boolean, text)',
    'rrhh_cancelar_vacaciones(uuid)', 'rrhh_marcar_tarea(uuid, boolean)', 'rrhh_marcar_nomina_vista(uuid)',
    'rrhh_firmar_nomina(uuid, text, text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

revoke all on public.empleados, public.fichajes, public.vacaciones, public.plantilla_incorporacion,
  public.tareas_incorporacion, public.evaluaciones, public.nominas from anon;
