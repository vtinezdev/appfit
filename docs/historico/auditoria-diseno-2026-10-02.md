# Auditoría y dirección del rediseño de APPFIT

Evaluación previa a modificar código, sobre `a8cc868`, en la rama `feat/rediseno-ui-ux`.

## Alcance y método

Lectura de CLAUDE, README, documentación viva, todas las pantallas y componentes de UI, tokens, Tailwind, guards y arquitectura. Recorrido del producto en Chromium aislado (`appfit-test.localhost`), a 375×812, claro y oscuro, con datos vacíos y una copia de prueba: Inicio, día nutricional, entrada libre, revisión, Gym, entreno activo, rutinas, historial, progreso y Ajustes. Las capturas de overlays se tomarán como viewport después de estabilizar la animación; una captura de página completa no representa fielmente un modal fijo.

No se propone cambiar IndexedDB, repositorios, parser, catálogo, cálculos, backups, privacidad ni funcionamiento offline.

## Diagnóstico global

El sistema actual centraliza valores y tiene buenas invariantes, pero su composición da demasiado protagonismo a los contenedores. Un resplandor naranja, bloques negros obligatorios, sombras, grandes radios y controles en cápsulas aparecen juntos. El resultado pesa visualmente más que los registros que debe ayudar a leer.

La navegación flotante oculta las etiquetas de tres destinos, cambia su distribución al seleccionar uno y se superpone al contenido mientras se desplaza. Reservar padding al final no evita que tape filas a mitad del scroll. La barra debe ocupar su propio espacio, con cuatro destinos estables y etiquetados.

La tipografía del sistema cambia de personalidad según dispositivo. Hay pesos fuertes en demasiados niveles, etiquetas en mayúsculas repetidas y números grandes sin suficiente adaptación a cifras largas. Debe existir una voz propia y una jerarquía más corta.

Los campos comparten estilos, pero muchos carecen de etiqueta visible o nombre accesible. Los controles compactos de series sacrifican tamaño táctil para meter seis botones por fila. El scroll global oculta todos los indicadores, incluso donde ayudarían a descubrir contenido.

Las sheets ya tienen Escape, foco, retorno, scroll y gesto de cierre: una buena base. Les falta un cierre explícito y un tratamiento común con las páginas modales. Estas últimas duplican shell y no contienen el foco ni aíslan el fondo. Hay listas con scroll dentro de otro scroll que complican el uso con teclado.

## Evaluación por área

| Área | Problema real | Decisión |
|---|---|---|
| Inicio | El resumen ocupa aproximadamente 330 px; kcal y anillo repiten jerarquía. El peso se encuentra parcialmente bajo la navegación. Falta acceso directo al registro habitual. | Resumen plano y más compacto, un dato principal, objetivos en texto, acción para registrar desde Inicio, entreno y peso con funciones distintas. |
| Nutrición / día | Cabecera, selector de pestañas, fecha y hero consumen gran parte de la primera vista. Los macros se repiten como barras en cada comida además del resumen. El añadido principal está al final. | Pestañas planas, fecha compacta, resumen de menor altura, añadir accesible en cabecera, comidas con totales discretos y platos claramente delimitados. |
| Platos | La separación recientemente añadida sí expresa una unidad real; los ingredientes se pueden desplegar de forma independiente. | Conservar agrupación, borde por plato, separación, nombres simples y edición individual. Reducir metadatos repetidos. |
| Añadir comida | Plantillas, texto, kcal rápidas, búsqueda y frecuentes compiten en una columna larga. No se entiende cuál es el siguiente paso. | Métodos explícitos Describir / Buscar / Plantillas; auxiliares en segundo nivel; conservar la selección de comida y guardado final. |
| Revisión | Cada alimento expone nombre editable, fuente, cambio, alias, cantidad y cuatro nutrientes, incluso cuando se ha reconocido bien. La revisión de un plato se vuelve un formulario enorme. | Alimento completo, cantidad y aporte primero. Detalles editables desplegables; datos incompletos abiertos. Cada alimento es una unidad visual. |
| Búsqueda / frecuentes | Nombres y unidades compiten en la misma línea; los nombres largos se recortan. | Nombres completos que envuelven, aporte por 100 g/ml secundario, listas planas y estados útiles. |
| Plantillas / copias | Buenas vistas previas y confirmaciones, pero controles y nombres poco consistentes. | Conservar semántica y protección de datos, unificar formulario, lista y sheet. |
| Resumen | Hero negro, porcentajes en badges y dos gráficas consecutivas repiten datos. Gráficas vacías simulan contenido. | Media clara, cobertura de registros explícita, una gráfica seleccionable, objetivos y alternativa textual. |
| Gym / inicio | Un bloque negro sobredimensionado presenta dos acciones iguales. Sin rutinas, la opción deshabilitada domina. | Inicio directo: rutina cuando existe, entreno libre siempre, último entreno como contexto. |
| Entreno activo | Seis botones de cantidad por serie, inputs estrechos, objetivos secundarios sobredimensionados y finalización demasiado prominente. | Tabla de registro con campos directos grandes, repetición rápida de serie, resumen compacto y acciones diferenciadas. |
| Rutinas | Listas bien agrupadas, creación y edición simples. Los ejercicios parecen chips y la búsqueda introduce scroll anidado. | Conservar flujo, mostrar orden de ejercicios, filas y formularios legibles, evitar scroll innecesario. |
| Historial | Las filas son correctas, pero el detalle empieza sin resumen; columnas cortas sin contexto para la unidad. | Fecha/duración claras, resumen y tabla de series por ejercicio, contenido largo robusto. |
| Progreso Gym | Tres cifras grandes en tres columnas desbordan con volumen alto. Dos gráficos con un solo punto no explican una tendencia. No hay leyenda visible de las dos líneas. | Peso principal, métricas secundarias compactas, leyendas, datos accesibles y estado de historial insuficiente. |
| Peso | Registro simple y tendencia sin juicio: bien resueltos. No hay historial accesible desde Inicio. | Conservar registro y sparkline ligera, añadir consulta de pesajes existentes sin nuevo modelo de datos. |
| Medidas | Son medidas caseras del parser, no medidas corporales. Catálogo útil pero estructura y notas compiten. | Ayuda agrupada, encabezado modal común, notas al final. No inventar seguimiento corporal. |
| Ajustes | Una guía extensa de primera instalación precede a las opciones de uso diario. Cada sección es una card grande. | Objetivos, apariencia y copias primero; guía y explicaciones desplegables; destrucción al final. |
| Claro / oscuro | Oscuro tiene valores propios, pero el mismo negro obligatorio limita ambos temas. Parte de las etiquetas de macros usa colores de relleno sin garantía de contraste de texto. | Neutrales cálidos propios, contraste medido en todos los contextos, color de datos acompañado por etiquetas. |

## Lo que se conserva

- React + Tailwind + CSS semántico, sin otra biblioteca visual.
- Repositorios y lógica pura, carga diferida de Recharts y del escáner.
- Cuatro destinos principales y router pequeño; no se necesita incorporar URLs para resolver el problema visual.
- Revisión local, cantidades y medidas ambiguas explícitas, snapshots y nombres completos al añadir.
- Etiquetas simples en el diario, platos independientes, deshacer, vistas previas y confirmaciones destructivas.
- Unidad tabular, formatos españoles, foco visible, modo sistema y reduced motion.
- Sparkline ligera de peso y ausencia de juicios sobre subir, bajar o superar objetivos.

## Referencias y criterio aplicado

Awesome DESIGN.md (`f6961238d5cddcf8042a74a70fc400ec67181abb`) documenta webs públicas, principalmente de marketing; no son especificaciones de apps nativas. De [Apple](https://github.com/voltagent/awesome-design-md/tree/main/design-md/apple): foco, jerarquía, espacio que separa y pocos efectos. De [Nike](https://github.com/voltagent/awesome-design-md/tree/main/design-md/nike): contraste tipográfico, presencia de los resultados y energía sin cromática constante. De [Linear](https://github.com/voltagent/awesome-design-md/tree/main/design-md/linear.app): consistencia, precisión de filas y controles, densidad deliberada. No se trasladan sus heroes de venta, tipografías propietarias, paletas ni navegación web.

Taste Skill (`ce26fc25c0e5e8cab638f883de62d9a86ee5e45b`): se revisaron el catálogo completo de skills, documentación y research, y se estudiaron las instrucciones de rediseño y móvil. `redesign-skill` aporta el orden auditar → diagnosticar → resolver y atención a estados reales. `imagegen-frontend-mobile` aporta safe areas, jerarquía métrica, flujo de varias pantallas, consistencia y ausencia de cajas anidadas. Se aplican sus principios; el encargo es implementación, no generación de imágenes. No hacen falta fotografías para registrar datos personales.

`taste-skill` v1/v2 y `gpt-tasteskill` se orientan principalmente a webs/landing pages; brandkit y las skills de imágenes a artefactos visuales; brutalist, soft y minimalist son direcciones opcionales, no contratos. Stitch ayuda a describir intención semántica en DESIGN.md. Se descartan AIDA, grandes heroes, GSAP obligatorio, movimiento perpetuo, aleatoriedad, bento obligatorio, imágenes decorativas y reglas de una sola plataforma: añaden ruido o mantenimiento a esta PWA. La investigación sobre salidas incompletas refuerza trabajar por fases y verificar todas las áreas, sin dejar una demo parcial.

## Dirección y arquitectura elegidas

**Precisión deportiva, personal y serena.** La marca vive en la composición y las cifras, no en un dashboard decorativo. Manrope variable autoalojada da carácter común a iOS y Android. Neutrales cálidos, naranja de esfuerzo reevaluado y más profundo, acento limitado a acciones, foco y progreso. Proteína, carbohidratos y grasa mantienen significado estable, con texto explícito.

Sistema pequeño: tokens semánticos → Tailwind → controles y estructuras compartidas → composición de cada feature. Cards para unidades con sentido (plato, ejercicio, grupo editable), listas planas para colecciones. Sin capa de wrappers por pantalla. Un shell con scroll y navegación en espacios distintos; pestañas de navegación distintas de los selectores de valor. Un mecanismo de capas modales comparte foco, Escape y aislamiento entre sheets y páginas completas.

Se eliminarán el halo, sombras de cards/nav, hero negro obligatorio, contador animado, anillo redundante y stepper compacto. Se incorporarán pestañas planas, desplegables accesibles y página modal común. DESIGN.md recoge las reglas de producto; docs/DESIGN-SYSTEM.md explica su implementación y validación.
