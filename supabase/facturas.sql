-- =============================================================================
-- Facturas de Ice Gym: la tabla donde el agente lector (agente/agente.py)
-- guarda cada factura que encuentra en las carpetas del servidor.
--
-- Ejecútalo una vez en el SQL Editor de Supabase (se puede volver a ejecutar).
-- No toca las tablas comerciales ni las de RRHH.
--
-- Dos orígenes, misma tabla:
--   · carpeta: el agente de agente/ las lee del disco del servidor e inserta
--     por la API REST con la sesión de un usuario del CRM (nunca service_role).
--     Los originales se quedan en el disco; aquí sólo va su ruta.
--   · crm: la pantalla /crm/facturas sube el original al bucket «facturas» y
--     el servidor del CRM inserta. `archivo` es entonces la ruta en el bucket.
-- =============================================================================

create table if not exists public.facturas (
  id          bigint generated always as identity primary key,
  numero      text,
  fecha       date,
  proveedor   text,
  nif         text,
  base        numeric(12,2),
  iva         numeric(12,2),
  total       numeric(12,2),
  empresa_id  uuid references public.empresas(id) on delete set null,  -- empresa del CRM con el mismo CIF
  archivo     text not null,                                           -- carpeta: Proveedores/FAC-0153.pdf · crm: ruta en el bucket
  origen      text not null default 'carpeta' check (origen in ('crm', 'carpeta')),
  modelo      text,                                                    -- modelo que la leyó, p. ej. anthropic/claude-sonnet-5.5
  creado_por  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Si la tabla venía de una versión anterior (sin origen o con archivo opcional).
alter table public.facturas add column if not exists origen text not null default 'carpeta'
  check (origen in ('crm', 'carpeta'));
alter table public.facturas alter column origen set default 'carpeta';

-- Una factura por archivo: el agente puede reiniciarse sin duplicar nada.
create unique index if not exists facturas_archivo_key on public.facturas (archivo);
create index if not exists facturas_created_at_idx on public.facturas (created_at desc);
create index if not exists facturas_empresa_id_idx on public.facturas (empresa_id);

alter table public.facturas enable row level security;

drop policy if exists facturas_ver on public.facturas;
create policy facturas_ver on public.facturas for select to authenticated using (true);

drop policy if exists facturas_crear on public.facturas;
create policy facturas_crear on public.facturas for insert to authenticated with check (true);

drop policy if exists facturas_editar on public.facturas;
create policy facturas_editar on public.facturas for update to authenticated using (true) with check (true);

drop policy if exists facturas_borrar on public.facturas;
create policy facturas_borrar on public.facturas for delete to authenticated using (true);

-- Bucket privado para los originales que se suben desde el CRM (fotos y PDF, máx. 10 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('facturas', 'facturas', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Equipo sube facturas" on storage.objects;
create policy "Equipo sube facturas" on storage.objects for insert to authenticated
  with check (bucket_id = 'facturas');
drop policy if exists "Equipo ve archivos de facturas" on storage.objects;
create policy "Equipo ve archivos de facturas" on storage.objects for select to authenticated
  using (bucket_id = 'facturas');
drop policy if exists "Equipo borra archivos de facturas" on storage.objects;
create policy "Equipo borra archivos de facturas" on storage.objects for delete to authenticated
  using (bucket_id = 'facturas');
