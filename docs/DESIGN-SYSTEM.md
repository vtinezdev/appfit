# Design system

Fuente de verdad de los valores: `src/shared/design/tokens.css`. Este documento recoge las reglas de uso, los primitives y el lenguaje de las pantallas. Lee solo la sección que necesites.

## Dirección visual

**Negro estructura, naranja actúa/progresa, blanco respira, gris informa.** Naranja solo con función: acción principal, pestaña activa, progreso, dato principal (kcal). Negro: navegación, hero de cada pantalla (`ink`), selección de segmentos, botón `contrast`. Pocas cards: secciones planas con título y hairlines; card solo donde agrupa (resumen, grupo de lista, formulario, ejercicio con campos).

- **Naranja en un solo sitio**: `--c-accent` (relleno), `--c-accent-strong` (naranja como texto o icono, 5,7:1 sobre blanco; `text-accent` no existe), `--c-accent-subtle` (fondos tintados). Texto sobre relleno naranja: `--c-on-accent` (negro, 6:1). Selección negra: `--c-selected`/`--c-on-selected` (cámbialos para una selección naranja).
- **Superficie ink** (`Card tone="ink"`, `Toast`, `BottomNav`): `[data-surface='ink']` en `tokens.css` redefine surface, textos, pistas, `accent-strong`, `selected`, `destructive`, `goal` y `focus`. Las variables que referencian a otras se resuelven donde se declaran, por eso `goal` y `focus` se redeclaran. En oscuro, ink es una superficie elevada. Como mucho un ink por pantalla (la barra y el Toast son la excepción).
- **Datos**: kcal = naranja; proteína pizarra, carbohidratos salvia, grasa malva (≥ 3:1 sobre blanco y sobre ink). Como texto se usan solo con un punto de color (`Badge dotClass`), nunca como color de texto pequeño.
- **Tipografía** (del sistema): `hero` 56 px/800 (cifra de la pantalla) > `metric` > `display` (título de pestaña) > `heading` (título de sheet) > `title` > `body` > `label` (overline en mayúsculas) > `caption`. Cifras siempre `tabular`.
- **Radios** 10/14/24 px; botones y controles en pill. **Spacing**: `page` 20, `section` 32, `card` 20, `stack` 12.
- **Barra flotante**: `--nav-height`, `--nav-offset` (safe area), `--nav-clearance` (`pb-nav`) y `--nav-toast`.
- **Hover** solo con puntero fino (`hoverOnlyWhenSupported`); pulsación `active:scale-95`; foco `--c-focus`.

## Arquitectura

```
tokens.css             src/shared/design/tokens.css  ← ÚNICA fuente de valores (color, tipo, spacing, radios, sombras, motion; claro y oscuro)
   │  variables CSS (--c-*, --fs-*, --radius-*, …)
   ▼
tailwind.config.js     solo NOMBRA los tokens como clases (bg-surface, text-fg-muted, rounded-md, text-body…).
   │                   Sustituye la paleta por defecto: slate-*, red-*, white… no existen. No contiene valores.
   ▼
primitives             src/shared/components (Button, Card, Input, Sheet…): fijan cómo se combinan las clases.
   ▼
pantallas              features/*: componen primitives; no inventan colores, tamaños ni radios.
```

Los valores en JS (gráficas, meta `theme-color`) se leen de las mismas variables: `design/chart.ts` devuelve `rgb(var(--c-…))` y `theme.ts` lee `--c-bg`. No hay una segunda paleta.

- **Tema**: `data-theme="light|dark"` en `<html>`. `theme.ts` resuelve `light | dark | system` (preferencia en `localStorage['appfit-theme']`; si falta, `system`) y sigue los cambios del sistema. Un script inline en `index.html` lo aplica antes de pintar (sin parpadeo). No hay selector de tema en la UI.
- **Datos**: `design/macros.ts` (kcal/proteína/carbohidratos/grasa → color + etiqueta + unidad) y `design/chart.ts` (colores, ejes, tooltip y línea de objetivo de las gráficas).

## Cómo cambiar el diseño

| Quiero… | Toco |
|---|---|
| Otro naranja / acento | `--c-accent`, `--c-accent-strong`, `--c-accent-subtle` (claro, `[data-theme='dark']` y bloque ink) |
| Selección en naranja | `--c-selected`, `--c-on-selected` |
| Radios más pequeños | `--radius-sm/md/lg` |
| Cards con menos contraste | `--c-surface`, `--c-surface-muted`, `--c-border`, `--shadow-raised` |
| Otra tipografía / escala | `--font-sans`, `--fs-*`, `--lh-*` |
| Más o menos aire | `--space-page/section/card/stack` |
| Fondo con más o menos color | `--glow-alpha` (claro y oscuro), `--glow-height`, `--gradient-page` |
| Otro tema | bloque `[data-theme='x']` con los mismos nombres + `theme.ts` |
| Animaciones más lentas | `--dur-*`, `--ease-*` (con `prefers-reduced-motion` valen 0) |

## Vocabulario de clases

- Superficies: `bg-bg`, `bg-surface`, `bg-surface-elevated`, `bg-surface-muted`
- Texto: `text-fg`, `text-fg-muted`, `text-fg-subtle` · Bordes: `border-line`, `border-line-strong`
- Estado: `accent`, `accent-subtle`, `text-accent-on`, `text-accent-strong`, `selected`/`text-selected-on`, `success`, `warning`, `destructive`/`text-destructive-on`
- Datos: `kcal`, `protein`, `carbs`, `fat`, `goal` (significan siempre lo mismo)
- Tipografía: `text-hero|display|heading|title|body|body-sm|label|caption|metric` (`.tabular` para cifras)
- Radios: `rounded-sm|md|lg|pill` · Sombras: `shadow-raised|overlay` · Zona táctil: `min-h-touch`, `min-h-touch-lg`, `max-h-sheet`

## Primitives (`src/shared/components`)

`Button` (`primary` · `secondary` · `ghost` · `destructive` · `danger` · `contrast`; `size` `sm` · `md` · `lg`; `block`; `loading`; siempre en pill), `IconButton` (`label` obligatorio), `Icon`, `Card` (`tone` `default` | `muted` | `ink`, `padded`), `ListGroup` + `ListRow` (fila pulsable; `plain` dentro de `ListGroup`, `flat` para listas con hairlines, `muted`, `accent`), `Input`/`Textarea`/`Select`/`SearchInput` (`tone`, `dense`, `aria-invalid`), `SegmentedControl` (activo `bg-selected`), `NumberStepper`, `ProgressBar` (el carril), `ProgressRing` (el mismo carril en anillo, con `children` en el centro; geometría en `shared/design/carril.ts`), `AnimatedNumber`, `SectionHeader` (`variant` `section` | `label`), `PageHeader` (overline + título), `Metric` (cifra + unidad + etiqueta + caption; `hero` | `metric` | `title`, `align`), `Badge` (`neutral` | `accent` | `warning`, `dotClass`), `LoadingState`/`EmptyState` (`icon`, `title`)/`ErrorState` (con icono `alert`), `Toast` (ink; `tono="error"` para fallos recuperables), `Sheet`, `ConfirmacionDestructiva`.

Notas que no se ven en la firma:
- `NumberStepper` normal: zonas de 44 px y campo de ancho fijo con la unidad dentro (`100 g`), sin flechas del navegador. `compact` (Entreno activo, plantillas): botones más pequeños para filas con varios números; `inputTextoGrande` fuerza el campo a 16 px.
- `SearchInput`: `type="search"` con lupa y `aria-label` obligatorio.
- `.no-spin` (`index.css`) oculta las flechas de `type="number"`, por clase (opt-in).

Componentes de dominio compartidos entre pantallas: `ResumenNutricional` (hero de kcal y macros de Inicio y Hoy) y `TarjetaEntreno` (Inicio).

Hook asociado: `shared/hooks/useAviso` devuelve `{ avisar, avisarError, toast }` (se renderiza `toast` una vez por pantalla; `avisar({ mensaje, onDeshacer })` muestra «Deshacer» y, si deshacer falla, avisa del error). El Toast queda por debajo de los Sheet (z-40 frente a z-50): dentro de un Sheet los errores van en línea con `ErrorState`.

Regla: se abstraen **patrones visuales repetidos con semántica clara**, no elementos HTML sueltos. Una composición propia de una pantalla se queda local.

### Patrón de borrado

- **Rutinas y plantillas** (rehacerlas cuesta mucho): `ConfirmacionDestructiva` (mensaje + «Cancelar» / «Sí, borrar», variantes `secondary`/`danger`, prop `ocupado`) sustituye en su sitio al botón que la ofrecía.
- **Filas sueltas** (series, entradas, alimentos, notas de medidas): borrado inmediato y aviso «Deshacer» con `useAviso`; el repo devuelve el registro borrado y expone `restaurar`.

## Patrón de pantalla

`px-page pt-6` → `PageHeader` (overline + título `display`) → (SegmentedControl) → hero `ink` → secciones planas con `SectionHeader variant="section"` separadas con `space-y-section`. Listas de primer nivel en `ListGroup` con `ListRow` (plain). Estados vacíos con `EmptyState icon title`.

Reglas comunes:
- **Cifra principal** = `AnimatedNumber` con su unidad en `text-body text-fg-muted` y el objetivo asociado; las cifras secundarias, en `text-title`.
- **Carril** (`ProgressBar`, `ProgressRing`): pista `surface-muted`, relleno del color del dato, **meta siempre visible** (`goal` con halo de `surface`) y, si se supera la meta, un **tramo atenuado** (`opacity-50`) después de ella. El dominio es `max(objetivo, valor)`: nada se corta al 100 %. Crece desde 0 al montarse (`duration-long`; 0 con reduced motion).
- **Superar el objetivo no es un error**: no cambia de color. Se dice con texto («+92 kcal sobre el objetivo»), con la meta física y con el tramo atenuado. Quedarse por debajo se dice igual de sereno («Quedan 240 kcal»). Rojo (`destructive`) solo para errores de acción, siempre con icono (`ErrorState`, `Toast tono="error"` con `role="alert"`).
- **Acción principal**: `Button size="lg" block` con icono + texto, dentro del flujo, como último elemento de la pantalla. Nunca flota sobre el contenido (taparía filas accionables).
- **Filas de lista**: el elemento pulsable es un `<button>` (foco y teclado); borrar es otro botón aparte; nombres largos a 2 líneas (`line-clamp-2`).
- **Movimiento**: `animate-shift-next|shift-prev` (cambio de día), `animate-rise-in` (toast, overlays), `animate-fade-in-late` (carga: no aparece si los datos llegan enseguida). Duración y distancia salen de `--dur-*` y `--motion-shift`.
- **Fondo**: un resplandor naranja (`bg-page-glow`, `--gradient-page`) arriba de las 4 pestañas, dibujado por el shell de `App`. Nunca en pantallas de tarea (Añadir comida, Medidas) ni en sheets. `contrast.test.ts` comprueba el texto sobre su pico.
- **Pantallas a pantalla completa** (`fixed inset-0`): contenido encerrado en `max-w-lg` centrado, como el resto de la app.

## Lenguaje de Hoy (referencia para el resto)

- Cabecera de fecha con «‹ ›» (no se pasa de hoy) y «⋯» del día; hero `ResumenNutricional` (kcal en `hero`, anillo y tres carriles P/C/G).
- **Una sección plana por comida** (`ComidaSection`, sin card): cabecera con el nombre en `text-title`, kcal y «⋯»; `FranjaMacros` (barra fina segmentada con el reparto de kcal P/C/G y, debajo, «P 24 g · C 51 g · G 12 g»); filas con `divide-line`; pie con `Button ghost sm` «Añadir a …» y «Repetir del día anterior (n)».
- **Comida vacía**: una sola línea con «Añadir» (y «Repetir…» si ayer hubo). Las cuatro comidas se muestran siempre; no hay «Sin registros» repetido.
- La acción principal «Añadir comida» cierra la pantalla (ver «Acción principal»).

## Lenguaje de Inicio

- `PageHeader` con la fecha como overline y un saludo según la hora como título.
- Hero `ResumenNutricional` (el mismo de Hoy, con «Ver día ›»), `TarjetaEntreno` (entreno en curso o último terminado) y `PesoCard`.
- **Card de resumen** (`PesoCard`, `TarjetaEntreno`): título `text-title` a la izquierda y acción `Button` `sm` a la derecha. Sin cards anidadas.
- **Sparkline** (`PesoCard`): SVG propio, `stroke-accent`, trazo 2 con `vector-effect: non-scaling-stroke`, `role="img"` con `aria-label` que dice el rango. Con menos de 2 pesajes no se dibuja.
- **Variación de peso**: «−0,6 kg en 7 días» con `formatNumber(…, 1)`, mismo tono suba o baje (nada de rojo o verde).
- **Estado vacío**: «Aún no hay pesajes» (`EmptyState`) con «Registrar» disponible. Registrar: `Sheet` con `NumberStepper` (paso 0,1, «kg»); errores en línea, confirmación en Toast.

## Lenguaje de Añadir comida

Mismo lenguaje que Hoy, aplicado a un flujo de entrada de datos.

- **Secciones planas**: cada bloque = `SectionHeader` + contenido; entre bloques `space-y-section`. Las listas de selección (plantillas, frecuentes, resultados) son `ul.divide-y divide-line` con `ListRow tone="flat"`, sin una card por fila.
- **Una Card solo donde hay campos editables**: la revisión agrupa todos los alimentos en **una** Card con `divide-y` (filas `p-card`, no cards anidadas). Los campos usan `tone="muted"` sobre esa superficie.
- **Cifra con presencia, sin decoración**: cada alimento muestra su kcal en `text-title` (`AnimatedNumber`) con P/C/G en `text-caption` (`resumenMacros`). En Sheets de una sola decisión (gramos) la kcal sube a `text-display`. **No hay carriles**: aquí no hay objetivo que comunicar.
- **CTA**: `Button size="lg" block` en una barra inferior **fuera del área con scroll**, con `Guardar · N kcal` (N = suma de `macrosPorGramos`, lo mismo que se guarda). Los Sheets usan `Button block` md.
- **Avisos**: «Actualizará el alimento guardado» va en `warning`; los errores, en `ErrorState`.
- **Campos**: nunca por debajo de 16 px (CSS global) ni de 44 px de alto; etiqueta visible encima (`text-caption`) y `aria-label` cuando la etiqueta visible es corta.

## Formato de números (`shared/lib/format.ts`)

Una regla: **cualquier cifra que el usuario lee como métrica se formatea con `formatInt(n)` (entero) o `formatNumber(n, maxDecimales)`**, siempre con separador de millares (`1.842`, `12.500,5`; es-ES no lo pone en 4 cifras por defecto, por eso no se usa `toLocaleString` a pelo). Nunca `{Math.round(x)}` ni `${x}` en el JSX.

- Sin formato (a propósito): valores de `<input>`, `aria-valuenow/max` (los lee el navegador) y datos internos.
- `AnimatedNumber` ya formatea con `formatInt`. Ejes de gráficas: `tickFormatter={formatInt}`; el tooltip, `formatter`.
- El guard lo comprueba con la regla `raw-number`.

## Sheet

`role="dialog"`, `aria-modal`, `aria-labelledby` (título); entrada y salida animadas (0 con reduced motion); asa y arrastre para cerrar (desde el asa o el título, no pelea con el scroll interno); Escape (solo el de arriba); focus trap y devolución del foco al elemento que lo abrió (capturado al renderizar, antes de un posible `autoFocus`); bloqueo del scroll de página con contador (sheets apilados); scroll interno con `overscroll-contain`. Los cierres iniciados en el propio Sheet animan la salida; si el padre lo desmonta, se retira sin animar.

## Guard (`guard.ts` + `guard.test.ts`)

Falla si aparece: paleta por defecto de Tailwind (`slate-*`, `brand-*`, `white`…), hex/`rgb()`/`hsl()` literales, emojis, tamaños de texto o radios fuera de la escala, cifras sin formato, o valores arbitrarios `[..]` de spacing, tamaño o color. También comprueba que `tokens.css` es coherente (todo color claro tiene su valor oscuro, Tailwind solo referencia variables definidas, ink solo redefine tokens existentes) y `contrast.test.ts` exige contraste WCAG (texto ≥ 4.5:1, datos ≥ 3:1) en claro, oscuro e ink.

Excepción legítima: se documenta junto al código, con motivo obligatorio (misma línea o la anterior):

```ts
const c = '#f7f6f3' // design-guard-allow: hex-color — el manifest de la PWA no puede leer variables CSS
```

Reglas: `palette-class`, `hex-color`, `functional-color`, `emoji-icon`, `text-size`, `radius`, `raw-number`, `arbitrary-value`. Exentos por diseño: `tokens.css` (donde viven los valores) y los comentarios.

Excepciones conocidas fuera del guard:
- `index.html` (`<meta theme-color>`) y `vite.config.ts` (manifest): hex estático, no pueden leer CSS. El primero se corrige en ejecución con `theme.ts`.
- Script inline de `index.html`: repite la resolución de tema de `theme.ts` para evitar el parpadeo antes de que cargue React.

## Trampas de UI (ya pasaron)

- **Zoom de iOS**: cualquier campo con texto < 16 px hace zoom al enfocarlo. Una clase `text-sm` en un input pisa la regla global de `index.css`.
- **Filas flex a 375 px**: un hijo con `flex-1` necesita `min-w-0`, y sus hermanos también si pueden crecer; si no, el nombre se queda a 0 px. Si no cabe, apilar en dos filas.
- **`<input type="date" max>`** solo limita el selector nativo, no un valor escrito por programa: la validación va además en el botón.
- **Recharts `ReferenceLine`** no amplía el eje Y: se fija `domain={[0, (dataMax) => Math.max(dataMax, objetivo)]}`.
