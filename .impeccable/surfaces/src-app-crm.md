---
version: 1
slug: "src-app-crm"
primary_target: "src/app/crm"
related_targets: ["src/components/crm"]
---

# CRM de Ice Gym (/crm)

Modo: **Operate**. El equipo (recepción, comerciales y dirección) resuelve tareas en portátil, en sesiones largas: cobrar, llamar, convertir y revisar.

Tarea por pantalla: el panel responde a "cómo va el club ahora"; leads, a "a quién llamo"; socios, a "quién es y qué debe"; pagos, a "qué cobro hoy"; clases, a "qué está lleno".

Restricciones: la paleta y la tipografía están fijadas en PRODUCT.md. Hay tema claro y oscuro (por defecto el del sistema, con cambio manual). El rojo bengala sólo marca impagos.

## Direction contract

THESIS: El club retransmitido en directo. Cada pantalla es un paquete gráfico de retransmisión deportiva: una torre de tiempos ordena lo que pasa ahora y los rótulos inclinados nombran lo importante. Rechaza el panel SaaS de barra lateral con tarjetas redondeadas y también el panel negro con neón y brillos de la primera versión.

OWN-WORLD: Placas opacas y planas, sin sombras ni velos. Corte inclinado constante (unos 70 grados, el de los rótulos de retransmisión) en los extremos de las placas y en las pestañas. Barlow Condensed 800 en mayúsculas para títulos (en cursiva en los rótulos) y cifras tabulares; Barlow para las frases. Los centros tienen códigos de tres letras: CHA, POB y RUZ. El número de socio va en una placa sólida, como el dorsal de un coche. El azul hielo sólo aparece como campo sólido con texto negro; el bengala, sólo como la placa de penalización de los impagos. Tema claro con fondo hielo y placas blancas; tema oscuro con fondo negro y placas carbón.

STORY: Quien entra ve al instante qué pasa en el club y qué le toca hacer; sigue una fila y llega a la ficha, y cobra, llama o convierte sin buscar.

FIRST VIEWPORT: Banda superior con la placa del logotipo y las secciones como pestañas inclinadas: la activa, en campo azul. A la izquierda, la torre EN DIRECTO (unos 300 px): los centros ordenados por ocupación con su posición en placa azul, código, personas dentro, aforo y porcentaje; debajo, las últimas entradas por el torno. A la derecha, un rótulo inferior con cinco cifras enormes (socios activos, altas, ingresos, conversión e impagos) y, debajo, la afluencia por hora con la hora punta rotulada. La acción principal de cada cifra es entrar a su sección.

FORM: Grafismo de retransmisión deportiva (torre de tiempos y rótulos inferiores), candidata 1 de la lista propia, elegida como IMPECCABLE’S PICK sobre la asignada (candidata 3). Clave de sorteo: 6afff19f.

SIGNATURE: La torre EN DIRECTO. Sus filas se reordenan deslizándose cuando cambia la ocupación, y las placas entran con una cortina inclinada rápida una sola vez al cargar.

MOTION: Una cortina inclinada al entrar (clip-path, unos 320 ms, ease-out exponencial y entrada escalonada) y cifras que suben. Nada más: sin brillos al pasar el ratón; pasar el ratón cambia a una placa sólida vecina. Respeta prefers-reduced-motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
