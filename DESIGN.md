---
name: APPFIT
description: "Precisión deportiva en tinta, mineral y naranja señal para un registro móvil rápido."
colors:
  bg: "rgb(242 245 248)"
  dark-bg: "rgb(14 22 33)"
  surface: "rgb(255 255 255)"
  dark-surface: "rgb(23 34 49)"
  surface-elevated: "rgb(255 255 255)"
  dark-surface-elevated: "rgb(30 44 61)"
  surface-muted: "rgb(232 237 242)"
  dark-surface-muted: "rgb(36 49 65)"
  overlay: "rgb(15 25 40)"
  dark-overlay: "rgb(0 0 0)"
  text-primary: "rgb(21 34 51)"
  dark-text-primary: "rgb(244 248 252)"
  text-secondary: "rgb(73 88 105)"
  dark-text-secondary: "rgb(192 206 222)"
  text-tertiary: "rgb(89 105 123)"
  dark-text-tertiary: "rgb(166 185 205)"
  border: "rgb(213 223 232)"
  dark-border: "rgb(56 73 94)"
  border-strong: "rgb(117 128 140)"
  dark-border-strong: "rgb(133 153 175)"
  accent: "rgb(223 87 27)"
  dark-accent: "rgb(255 148 92)"
  on-accent: "rgb(15 25 40)"
  accent-strong: "rgb(157 55 13)"
  dark-accent-strong: "rgb(255 170 124)"
  accent-subtle: "rgb(255 236 222)"
  dark-accent-subtle: "rgb(68 39 24)"
  selected: "rgb(255 255 255)"
  dark-selected: "rgb(64 83 105)"
  on-selected: "rgb(21 34 51)"
  dark-on-selected: "rgb(244 248 252)"
  success: "rgb(24 111 73)"
  dark-success: "rgb(105 207 157)"
  on-success: "rgb(255 255 255)"
  dark-on-success: "rgb(14 22 33)"
  success-subtle: "rgb(230 244 236)"
  dark-success-subtle: "rgb(25 55 44)"
  warning: "rgb(137 84 9)"
  dark-warning: "rgb(235 193 97)"
  destructive: "rgb(175 49 38)"
  dark-destructive: "rgb(255 148 135)"
  on-destructive: "rgb(255 255 255)"
  dark-on-destructive: "rgb(20 20 18)"
  protein: "rgb(66 95 136)"
  dark-protein: "rgb(151 179 221)"
  carbs: "rgb(83 102 47)"
  dark-carbs: "rgb(173 195 121)"
  fat: "rgb(129 78 113)"
  dark-fat: "rgb(215 166 201)"
  training: "rgb(21 34 51)"
  dark-training: "rgb(31 48 69)"
  on-training: "rgb(245 248 252)"
  training-muted: "rgb(191 207 223)"
  training-track: "rgb(56 73 94)"
  meal-accent: "rgb(255 148 92)"
typography:
  hero:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  display:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  metric:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.04em"
  heading:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  body-sm:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.04em"
  caption:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  sheet: "1.5rem"
  pill: "9999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  page: "1.25rem"
  section: "1.5rem"
  card: "1rem"
  stack: "0.75rem"
  touch: "2.75rem"
  touch-lg: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.accent-strong}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  button-destructive:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.destructive}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  button-danger:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.on-destructive}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  input:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card}"
  card-muted:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card}"
  meal-header:
    backgroundColor: "{colors.training}"
    textColor: "{colors.on-training}"
    rounded: "{rounded.lg}"
    padding: "12px"
  badge-neutral:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  segmented-control:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "4px"
  menu-trigger:
    backgroundColor: "{colors.training}"
    textColor: "{colors.on-training}"
    rounded: "{rounded.md}"
    width: "124px"
    height: "48px"
  menu-target:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px"
    width: "5.25rem"
    height: "4.25rem"
  series-completed:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-success}"
    rounded: "10px"
---

# Design System: APPFIT

## Overview

**Creative North Star: "Pista indoor"**

La pista indoor organiza APPFIT con precisión deportiva: azul tinta para estructura y lectura, blanco mineral para descanso visual y naranja señal para actuar. Manrope local aporta títulos firmes y cifras tabulares; nutrición, peso y entrenamiento comparten la misma gramática de controles, líneas y superficies.

La densidad es operativa: los datos relacionados permanecen próximos y las tareas se leen en una columna móvil. El movimiento explica origen, continuidad y confirmación; el abanico que emerge del botón Menú es el gesto distintivo. La identidad se sostiene en tipo, color y geometría, sin añadir materiales o imágenes que el artefacto no utiliza.

**Key Characteristics:**

- Tinta, mineral y naranja señal con roles equivalentes en ambos temas.
- Una familia local, cifras tabulares y jerarquía fuerte sin reducir los campos.
- Superficies planas, radios contenidos y profundidad reservada a capas.
- Acciones táctiles, continuidad breve y feedback que conserva texto e iconos.

Este documento registra el rediseño construido en `src/shared/design/tokens.css`, `tailwind.config.js`, `src/index.css` y los componentes compartidos. [PRODUCT.md](PRODUCT.md) conserva la verdad de producto; [la superficie APPFIT](.impeccable/surfaces/appfit.md) conserva el brief y su composición concreta; [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) explica la implementación. La extracción es code-led, sin comp aprobado ni nuevos rasters; no acredita Safari/iOS o Android físicos.

## Colors

La paleta combina minerales fríos y tinta azul con una señal naranja cálida. El frontmatter conserva colores CSS RGB derivados de los canales de la fuente; los tokens con prefijo `dark-` registran únicamente los valores que el tema oscuro sustituye. Los roles sin sustitución mantienen el mismo valor. Foco y kcal reutilizan naranja de texto y naranja señal; la meta reutiliza tinta de lectura.

### Primary

- **Naranja señal:** acción principal, indicador de navegación, destino actual y calorías. Su texto es tinta, en ambos temas.
- **Naranja de texto y foco:** enlaces, acciones ghost y foco visible; tiene contraste propio para cada apariencia.
- **Apoyo de señal:** fondo discreto de acciones contextuales y metadatos de acento.
- **Señal sobre cabeceras de comida:** reutiliza el naranja claro del tema oscuro sobre tinta en ambos temas; icono y kcal distinguen la sección sin convertir el bloque en una acción naranja.

### Neutral

- **Fondo mineral:** página clara; su equivalente oscuro es tinta profunda.
- **Superficie de contenido:** paneles y listas agrupadas. La superficie de capa se distingue tonalmente en oscuro.
- **Mineral secundario:** campos, selectores y contexto; no sustituye el límite de control.
- **Tinta de lectura, contexto y metadato:** tres niveles legibles, sin usar opacidad para esconder información.
- **Divisor mineral y límite de control:** separar contenido y reconocer un campo son funciones distintas.
- **Superficie de entrenamiento:** tinta con lectura clara y un carril propio. Es un contexto semántico usado por la sesión activa y el cierre, no un color obligatorio de todos los resúmenes.

Proteína mineral, carbohidratos oliva y grasa ciruela son códigos de datos, no acentos de feature. Confirmación, advertencia y destrucción acompañan texto o iconos. Superar un objetivo nutricional mantiene una lectura neutral y una diferencia explícita. El aviso flotante utiliza una superficie inversa al tema con sus propios valores de lectura y foco.

**The Señal con significado Rule.** El naranja identifica acción, selección de destino y kcal. Proteína, carbohidratos y grasa conservan sus colores de datos; ningún color sustituye etiqueta, unidad o estado accesible.

## Typography

**Display Font:** Manrope variable local, con fallback sans del sistema.
**Body Font:** la misma familia; no hay segunda voz ornamental.
**Label/Mono Font:** Manrope con cifras tabulares donde hay métricas, cantidades o relojes; no se incorpora una familia monoespaciada.

Manrope Latin se sirve desde `public/fonts/manrope-latin-variable.woff2`, con intercambio de fuente y rango variable de pesos. La interfaz conserva tamaños finales inmediatos y usa el peso para separar tarea, dato y contexto.

### Hierarchy

- **Hero:** métrica protagonista y tiempo de sesión guardada; peso fuerte y tracking cerrado.
- **Display:** títulos de pantalla.
- **Metric:** cifra secundaria destacada.
- **Heading:** título o dato de un contexto operativo compacto.
- **Title:** secciones, ejercicios y títulos de capas.
- **Body:** lectura y campos editables.
- **Body-sm:** contexto y controles secundarios; los botones lo refuerzan con peso semibold.
- **Label:** etiqueta breve con tracking moderado, sin imponer mayúsculas.
- **Caption:** metadatos y unidades breves; no sustituye texto de tarea o campo.

Los tamaños, pesos, interlineados y tracking normativos están en el frontmatter. Los controles pueden reforzar el peso de su rol; el label no autoriza un kicker ornamental. La cabecera renderiza título primero y contexto debajo, aunque su API conserve el nombre histórico `overline`.

**The Una voz estable Rule.** Manrope es la familia común. Las cifras cambian directamente y conservan ancho tabular; los nombres necesarios para elegir envuelven antes de reducir su tamaño.

## Layout

La PWA usa una columna centrada de máximo 512 px también en escritorio. El shell ocupa 100dvh; el contenido principal posee el scroll de página y la navegación tiene espacio propio. Margen lateral de página según la escala compartida, reducido a 16 px por debajo de 360 px; secciones, unidades y contenido interno utilizan los roles de espaciado del frontmatter. El ritmo básico es de 4 px.

La navegación reserva 72 px más la safe area inferior. Los contenidos respetan la safe area superior. Las capas siguen alto y desplazamiento de `visualViewport` cuando existe, con fallback a 100dvh, y separan acciones persistentes del contenido desplazable.

Flex y rejillas mantienen ancho mínimo cero y permiten envolver. Las métricas pueden compartir dos o tres columnas cuando caben sus cifras. Listas y divisores agrupan registros; los paneles delimitan unidades de información reales. La composición particular del resumen diario o del entreno activo pertenece a sus componentes y a la superficie, no a una prohibición global de otras composiciones.

## Elevation & Depth

La profundidad combina tono, línea y espacio. Los paneles, campos y barra inferior no tienen sombra. Sheets y avisos flotantes emplean la única sombra compartida; el tema oscuro adapta su intensidad. El backdrop usa el color de aislamiento a media opacidad. La superficie de entrenamiento tiene profundidad tonal, sin añadir un material simulado.

### Shadow Vocabulary

- **Overlay:** sombra difusa superior para sheets y avisos. Sus valores y variante oscura viven en `extensions.shadows` del sidecar y en la variable de sombra de la fuente.

**The Plano por defecto Rule.** Los paneles y la navegación reposan sin sombra. La separación se construye con tono, contorno y espacio; la única sombra compartida pertenece a capas y avisos flotantes.

## Shapes

Esquinas contenidas: pequeñas para badges e indicadores de selección, medias para botones y campos, grandes para paneles, y amplias solo en la parte superior de sheets. Los círculos y el radio pill resuelven puntos de dato, asa o acciones que lo justifican.

Los contornos son finos. Los campos utilizan el límite fuerte; las agrupaciones de contenido utilizan la línea de división. El botón Menú es un rectángulo corto, no una rueda dibujada. Su abanico conserva cuatro destinos amplios en dos niveles. Las filas y el check de series tienen un radio local de 10 px: ese detalle de la tabla no amplía la escala común de radios.

## Components

### Buttons

Controles firmes y táctiles, con radio medio. Primary usa naranja y tinta; secondary usa superficie y contorno; ghost usa naranja de texto. Destructive ofrece la acción sobre mineral secundario; danger usa fondo destructivo sólido para la confirmación.

El tamaño medio conserva 44 px mínimos, padding vertical de 8 px y horizontal de 20 px. Small mantiene el target, reduce la tipografía a body-sm y el padding horizontal a 16 px. Large usa 48 px mínimos, peso bold y padding horizontal de 24 px. IconButton mantiene 44 px reales en small/medium y 48 px en large; requiere nombre accesible.

Hover se limita a puntero compatible. Presionar aplica una escala breve de 0,97 y el tratamiento de brillo/opacidad de la variante. Loading deshabilita y anuncia ocupado. El foco compartido tiene contorno de 2 px y separación de 2 px. Reduce Motion elimina la escala de presión.

### Chips

Badge es un metadato no pulsable: radio pequeño, padding breve y tipografía caption con peso medium. Las variantes neutral, accent y warning conservan contexto legible. El punto de dato, cuando existe, acompaña palabras.

### Cards / Containers

Card delimita una unidad real, con radio grande y padding de contenido. Default combina superficie y línea; muted utiliza el mineral secundario. No hay elevación de card. ListGroup y ListRow ofrecen listas planas, divisores y filas completas pulsables con estados de hover y presión.

La cabecera de cada comida es un bloque de tinta independiente del plato: icono circular, título heading con peso 800, número de registros debajo y total de kcal naranja a la derecha. Usa radio grande, borde naranja tenue y separación de 12 px respecto a sus entradas, sin sombra ni halo. El icono no es un control y la cabecera no se pulsa; el botón de acciones conserva su nombre y comportamiento. No se inventan horarios: el diario no registra la hora de la comida. En poco espacio las kcal ganan una fila; con texto ampliado el título ocupa todo el ancho bajo icono y acciones. Los nombres y las cifras completas envuelven, sin altura fija ni reducir targets.

### Inputs / Fields

Input, Select, Textarea y SearchInput comparten radio medio, texto body, límite fuerte y superficie secundaria; el tono surface se utiliza cuando el campo va directamente sobre la página. Los campos de una línea tienen al menos 44 px y padding horizontal de 12 px. El foco refuerza el borde con naranja de texto y aclara la superficie. Error marca el borde y se explica en la misma tarea; disabled reduce presencia sin cambiar la geometría.

Las etiquetas de formulario son visibles. Una búsqueda tiene nombre accesible y lupa SVG. Los campos numéricos del entreno son directos y tabulares; su borrador evita que una escritura asíncrona anterior interrumpa la entrada.

### Navigation

Un botón Menú de 124×48 px abre el abanico desde el centro medido de ese mismo botón. Inicio, Nutrición, Gym y Ajustes conservan icono y nombre. El destino actual añade check y estado accesible además del naranja; cada target contiene su check también en la rejilla compacta.

Los destinos miden 84×68 px y se distribuyen en dos niveles ascendentes. La órbita horizontal alcanza 120 px y se limita por el ancho disponible; la elevación es de 160 px. Entrada de 280 ms con desfase de 18 ms y salida de 180 ms conservan origen y reversa. Las curvas desaceleran sin rebote. Texto ampliado o altura inferior a 360 px activa una rejilla desplazable de dos columnas sobre el mismo origen; se mantienen las etiquetas y el tamaño táctil. Más de cuatro destinos se pagina.

ViewTabs navega entre vistas con una línea indicadora de 3 px y panel asociado. SegmentedControl elige un valor sobre fondo mineral; el indicador neutro sigue el ancho y posición medidos de la opción. Sus opciones usan ancho flexible según contenido, evitando cortar una etiqueta frecuente para conservar segmentos iguales. Ambos incluyen flechas, Home/End y una entrada de teclado.

### Layers and feedback

Sheet es un panel inferior con asa, cierre visible, contenido desplazable y footer opcional persistente. ModalPage ocupa el área visible para una tarea completa. Portal, pila de capas, aislamiento del fondo, foco, Escape, Atrás y retorno del foco son compartidos. Solo la capa superior es interactiva. La salida mantiene la capa hasta su frontera de cierre; reabrir cancela tareas pendientes.

Entrada de capa de 280 ms, estado de 200 ms y feedback de 120 ms usan la curva estándar. La salida usa 180 ms y curva propia. CSS y Web Animations implementan estas transiciones: no existe una librería ni un motor físico de spring. Reduce Motion elimina desplazamientos, escala, FLIP, desfase y animaciones de carga/éxito; las capas mantienen un fundido de 80 ms. Selección y progreso actualizan sin transición espacial.

Toast flota sobre la navegación con superficie inversa y estado o alerta; ofrece Deshacer cuando procede. Los errores de una tarea modal se muestran dentro de esa capa. Haptic es complementario y opcional: iOS/Safari no expone Vibration API, Android depende del navegador; no se simula con audio. La interfaz comunica la acción sin vibración y la omite bajo Reduce Motion o pestaña oculta.

### Nutritional summary

ResumenNutricional integra cifra de kcal, objetivo, diferencia y tres macros en un panel. Controles, detalle y footer son slots dentro de su contorno. ProgressBar representa objetivo y exceso atenuado, con texto accesible; las cifras y unidades permanecen completas. Esta composición compartida resuelve el resumen del día, sin imponerla a todas las métricas del producto.

### Active workout and completion

El entreno activo usa un contexto de tinta compacto: título antes del estado, reloj aislado, volumen, series marcadas y progreso. La configuración del descanso queda en Disclosure y el temporizador la sustituye mientras corre, preservando espacio para editar series.

Cada fila mantiene número/check, reps, kg y borrado. Completar aplica fondo de éxito, check reversible y anuncio accesible; editar desmarca. La confirmación espera la escritura pendiente. Altas y cambios de estructura, incluido abrir descanso/configuración, permiten continuidad FLIP; el reloj y las teclas no disparan mediciones de la lista. Borrar conserva Deshacer.

Las marcas y el descanso son estado de presentación en `sessionStorage`, separados por workout. Sobreviven navegación y recarga de la misma pestaña; no cambian IndexedDB ni backups. Si storage falla, la interacción continúa en memoria. El descanso está desactivado por defecto, ofrece 60/90/120 s, usa deadline absoluto, suspende ticks ocultos y recalcula al volver. No declara ejecución fiable en background ni notificaciones.

Terminar espera escrituras, explica que guarda todas las series registradas, marcadas o no, y ofrece continuar. El resumen de cierre muestra duración, ejercicios, series y volumen guardados; su check entra en 420 ms y aparece directamente bajo Reduce Motion.

## Do's and Don'ts

### Do:

- **Do** usar los roles de color y la escala compartida en claro y oscuro.
- **Do** mantener campos de al menos 16 px y targets reales de 44 px; las acciones principales de registro usan 48 px.
- **Do** colocar el contexto después del título y mantener nombres, cifras y unidades legibles al envolver.
- **Do** mostrar selección y confirmación con texto o forma además del color.
- **Do** mantener foco visible, aislamiento y retorno del foco en todas las capas.
- **Do** conservar estados útiles bajo Reduce Motion y permitir que el contenido responda al teclado y las safe areas.

### Don't:

- **Don't** introducir una paleta, familia o sombra propia por feature.
- **Don't** convertir cada etiqueta o cifra en una tarjeta ni imponer una misma composición a todas las tareas.
- **Don't** reducir tipografía o targets para encajar una etiqueta; ocultar overflow no repara un layout.
- **Don't** colocar un eyebrow decorativo por encima del título.
- **Don't** usar movimiento, vibración o color como única confirmación de una acción.
- **Don't** presentar el exceso nutricional como error, ni añadir resultados, récords o tendencias que los registros no acreditan.
- **Don't** describir la PWA como app nativa, prometer vibración en iOS o declarar un motor spring que el código no incorpora.
