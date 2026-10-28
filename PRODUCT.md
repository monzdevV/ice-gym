# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Todo el equipo interno de Ice Gym usa el mismo CRM, cada perfil con su trabajo:

- **Compras y operaciones:** gestionan proveedores (maquinaria, agua, bebidas, mantenimiento, tecnología), sus contactos y las negociaciones abiertas.
- **Comerciales:** trabajan el pipeline de oportunidades B2B: prospectan, envían propuestas, negocian y cierran acuerdos con empresas.
- **Dirección / gerencia:** revisa el panel: ingresos, altas y bajas, conversión, ocupación y comparativa entre centros.

Uso principal en **oficina, con portátil y en sesiones largas**. También tiene que funcionar en móvil.

## Product Purpose

CRM interno de Ice Gym, una cadena ficticia de gimnasios con tres centros (Chamberí en Madrid, Poblenou en Barcelona y Ruzafa en Valencia). Es un CRM comercial B2B: reúne empresas (clientes corporativos, proveedores y partners), contactos, oportunidades, actividades y tareas, para que el equipo deje de trabajar con hojas de cálculo sueltas. Funciona bien si cada perfil encuentra y resuelve su tarea en segundos, y si las oportunidades calientes y los seguimientos vencidos no se pierden.

## Positioning

Es la herramienta propia de la cadena, no un SaaS genérico. Está construida sobre su modelo real (centros, tarifas Basic, Comfort y Premium, accesos por torno, clases con plazas) y habla el idioma del gimnasio.

## Operating Context

- Rutas: `/crm` (dashboard), `/crm/oportunidades` (Kanban, tabla y ficha), `/crm/empresas`, `/crm/contactos`, `/crm/actividades`, `/crm/tareas`, `/crm/configuracion`. Acceso con Supabase Auth. La web pública vive en `/`.
- Si el dominio empieza por `crm-`, la raíz sirve el CRM directamente. Hay una web pública aparte (fase 2) que crea leads con origen `web`.
- Los datos de ejemplo son ficticios: 3 centros, 3 tarifas, 6 miembros del equipo, 41 empresas con contactos, oportunidades e interacciones (`supabase/seed_b2b.sql`). Las clases de la web se generan a diario desde `horario_clases` con `programar_clases()` (pg_cron).

## Capabilities and Constraints

- Stack fijado por el cliente: Next.js 16 (App Router, TypeScript), Tailwind v4, shadcn/ui muy personalizado, Motion, @supabase/ssr y despliegue en Vercel.
- Acciones: mover oportunidades por etapa (Kanban), marcarlas ganadas o perdidas (con motivo), crear y editar empresas y contactos, marcar contacto principal, registrar interacciones (llamada, email, reunión, nota, tarea, seguimiento) y completar tareas. La web pública crea leads con origen `web`.
- Seguridad: RLS en todas las tablas. El público solo puede crear leads y leer centros, tarifas y clases. Nunca se usa la `service_role` key.
- Idioma: todo en español.
- Temas: claro y oscuro. Por defecto sigue la preferencia del sistema y se puede cambiar a mano.

## Brand Commitments

- Nombre: **Ice Gym**. Logotipo: "ICE" en blanco (o tinta, en tema claro) y "GYM" en azul hielo entre reglas.
- Sensación pedida: fría, intensa y deportiva, como una marca real de fitness. No puede parecer hecho por IA.
- Paleta fijada: negro casi puro `#0A0B0D`, blanco hielo `#F2F7FA`, azul hielo eléctrico `#5CE1FF` y, como mucho, un segundo acento usado muy poco.
- Tipografía fijada: titulares condensados, muy gruesos y en mayúsculas (Barlow Condensed 800). Al cliente le gusta la letra del logotipo y quiere verla en más sitios. Texto en Barlow e Inter Tight, con cifras tabulares.
- Pedido expreso: esquinas rectas o casi rectas, cortes en diagonal, números enormes en los indicadores, textura de ruido sutil, iconos de trazo fino y animación escasa y con intención.
- Prohibido expresamente: degradados morados o azules, glassmorphism, Inter como fuente principal, emojis como iconos, tarjetas iguales con esquinas muy redondeadas y sombra suave, hero centrado genérico y frases de relleno.
- Rechazado en la primera versión: resplandores y fondos semitransparentes al pasar el ratón (sobre todo en impagos), píldoras de estado con fondo semitransparente y cajas cuadradas con borde alrededor de cada control de los menús.

## Evidence on Hand

- Datos de ejemplo en Supabase (proyecto `gmzslroxejknsgcldmrx`). No hay clientes, testimonios, cifras de negocio ni fotos reales: no se inventan.

## Product Principles

1. **La tarea antes que la decoración.** Cada pantalla responde primero a "¿qué tengo que hacer ahora?": cobrar, llamar, convertir.
2. **Lo urgente se ve sin buscarlo.** Los impagos y los leads que se enfrían tienen que saltar a la vista, pero con jerarquía, no con alarmas.
3. **Un solo lenguaje para tres perfiles.** Compras, comerciales y dirección comparten las mismas piezas; cambia la densidad, no el idioma visual.
4. **Honesto con los datos.** Si falta un dato, se ve el hueco; nunca se rellena con un valor inventado.

## Accessibility & Inclusion

Nivel WCAG 2.1 AA: contraste suficiente en los dos temas, foco de teclado visible, estado nunca comunicado solo por color y respeto a `prefers-reduced-motion`.
