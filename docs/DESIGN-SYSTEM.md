# Design system

## Arquitectura

```
tokens.css                    src/shared/design/tokens.css   ← ÚNICA fuente de valores (color, tipo, spacing, radios, sombras, motion; claro y oscuro)
   │  variables CSS  (--c-*, --fs-*, --radius-*, …)
   ▼
tailwind.config.js            solo NOMBRA los tokens como clases (bg-surface, text-fg-muted, rounded-md, text-body…).
   │                          Sustituye la paleta por defecto: slate-*, red-*, white… no existen. No contiene valores.
   ▼
primitives                    src/shared/components  (Button, Card, Input, Sheet…): fijan cómo se combinan las clases.
   │
   ▼
pantallas                     features/*: componen primitives; no inventan colores, tamaños ni radios.
```

Los valores en JS (gráficas, meta `theme-color`) se leen de las mismas variables: `design/chart.ts` devuelve `rgb(var(--c-…))` y `theme.ts` lee `--c-bg`. No hay una segunda paleta.

- **Tema**: `data-theme="light|dark"` en `<html>`. `theme.ts` resuelve `light | dark | system` (preferencia en `localStorage['appfit-theme']`, ausente = system) y sigue los cambios del sistema. Un script inline en `index.html` lo aplica antes de pintar (sin parpadeo). Todavía no hay selector en la UI.
- **Datos**: `design/macros.ts` (kcal/proteína/carbohidratos/grasa → color + etiqueta + unidad) y `design/chart.ts` (colores, ejes, tooltip y línea de objetivo de las gráficas).

## Cómo cambiar el diseño

| Quiero… | Toco |
|---|---|
| Accent más cálido | `--c-accent`, `--c-accent-subtle` (claro y `[data-theme='dark']`) |
| Radios más pequeños | `--radius-sm/md/lg` |
| Cards con menos contraste | `--c-surface`, `--c-surface-muted`, `--c-border`, `--shadow-raised` |
| Otra tipografía / escala | `--font-sans`, `--fs-*`, `--lh-*` |
| Más/menos aire | `--space-page/section/card/stack` |
| Otro tema | Bloque `[data-theme='x']` con los mismos nombres + `theme.ts` |
| Animaciones más lentas | `--dur-*`, `--ease-*` (con `prefers-reduced-motion` valen 0) |

## Vocabulario de clases

- Superficies: `bg-bg`, `bg-surface`, `bg-surface-elevated`, `bg-surface-muted`
- Texto: `text-fg`, `text-fg-muted`, `text-fg-subtle` · Bordes: `border-line`, `border-line-strong`
- Estado: `accent`, `accent-subtle`, `text-accent-on`, `success`, `warning`, `destructive`
- Datos: `kcal`, `protein`, `carbs`, `fat`, `goal` (significan siempre lo mismo)
- Tipografía: `text-display|heading|title|body|body-sm|label|caption|metric` (`.tabular` para cifras)
- Radios: `rounded-sm|md|lg|pill` · Sombras: `shadow-raised|overlay` · Zona táctil: `min-h-touch`, `min-h-touch-lg`, `max-h-sheet`

## Primitives (`src/shared/components`)

`Button` (primary · secondary · ghost · destructive · danger; `size` sm · md · lg; `shape="pill"` para la acción flotante principal), `IconButton` (label obligatorio), `Icon`, `Card`, `ListRow` (fila pulsable; `tone="flat"` para listas con hairlines), `Input/Textarea/Select/SearchInput` (`tone`, `dense`), `SegmentedControl`, `NumberStepper`, `ProgressBar` (el carril, ver abajo), `ProgressRing` (el mismo carril en anillo, con `children` en el centro; geometría en `shared/design/carril.ts`), `AnimatedNumber`, `SectionHeader`, `LoadingState/EmptyState/ErrorState`, `Toast` (`tono="error"` para fallos recuperables), `Sheet`, `ConfirmacionDestructiva`.

Hook asociado: `shared/hooks/useAviso` devuelve `{ avisar, avisarError, toast }` (se renderiza `toast` una vez por pantalla; `avisar({ mensaje, onDeshacer })` muestra «Deshacer» y, si deshacer falla, avisa del error). El Toast queda por debajo de los Sheet (z-40 frente a z-50): dentro de un Sheet los errores van en línea con `ErrorState`.

### Patrón de borrado

- **Rutinas y plantillas** (no se recuperan con un toque): `ConfirmacionDestructiva` (mensaje + Cancelar / «Sí, borrar», variantes `secondary`/`danger`, prop `ocupado`) sustituye en su sitio al botón que la ofrecía.
- **Filas sueltas** (series, entradas, alimentos): borrado inmediato y aviso «Deshacer» con `useAviso`; el repo devuelve el registro borrado y expone `restaurar`.

Regla: se abstraen **patrones visuales repetidos con semántica clara**, no elementos HTML sueltos. Una composición propia de una pantalla se queda local.

## Lenguaje de la pantalla Hoy (referencia para el resto)

Dirección: **Nítido** (jerarquía clara, superficies sobrias) + **Dorsal** (cifras con presencia, carriles, meta) + **Calma** (sin lenguaje de castigo).

- **Una Card de resumen por pantalla y una Card por comida**. Cada comida (`ComidaSection`) es su propia Card (`padded={false}`): cabecera con nombre en `text-title` (sin mayúsculas), kcal y acciones; `FranjaMacros` (barra fina segmentada `h-1.5` con el reparto de kcal P/C/G en los colores de `MACROS` y, debajo, «P 24 g · C 51 g · G 12 g»); filas con `divide-line` hasta el borde de la card; y pie con `Button ghost sm` «Añadir a …» y «Repetir del día anterior (n)». Nunca card dentro de card.
- **Cifra principal** = `text-metric` + `AnimatedNumber`, con su unidad en `text-body text-fg-muted` y el objetivo asociado a la vista. Las cifras secundarias usan `text-title`.
- **Carril (`ProgressBar`)**: pista `bg-surface-muted`, relleno del color del dato, **línea de meta siempre visible** (`bg-goal` con halo `ring-surface`, sobresale de la pista) y, si se supera la meta, un **tramo atenuado** (`opacity-50`) después de ella. El dominio es `max(objetivo, valor)`: nada se corta al 100 %. `size="lg"` para la métrica principal, `md` para las secundarias. Crece desde 0 al montarse y sigue los cambios con `duration-long` (0 con reduced motion).
- **Superar el objetivo no es un error**: no cambia de color. Se dice con texto (`+92 kcal sobre el objetivo`, `de 60 g · +4`), con la meta física del carril y con el tramo atenuado. Quedarse por debajo se dice igual de sereno (`Quedan 240 kcal`). Los errores de acción (`Toast tono="error"`) llevan icono y `role="alert"`; `destructive` solo para eso.
- **Acción principal**: `Button size="lg" shape="pill" block` con icono + texto, **dentro del flujo**, como último elemento de la pantalla. No flota sobre el contenido (un botón flotante puede tapar filas accionables); el espacio inferior lo reserva la propia pantalla. El `Toast` flota sobre la barra de navegación y desaparece solo.
- **Día vacío / comida vacía**: las cuatro cards se muestran siempre; una comida sin entradas es una card compacta (cabecera sin franja + pie con Añadir/Repetir). No hay texto de «Sin registros» repetido.
- **Movimiento**: `animate-shift-next|shift-prev` (cambio de día), `animate-rise-in` (toast), `animate-fade-in-late` (carga: no aparece si los datos llegan enseguida). Duración y distancia salen de `--dur-*` y `--motion-shift`; con `prefers-reduced-motion` las duraciones valen 0.
- **Cifras**: toda métrica numérica que se lee (kcal, g, kg, volumen) pasa por `formatInt`/`formatNumber` (ver «Formato de números»).
- **Filas de lista**: el elemento pulsable es un `<button>` (foco y teclado), el borrado es otro botón aparte; nombres largos a 2 líneas (`line-clamp-2`).

## Lenguaje de Inicio

Pantalla de arranque: cabecera (`text-heading` «Inicio» + fecha en `text-body-sm`) y una pila de Cards de resumen (`space-y-stack`). Mismo lenguaje que Hoy (serenidad, meta física, sin castigo).

- **Card de resumen** (`ResumenDiaCard`, `PesoCard`): título `text-title` a la izquierda y acción `Button ghost sm` a la derecha («Ver día ›», «Registrar»). Sin cards anidadas.
- **Anillo (`ProgressRing`)**: pista `stroke-surface-muted`, relleno del color del dato (`stroke-kcal`…), marca de meta siempre visible (`stroke-goal` con halo `stroke-surface`), exceso con `opacity-50`, dominio `max(objetivo, valor)`, crece desde 0 con `duration-long` (0 con reduced motion). La cifra principal va en el centro (`AnimatedNumber`) con el objetivo debajo en `text-caption`; `role="progressbar"` + `aria-valuetext`. Junto al anillo, tres líneas compactas de macro con `ProgressBar md`.
- **Sparkline** (`PesoCard`): SVG propio (`puntosSparkline`, sin Recharts), `stroke-accent`, trazo 2 con `vector-effect: non-scaling-stroke`, `role="img"` con `aria-label` que dice el rango. Los puntos se reparten por orden, no por fecha. Con menos de 2 pesajes no se dibuja.
- **Variación de peso**: «−0,6 kg en 7 días» con `formatNumber(…, 1)`, mismo tono suba o baje (nada de rojo/verde). Sin pesaje de hace 7 días o más, no se muestra.
- **Estado vacío**: «Aún no hay pesajes» (`EmptyState`) y el botón «Registrar» sigue disponible. Carga: `LoadingState` con `animate-fade-in-late`.
- **Registrar**: `Sheet` con `NumberStepper` (paso 0,1, «kg»); los errores van en línea (`ErrorState`), la confirmación en Toast.

## Lenguaje de Añadir comida (segunda pantalla del sistema)

Mismo lenguaje que Hoy, aplicado a un flujo de entrada de datos. Detalle en `docs/progreso/sesion-03/anadir-comida-rediseno.md`.

- **Secciones planas**: cada bloque = `SectionHeader` + contenido; entre bloques `space-y-section`. Las listas de selección (plantillas, frecuentes, resultados) son `ul.divide-y divide-line` con `ListRow tone="flat"`, sin una card por fila.
- **Una Card solo donde hay campos editables**: la revisión agrupa todos los alimentos en **una** Card con `divide-y` (las filas son `p-card`, no cards anidadas). Los campos usan `tone="muted"` sobre esa superficie.
- **Cifra con presencia, sin decoración**: lo que aporta un alimento es `kcal` en `text-title` (`AnimatedNumber`) con P/C/G en `text-caption` debajo (`resumenMacros`, mismo formato que las filas de Hoy). En Sheets de una sola decisión (gramos) la kcal sube a `text-display`. **No hay carriles**: aquí no hay objetivo que comunicar, y un carril sin meta sería decorativo.
- **CTA**: `Button size="lg" shape="pill" block` en una barra inferior **fuera del área con scroll** (no tapa contenido) con `Guardar · N kcal`, donde N es la suma de `macrosPorGramos` (lo mismo que se guarda). Los Sheets conservan `Button block` md.
- **Rojo solo para errores**: `ErrorState` (con icono `alert`, no solo color) y el aviso «Actualizará el alimento guardado» va en `warning`. Grabar voz ya no es rojo: pasa a acento con icono de parar y `aria-pressed`.
- **Campos**: nunca por debajo de 16 px (CSS global) ni de 44 px de alto; etiqueta visible encima (`text-caption`) y `aria-label` cuando la etiqueta visible es corta.
- **Columna**: pantallas a pantalla completa (`fixed inset-0`) se encierran en `max-w-lg` centrado (cabecera, contenido y CTA), como el resto de la app.

### Cambios en primitives que salen de esta pantalla

| Primitive | Cambio | Por qué es global |
|---|---|---|
| `ListRow` | `tone="flat"` (sin fondo, `px-1`, marca solo al pulsar) | El patrón «lista con hairlines» de Hoy se repetía a mano; ahora Plantillas, Frecuentes y Resultados lo comparten |
| `SearchInput` (en `Input.tsx`) | Campo `type="search"` con lupa; `aria-label` obligatorio; icono `search` nuevo | Alimentos y Gym buscan con un `Input` sin lupa; pendiente de migrar |
| `ErrorState` | Icono `alert` | El color no debe ser el único indicador (ya lo hacía el `Toast` de error) |
| `NumberStepper` | Variante normal: zonas de 44 px, campo de ancho fijo con la unidad **dentro** (`100 g`), sin flechas del navegador. **`compact` (Gym, plantillas) intacta**: mismas clases que antes | En Sheets el campo se estiraba a todo el ancho y los botones medían 36 px |
| `VoiceRecorder` | Reposo secundario (`surface-muted`), grabando = acento + `aria-pressed`. Sin rojo | Dos botones rellenos de acento competían; grabar no es un error |
| `.no-spin` (`index.css`) | Oculta las flechas de `type="number"`, **por clase** (opt-in) | Pisaban la cifra en campos estrechos en escritorio |
| tokens dark | `--c-surface-elevated` 34→30, `--c-surface-muted` 33→37 | En oscuro, un campo `surface-muted` dentro de un Sheet (`surface-elevated`) era prácticamente invisible (1 punto de diferencia); ahora hay 7. `contrast.test.ts` sigue en verde |

## Formato de números (`shared/lib/format.ts`)

Una regla: **cualquier cifra que el usuario lee como métrica se formatea con `formatInt(n)` (entero) o `formatNumber(n, maxDecimales)`**, siempre con separador de millares (`1.842`, `12.500,5`; es-ES no lo pone en 4 cifras por defecto, por eso no se usa `toLocaleString` a pelo). Nunca `{Math.round(x)}` ni `${x}` en el JSX.

- Sin formato (a propósito): valores de `<input>`, `aria-valuenow/max` (los lee el navegador) y datos internos.
- `AnimatedNumber` ya formatea con `formatInt`. Ejes de gráficas: `tickFormatter={formatInt}`; el tooltip, `formatter`.
- El guard lo comprueba con la regla `raw-number` (`{Math.round(` en JSX o plantillas).
- Migrado: Hoy, Resumen (media diaria, eje y tooltip de kcal), plantillas (totales), Alimentos, volumen en el Historial de Gym. Pendiente al propagar el sistema a Gym: ejes de las gráficas de Progreso.

## Sheet

`role="dialog"`, `aria-modal`, `aria-labelledby` (título); entrada/salida animada (0 con reduced motion); asa y arrastre para cerrar (desde asa/título, no pelea con el scroll interno); Escape (solo el de arriba); focus trap y devolución del foco al elemento que lo abrió (capturado al renderizar, antes de un posible `autoFocus`); bloqueo del scroll de página con contador (sheets apilados); scroll interno con `overscroll-contain`. Los cierres iniciados en el propio Sheet animan la salida; si el padre lo desmonta, se retira sin animar.

## Guard (`guard.ts` + `guard.test.ts`)

Falla si aparece: paleta por defecto de Tailwind (`slate-*`, `brand-*`, `white`…), hex/`rgb()`/`hsl()` literales, emojis, tamaños de texto o radios fuera de la escala, cifras sin formato, o valores arbitrarios `[..]` de spacing/tamaño/color. También comprueba que `tokens.css` es coherente (todo color claro tiene su valor oscuro, Tailwind solo referencia variables definidas) y `contrast.test.ts` exige contraste WCAG (texto ≥ 4.5:1, datos ≥ 3:1) en claro y oscuro.

Excepción legítima: se documenta junto al código, con motivo obligatorio (misma línea o la anterior):

```ts
const c = '#f7f6f3' // design-guard-allow: hex-color — el manifest de la PWA no puede leer variables CSS
```

Reglas: `palette-class`, `hex-color`, `functional-color`, `emoji-icon`, `text-size`, `radius`, `raw-number`, `arbitrary-value`. Exentos por diseño: `tokens.css` (donde viven los valores) y los comentarios.

## Excepciones conocidas fuera del guard

- `index.html` (`<meta theme-color>`) y `vite.config.ts` (manifest): hex estático, no pueden leer CSS. El primero se corrige en runtime con `theme.ts`.
- Script inline de `index.html`: repite la resolución de tema de `theme.ts` para evitar el parpadeo antes de que cargue React.
