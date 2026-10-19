-- Agente lector de facturas: tabla, RLS y bucket privado de originales.
-- Claude (vía OpenRouter) solo lee la factura; el INSERT lo hace el servidor del CRM.

create table if not exists public.facturas (
  id          bigint generated always as identity primary key,
  numero      text,
  fecha       date,
  proveedor   text,
  nif         text,
  base        numeric(12,2),
  iva         numeric(12,2),
  total       numeric(12,2),
  empresa_id  uuid references public.empresas(id) on delete set null,
  archivo     text,                       -- ruta dentro del bucket «facturas»
  origen      text not null default 'crm' check (origen in ('crm', 'carpeta')),
  modelo      text,                       -- modelo que la leyó (p. ej. anthropic/claude-sonnet-4.5)
  creado_por  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

create index if not exists facturas_created_at_idx on public.facturas (created_at desc);
create index if not exists facturas_empresa_id_idx on public.facturas (empresa_id);

alter table public.facturas enable row level security;

create policy "Equipo ve facturas"     on public.facturas for select to authenticated using (true);
create policy "Equipo crea facturas"   on public.facturas for insert to authenticated with check (true);
create policy "Equipo edita facturas"  on public.facturas for update to authenticated using (true) with check (true);
create policy "Equipo borra facturas"  on public.facturas for delete to authenticated using (true);

-- Bucket privado para los originales (fotos y PDF, máx. 10 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('facturas', 'facturas', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Equipo sube facturas" on storage.objects for insert to authenticated
  with check (bucket_id = 'facturas');
create policy "Equipo ve archivos de facturas" on storage.objects for select to authenticated
  using (bucket_id = 'facturas');
create policy "Equipo borra archivos de facturas" on storage.objects for delete to authenticated
  using (bucket_id = 'facturas');
