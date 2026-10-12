# 035 — Acento volt y pulido visual

Fecha: 2026-10-12. Estado: vigente. Sustituye el color del acento de [ADR 020](020-acento-naranja-y-superficies-suaves.md) (naranja) y la posición del «+» de [ADR 028](028-barra-de-pestanas-y-registrar.md). Superficies, forma, composición y el resto de ambos siguen vigentes.

## Contexto

Con la app ya a su gusto, Víctor pidió buscar en otras apps (WHOOP, Oura, Strava, Hevy, Strong, MacroFactor, Apple Fitness, Gentler Streak, Bevel) maneras de mejorar lo que ya existe, sin funciones nuevas. Se le presentaron 19 propuestas con maquetas de antes y después y un explorador de seis paletas sobre las pantallas reales. Eligió la paleta E («Volt»: grafito con verde lima) y aceptó las 19 propuestas, con un matiz en la rueda de energía: más grande y con la cifra protagonista, pero con el relleno de siempre (tramos contiguos, sin extremos redondeados).

## Decisión

- **Acento volt**: `accent` es un verde lima claro (198 244 50) en ambos temas, con texto casi negro encima (`on-accent`). Como es claro, en el tema claro no sirve para líneas ni texto: `accent-strong` (oliva 58 94 10 en claro, lima claro en oscuro) dibuja texto, iconos, foco, la barra de las pestañas de vista, las curvas de las gráficas y los bordes de selección. Los neutros toman un leve sesgo oliva.
- **Energía en la familia del acento**: `kcal` es lima (oliva más oscuro en claro, para rellenar sobre blanco con ≥ 3:1). La regla de familia pasa de ΔE ≤ 10 a **tono a ≤ 15°** (OKLCH), porque en claro el relleno de energía es más oscuro que el acento.
- **«Serie hecha» se separa del volt**: el verde de éxito queda a ≥ 25° de tono y ΔE ≥ 20 del acento (en oscuro pasa a 64 190 140). Lo vigila `contrast.test.ts`.
- **Barra flotante**: cápsula sólida con sombra (`shadow-float`), sin desenfoque, separada de los bordes; Inicio · Nutrición · Entreno · Más dentro y el «+» redondo aparte, a la derecha. La pestaña actual va sobre una píldora. La barra flota sobre el contenido, que pasa por debajo con una franja de lectura; la vista reserva su alto al final.
- **Pulido aprobado** (sin funciones nuevas): aviso de copia en una banda; rótulos de tarjeta y de métrica en versalitas (`text-rotulo`); fondo de sección con foto o liso (preferencia de pantalla en Ajustes); rueda de energía mayor con la cifra en `hero`, «Quedan» como segunda cifra y cada macro frente a su objetivo; minigráfica del peso con relleno plano y su máximo y mínimo; «Tu semana» de Inicio con un anillo de kcal por día y la pesa del entreno; revisión semanal en una fila; semana de Nutrición con un anillo por día; filas del diario con la categoría (o la inicial) en una pastilla y las letras P/C/G en su color; borrar alimentos deslizando la fila (con «Deshacer»); rutinas a la vista en Empezar; cabecera de la sesión con el tiempo en grande y un segmento por serie; ejercicios terminados plegados; Progreso como lista con minigráficas; «Más» con teselas de progreso; barra de altitud en la lista de montañas; Ritmo como mapa de calor en grafito; Vitrina en medallas con anillo de progreso (en grafito: el color de la gamificación sigue siendo solo de la Liga).
- **Iconos de la PWA** regenerados con el pulso en volt.

## Consecuencias

- El volt es lo más cercano al neón que admite `DESIGN.md`: queda limitado a la acción principal (el «+», el primario de las capas) y a la energía; el resto de la interfaz sigue en grafito.
- Una acción sólida en acento por vista, como antes. Sobre grafito, la acción principal de Empezar usa `.training-primary` (relleno en el texto de entreno) para no gastar el acento.
- Borrar deslizando necesita confirmarse en el iPhone real; el botón «Borrar» sigue en el árbol accesible y se abre con el foco de teclado.
- Los scripts `scripts/ui/validar-*` que borraban con la papelera o empezaban «Desde rutina» se han adaptado; varios ya estaban desfasados antes de este cambio.
