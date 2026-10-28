-- =============================================================================
-- Facturas de Ice Gym: la tabla donde el agente lector (agente/agente.py)
-- guarda cada factura que encuentra en las carpetas del servidor.
--
-- Ejecútalo una vez en el SQL Editor de Supabase (se puede volver a ejecutar).
-- No toca las tablas comerciales ni las de RRHH.
--
-- Claude sólo lee la factura y devuelve el JSON. El INSERT lo hace el agente
-- por la API REST de Supabase (POST /rest/v1/facturas), con la sesión de un
-- usuario del CRM: rol authenticated, sujeto a RLS. Nunca service_role.
-- Los originales se quedan en el disco del servidor; aquí sólo va su ruta.
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
  archivo     text not null,                                           -- ruta dentro de la carpeta, p. ej. Proveedores/FAC-0153.pdf
  modelo      text,                                                    -- modelo que la leyó, p. ej. anthropic/claude-sonnet-5.5
  creado_por  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Si la tabla venía de la versión anterior del agente (lector web + bucket).
alter table public.facturas drop column if exists origen;

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
