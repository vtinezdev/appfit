# Sesión 03 · Rediseño de Hoy (pantalla piloto)

Dirección: **A · Nítido + B · Dorsal + E · Calma**. Solo UI y presentación: sin cambios de DB, repositorios, cálculos, plantillas, copias ni validaciones.

## Auditoría previa

| Área | Antes | Decisión |
|---|---|---|
| Jerarquía | 4 barras iguales en una Card; las kcal pesaban lo mismo que la grasa | kcal como cifra principal (`text-metric`); macros en 3 columnas debajo |
| Objetivo | Muesca solo si te pasas; nada hasta entonces | Meta siempre visible en el carril; tramo atenuado tras la meta; texto de desviación sin rojo |
| Exceso | `ProgressBar` ya extendía el dominio (no cortaba al 100 %) pero no lo comunicaba | Mismo dominio, ahora con tramo atenuado, `+N` y frase |
| Comidas | Mini-card por entrada; fila = `div onClick` (sin foco ni teclado); sin total por comida; nombre a 1 línea | Lista plana con hairlines; fila = `<button>`; total por comida; nombre a 2 líneas |
| Acción | FAB solo icono; tapaba el borrar de la última fila al final del scroll | `Añadir comida` (icono + texto), padding inferior que lo libera; el toast va encima |
| Navegación temporal | Botones grises sueltos; sin transición; al cargar desaparecía la cabecera | Pastilla de fecha, transición direccional discreta, la cabecera no desaparece al cargar |
| Estados | Vacío = 4× «Sin registros»; error solo como toast sin `role="alert"`; no hay estado de día futuro (`›` se deshabilita hoy) | Mismo lenguaje; toast de error con icono + `role="alert"` |
| Reutilizable | `SectionHeader`, `IconButton`, `Card`, `EmptyState`, `Sheet`, `MACROS`, tokens | Se mantienen |

`ProgressBar` y `MacroBar` solo los usaba Hoy (Resumen usa Recharts), así que se pudieron rediseñar sin efectos en otras pantallas.

## Cambios

- `shared/components/ProgressBar.tsx`: carril (pista, relleno, línea de meta, tramo atenuado, `size`, `valueText`, crece desde 0).
- `shared/components/AnimatedNumber.tsx` (nuevo): entero interpolado, lector de pantalla lee solo el valor final.
- `shared/components/Toast.tsx`: `tono="error"`, alineado con la columna de contenido, encima del botón flotante.
- `shared/components/Button.tsx`: `size="sm"`, `shape="pill"`. `Icon`: `alert`.
- `shared/design/motion.ts` (`motionMs`, antes privado de `Sheet`), `tokens.css` (`--motion-shift`), `tailwind.config.js` (keyframes/animaciones sobre los tokens).
- `shared/lib/format.ts`: `formatInt` (separador de millares también en 4 cifras: «1.842»).
- `features/nutricion/components/KcalDia.tsx` (nuevo), `MacroBar.tsx` (rediseñado), `ComidaSection.tsx` (nuevo).
- `features/nutricion/pages/Hoy.tsx` recompuesto; `NutricionTab.tsx` ya no pinta el FAB (lo pinta Hoy, que recibe `onAnadir`).

Ver `docs/DESIGN-SYSTEM.md` («Lenguaje de la pantalla Hoy») para las reglas que salen de esta pantalla.

## Remates (tras la aprobación de la dirección)

1. **CTA**: «Añadir comida» pasa de flotante a último elemento del flujo (pill a ancho completo). Ya no tapa filas; el `Toast` baja a flotar sobre la barra de navegación.
2. **Día vacío**: `ComidasVacias` (un solo «Sin registros» + lista compacta de comidas con «Repetir del día anterior» donde aplica).
3. **Números**: `formatNumber`/`formatInt` como utilidad compartida con regla documentada y regla `raw-number` en el guard; migrados los usos relevantes.
