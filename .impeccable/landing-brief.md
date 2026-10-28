# Brief compartido · Landing pública de Ice Gym

Proyecto: `C:\Users\ivan2\develop\ice-gym` (Next.js 16.3 App Router, React 19.2, Tailwind v4, Motion 13 `motion/react`, Phosphor icons `@phosphor-icons/react`, Lenis). Dev en `localhost:3210`. **Lee `AGENTS.md`: esta versión de Next tiene cambios; consulta `node_modules/next/dist/docs/` si usas APIs de Next (Image, Form, server actions).**

## Contexto a leer antes de empezar (rápido)
- `PRODUCT.md` (marca, prohibiciones), `.impeccable/public-direction.md` (dirección visual de la web pública).
- `C:\Users\ivan2\develop\libreria\proyectos\ADN-del-usuario.md` (gustos del usuario) y `libreria\recursos\color-iconos-motion.md`.
- Referencias HTML de la librería del usuario: `C:\Users\ivan2\develop\libreria\disenos\landing\*.html` (hay piezas de gym: 05, 12, 15, 27, 32, y 31 kinético). Inspírate, no copies.
- Portfolio del usuario (nivel de animación que le gusta: Lenis, Motion, scroll ligado, texto kinético): `C:\Users\ivan2\develop\portfolio\src\components\*.tsx`. **Solo lectura, nunca edites el portfolio.**

## Sistema (no inventes otro)
- Wrapper `.landing` fuerza el tema oscuro. Colores SOLO con tokens Tailwind: `bg-fondo #0A0B0D`, `bg-placa #121418`, `bg-placa-2 #1B1E24`, `border-linea #262A31`, `text-tinta #F2F7FA`, `text-tinta-2 #949DA8`, `text-acento-tinta`/`bg-acento #5CE1FF` (azul hielo; sobre él texto `text-sobre-campo` negro). Nada de hex a mano.
- Tipografía: `.rotulo` (Barlow Condensed 800 cursiva mayúsculas), `.condensada` (condensada recta, botones/etiquetas), `.cifra` (números tabulares condensados). Texto: Barlow (`font-sans`). Titulares ENORMES (clamp hasta 9-14rem).
- Esquinas 0 px. Cortes diagonales ~70°: clases `.corte-d`, `.corte-i`, `.corte-a`, `.corte-rotulo` (clip-path). Grano `.ruido` ya está en el wrapper.
- Motion: curva `[0.23,1,0.32,1]`, duraciones 160/320/700 ms, escalón 40-60 ms, escala 0.97 al pulsar. Respeta reduced-motion (MotionConfig ya lo hace; en scroll-linked usa `useReducedMotion`).
- Primitivas compartidas en `src/components/landing/Movimiento.tsx`: `Revelar`, `TituloPartido` (titular palabra a palabra con máscara), `Antetitulo n="02"`, `curva`. `ScrollSuave.tsx` exporta `irA(id)` para enlaces internos. Úsalas; no las modifiques (si necesitas algo más, créalo dentro de tu archivo).
- Imágenes reales en `public/landing/`: `sala-poleas.jpg`, `sala-peso-libre.jpg` (se ve un rótulo "ELITE FITNESS" en la pared: recorta/usa object-position para que no se lea), `sala-cardio.jpg`, `sala-ciclo.jpg` (pantalla con "APEX RIDE // LONDON": evita que se lea, recorta arriba o tapa), `sala-funcional.jpg`, `fachada-frontal.jpg`, `fachada-esquina.jpg` (1024 px de ancho aprox). Usa `next/image` con `sizes` correcto. Fotos nocturnas con luz azul: encajan con el azul hielo.
- Datos: cada sección recibe `{ datos }: { datos: DatosLanding }` (`src/lib/datos/publico.ts`): `centros` (Chamberí/Madrid 320 aforo, Poblenou/Barcelona 260, Ruzafa/Valencia 195; con dirección, teléfono, horario), `tarifas` (Basic 19,99 €, Comfort 29,99 € destacada, Premium 44,99 €; matrícula, descripción, `incluye[]`), `clases` (próximas; hoy solo hay "Yoga Flow"). Códigos de centro: `codigoCentro()` de `@/design/tokens` → CHA/POB/RUZ. Formato de moneda: mira `src/lib/formato.ts`.
- **Prohibido inventar** testimonios, nº de socios, valoraciones o cifras de negocio. Usa solo los datos anteriores (aforo, horas, precios, 3 ciudades…). Si un dato no existe, no lo pongas.
- Prohibido: degradados morados/azules decorativos, glassmorphism, glows al hover, tarjetas redondeadas iguales con sombra, emojis, hero centrado genérico, frases de relleno. Copy en español, directo, con carácter deportivo.
- Móvil impecable (360 px): sin scroll horizontal, objetivos táctiles ≥ 44 px.
- IDs de sección para la navegación: `#instalaciones`, `#tarifas`, `#centros`, `#clases`, `#visita`.

## Reglas de trabajo
- Edita SOLO tus archivos asignados. No toques `page.tsx`, `globals.css`, `tokens.ts`, `Movimiento.tsx`, ni el CRM.
- Exporta el componente con el mismo nombre y firma que el stub.
- Al acabar, ejecuta `npx tsc --noEmit -p .` y `npx eslint <tus archivos>` y arregla lo tuyo. No arranques `next dev` ni `next build` (otros agentes trabajan en paralelo).
- Responde con 3-5 líneas: qué hiciste y qué animaciones.
