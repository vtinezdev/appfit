# Plan: recetas con preparación (prototipo)

Fecha: 2026-10-26. Estado: **pendiente, sin empezar**. Decisión de Víctor: primero un **prototipo** con recetas de prueba para ver cómo queda; después se decide si se implementa de verdad (fase 2) o se descarta.

## Mensaje para abrir la sesión

> Lee `CLAUDE.md` y `docs/plan-recetas-2026-10-26.md`. Actualiza `master`, crea la rama `feat/recetas-prototipo` y haz la fase 1 (prototipo). Cuando tengas las capturas, enséñamelas y no fusiones nada hasta que decida.

## Qué se quiere

Pasar de una receta que **solo calcula** (lo que hay hoy) a una receta que **también se lee y se cocina**: lo que aporta (kcal y macros por ración y por 100 g) y cómo se prepara. Se accede desde la rejilla de secciones (botón de los cuatro puntos) y desde Nutrición.

Alcance decidido: **solo las recetas de cada persona**. Un recetario incluido en la app queda fuera; el modelo no debe impedir añadirlo después, con recetas de solo lectura y un «Copiar a mis recetas».

## Punto de partida (código actual)

- `Receta` (`shared/db/types.ts`): `nombre`, `nombreNorm`, `ingredientes: MealItem[]` (snapshot), `pesoCocinadoG`, `foodId`, fechas. Cada receta mantiene un `Food` propio con los valores por 100 g del peso cocinado ([ADR 022](decisiones/022-esquema-v7-recetas-y-objetivos-por-dia.md)), así que ya funciona en búsqueda, frecuentes, intérprete y entradas.
- Lógica: `nutricion/lib/recetas.ts` (`por100DeReceta`, `ingredienteDeItem`, `itemDeIngrediente`, `validarReceta`, `pesoCrudoTotal`).
- Datos: `nutricion/data/recetasRepo.ts` (`listar`, `obtener`, `crear`, `actualizar`, `borrar`, `categoriaDe`).
- UI: `nutricion/pages/Alimentos.tsx`, vista Recetas (lista con kcal/100 g; tocar abre el editor) y `components/EditorReceta.tsx` (ModalPage: nombre, categoría, ingredientes con el flujo de Añadir comida, peso cocinado, borrar con `ConfirmacionDestructiva`).
- Ya existen y sirven para la ficha: `entriesRepo.anadirDesdeAlimento` (registrar), `planificadasRepo.planificarAlimento` (Plan) y la lista de la compra del Plan (`components/ListaCompra`, que sale de lo planificado).
- Navegación: `app/navegacion.ts` (`DESTINOS`, `EN_SECCIONES`, `DENTRO_DE`, `destinosOcultos`); la rejilla tiene 7 secciones y `app/rejilla.ts` pone como mucho 4 columnas.

## Fase 1 — Prototipo (rama `feat/recetas-prototipo`, no se fusiona)

Objetivo: verlo en pantalla con recetas realistas. Se puede tirar sin dejar rastro.

1. **Campos opcionales en `Receta`**, sin índice y por tanto sin versión nueva de Dexie (el mismo criterio que en el ADR 022):
   - `raciones?: number` (entero ≥ 1; sin él, 1)
   - `pasos?: string[]` (cada paso, un texto; vacíos fuera)
   - `tiempoMin?: number` (opcional, total)
   - `notas?: string` (opcional: trucos, conservación)
   Recorren `RecetaInput`, `crear` y `actualizar`. Las recetas antiguas sin ellos deben verse bien.
2. **Lógica pura en `lib/recetas.ts`, con tests**:
   - `gramosPorRacion(receta)` = `pesoCocinadoG / raciones`.
   - `valoresPorRacion(receta)`: kcal y macros de una ración, a partir de `por100DeReceta`.
   - `escalarIngredientes(ingredientes, racionesBase, racionesVista)`: cantidades para otro número de raciones (solo para mostrar; no se guarda).
   - `limpiarPasos(textos)` y ampliar `validarReceta` (raciones entero entre 1 y un máximo razonable; pasos con longitud máxima).
3. **Editor**: en `EditorReceta`, una sección «Preparación» con raciones (`NumberStepper`), tiempo y una lista de pasos (añadir, editar, quitar con Deshacer y reordenar si sale barato; si no, solo subir y bajar). Textareas de 16 px.
4. **Ficha de lectura nueva**, `components/FichaReceta.tsx` (ModalPage, composición de primitives):
   - Cabecera: nombre, raciones y tiempo.
   - Métricas: kcal y P/C/G **por ración** destacadas; por 100 g en secundario.
   - Ingredientes: selector de raciones que recalcula las cantidades.
   - Pasos: lista numerada.
   - Notas, si las hay.
   - Pie: «Registrar una ración» (abre la elección de comida y fecha y llama a `anadirDesdeAlimento` con los gramos de una ración), «Planificar» (`planificarAlimento`) y «Editar» (abre `EditorReceta`).
   - Recetas sin pasos: un estado vacío con «Añadir preparación».
5. **Navegación del prototipo**:
   - En Alimentos → Recetas, tocar una receta abre la **ficha**, no el editor.
   - Un destino `recetas` en la rejilla (8 secciones → dos filas de 4), oculto con el módulo de Nutrición apagado (`destinosOcultos`). Icono provisional: `utensils` lo usa Nutrición, así que habrá que dibujar uno (libro o cuchara) en `Icon.tsx`.
   - Para comparar, un acceso desde la cabecera de Nutrición a ese mismo destino.
6. **Recetas de prueba**: un script `scripts/ui/validar-recetas.cjs`, como los de `scripts/ui/validar-*.cjs`, que siembre en **`appfit-test.localhost:5173`** (nunca `localhost:5173`) cuatro recetas que cubran los casos:
   - Corta: tortilla francesa (3 ingredientes, 2 pasos, 1 ración).
   - Larga: «Lentejas estofadas con chorizo y verduras de la abuela» (8 ingredientes, 8 pasos largos, 4 raciones, 75 min, notas).
   - Muchas raciones y cifras grandes: bizcocho de yogur (12 raciones, ~2.500 kcal en total).
   - Antigua: una receta sin pasos, sin raciones ni tiempo (compatibilidad).
   Captura la lista, la ficha (arriba y abajo), el editor con pasos y la rejilla a 320/375/430 px en claro y oscuro. Comprueba también que no haya scroll horizontal y que los controles midan 44 px. Las capturas se le enseñan a Víctor.

Tests y build en verde también en el prototipo (`npm run test`, `npm run build`), porque la fase 2 parte de él.

## Qué tiene que decidir Víctor al ver el prototipo

- Si se sigue adelante o se descarta (si se descarta, se borra la rama y aquí se anota en «Descartadas» de `docs/roadmap.md`).
- Dónde vive: destino propio en la rejilla, dentro de Nutrición (como Referencias está dentro de Ajustes, con `DENTRO_DE`) o las dos cosas. Recomendado: una sola pantalla, a la que se llega por los dos caminos; la vista Alimentos → Recetas desaparece o se queda como acceso directo.
- Si se registra por ración por defecto (recomendado) o por gramos.
- Si «Planificar» la receta debe añadir sus **ingredientes** a la lista de la compra en vez de la receta entera (hoy la lista suma lo planificado, así que saldría «Lentejas… 400 g»). Es la mejora con más valor, pero toca `lib/planificadas`.
- Fuera de la primera versión: fotos (pesan en IndexedDB, backup y copia cifrada), compartir en Social, importar desde una web (servicio externo y casi exige IA, contra las reglas del proyecto).

## Fase 2 — Implementación de verdad (solo si Víctor la aprueba)

Partiendo del prototipo y con lo decidido:

1. Ajustar la navegación elegida (`navegacion.ts`, `navegacion.test.ts`, `rejilla.test.ts`, `seccionDe`, volver atrás en `volver.ts`).
2. Backup: confirmar que `exportar`/`importar` conservan los campos nuevos y añadir un test en `backup.test.ts`. Al ser campos opcionales de una tabla existente no hace falta subir `BACKUP_VERSION`. La copia cifrada de la cuenta reutiliza el backup, pero hay que comprobarlo en `copiaNube.test.ts`.
3. Si se elige: ingredientes de la receta en la lista de la compra (`lib/planificadas` y tests).
4. Validación completa en navegador (320/375/430, ambos temas, textos largos, cifras grandes, texto al 200 %), y anotar en `docs/roadmap.md` lo que falte probar en el iPhone (teclado en los pasos).
5. Documentos: `docs/features/nutricion.md` (Raciones propias y recetas), `docs/datos.md` (forma de `Receta`), `docs/arquitectura.md` (navegación), `docs/DESIGN-SYSTEM.md` (si sale un patrón nuevo), `README.md` (característica visible), entrada en `docs/PROCESO.md`. Un ADR solo si cambia la decisión del ADR 022 (no debería: la receta sigue siendo un `Food` propio).
6. Mover este plan a `docs/historico/`.
