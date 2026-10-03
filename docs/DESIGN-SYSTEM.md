# Sistema visual de APPFIT

Implementación de la identidad de [DESIGN.md](../DESIGN.md). El criterio de producto vive allí; este documento explica cómo sostenerlo en código. Motivación: [auditoría](historico/auditoria-diseno-2026-10-02.md) y [ADR 007](decisiones/007-sistema-visual-movil.md).

## Arquitectura

Tres piezas, sin librería nueva ni variantes por feature:

1. `src/shared/design/tokens.css`: valores semánticos, temas, dimensiones y motion.
2. `tailwind.config.js`: nombres de clase que apuntan a esos tokens; conserva el espaciado básico de Tailwind. Sustituye su paleta, escala tipográfica y radios.
3. `src/shared/components/`: controles y patrones repetidos. Las pantallas conservan composición y decisiones de dominio.

`src/index.css` contiene fuente local, base, foco, safe areas y cifras tabulares. `design/theme.ts` aplica el tema y actualiza `meta theme-color`; `design/viewport.ts`, inicializado al arrancar, sigue `visualViewport` para ajustar las capas al área visible cuando aparece el teclado. No modifica datos.

Manrope variable Latin, Fontsource 5.3.0: `public/fonts/manrope-latin-variable.woff2`, con licencia OFL adjunta. Precarga local y precache del service worker; sin Google Fonts ni petición externa. Fallback del sistema sin bloquear el texto.

## Tokens

Los valores exactos viven en `tokens.css`; no se duplican en componentes.

| Familia | Clases / roles | Uso |
|---|---|---|
| Superficies | `bg-bg`, `bg-surface`, `bg-surface-muted`, `bg-surface-elevated` | página, unidad, campo/contexto, sheet |
| Texto | `text-fg`, `text-fg-muted`, `text-fg-subtle` | dato, contexto, metadato; todos contrastan |
| Línea | `border-line`, `border-line-strong` | divisor decorativo, límite reconocible de control |
| Acción | `bg-accent`, `text-accent-on`, `text-accent-strong`, `bg-accent-subtle` | acción, texto encima, acción textual/foco, apoyo |
| Selección | `bg-selected`, `text-selected-on` | opción neutra del selector de valor |
| Estado | `success`, `warning`, `destructive`, `destructive-on` | siempre con texto o icono |
| Datos | `kcal`, `protein`, `carbs`, `fat`, `goal` | naranja, azul, oliva, ciruela; mismos roles en toda la app |

`data-theme="light|dark"` va en html. `data-surface="inverse"` se reserva al Toast, con texto/foco/acción adecuados al fondo inverso. Los resúmenes no tienen contexto negro especial.

| Escala | Valores / clases |
|---|---|
| Tipografía | hero 44, display/metric 28, heading 22, title 18, body 16, body-sm 14, label 13, caption 12 px |
| Espaciado | page 20 (16 bajo 360 px), section 28, card 16, stack 12 px; base de 4 px |
| Radios | sm 8, md 12, lg 16, sheet 24; pill solo con significado |
| Interacción | touch 44, touch-lg 48 px; área real, sin pseudo elemento |
| Profundidad | shadow-overlay solamente; sin sombras de cards ni nav |
| Motion | short 120, normal 200 ms, ease-standard; desplazamiento 4 px |

Reduced motion lleva las duraciones a cero. La carga tiene retraso breve para evitar parpadeo. Valores inmediatos; gráficas sin animación de entrada.

## Navegación y capas

`App` es un flex de altura 100dvh: `main` tiene el único scroll de página y `BottomNav` espacio propio (64 px + safe area). Cambiar destino vuelve al inicio. Columna centrada de máximo 512 px también en escritorio. Cuatro destinos siempre con icono/nombre, `aria-current` y línea de selección; sin barra flotante ni anchos cambiantes.

- **ViewTabs**: navegar entre vistas. tablist/tab/tabpanel asociado, flechas/Home/End y una entrada de teclado.
- **SegmentedControl**: elegir valor (comida, periodo, tema, métrica, colección). radiogroup/radio y etiqueta; mismo teclado. No confundir con navegación.
- **Disclosure**: detalles, datos de gráfica y explicación; aria-expanded/controls. No ocultar errores que impiden guardar.
- **Sheet**: panel inferior, asa y cierre explícito; contenido con scroll, footer opcional persistente. Backdrop/Escape/arrastre cierran. Arrastre solo en header.
- **ModalPage**: tarea completa (Añadir/Editar comida, Medidas caseras), cabecera con salida y footer persistente opcional.
- Ambos usan portal en body y **useModalLayer**: pila, foco, Tab, Escape, inert y retorno del foco. Solo la capa superior es interactiva; shell y capas inferiores quedan aislados.
- `.modal-viewport` usa alto/offset de visualViewport y fallback 100dvh. Sheet limita altura con safe top y margen. No situar capas dentro de padres transformados.
- Formularios: error/acciones fuera del scroll, en footer. El header nombra la tarea; nombres extensos de alimentos/plantillas van completos en el cuerpo desplazable, para no consumir el área del teclado. Los fallos no van a un Toast detrás de la capa.

## Primitives

| Componente | Contrato |
|---|---|
| Button | primary, secondary, ghost, destructive (oferta), danger (confirmación); loading deshabilita y anuncia ocupado |
| IconButton | label obligatorio; sm/md 44 px, lg 48; sm solo reduce icono |
| Input, Textarea, Select, SearchInput | 16 px, control ≥44, borde fuerte, foco global; etiquetas visibles en formularios y nombre accesible en búsquedas |
| NumberStepper | una escala; botones 44, campo 16, unidad y label obligatorio; Gym usa campos directos |
| Card | default/muted; unidad real, no marco obligatorio de sección |
| ListGroup / ListRow | lista plana/divisores; fila completa pulsable; tonos semánticos |
| PageHeader / SectionHeader | pantalla 28, sección 18, etiqueta 13 en caja normal |
| Metric | formato español inmediato, unidad/contexto; envuelve cifras largas |
| ProgressBar | dominio max(valor, objetivo, 1), meta y exceso atenuado; aria-valuetext explícito |
| Badge | metadato breve, radio contenido; no toda etiqueta necesita uno |
| Icon | SVG propio coherente, sin emoji ni nueva librería |
| EmptyState / LoadingState / ErrorState | explicación concreta, carga localizada, error recuperable |
| Toast / useAviso | éxito/Deshacer o error fuera de modales; encima de nav, inverse, status/alert |
| ConfirmacionDestructiva | consecuencias, cancelar/confirmar y ocupado; sin nuevo sistema de diálogos |

Retirados: AnimatedNumber, ProgressRing, Card ink, Button contrast, stepper compacto y dense de campos; halo, sombras raised/nav, clearance ficticio y duración long. No recrearlos sin necesidad.

## Patrones de producto

- **Inicio/Hoy**: `ResumenNutricional` comparte un panel Card con superficie/borde del tema, radio lg y padding card; separación exterior section respecto al contenido siguiente. Cabecera con divisor y «Ver día» en Inicio, kcal dominante, meta/diferencia y tres columnas de macros con divisor interno. El desglose opcional del diario queda dentro del mismo panel. Cifras largas envuelven sin ocultarse; sin anillo, sombra ni porcentaje redundante. Inicio mantiene Registrar comida fuera de la tarjeta.
- **Diario**: total por comida; filas con nombre simple/cantidad/kcal. Un plato conserva contorno, separación y despliegue independiente. No repetir barras de macros a cada nivel.
- **Editar plato**: acción de texto con lápiz en una fila propia dentro del contorno, visible sin desplegar ingredientes. La página modal identifica el plato completo en el cuerpo, fija la comida y permite consultar los ingredientes actuales; Describir/Buscar prepara nuevos ingredientes para revisar y confirmar con «Añadir al plato». Conserva la edición/borrado individual del diario, sin comprimir acciones en la cabecera del bloque.
- **Copiar plato**: acción con icono de copia junto a Editar, con envoltura si falta ancho. Reutiliza el sheet de acciones, identificando el plato completo en el cuerpo. «Copiar a otra comida…» muestra solo el selector de comida de destino y conserva el día seleccionado; copiar al origen queda desactivado. «Copiar a otro día…» y plantilla siguen disponibles. El menú de una comida ofrece las mismas vías para toda la sección. Éxito con Deshacer y errores en la capa activa.
- **Detalle nutricional en Hoy**: selector segmentado superior Sencilla/Detallada, sencilla por defecto. Detallada añade al resumen diario una rejilla de dos columnas con fibra, azúcares, sal y grasas saturadas; muestra «Sin datos» o cobertura parcial cuando corresponde, sin objetivos inventados ni juicios de salud.
- **Añadir**: comida + métodos Describir/Buscar/Plantillas. Revisión: nombre completo, cantidad, aporte, avisos y Cambiar. Nutrientes por 100 g/nombre personal en Detalles; incompletos abren esos detalles. Claves locales estables evitan mover borradores al quitar ingredientes.
- **Detalles del alimento**: siempre muestra los cuatro extras opcionales junto a los macros, independientemente del modo del diario. Campos de dos columnas y estado vacío «Sin datos»; debajo, aporte conocido de la cantidad indicada.
- **Gym activo**: ejercicio, referencia anterior, N.º/Reps/kg y añadir serie. Campos directos ≥44; sin seis mini botones por fila.
- **Progreso**: una sesión es dato, sin curva de tendencia. Peso/1RM con leyenda (1RM discontinuo); volumen separado por unidad. Datos textuales desplegables.
- **Resumen**: media solo de días registrados, cobertura explícita. Una métrica por gráfica, con meta y alternativa textual; sin gráfica vacía.
- **Peso**: registro de hoy, fecha/variación neutral e historial; sin nuevo modelo. Medidas es ayuda de cantidades caseras.
- **Ajustes**: objetivos, tema, copias, conservación, instalación, catálogo y borrado; explicación larga desplegable.

## Patrón de borrado

Series, entradas, platos y alimentos: inmediato con Deshacer, restauración existente. Rutinas/plantillas: confirmación previa. Importación/borrado global: confirmar sustitución/destrucción. Fallos de formulario en ErrorState de esa capa.

## Gráficas y cifras

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
