# Sistema visual de APPFIT

Implementación de la identidad de [DESIGN.md](../DESIGN.md). El criterio de producto vive allí; este documento explica cómo sostenerlo en código. Base arquitectónica: [ADR 007](decisiones/007-sistema-visual-movil.md). Identidad actual: [ADR 012](decisiones/012-identidad-enfocada-energica.md) con la paleta de [ADR 017](decisiones/017-paleta-cobalto-y-composicion-respirada.md); motion: [ADR 009](decisiones/009-identidad-y-motion-impeccable.md).

## Arquitectura

Tres piezas para la identidad compartida:

1. `src/shared/design/tokens.css`: valores semánticos, temas, dimensiones y motion.
2. `tailwind.config.js`: nombres de clase que apuntan a esos tokens; conserva el espaciado básico de Tailwind. Sustituye su paleta, escala tipográfica y radios.
3. `src/shared/components/`: controles y patrones repetidos. Las pantallas conservan composición y decisiones de dominio.

`src/index.css` contiene fuente local, base, foco, safe areas y cifras tabulares. `design/theme.ts` aplica el tema y actualiza `meta theme-color`; `design/viewport.ts`, inicializado al arrancar, sigue `visualViewport` para ajustar las capas al área visible cuando aparece el teclado. No modifica datos.

Saira variable Latin (ejes `wdth` 50–125 % y `wght` 100–900), recta y cursiva, en `public/fonts/`: licencia OFL, precarga y precache; sin petición externa en ejecución. Las tres familias (`--font-sans`, `--font-display`, `--font-numeric`) son Saira; cambian peso, anchura y estilo, que viven en `tokens.css` (`--fw-*`, `--fst-*`, `--font-style-numeric`) y aplica `index.css`:
- `font-display`, `text-display`, `text-heading` y los títulos de capas/ejercicio: 900 al 62,5 %, rectos.
- `font-numeric`: cursiva 800 al 70 %; con `text-hero`, 900 al 62,5 %. Se declara después de `text-heading` para que una cifra con tamaño de título siga siendo cifra.
- `text-label`: 700 al 85 %. El resto, ancho normal.
Fallback sistema con `font-display: swap`.

Procedencia: Google Fonts, subconjunto latin de `Saira:wdth,wght` (`fonts.gstatic.com/s/saira/v23/memwYa2wxmKQyNknTZM.woff2`) y de su cursiva (`…/mem-Ya2wxmKQyNkifZE1Vw.woff2`), variables completas. Licencia: `https://github.com/google/fonts/blob/main/ofl/saira/OFL.txt`, copiada en `public/fonts/Saira-LICENSE.txt`.

## Tokens

Los valores exactos viven en `tokens.css`; no se duplican en componentes.

| Familia | Clases / roles | Uso |
|---|---|---|
| Superficies | `bg-bg`, `bg-surface`, `bg-surface-muted`, `bg-surface-elevated` | página, unidad, campo/contexto, sheet |
| Texto | `text-fg`, `text-fg-muted`, `text-fg-subtle` | dato, contexto, metadato; todos contrastan |
| Línea | `border-line`, `border-line-strong` | divisor decorativo, límite reconocible de control |
| Acción | `bg-accent`, `text-accent-on`, `text-accent-strong`, `bg-accent-subtle` | cobalto: acción, texto encima, acción textual/foco, apoyo |
| Selección | `bg-selected`, `text-selected-on` | opción neutra del selector de valor |
| Estado | `success`, `warning`, `destructive`, `destructive-on` | siempre con texto o icono |
| Datos | `kcal`, `protein`, `carbs`, `fat`, `goal` | ámbar, índigo, turquesa, arcilla; mismos roles en toda la app |

`data-theme="light|dark"` va en html. `data-surface="inverse"` se reserva al Toast, con texto/foco/acción adecuados al fondo inverso. Grafito frío (tono 258) en ambos temas; cobalto para actuar y ámbar para kcal. `meal-accent` es el cobalto legible sobre grafito de `.training-surface`. `kcal` es más oscuro en claro para contrastar ≥3:1 sobre blanco. `contrast.test.ts` exige además distancia perceptual (ΔE OKLab) entre macros ≥ 10, entre acción textual y borrar ≥ 15 y entre kcal y acción ≥ 15. `Button` añade la variante `subtle` (texto neutro) para acciones repetidas en listas. `.training-surface` resuelve también texto/foco/controles sobre grafito. Los resúmenes nutricionales conservan el tema de página.

| Escala | Valores / clases |
|---|---|
| Tipografía | hero 56, display 41, metric 34, heading 26, title 18, body 16, body-sm 14, label 13, caption 12 px |
| Espaciado | page 20 (16 bajo 360 px), section 24, card 16, stack 12 px; base de 4 px |
| Radios | sm 6, md 10, lg 14, sheet 20 px; pill solo con significado |
| Interacción | touch 44, touch-lg 48 px; área real, sin pseudo elemento |
| Profundidad | shadow-overlay solamente; sin sombras de cards ni nav |
| Motion | feedback 120, estado 200, entrada de capa 280, salida 180, éxito 420, stagger 18 ms; desplazamiento 8 px |

Reduce Motion suprime desplazamientos, escala, FLIP, stagger, pulsación y entradas de series/éxito. Capas conservan un fundido de 80 ms para explicar estados; selección y barras cambian sin transición espacial. Carga localizada con skeleton, sin pulso bajo reducción. Valores inmediatos; gráficas sin contador ni animación de entrada. `motion.ts` lee las duraciones/easing del CSS y ofrece haptic opcional, nunca un requisito para entender una acción.

## Navegación y capas

### Fondo fotográfico

`app/AtmosferaApp` es la única selección de escenas: Inicio → bienestar/fitness, Nutrición → meal prep, Gym → pesas; Referencias/Ajustes reutilizan las fotos con `data-quiet`. Se monta en el shell como hermana del `<main>` con scroll (no dentro de él), en un contenedor `relative isolate` que ocupa el área de contenido; centrada en la columna `max-w-lg`, empieza bajo la safe area superior. Así el contenido se desplaza por encima y la foto queda quieta sin `position: fixed` ni eventos de scroll. Para que eso valga también en secciones que caben en pantalla (Gym, Referencias), en táctil (`pointer: coarse`) `.app-view[data-atmosphere]` mide `100% + 1px`: `main` siempre puede desplazarse y iOS no pasa el gesto al documento, que arrastraría foto y contenido juntos; además `html` lleva `overscroll-behavior: none` (en el root, que es donde se aplica al viewport). Aislada y fuera del flujo, con alt vacío/aria-hidden/pointer-events:none. No lee ni escribe registros. `useSyncExternalStore` consume el tema ya resuelto por `design/theme`, sin segunda preferencia ni observador del DOM. Solo se monta una imagen; las variantes `*-claro.webp` son fotografías distintas de luz natural, no una transformación de la escena oscura.

Las seis WebP locales (960×1440, unos 333 KB en conjunto) cargan sin servicios externos; `vite.config` incluye webp en el precache. El juego claro añade unos 157 KB. Decodificación async, prioridad alta solo para Inicio. Procedencia y prompts: `public/images/atmosferas/README.md` y sidecars. No usar un recorte del mockup con texto como fondo.

Los tokens `--atmosphere-*` gobiernan altura, opacidad, saturación y protección de lectura. Fotografía quieta del alto visible (máximo 50 rem) y fade vertical; no hay hero de altura añadida, parallax, vídeo o backdrop-filter. PageHeader/tabs protegen su texto, Card dentro del shell conserva 96%/98% de opacidad (oscuro/claro); training conserva 96%. Menús, registros, controles y formularios siguen con superficies propias. Forced Colors oculta la foto, Reduce Motion mantiene una escena estática y una descarga fallida deja el fondo del tema.

Los tests de contraste comprueban cabeceras/paneles incluso sobre negro/blanco fotográficos. No convertir una foto futura en más luminosidad detrás del texto eliminando su protección.

**Continuidad ambiental aprobada:** el tratamiento de la preview de Gym es ahora el fondo habitual, sin flags ni preferencias nuevas. `data-scene` asigna dos tonos por ámbito: pizarra/niebla en Inicio, arena/pizarra en Nutrición y cobalto/acero en Gym. La protección de lectura de cabecera y pestañas es una franja que se desvanece (`--atmosphere-reading-height` 15 rem, `--atmosphere-reading-fade` 21 rem), no un fondo de cada elemento; vive en `.app-view[data-atmosphere]::before` para desplazarse con la cabecera y no tapar siempre la parte alta de la foto quieta. `::before` de la capa contiene dos radiales estáticos por toda el área visible; foto y velo en `img`/`::after` comparten una máscara (opaca hasta 40%, transparente al final) para desembocar sin costura en la luz ambiental. Foto y velo miden `min(100%, --atmosphere-height)`: en el móvil ocupan el alto visible y en pantallas altas se quedan en 50 rem; no repite ni añade fotos en tramos largos.

Tokens `--atmosphere-photo-*`: saturación 60%/85%, contraste 96%, brillo 92%/98% y opacidad 90%/72% (oscuro/claro). Velos 52/56/82% en oscuro, 71/86/90% en claro (el mínimo que mantiene ≥4,5:1 para texto principal/secundario arriba y todo el texto desde el 18% sobre el negro fotográfico). Luces laterales con máximos 16%/10% y 10%/7%, respectivamente; `data-quiet` reduce su capa al 35% y la foto al 20%/14%. Los controles, superficies y protección de lectura conservan sus valores. Sin raster nuevo, blur, `position: fixed`, animación ni eventos de scroll (la quietud viene de la estructura del shell). Forced Colors oculta toda la decoración; Reduce Motion no tiene trabajo añadido. Contraste comprobado con extremos fotográficos y posiciones intermedias de la máscara, en los tres ambientes/ambos temas. Capturas/recorrido: `scripts/ui/validar-fondos.cjs`.

Claro usa foto al 72%, saturación 85%, velo superior 71% → 86% al 18% de altura → 90% al 43%; Referencias/Ajustes reducen la foto al 14%. Oscuro define su propia saturación (60%) para que el ajuste de claro no le afecte. Los stops finales, las superficies y el motion no cambian. La lectura plana superior/tras el contexto en claro también se verifica frente a extremos fotográficos.

### Shell y tareas

`App` es un flex de altura 100dvh: `main` tiene el único scroll de página y `BottomNav` espacio propio (72 px + safe area). Cambiar destino vuelve al inicio. Columna centrada de máximo 512 px también en escritorio. Un botón Menú de 124×48 px abre un portal de abanico, no una Sheet. Tiene `aria-haspopup`, `aria-expanded`, `aria-controls` y contexto visible de la sección actual.

`app/RuedaNavegacion` distribuye cinco destinos (tres arriba y dos debajo) en dos niveles ascendentes desde el centro medido del botón. Targets de 84×68 px, órbita horizontal hasta 120 px (104 a 320), elevación de 160 px. Icono/nombre visibles, sección actual con `aria-current="page"`, acento y check. Las acciones viajan desde el origen en 280 ms con stagger de 18 ms; salida inversa de 180 ms. Texto ampliado o landscape muy bajo cambia a una rejilla desplazable de dos columnas sobre el mismo origen, sin reducir etiquetas. Flechas/Home/End, Enter/Espacio, Escape, Atrás, backdrop y cierre central mantienen foco, scroll y aislamiento. Más de cinco destinos (tres arriba y dos debajo) usa paginación, nunca targets menores. Geometría pura en `shared/design/rueda.ts`. El contexto inferior permanece accesible cuando el texto ampliado impide mostrarlo junto al botón; la cabecera mantiene la orientación visual.

- **ViewTabs**: navegar entre vistas. tablist/tab/tabpanel asociado, flechas/Home/End y una entrada de teclado.
- **FilterChips**: multiselección por familia mediante botones con `aria-pressed`, 44 px y radio pill con significado de filtro. Fila desplazable horizontal sin estrechar targets. Gym combina OR dentro de músculo/equipo y AND entre ambas familias; no sustituye ViewTabs/SegmentedControl. Selector en ModalPage con búsqueda fija y filtros/resultados en el scroll de tarea; solo buscar/escribir personalizado abre teclado. La cabecera envuelve y coloca el título completo debajo de Volver si hace falta. `busy` impide cierres durante escritura; error recuperable conserva tarea/borrador y footer persistente.
- **SegmentedControl**: elegir valor (comida, periodo, tema, métrica, colección). radiogroup/radio y etiqueta; mismo teclado. No confundir con navegación.
- **Disclosure**: detalles, datos de gráfica y explicación; aria-expanded/controls. No ocultar errores que impiden guardar.
- **Sheet**: panel inferior, asa y cierre explícito; contenido con scroll, footer opcional persistente. Backdrop/Escape/arrastre cierran. Arrastre solo en header.
- **ModalPage**: tarea completa (Añadir/Editar comida, Medidas caseras), cabecera con salida y footer persistente opcional.
- Ambos usan portal en body y **useModalLayer**: pila, foco, Tab, Escape, Atrás, inert y retorno del foco. Solo la capa superior es interactiva. History API conserva URL/estado previos y serializa salidas antes de colocar una capa nueva; evita que un popstate pendiente cierre otra tarea.
- **useOverlayPresence** monta la capa en el primer commit y mantiene una única frontera de salida: al acabar la transición se restaura foco/aislamiento. Reabrir cancela tareas pendientes. Pointer cancel/lost capture cancela el arrastre de Sheet; no confirma un cierre.
- `.modal-viewport` usa alto/offset de visualViewport y fallback 100dvh. Sheet limita altura con safe top y margen. No situar capas dentro de padres transformados.
- Formularios: error/acciones fuera del scroll, en footer. El header nombra la tarea; nombres extensos de alimentos/plantillas van completos en el cuerpo desplazable, para no consumir el área del teclado. Los fallos no van a un Toast detrás de la capa.

## Primitives

| Componente | Contrato |
|---|---|
| Button | primary, secondary, ghost, destructive (oferta), danger (confirmación); loading deshabilita y anuncia ocupado |
| IconButton | label obligatorio; sm/md 44 px, lg 48; sm solo reduce icono; ref de React 19 apunta al botón real |
| Input, Textarea, Select, SearchInput | 16 px, control ≥44, borde fuerte, foco global; etiquetas visibles en formularios y nombre accesible en búsquedas |
| NumberStepper | una escala; botones 44, campo 16, unidad y label obligatorio; Gym usa campos directos |
| Card | default/muted; unidad real, superficie sin contorno visible por defecto; no marco obligatorio de sección |
| ListGroup / ListRow | lista plana/divisores; fila completa pulsable; tonos semánticos |
| PageHeader / SectionHeader | pantalla 41, sección 26, Saira 900 condensada recta; contexto debajo del título y acción redistribuida al ampliar texto |
| BrandMark | AppFit accesible en Saira; Fit en acento de texto, sin nuevo icono PWA |
| Metric | Saira cursiva condensada para cifras principales, formato español inmediato, unidad/contexto; envuelve cifras largas |
| ProgressBar | dominio max(valor, objetivo, 1), meta y exceso atenuado; aria-valuetext explícito |
| Badge | metadato breve, radio contenido; no toda etiqueta necesita uno |
| Icon | SVG propio coherente, sin emoji ni nueva librería |
| EmptyState / LoadingState / ErrorState | explicación concreta, carga localizada, error recuperable |
| Toast / useAviso | éxito/Deshacer o error fuera de modales; encima de nav, inverse, status/alert |
| ConfirmacionDestructiva | consecuencias, cancelar/confirmar y ocupado; sin nuevo sistema de diálogos |

Retirados: AnimatedNumber, ProgressRing, Card ink, Button contrast, stepper compacto y dense de campos; halo, sombras raised/nav, clearance ficticio y duración long. No recrearlos sin necesidad.

## Patrones de producto

- **Inicio**: saludo/fecha/marca y mensaje breve; `TarjetaEntreno destacado` presenta sesión en curso o acceso a elegir entrenamiento, con acción principal y último resultado real cuando existe. No presupone una rutina programada. Nutrición usa `ResumenNutricional integrado`, sin otra tarjeta; Registrar comida es secundario, Ver día permanece. Peso/historial y accesos rápidos se conservan.
- **Hoy**: `ResumenNutricional` conserva panel, kcal, objetivo, diferencia y macros. `integrado` solo cambia su contenedor, no sus cálculos ni slots `controles`, `detalle`, `footer`. Kcal en cursiva hero 56, macros 26; cifras largas envuelven.
- **Diario**: `ComidaSection` compone `CabeceraComida`, compartida por Desayuno/Comida/Cena/Snack. Título sobre la página, sin caja ni borde: icono decorativo neutro, título heading, número real de registros caption y kcal tabulares title/neutras con unidad visible, sin divisor vertical. Container queries mueven las kcal a una fila propia bajo 18 rem y título/contexto a ancho completo bajo 10 rem; cifras de más de cuatro caracteres ganan una fila independientemente del viewport. No oculta ni abrevia nombres/cifras ni fija altura. Acciones mantiene su IconButton de 44 px y retorno de foco; Añadir/Repetir quedan debajo en comidas vacías. `RegistroComida` es la fila común de plato e individual. Los registros de una comida comparten una sola `Card` (sin borde propio por registro), separados por líneas finas, y «Añadir a…»/«Repetir» cierran la superficie como última fila `subtle`; padding interior 4×8 px. Nombre body/semibold; línea secundaria caption con cantidad/conteo y P/C/G; kcal tabulares con unidad a la derecha. El chevrón y conteo distinguen al plato. Los ingredientes usan la misma estructura como filas interiores sin borde/fondo independiente y nombre medium. Bajo 14 rem del contenedor se apilan detalles y kcal; nombres/cifras envuelven y no hay altura fija. No repetir barras de macros a cada nivel.
- **Acciones del plato**: IconButton «…» de 44 px abre `AccionesPlatoSheet`: Añadir ingredientes, Mover, Copiar plato y Borrar plato. La Sheet identifica el plato completo, devuelve foco al cerrar y espera `onExited` antes de abrir otra tarea o borrar; no hay capas superpuestas ni Deshacer detrás del menú. Botones bloqueados mientras se mueve. La página de añadido mantiene su formulario, comida fija y confirmación; la copia reutiliza `AccionesComidaSheet`.
- **Mover plato**: asa de 44 px al desplegar los ingredientes con icono grip y touch-action:none; el cuerpo conserva el scroll. Copia legible en portal, acotada al viewport, origen atenuado y comida receptora con fondo de acento suave/contorno fuerte. No anima el seguimiento del dedo ni el retorno; FLIP de los otros grupos solo al cambiar ids y sin movimiento con Reduce Motion. PointerSensor propio mantiene el primer pointerId y limpia captura/listeners ante cancel, Escape, blur, cambio de visibilidad o resize; dnd-kit aporta contexto, teclado, autoscroll y anuncios en español. «Mover» en el menú contextual ofrece destinos mediante Sheet con errores en línea y actual deshabilitado. La nueva frontera opcional `Sheet.onExited` permite conservar contenido/foco durante la salida y enfocar el plato al terminar.
- **Copiar plato**: acción dentro de «…», junto a Añadir ingredientes y Mover. Reutiliza el sheet de acciones, identificando el plato completo en el cuerpo. «Copiar a otra comida…» conserva el día seleccionado; copiar al origen queda desactivado. «Copiar a otro día…» y plantilla siguen disponibles. Éxito con Deshacer y errores en la capa activa.
- **Detalle nutricional en Hoy**: Sencilla/Detallada dentro del resumen. Detallada muestra fibra, azúcares, sal y saturadas en filas completas: nombre, gramos, barra y cobertura explícita. Bajo 14 rem de ancho de fila, etiqueta y cifra se apilan; la meta queda dentro del carril también al ampliar texto. IconButton info de 44 px abre Sheet con criterio/fuente y enlace a la referencia global tras `onExited`. No hay mínimos/máximos permanentes ni disclosure de metodología dentro de Nutrición. «Sin datos» no muestra consumo ni se convierte a cero. Porciones conservan su desglose anterior. Fecha inmediatamente después de tabs.
- **Referencias**: índice plano de cuatro áreas, contenido de lectura y Disclosure por nutriente. Compartir `ReferenciaNutrienteContenido` y el registro puro con el detalle contextual. Títulos y cifras envuelven; abrir un área enfoca y desplaza su título, volver restaura el foco. Recomendaciones no definidas usan EmptyState, sin valores ficticios. Principio y estructura: [Referencias](features/referencias.md).
- **Añadir**: comida + métodos Describir/Buscar/Plantillas. Revisión: nombre completo, cantidad, aporte, avisos y Cambiar. Nutrientes por 100 g/nombre personal en Detalles; incompletos abren esos detalles. Claves locales estables evitan mover borradores al quitar ingredientes.
- **Detalles del alimento**: siempre muestra los cuatro extras opcionales junto a los macros, independientemente del modo del diario. Campos de dos columnas y estado vacío «Sin datos»; debajo, aporte conocido de la cantidad indicada.
- **Gym activo**: superficie tinta compacta para rutina/estado, reloj aislado, volumen y progreso de series marcadas. La primera fila editable permanece visible a 320×568 con descanso activo. Ejercicio, referencia anterior, Serie/Reps/kg/borrar y añadir serie; campos directos ≥44, cifras de 18 px/700 y nombre del ejercicio en título 26. Tocar el número confirma con check, superficie de éxito, haptic opcional y anuncio accesible; editar desmarca. `useListMotion` aplica FLIP al cambiar ids o la presencia/configuración del descanso, no a cada tecla o tick. Alta tiene entrada breve, borrado conserva Deshacer.
- **Descanso**: desactivado por defecto, 60/90/120 s opcionales en un Disclosure; elegir una duración cierra la configuración y devuelve el foco. El temporizador activo sustituye esos ajustes, dando prioridad al registro de series. Deadline absoluto, render del reloj separado, pausa de ticks en pestaña oculta y recalculo al volver. Puede finalizarse antes; no pide notificaciones ni simula ejecución en background.
- **Estado de sesión**: marcas/descanso viven en `sessionStorage`, por id de workout; sobreviven navegación y recarga de esa pestaña. No son datos históricos, no se exportan ni cambian el esquema. Todas las series registradas siguen guardándose, marcadas o no; confirmación de fin lo explica.
- **Fin de sesión**: espera escrituras pendientes, ofrece continuar o guardar, muestra errores en la propia Sheet, y presenta resumen real de duración, ejercicios, series y volumen. Check de éxito de 420 ms, sin confeti ni récords inventados.
- **Progreso**: una sesión es dato, sin curva de tendencia. Peso/1RM con leyenda (1RM discontinuo); volumen separado por unidad. Datos textuales desplegables.
- **Resumen**: media solo de días registrados, cobertura explícita. Una métrica por gráfica, con meta y alternativa textual; sin gráfica vacía.
- **Peso**: registro de hoy, fecha/variación neutral e historial; sin nuevo modelo. Medidas es ayuda de cantidades caseras.
- **Ajustes**: objetivos, tema, copias, conservación, instalación, catálogo y borrado; explicación larga desplegable.

## Patrón de borrado

Series, entradas, platos y alimentos: inmediato con Deshacer, restauración existente. Rutinas/plantillas: confirmación previa. Importación/borrado global: confirmar sustitución/destrucción. Fallos de formulario en ErrorState de esa capa.

## Gráficas y cifras

`MapaMuscular` comparte resumen final/historial. SVG original frontal/trasero de once grupos, sin cálculo interno; `lib/cargaMuscular` entrega score, aportes y niveles 0–5. `--c-muscle-1`…`5` son una rampa de cobalto, independiente del rojo de borrar; neutral usa surface-muted. `--muscle-body-width` y `--muscle-swatch-size` dimensionan cuerpo/leyenda. Nivel máximo oscuro gana luminosidad, claro gana profundidad; lista textual accesible conserva precisión. Forced Colors usa Canvas/Highlight y los niveles textuales. Filas ≥44 px muestran ejercicios al expandir; al estrechar el contenedor (16rem), el nivel pasa debajo del nombre sin partir palabras. SVG decorativo para tecnologías de asistencia porque la lista ofrece los mismos datos. Sin animación de valores o nuevas capas.

`formatInt` / `formatNumber` para valores visibles; sin decimales crudos ni toFixed. Los ejes estrechos usan formatCompact (mil/M); métricas/tooltips/listas mantienen cifras completas. `design/macros.ts` fija P/C/G; `design/chart.ts` ejes, tooltip y meta. Recharts diferido, Inicio con SVG propio. Líneas rectas, huecos explícitos, unidades/leyenda y datos textuales. El color no sustituye información.

## Guard y validación

`design/guard.test.ts` analiza toda la UI: paleta directa, hex, emojis, valores arbitrarios, tipografía/radios sin token, cifras sin formato y patrones retirados. Excepciones justificadas en el guard; no desactivar reglas por conveniencia.

`contrast.test.ts`: ambos temas/inverse, texto ≥4,5:1, indicadores/foco/bordes ≥3:1 y macros también como texto. Divisores decorativos no son límites de interacción. `selection.test.ts` protege teclado; `components.test.tsx` comprueba mediante render estático navegación, asociación de paneles, semántica, targets, carga, métricas y exceso. Interacción/foco/scroll reales: [desarrollo](desarrollo.md), `scripts/ui/validar-rediseno.cjs`.

## Trampas de UI

- Inputs <16 px provocan zoom iOS: no pisar su escala.
- Flex estrecho necesita min-w-0; envolver/apilar, nunca esconder overflow para disimular un layout roto.
- Input date max limita selector, no valor programático; validar también la acción.
- ReferenceLine no amplía eje Y: dominio debe incluir objetivo.
- Reiniciar Vite si un cambio de Tailwind deja CSS servido con utilidades anteriores. Validar también producción.
