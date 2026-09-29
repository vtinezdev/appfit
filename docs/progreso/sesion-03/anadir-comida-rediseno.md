# Sesión 03 · Rediseño de Añadir comida

Dirección heredada de Hoy: **Nítido + Dorsal + Calma**. Solo UI y presentación: sin cambios de DB, repositorios, modelos, validaciones ni reglas de negocio. Reglas resumidas en `docs/DESIGN-SYSTEM.md` («Lenguaje de Añadir comida»).

## Auditoría previa (375 px)

| Área | Antes | Decisión |
|---|---|---|
| Estructura | Pila de bloques sueltos; una Card por plantilla, por alimento frecuente y por alimento revisado | Secciones planas con `SectionHeader` + listas con hairlines; una sola Card en la revisión |
| Frecuentes | Rejilla de 2 columnas: nombres cortados («Yogur nat…»), kcal/100 g partido en 2 líneas | Lista de una columna: nombre a 2 líneas, kcal/100 g alineado a la derecha |
| Revisión | No decía cuánto aporta cada alimento; nombre editable sin apariencia de campo; 4 inputs por 100 g en 2 filas con etiqueta inline | kcal + P/C/G por alimento (los mismos valores que se guardarán); nombre en `Input` real; 4 columnas con etiqueta encima |
| Cantidad | `NumberStepper` estirado a todo el ancho en Sheets, botones de 36 px, la «g» flotando | 44 px, campo de ancho fijo con la unidad dentro |
| Acciones | Dos botones rellenos de acento a la vez (Interpretar + mic); mic rojo al grabar; «Volver a interpretar» era un `<button>` suelto; Kcal rápidas enterrado tras la lista | Mic secundario, grabando = acento; Button `ghost`; Kcal rápidas justo debajo de la IA |
| Escritorio | El overlay ocupaba 1200 px | Columna `max-w-lg` centrada |
| Dark | Campos `surface-muted` dentro de Sheets casi invisibles | Ajuste de tokens dark (ver DS) |

## Cambios

- `pages/AnadirComida.tsx`: recompuesta. Estructura de columna; orden Comida → Plantillas → Describir (IA) → Kcal rápidas → Buscar/Frecuentes. En revisión: `SectionHeader` («Alimentos · N», con P/C/G totales si N > 1) + una Card con `divide-y`; barra inferior con `Guardar · N kcal`. Sheet de gramos con kcal grande, P/C/G y kcal/100 g. Entrada del overlay con `animate-rise-in`, de la revisión con `animate-fade-in`.
- `components/ItemRevisionRow.tsx` (sustituye a `ItemRevisionCard`): nombre → cantidad + aporte → por 100 g → aviso.
- `components/AlimentosRapidos.tsx` (sustituye a `QuickAddGrid`): buscador con lupa, lista plana, anuncio de nº de resultados (`role="status"` sr-only).
- `components/PlantillasLista.tsx`, `EntradaIA.tsx`, `KcalRapidasSheet.tsx`, `AplicarPlantillaSheet.tsx`: mismo lenguaje. `MacroInputs` gana `layout="row"` (el editor de Alimentos sigue con `grid`).
- `lib/nutrition.ts`: `resumenMacros` (formato «P41 C0 G3») + test. No hay más lógica nueva.
- Design System: ver tabla de «Cambios en primitives» en `docs/DESIGN-SYSTEM.md`.

## Decisiones importantes

- **Kcal por alimento y total en el CTA** salen de `macrosPorGramos`/`sumMacros`, las mismas funciones que usan `entriesRepo.guardarComida` y Hoy. Es presentar un valor existente, no una métrica nueva. Comprobado: el `Guardar · 774 kcal` coincide con las 774 kcal que aparecen luego en Hoy.
- **Sin carriles**: no hay objetivo en este flujo. Mostrar el progreso del día exigiría consultar entradas (dato nuevo) y sería una decisión funcional.
- **Un alimento frecuente = un Sheet = una entrada** (flujo actual). Una «cesta» con varios alimentos seleccionados sería una función nueva; no se hace.
- **Estado del Sheet de gramos**: guarda el `Food` elegido (antes solo `foodId` + nombre) para poder mostrar kcal/macros; `confirmarRapido` sigue llamando a `anadirDesdeAlimento` con el mismo `foodId`/`gramos`.
- **Kcal rápidas** cambia de posición (bajo la IA) porque con la lista de una columna quedaba debajo de hasta 10 filas.
- **Campos por 100 g de la revisión** a 44 px de alto (no `dense`): son secundarios visualmente pero se tocan.

## Deuda visual / pendiente

- `SearchInput` solo lo usa esta pantalla; `Alimentos` y Gym (ejercicios) usan aún un `Input` sin lupa.
- `GestionPlantillaSheet` (en Alimentos) sigue con `NumberStepper compact` y su composición previa: fuera de esta pantalla.
- Nombre vacío en la revisión: el botón se desactiva (comportamiento previo) y el campo lleva `aria-invalid` y placeholder, pero sin mensaje explícito. Decidir el copy es una decisión de producto.
- Con muchas plantillas, la sección de plantillas empuja la IA fuera de pantalla; considerar limitar o plegar (decisión funcional, no tocada).
- Sin toast de «guardado» al volver a Hoy: Hoy no lo tiene hoy y añadirlo requiere estado en `NutricionTab`.
- La entrada de plantillas/frecuentes/IA no distingue visualmente «frecuentes» de «resultados» más allá de la cabecera y una transición de opacidad; suficiente por ahora.
