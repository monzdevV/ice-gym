# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Todo el equipo interno de Ice Gym usa el mismo CRM, cada perfil con su trabajo:

- **Recepción:** busca socios, cobra recibos, comprueba quién está dentro y anota llamadas. Muchas consultas cortas seguidas.
- **Comerciales:** trabajan el embudo de leads: llaman, agendan visitas, ponen el pase de prueba y convierten en socio.
- **Dirección / gerencia:** revisa el panel: ingresos, altas y bajas, conversión, ocupación y comparativa entre centros.

Uso principal en **oficina, con portátil y en sesiones largas**. También tiene que funcionar en móvil.

## Product Purpose

CRM interno de Ice Gym, una cadena ficticia de gimnasios con tres centros (Chamberí en Madrid, Poblenou en Barcelona y Ruzafa en Valencia). Reúne en un solo sitio socios, cuotas, accesos, clases y el embudo comercial, para que el equipo deje de trabajar con hojas de cálculo sueltas. Funciona bien si cada perfil encuentra y resuelve su tarea en segundos, y si los impagos y los leads calientes no se pierden.

## Positioning

Es la herramienta propia de la cadena, no un SaaS genérico. Está construida sobre su modelo real (centros, tarifas Basic, Comfort y Premium, accesos por torno, clases con plazas) y habla el idioma del gimnasio.

## Operating Context

- Rutas: `/crm` (panel), `/crm/leads` (Kanban y ficha), `/crm/socios` (tabla y ficha), `/crm/pagos`, `/crm/clases`. Acceso con Supabase Auth.
- Si el dominio empieza por `crm-`, la raíz sirve el CRM directamente. Hay una web pública aparte (fase 2) que crea leads con origen `web`.
- Los datos de ejemplo son ficticios: 3 centros, 3 tarifas, unos 150 socios, 60 leads, 6 meses de pagos y accesos, y una semana de clases.

## Capabilities and Constraints

- Stack fijado por el cliente: Next.js 16 (App Router, TypeScript), Tailwind v4, shadcn/ui muy personalizado, Motion, @supabase/ssr y despliegue en Vercel.
- Acciones: mover leads por estado, convertir un lead en socio (crea el socio y emite su primera cuota), congelar, reactivar o dar de baja socios, cobrar recibos y registrar actividades (llamada, email, WhatsApp, visita, nota).
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
3. **Un solo lenguaje para tres perfiles.** Recepción, comerciales y dirección comparten las mismas piezas; cambia la densidad, no el idioma visual.
4. **Honesto con los datos.** Si falta un dato, se ve el hueco; nunca se rellena con un valor inventado.

## Accessibility & Inclusion

Nivel WCAG 2.1 AA: contraste suficiente en los dos temas, foco de teclado visible, estado nunca comunicado solo por color y respeto a `prefers-reduced-motion`.
