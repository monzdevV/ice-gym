-- =============================================================================
-- Datos FICTICIOS de RRHH para ver el módulo con contenido.
--
-- Ejecútalo en el SQL Editor de Supabase DESPUÉS de rrhh.sql y de haber creado
-- tu usuario administrador. Se puede volver a ejecutar: primero borra los datos
-- de demo anteriores.
--
-- Qué crea:
--   · 12 empleados de demo (emails @demo.icegym.es, sin cuenta de acceso).
--   · Jerarquía: tú (admin) → 3 responsables → sus equipos.
--   · Fichajes de agosto–septiembre 2026 (y fichajes abiertos hoy).
--   · Vacaciones pendientes, aprobadas, denegadas y canceladas.
--   · Incorporaciones completas, a medias y recién empezadas.
--   · Evaluaciones trimestrales de 2025 y 2026.
--   · Nóminas de 2026, firmadas y pendientes (los PDF NO existen en Storage).
--
-- Para quitarlo todo, ejecuta sólo el bloque "Limpieza" del principio.
-- =============================================================================

/* --------------------------------- Limpieza --------------------------------- */

-- Fichajes y nóminas de demo que se le añaden al admin (marcados).
delete from public.fichajes where created_at = timestamptz '2001-01-01 00:00:00+00';
delete from public.nominas where archivo_path like '%-demo.pdf';
-- Empleados de demo (en cascada: fichajes, vacaciones, tareas, evaluaciones, nóminas).
delete from public.empleados where email ilike '%@demo.icegym.es';

/* --------------------------------- Empleados -------------------------------- */

do $$
declare
  v_admin uuid := (select id from public.empleados where rol = 'admin' and user_id is not null order by created_at limit 1);
  r record;
  v_id uuid;
  v_ids jsonb := '{}';
begin
  perform setseed(0.42);

  for r in
    select * from (values
      -- clave, nombre, apellidos, rol, puesto, departamento, alta, jefe(clave|admin), estado, baja, nacimiento, telefono, dni_num
      ('laura',  'Laura',  'Martín Ruiz',       'responsable', 'Responsable de sala',              'Entrenamiento',       date '2023-03-01', 'admin',  'activo',   null::date,        date '1989-04-12', '612 345 101', 48211934),
      ('javier', 'Javier', 'Ortega Sanz',       'responsable', 'Responsable comercial',            'Comercial',           date '2022-09-15', 'admin',  'activo',   null,              date '1985-11-03', '612 345 102', 50877412),
      ('marta',  'Marta',  'Gil Romero',        'responsable', 'Responsable de recepción',         'Atención al cliente', date '2024-01-08', 'admin',  'activo',   null,              date '1991-07-22', '612 345 103', 53120988),
      ('elena',  'Elena',  'Castro Rubio',      'empleado',    'Fisioterapeuta',                   'Salud',               date '2024-03-04', 'admin',  'activo',   null,              date '1993-02-14', '612 345 104', 47003561),
      ('raul',   'Raúl',   'Vidal Iglesias',    'empleado',    'Técnico de mantenimiento',         'Operaciones',         date '2022-01-10', 'admin',  'inactivo', date '2026-06-30', date '1980-09-30', '612 345 105', 44556120),
      ('carlos', 'Carlos', 'Navarro Díaz',      'empleado',    'Entrenador personal',              'Entrenamiento',       date '2024-05-02', 'laura',  'activo',   null,              date '1996-05-08', '612 345 106', 54889023),
      ('lucia',  'Lucía',  'Fernández Vega',    'empleado',    'Entrenadora personal',             'Entrenamiento',       date '2025-02-03', 'laura',  'activo',   null,              date '1998-12-01', '612 345 107', 55712340),
      ('alvaro', 'Álvaro', 'Moreno Castillo',   'empleado',    'Monitor de actividades dirigidas', 'Entrenamiento',       date '2025-09-01', 'laura',  'activo',   null,              date '2000-03-19', '612 345 108', 56230017),
      ('sara',   'Sara',   'Jiménez López',     'empleado',    'Asesora comercial',                'Comercial',           date '2024-10-14', 'javier', 'activo',   null,              date '1994-08-27', '612 345 109', 51990344),
      ('diego',  'Diego',  'Ramos Herrera',     'empleado',    'Asesor comercial',                 'Comercial',           date '2026-09-21', 'javier', 'activo',   null,              date '1999-01-15', '612 345 110', 57004812),
      ('paula',  'Paula',  'Serrano Molina',    'empleado',    'Recepcionista',                    'Atención al cliente', date '2023-06-12', 'marta',  'activo',   null,              date '1997-06-04', '612 345 111', 52667790),
      ('hugo',   'Hugo',   'Delgado Prieto',    'empleado',    'Recepcionista',                    'Atención al cliente', date '2026-09-28', 'marta',  'activo',   null,              date '2002-10-10', '612 345 112', 58341206)
    ) as t(clave, nombre, apellidos, rol, puesto, departamento, alta, jefe, estado, baja, nacimiento, telefono, dni_num)
  loop
    insert into public.empleados (
      rol, nombre, apellidos, documento, email, telefono, puesto, departamento, fecha_alta, fecha_baja,
      jefe_id, estado, fecha_nacimiento, direccion, contacto_emergencia, dias_vacaciones, notas
    ) values (
      r.rol, r.nombre, r.apellidos,
      r.dni_num::text || substr('TRWAGMYFPDXBNJZSQVHLCKE', (r.dni_num % 23) + 1, 1),
      r.clave || '@demo.icegym.es',
      r.telefono, r.puesto, r.departamento, r.alta, r.baja,
      case when r.jefe = 'admin' then v_admin else (v_ids ->> r.jefe)::uuid end,
      r.estado, r.nacimiento,
      'Calle Ficticia ' || (10 + (r.dni_num % 80)) || ', 28000 Madrid',
      'Familiar · 699 000 ' || lpad(((r.dni_num % 900) + 100)::text, 3, '0'),
      case when r.rol = 'responsable' then 25 else 22 end,
      '[DEMO] Ficha de prueba generada automáticamente.'
    )
    returning id into v_id;
    v_ids := v_ids || jsonb_build_object(r.clave, v_id);
  end loop;

  -- Las tareas de tipo "rrhh" de la plantilla, a administración (el trigger no tiene sesión aquí).
  if v_admin is not null then
    update public.tareas_incorporacion t set responsable_id = v_admin
    from public.plantilla_incorporacion p, public.empleados e
    where e.id = t.empleado_id and e.email ilike '%@demo.icegym.es'
      and p.nombre = t.nombre and p.responsable = 'rrhh';
  end if;
end $$;

/* ------------------------------- Incorporación ------------------------------ */

-- Quien lleva tiempo: todo hecho, en plazo.
update public.tareas_incorporacion t set
  completada = true,
  completada_at = ((t.fecha_limite - (random() * 1)::int) + time '12:00') at time zone 'Europe/Madrid',
  completada_por = t.responsable_id
from public.empleados e
where e.id = t.empleado_id and e.email ilike '%@demo.icegym.es' and e.fecha_alta < date '2026-09-01';

-- Diego (alta 21/09): casi todo hecho, falta configurar el puesto y firmar (vencidas).
update public.tareas_incorporacion t set
  completada = true,
  completada_at = ((t.fecha_limite) + time '11:30') at time zone 'Europe/Madrid',
  completada_por = t.responsable_id
from public.empleados e
where e.id = t.empleado_id and e.email = 'diego@demo.icegym.es' and t.orden not in (8, 10);

-- Hugo (alta 28/09): sólo lo del primer día.
update public.tareas_incorporacion t set
  completada = true,
  completada_at = ((e.fecha_alta) + time '09:45') at time zone 'Europe/Madrid',
  completada_por = t.responsable_id
from public.empleados e
where e.id = t.empleado_id and e.email = 'hugo@demo.icegym.es' and t.orden in (1, 2, 3);

/* -------------------------------- Vacaciones -------------------------------- */

insert into public.vacaciones (created_at, empleado_id, inicio, fin, comentario, estado, solicitada_por, resuelta_por, resuelta_at, respuesta, cancelada_at)
select
  v.creada::timestamptz, e.id, v.inicio, v.fin, v.comentario, v.estado, e.id,
  case when v.estado in ('aprobada', 'denegada') then e.jefe_id end,
  case when v.estado in ('aprobada', 'denegada') then v.creada::timestamptz + interval '1 day 3 hours' end,
  v.respuesta,
  case when v.estado = 'cancelada' then v.creada::timestamptz + interval '5 days' end
from (values
  ('laura',  date '2026-08-10', date '2026-08-21', 'Vacaciones de verano.',                 'aprobada',  '2026-06-02 10:15+02', 'Disfrútalas.'),
  ('laura',  date '2026-12-21', date '2026-12-31', 'Navidades con la familia.',             'pendiente', '2026-09-28 18:40+02', null),
  ('javier', date '2026-08-24', date '2026-09-04', null,                                    'aprobada',  '2026-05-20 09:05+02', null),
  ('marta',  date '2026-10-19', date '2026-10-23', 'Puente para un viaje.',                 'pendiente', '2026-09-30 12:20+02', null),
  ('elena',  date '2026-09-14', date '2026-09-18', null,                                    'aprobada',  '2026-07-01 16:00+02', null),
  ('raul',   date '2026-04-06', date '2026-04-10', 'Semana Santa.',                         'aprobada',  '2026-02-10 08:30+01', null),
  ('carlos', date '2026-08-17', date '2026-08-28', 'Verano.',                               'aprobada',  '2026-06-10 13:10+02', 'Ok, cubre Lucía tus clases.'),
  ('carlos', date '2026-10-26', date '2026-10-30', 'Boda de un amigo en Sevilla.',          'pendiente', '2026-09-29 20:05+02', null),
  ('lucia',  date '2026-09-07', date '2026-09-11', null,                                    'denegada',  '2026-08-01 11:00+02', 'Coincide con el arranque de temporada. ¿Puedes mirar otra semana?'),
  ('lucia',  date '2026-09-21', date '2026-09-25', 'Cambio de fechas tras la denegación.',  'aprobada',  '2026-08-03 09:45+02', null),
  ('alvaro', date '2026-12-07', date '2026-12-11', null,                                    'pendiente', '2026-10-01 17:30+02', null),
  ('sara',   date '2026-07-27', date '2026-08-07', 'Vacaciones de verano.',                 'aprobada',  '2026-05-12 10:00+02', null),
  ('sara',   date '2026-11-02', date '2026-11-06', null,                                    'pendiente', '2026-09-25 09:15+02', null),
  ('paula',  date '2026-08-03', date '2026-08-07', 'Al final no me voy.',                   'cancelada', '2026-06-15 14:00+02', null),
  ('paula',  date '2026-10-12', date '2026-10-16', 'Puente del Pilar.',                     'aprobada',  '2026-07-20 12:00+02', 'Aprobado.')
) as v(clave, inicio, fin, comentario, estado, creada, respuesta)
join public.empleados e on e.email = v.clave || '@demo.icegym.es';

/* --------------------------------- Fichajes --------------------------------- */

-- Días laborables de agosto a ayer, salvo vacaciones aprobadas y antes del alta.
-- Turno de mañana o de tarde según el puesto; alguna incidencia corregida a mano.
with personas as (
  select e.id, e.fecha_alta, coalesce(e.fecha_baja, date '2026-12-31') as hasta,
    case when e.puesto in ('Recepcionista', 'Monitor de actividades dirigidas') and e.nombre in ('Paula', 'Álvaro') then time '14:00' else time '07:30' end as turno,
    false as es_admin
  from public.empleados e where e.email ilike '%@demo.icegym.es'
  union all
  select e.id, least(e.fecha_alta, date '2022-01-01'), date '2026-12-31', time '08:30', true
  from public.empleados e where e.rol = 'admin' and e.user_id is not null
),
dias as (
  select p.*, d::date as fecha, random() as r1, random() as r2, random() as r3
  from personas p, generate_series(date '2026-08-03', date '2026-10-01', interval '1 day') d
  where extract(isodow from d) < 6 and d::date >= p.fecha_alta and d::date <= p.hasta
    and not exists (select 1 from public.vacaciones v where v.empleado_id = p.id and v.estado = 'aprobada' and d::date between v.inicio and v.fin)
    and random() > 0.03 -- algún día suelto sin fichar
)
insert into public.fichajes (created_at, empleado_id, fecha, entrada, salida, estado, incidencia, origen, creado_por)
select
  case when es_admin then timestamptz '2001-01-01 00:00:00+00' else (fecha + turno) at time zone 'Europe/Madrid' end,
  id, fecha,
  (fecha + turno + make_interval(mins => (r1 * 25)::int - 10)) at time zone 'Europe/Madrid',
  (fecha + turno + make_interval(mins => (r1 * 25)::int - 10) + make_interval(mins => 450 + (r2 * 60)::int)) at time zone 'Europe/Madrid',
  case when r3 < 0.04 then 'incidencia' else 'correcto' end,
  case when r3 < 0.02 then 'Olvidó fichar la salida; corregido por RRHH.'
       when r3 < 0.04 then 'Fichaje de entrada añadido a mano: el torno no funcionaba.' end,
  case when r3 < 0.04 then 'manual' else 'fichaje' end,
  id
from dias;

-- Hoy: los del turno de mañana ya están dentro (fichaje abierto). Al admin no se le abre, para que pruebe a fichar.
insert into public.fichajes (empleado_id, fecha, entrada, origen, creado_por)
select e.id, date '2026-10-02', t.entrada, 'fichaje', e.id
from public.empleados e
cross join lateral (select ((date '2026-10-02' + time '07:30' + make_interval(mins => (random() * 20)::int)) at time zone 'Europe/Madrid') as entrada) t
where e.email ilike '%@demo.icegym.es' and e.estado = 'activo'
  and e.nombre not in ('Paula', 'Álvaro', 'Hugo')
  and t.entrada < now()
  and not exists (select 1 from public.fichajes f where f.empleado_id = e.id and f.salida is null);

/* ------------------------------- Evaluaciones ------------------------------- */

with trimestres as (
  select a as anio, q as trimestre,
    make_date(a, q * 3 - 2, 1) as inicio,
    (make_date(a, q * 3, 1) + interval '1 month - 1 day')::date as fin
  from generate_series(2025, 2026) a, generate_series(1, 4) q
  where make_date(a, q * 3, 1) + interval '1 month' <= date '2026-10-01'
),
comentarios(n, texto) as (values
  (1, 'Muy buen trimestre. Los socios destacan su trato cercano.'),
  (2, 'Cumple objetivos. Debe mejorar la puntualidad en los cambios de turno.'),
  (3, 'Ha asumido más responsabilidad y lo ha hecho bien.'),
  (4, 'Trimestre correcto. Pendiente la formación de primeros auxilios.'),
  (5, 'Excelente actitud con el equipo y con los socios nuevos.'),
  (6, 'Por debajo de lo esperado: varias incidencias con las reservas. Seguimos el mes que viene.'),
  (7, 'Buen progreso; ya lleva sola/o las clases de la tarde.')
)
insert into public.evaluaciones (empleado_id, anio, trimestre, puntuacion, comentarios, evaluador_id, fecha, visible_empleado)
select e.id, t.anio, t.trimestre, x.punt,
  (select texto from comentarios where n = case when x.punt <= 2 then 6 else (array[1, 2, 3, 4, 5, 7])[1 + abs(hashtext(e.id::text || t.anio || t.trimestre)) % 6] end limit 1),
  e.jefe_id,
  t.fin + 8,
  true
from public.empleados e
join trimestres t on e.fecha_alta <= t.inicio + 45 and (e.fecha_baja is null or e.fecha_baja >= t.fin)
cross join lateral (select case
  when random() < 0.07 then 2
  when random() < 0.40 then 5
  when random() < 0.85 then 4
  else 3 end as punt) x
where e.email ilike '%@demo.icegym.es' and e.jefe_id is not null
  -- Q3 2026 aún sin evaluar a Carlos ni a Sara (para ver pendientes).
  and not (t.anio = 2026 and t.trimestre = 3 and e.email in ('carlos@demo.icegym.es', 'sara@demo.icegym.es'));

/* --------------------------------- Nóminas ---------------------------------- */

-- Enero–septiembre 2026. Hasta julio, todas firmadas; agosto, casi todas; septiembre, pendientes.
-- Los PDF no existen en Storage: "abrir" dará error, pero listado, estados y firma se ven.
with personas as (
  select e.id, e.nombre, e.apellidos, e.fecha_alta, e.fecha_baja, false as es_admin, null::uuid as uid
  from public.empleados e where e.email ilike '%@demo.icegym.es'
  union all
  select e.id, e.nombre, e.apellidos, least(e.fecha_alta, date '2022-01-01'), e.fecha_baja, true, e.user_id
  from public.empleados e where e.rol = 'admin' and e.user_id is not null
),
meses as (
  select p.*, m as mes, ((make_date(2026, m, 1) + interval '1 month')::date + time '10:00') at time zone 'Europe/Madrid' as subida,
    random() as r
  from personas p, generate_series(1, 9) m
  where p.fecha_alta <= (make_date(2026, m, 1) + interval '1 month - 1 day')::date
    and (p.fecha_baja is null or p.fecha_baja >= make_date(2026, m, 1))
),
filas as (
  select *,
    (mes <= 7 or (mes = 8 and (r > 0.25 or es_admin))) as firmada,
    -- Septiembre del admin: ya "vista", para que puedas probar el botón Firmar.
    (mes <= 7 or (mes = 8 and (r > 0.1 or es_admin)) or (mes = 9 and (r > 0.6 or es_admin))) as vista
  from meses
)
insert into public.nominas (
  created_at, empleado_id, anio, mes, archivo_path, archivo_nombre, tamano, hash_sha256, subida_por,
  vista_at, firmada_at, firmada_por, firmada_por_empleado, firma_ip, firma_user_agent, firma_huella
)
select
  subida, id, 2026, mes,
  id || '/2026-' || lpad(mes::text, 2, '0') || '-demo.pdf',
  'Nomina_2026-' || lpad(mes::text, 2, '0') || '_' || replace(nombre || '_' || split_part(apellidos, ' ', 1), ' ', '_') || '.pdf',
  80000 + (r * 40000)::int,
  encode(extensions.digest(id::text || mes::text || 'demo', 'sha256'), 'hex'),
  (select a.id from public.empleados a where a.rol = 'admin' and a.user_id is not null order by a.created_at limit 1),
  case when vista then least(subida + make_interval(hours => 2 + (r * 40)::int), now() - interval '1 hour') end,
  case when firmada then subida + make_interval(hours => 3 + (r * 40)::int) end,
  case when firmada then uid end,
  case when firmada then id end,
  case when firmada then '83.45.' || (10 + (r * 200)::int) || '.' || (1 + (r * 250)::int) end,
  case when firmada then 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1' end,
  case when firmada then encode(extensions.digest(id::text || mes::text || 'firma-demo', 'sha256'), 'hex') end
from filas;

/* --------------------------------- Resumen ---------------------------------- */

select 'empleados' as tabla, count(*) from public.empleados where email ilike '%@demo.icegym.es'
union all select 'fichajes', count(*) from public.fichajes f join public.empleados e on e.id = f.empleado_id where e.email ilike '%@demo.icegym.es' or f.created_at = timestamptz '2001-01-01 00:00:00+00'
union all select 'vacaciones', count(*) from public.vacaciones v join public.empleados e on e.id = v.empleado_id where e.email ilike '%@demo.icegym.es'
union all select 'tareas_incorporacion', count(*) from public.tareas_incorporacion t join public.empleados e on e.id = t.empleado_id where e.email ilike '%@demo.icegym.es'
union all select 'evaluaciones', count(*) from public.evaluaciones v join public.empleados e on e.id = v.empleado_id where e.email ilike '%@demo.icegym.es'
union all select 'nominas', count(*) from public.nominas where archivo_path like '%-demo.pdf';
