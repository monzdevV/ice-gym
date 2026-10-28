# Pendiente

Lo que falta para dar por terminado el CRM de Ice Gym (comercial + ventas + RRHH + agente de facturas). Ordenado de más a menos urgente.

## 1. Poner en marcha la base de datos

Nada de lo nuevo funciona hasta ejecutar estos scripts en el SQL Editor de Supabase. Se pueden volver a ejecutar sin romper nada.

- [ ] `supabase/ventas.sql`: tablas del segmento Ventas, permisos (RLS) y valores por defecto (etapas Nuevo / Calificado / Propuesta / Ganado, razones de pérdida, tipos de actividad y el equipo «Ventas»).
- [ ] `supabase/facturas.sql`: tabla `facturas` del agente lector de facturas.
- [ ] Comprobar que `supabase/rrhh.sql` ya está aplicado en el proyecto de producción.

## 2. Probar en el navegador (no se ha hecho)

El código compila, pasa el lint y la build de producción, y ha pasado una revisión de errores, pero **ninguna pantalla de Ventas se ha visto funcionando con datos reales**: hace falta haber ejecutado el SQL e iniciar sesión.

- [ ] **Mi flujo** (`/crm/ventas`):
  - [ ] Tablero: arrastrar entre etapas, alta rápida en cada columna, plegar columnas, barra de actividades por colores.
  - [ ] Lista: agrupar, ordenar y acciones en lote.
  - [ ] Calendario, Análisis (tabla, gráfico y CSV) y vista Actividad.
  - [ ] Búsqueda: filtros, «Agrupar por» y favoritos.
  - [ ] «Nuevo» y la importación desde CSV.
- [ ] **Ficha de oportunidad:** barra de etapas, Ganado / Perdido / Restaurar, edición en línea, etiquetas, notas, actividades e historial.
- [ ] **Mis actividades:** también la pestaña de análisis.
- [ ] **Equipos** y **Clientes** (lista y ficha).
- [ ] **Ajustes de ventas:** etapas, etiquetas, razones de pérdida, tipos y planes de actividad.
- [ ] Repasar en tema claro y oscuro el contraste de los colores de plazo de las actividades (rojo / ámbar / verde sobre el fondo).
- [ ] Repasar el diseño de la parte comercial nueva con las pantallas de RRHH, que comparten componentes, colores y tipografías.
- [ ] Probar en móvil: barra inferior, tablero con desplazamiento horizontal y diálogos.

## 3. Agente de facturas (`agente/`)

- [ ] Crear en el CRM un usuario propio para el agente y rellenar `agente/.env` a partir de `.env.example` (clave de OpenRouter y clave publicable de Supabase).
- [ ] Probar con facturas reales: primero `python agente.py --dry-run`, después `python agente.py`. Solo se ha probado sin red, con Claude y Supabase falsos (23 comprobaciones).
- [ ] Dejarlo siempre encendido en el servidor (systemd o el Programador de tareas; ver `agente/README.md`).
- [ ] Decidir si el CRM necesita una pantalla «Facturas» o una pestaña en la ficha de cada empresa. Hoy las facturas solo están en la tabla de Supabase.

## 4. Decisiones pendientes

- [ ] **Permisos.** Las tablas comerciales, las de Ventas y `facturas` dejan leer y escribir a cualquier usuario con sesión. Desde que RRHH crea cuentas para los empleados, un empleado también podría ver ventas y facturas. Decidir quién ve qué y escribir las políticas RLS.
- [ ] **Clientes de Ventas y empresas de Comercial.** Ventas tiene sus propios clientes (como en Odoo) y no comparte datos con empresas y contactos del comercial B2B. Decidir si se unifican.
- [ ] **Acceso directo «Clientes».** Se quitó del menú y de la paleta al traer la parte comercial nueva. El filtro sigue en Empresas (`?tipo=cliente`). Decidir si vuelve.
- [ ] **Idioma del código.** El código y los comentarios están en español, como el resto del proyecto. Decidir si se pasa a inglés.

## 5. Funciones de Odoo que no se han copiado

- [ ] Vista de mapa del flujo (necesita geocodificar direcciones).
- [ ] Opciones de «Generar» que dependen de servicios externos: minería de leads, formularios web, correo entrante al alias del equipo, Outlook / Gmail. La importación desde CSV sí está.
- [ ] «Enviar mensaje» abre el programa de correo (`mailto:`). Para enviar desde el CRM y guardar el correo en el historial hace falta un servicio de correo.

## 6. Mejoras técnicas

- [ ] Hacer atómicas las operaciones de varios pasos (mover y anotar en el historial, marcar perdida y cancelar actividades, borrar una etapa y mover sus oportunidades) con funciones RPC de Postgres.
- [ ] «Mis actividades» y «Análisis» cargan como mucho 1.000 y 5.000 actividades. Paginar si el volumen crece.
- [ ] La importación CSV admite 2.000 filas por vez. Para más, procesarla en segundo plano.
- [ ] Reordenar etapas arrastrando (hoy se hace con botones de subir y bajar).
- [ ] Añadir pruebas automáticas: el proyecto no tiene ninguna.

## Qué hay en esta rama

- **Comercial:** la versión nueva de este repositorio (commit `854007d`): dashboard con gráficos, oportunidades, empresas con logos, contactos, actividades, tareas, menú plegable y tipografías nuevas.
- **RRHH:** sin cambios respecto a la versión anterior del CRM (empleados, horarios, vacaciones, incorporación, evaluaciones y nóminas).
- **Ventas:** segmento nuevo copiado del apartado Ventas del CRM de Odoo: Mi flujo, Mis actividades, Equipos, Clientes y Ajustes.
- **Agente de facturas** (`agente/`): vigila las carpetas de facturas del servidor, las lee con Claude vía OpenRouter y las guarda en Supabase.
- Este proyecto es **solo el CRM**: la web pública vive aparte (`NEXT_PUBLIC_WEB_URL`), por eso no incluye la landing.
