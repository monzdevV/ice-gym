-- =============================================================================
-- Ventas de Ice Gym: flujo de oportunidades por etapas, actividades planificadas,
-- equipos de ventas y clientes. Es un segmento propio del CRM, al lado del
-- comercial B2B y de RRHH.
--
-- Ejecútalo una vez en el SQL Editor de Supabase (se puede volver a ejecutar).
-- No cambia las tablas comerciales ni las de RRHH. Los comerciales son los
-- miembros de la tabla `equipo` del CRM y las empresas son las de `empresas`,
-- las mismas de Oportunidades y Contactos: Ventas no tiene empresas propias.
--
-- Seguridad: RLS en todas las tablas; como en el comercial, el equipo con
-- sesión (rol authenticated) trabaja sobre todo el segmento.
-- =============================================================================

/* ------------------------------ Configuración ------------------------------ */

create table if not exists public.ventas_etapas (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  orden         integer not null default 0,
  probabilidad  numeric(5,2) not null default 10 check (probabilidad between 0 and 100),
  ganada        boolean not null default false,   -- la etapa de «Ganado»
  plegada       boolean not null default false,   -- columna plegada en el tablero
  requisitos    text,                              -- qué hace falta para pasar a esta etapa
  created_at    timestamptz not null default now()
);

create table if not exists public.ventas_etiquetas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  color       text not null default 'gris',
  created_at  timestamptz not null default now()
);

create table if not exists public.ventas_motivos_perdida (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  orden       integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.ventas_tipos_actividad (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  icono       text not null default 'tarea' check (icono in ('email', 'llamada', 'reunion', 'documento', 'tarea')),
  dias        integer not null default 0,         -- vencimiento por defecto: hoy + días
  resumen     text,                                -- resumen por defecto
  orden       integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Plan de actividad: varias actividades que se planifican de una vez.
create table if not exists public.ventas_planes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.ventas_plan_pasos (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.ventas_planes(id) on delete cascade,
  tipo_id      uuid not null references public.ventas_tipos_actividad(id) on delete restrict,
  resumen      text,
  dias         integer not null default 0,
  asignado_id  uuid references public.equipo(id) on delete set null,  -- vacío: el comercial de la oportunidad
  orden        integer not null default 0
);

-- Un tipo de actividad en uso no se borra: así un plan nunca pierde pasos sin avisar.
alter table public.ventas_plan_pasos drop constraint if exists ventas_plan_pasos_tipo_id_fkey;
alter table public.ventas_plan_pasos
  add constraint ventas_plan_pasos_tipo_id_fkey foreign key (tipo_id) references public.ventas_tipos_actividad(id) on delete restrict;

/* --------------------------------- Equipos --------------------------------- */

create table if not exists public.ventas_equipos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  email       text,                                -- alias de correo del equipo
  color       text not null default 'azul',
  lider_id    uuid references public.equipo(id) on delete set null,
  objetivo    numeric(14,2),                       -- objetivo de facturación mensual
  activo      boolean not null default true,
  orden       integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.ventas_equipo_miembros (
  equipo_id   uuid not null references public.ventas_equipos(id) on delete cascade,
  miembro_id  uuid not null references public.equipo(id) on delete cascade,
  primary key (equipo_id, miembro_id)
);

/* --------------------------------- Clientes -------------------------------- */

-- Personas a las que se vende. Su empresa es una de `empresas`.
create table if not exists public.ventas_clientes (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  empresa_id    uuid references public.empresas(id) on delete set null,
  puesto        text,
  email         text,
  telefono      text,
  movil         text,
  web           text,
  nif           text,
  direccion     text,
  ciudad        text,
  codigo_postal text,
  pais          text not null default 'España',
  comercial_id  uuid references public.equipo(id) on delete set null,
  etiquetas     text[] not null default '{}',
  notas         text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists ventas_clientes_nombre_idx on public.ventas_clientes (lower(nombre));
create index if not exists ventas_clientes_empresa_idx on public.ventas_clientes (empresa_id);

/* ------------------------------ Oportunidades ------------------------------ */

create table if not exists public.ventas_oportunidades (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  cliente_id         uuid references public.ventas_clientes(id) on delete set null,
  empresa_id         uuid references public.empresas(id) on delete set null,
  contacto_nombre    text,                         -- quién, si aún no es cliente
  empresa_nombre     text,                         -- su empresa, si aún no está en `empresas`
  email              text,
  telefono           text,
  ciudad             text,
  pais               text,
  ingresos           numeric(14,2) not null default 0,
  probabilidad       numeric(5,2) not null default 10 check (probabilidad between 0 and 100),
  probabilidad_manual boolean not null default false,  -- si no, la marca la etapa
  etapa_id           uuid references public.ventas_etapas(id) on delete set null,
  etapa_desde        timestamptz not null default now(),
  posicion           double precision not null default 0,
  comercial_id       uuid references public.equipo(id) on delete set null,
  equipo_id          uuid references public.ventas_equipos(id) on delete set null,
  cierre_previsto    date,
  prioridad          smallint not null default 0 check (prioridad between 0 and 3),
  notas              text,
  campana            text,
  medio              text,
  origen             text,
  referido           text,
  estado             text not null default 'abierta' check (estado in ('abierta', 'ganada', 'perdida')),
  motivo_perdida_id  uuid references public.ventas_motivos_perdida(id) on delete set null,
  nota_cierre        text,
  cerrada_at         timestamptz,
  activa             boolean not null default true,  -- archivar sin borrar
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists ventas_oportunidades_etapa_idx on public.ventas_oportunidades (etapa_id, posicion);
create index if not exists ventas_oportunidades_comercial_idx on public.ventas_oportunidades (comercial_id);
create index if not exists ventas_oportunidades_equipo_idx on public.ventas_oportunidades (equipo_id);
create index if not exists ventas_oportunidades_cliente_idx on public.ventas_oportunidades (cliente_id);

/* ------------------- Empresas comunes con el comercial B2B ------------------ */

-- Bases creadas con la primera versión: Ventas tenía sus propias empresas
-- (clientes con es_empresa). Pasan a `empresas` (o se enlazan con la que ya
-- tenga el mismo CIF o nombre) y sus personas y oportunidades las siguen.
alter table public.ventas_oportunidades
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

do $$
declare
  c record;
  e uuid;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ventas_clientes' and column_name = 'es_empresa'
  ) then
    return;
  end if;

  -- La FK de empresa_id apuntaba a la propia tabla; se rehace abajo hacia `empresas`.
  alter table public.ventas_clientes drop constraint if exists ventas_clientes_empresa_id_fkey;

  for c in execute 'select * from public.ventas_clientes where es_empresa' loop
    select id into e from public.empresas
    where (c.nif is not null and upper(cif) = upper(c.nif)) or lower(nombre) = lower(c.nombre)
    order by (c.nif is not null and upper(cif) = upper(c.nif)) desc
    limit 1;
    if e is null then
      insert into public.empresas (nombre, tipo, sector, web, email, telefono, direccion, ciudad, pais, cif, notas, estado, responsable_id)
      values (c.nombre, 'cliente', 'otros', c.web, c.email, coalesce(c.telefono, c.movil), c.direccion, c.ciudad, c.pais,
              c.nif, c.notas, case when c.activo then 'activa' else 'inactiva' end, c.comercial_id)
      returning id into e;
    end if;
    update public.ventas_clientes set empresa_id = e where empresa_id = c.id;
    update public.ventas_oportunidades set empresa_id = e, cliente_id = null where cliente_id = c.id;
    -- Lo que colgaba de una oportunidad sigue en ella; lo que era sólo de la empresa se va con ella.
    update public.ventas_actividades set cliente_id = null where cliente_id = c.id and oportunidad_id is not null;
    update public.ventas_mensajes set cliente_id = null where cliente_id = c.id and oportunidad_id is not null;
    delete from public.ventas_clientes where id = c.id;
  end loop;

  alter table public.ventas_clientes drop column es_empresa;
  update public.ventas_clientes v set empresa_id = null
  where empresa_id is not null and not exists (select 1 from public.empresas x where x.id = v.empresa_id);
  alter table public.ventas_clientes
    add constraint ventas_clientes_empresa_id_fkey foreign key (empresa_id) references public.empresas(id) on delete set null;
end $$;

-- La empresa de la oportunidad: la de su cliente o la escrita a mano, si ya existe.
update public.ventas_oportunidades o set empresa_id = v.empresa_id
from public.ventas_clientes v
where o.cliente_id = v.id and o.empresa_id is null and v.empresa_id is not null;

update public.ventas_oportunidades o set empresa_id = x.id, empresa_nombre = null
from public.empresas x
where o.empresa_id is null and o.empresa_nombre is not null and lower(x.nombre) = lower(trim(o.empresa_nombre));

create index if not exists ventas_oportunidades_empresa_idx on public.ventas_oportunidades (empresa_id);

create table if not exists public.ventas_oportunidad_etiquetas (
  oportunidad_id  uuid not null references public.ventas_oportunidades(id) on delete cascade,
  etiqueta_id     uuid not null references public.ventas_etiquetas(id) on delete cascade,
  primary key (oportunidad_id, etiqueta_id)
);

/* ------------------------- Actividades e historial ------------------------- */

-- Actividades planificadas sobre una oportunidad o un cliente.
create table if not exists public.ventas_actividades (
  id              uuid primary key default gen_random_uuid(),
  oportunidad_id  uuid references public.ventas_oportunidades(id) on delete cascade,
  cliente_id      uuid references public.ventas_clientes(id) on delete cascade,
  tipo_id         uuid references public.ventas_tipos_actividad(id) on delete set null,
  resumen         text,
  nota            text,
  vence           date not null default current_date,
  asignado_id     uuid references public.equipo(id) on delete set null,
  estado          text not null default 'pendiente' check (estado in ('pendiente', 'hecha', 'cancelada')),
  comentario      text,                            -- lo que se anota al marcarla como hecha
  hecha_at        timestamptz,
  creado_por      uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  check (oportunidad_id is not null or cliente_id is not null)
);

create index if not exists ventas_actividades_oportunidad_idx on public.ventas_actividades (oportunidad_id, estado, vence);
create index if not exists ventas_actividades_cliente_idx on public.ventas_actividades (cliente_id, estado, vence);
create index if not exists ventas_actividades_asignado_idx on public.ventas_actividades (asignado_id, estado, vence);

-- Historial: notas a mano y lo que anota el sistema (cambios de etapa, ganada, perdida…).
create table if not exists public.ventas_mensajes (
  id              uuid primary key default gen_random_uuid(),
  oportunidad_id  uuid references public.ventas_oportunidades(id) on delete cascade,
  cliente_id      uuid references public.ventas_clientes(id) on delete cascade,
  tipo            text not null default 'nota' check (tipo in ('nota', 'sistema', 'actividad')),
  cuerpo          text not null,
  autor           text,                            -- email de quien lo escribió
  created_at      timestamptz not null default now(),
  check (oportunidad_id is not null or cliente_id is not null)
);

create index if not exists ventas_mensajes_oportunidad_idx on public.ventas_mensajes (oportunidad_id, created_at desc);
create index if not exists ventas_mensajes_cliente_idx on public.ventas_mensajes (cliente_id, created_at desc);

/* ----------------------------------- RLS ----------------------------------- */

do $$
declare
  t text;
begin
  foreach t in array array[
    'ventas_etapas', 'ventas_etiquetas', 'ventas_motivos_perdida', 'ventas_tipos_actividad',
    'ventas_planes', 'ventas_plan_pasos', 'ventas_equipos', 'ventas_equipo_miembros',
    'ventas_clientes', 'ventas_oportunidades', 'ventas_oportunidad_etiquetas',
    'ventas_actividades', 'ventas_mensajes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_equipo', t);
    execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', t || '_equipo', t);
  end loop;
end $$;

/* --------------------------- Valores por defecto --------------------------- */

insert into public.ventas_etapas (nombre, orden, probabilidad, ganada)
select * from (values
  ('Nuevo', 10, 10::numeric, false),
  ('Calificado', 20, 30, false),
  ('Propuesta', 30, 60, false),
  ('Ganado', 40, 100, true)
) v(nombre, orden, probabilidad, ganada)
where not exists (select 1 from public.ventas_etapas);

insert into public.ventas_motivos_perdida (nombre, orden)
select * from (values
  ('Demasiado caro', 10),
  ('No tenemos gente/habilidades', 20),
  ('No hay suficiente stock', 30)
) v(nombre, orden)
where not exists (select 1 from public.ventas_motivos_perdida);

insert into public.ventas_tipos_actividad (nombre, icono, dias, orden)
select * from (values
  ('Correo electrónico', 'email', 0, 10),
  ('Llamada', 'llamada', 2, 20),
  ('Reunión', 'reunion', 0, 30),
  ('Documento', 'documento', 5, 40),
  ('Tarea pendiente', 'tarea', 5, 50)
) v(nombre, icono, dias, orden)
where not exists (select 1 from public.ventas_tipos_actividad);

insert into public.ventas_equipos (nombre, color, orden)
select 'Ventas', 'azul', 0
where not exists (select 1 from public.ventas_equipos);
