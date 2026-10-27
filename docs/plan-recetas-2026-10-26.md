# Plan: recetas con preparación (prototipo)

Fecha: 2026-10-26. Estado (2026-10-27): **fase 1 hecha** en la rama `feat/recetas-prototipo` (sin fusionar). Víctor ha visto las capturas y **aprueba seguir**, con las decisiones de abajo; además amplía el alcance al **recetario del catálogo** (las 1.552 recetas de típicos), con pasos escritos por tandas. La siguiente sesión empieza por § Handoff.

## Mensaje para abrir la siguiente sesión (con Sonnet: `/model sonnet`)

> Lee `CLAUDE.md` y `docs/plan-recetas-2026-10-26.md` (§ Decisiones y § Handoff). Trabaja en la rama `feat/recetas-prototipo` y empieza por la etapa 1: el formato de las preparaciones y la primera tanda de 100 recetas con pasos. Enséñamela antes de seguir y no fusiones nada.

## Qué se quiere

Pasar de una receta que **solo calcula** (lo que hay hoy) a una receta que **también se lee y se cocina**: lo que aporta (kcal y macros por ración y por 100 g) y cómo se prepara. Se accede desde la rejilla de secciones (botón de los cuatro puntos) y desde Nutrición.

Alcance inicial: solo las recetas de cada persona. **Ampliado el 2026-10-27**: también un recetario de solo lectura con las recetas del catálogo de típicos, con pasos, y «Copiar a mis recetas» (§ Decisiones).

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

### Qué quedó hecho en la fase 1 (sesión 13, 2026-10-27)

Todo lo de arriba, subido a la rama en el commit de cierre de la sesión 13:
- `Receta` con `raciones`, `pasos`, `tiempoMin` y `notas` opcionales (`shared/db/types.ts`), que recorren `RecetaInput`, `crear` y `actualizar` (`preparacionDe` en `recetasRepo.ts`: pasos limpios, notas recortadas, `undefined` borra el campo al actualizar).
- `lib/recetas.ts`: `racionesDe`, `gramosPorRacion`, `valoresPorRacion` (sale de `por100DeReceta`, así coincide con lo registrado), `escalarIngredientes`, `limpiarPasos`, `textoTiempo`, `textoRaciones` y `validarReceta` con preparación (raciones 1–50, ≤ 40 pasos de ≤ 1.000 caracteres, tiempo 1–2.880 min, notas ≤ 2.000). Tests en `recetas.test.ts` y `recetasRepo.test.ts`.
- UI: `components/PasosReceta.tsx` (pasos en el editor, subir/bajar/quitar con Deshacer en línea), sección Preparación en `EditorReceta` (prop `irAPreparacion`), `components/FichaReceta.tsx` (ficha + hoja Registrar/Planificar con comida, día y raciones de 0,5 en 0,5), `components/ListaRecetas.tsx` (la usan `RecetasTab.tsx` y Alimentos → Recetas).
- Navegación: destino `recetas` (`navegacion.ts`, tras Nutrición; oculto con Nutrición apagada), icono `recetario` en `Icon.tsx`, ambiente `nutricion` en `AtmosferaApp`, `IconButton` «Recetas» en la cabecera de Nutrición (`onIrARecetas`).
- `scripts/ui/validar-recetas.cjs`: siembra 4 recetas (tortilla, lentejas largas, bizcocho de 12 raciones, antigua sin preparación), recorre lista, ficha, editor, registrar (comprueba la entrada: 120 g, 217 kcal) y captura a 320/375/430 en claro y oscuro con overflow, 44 px e inputs de 16 px. En este contenedor: `APPFIT_CHROMIUM=/opt/pw-browsers/chromium` y Vite con `npm run dev -- --host 127.0.0.1`.
- `npm run test` (2.941) y `npm run build` en verde.
- **Sin hacer de la fase 2**: documentos vivos, backup/copia cifrada, `volver.ts`, test de navegación de la cabecera.

## Decisiones de Víctor (2026-10-27)

1. **Se sigue adelante.**
2. **Una sola pantalla Recetas**, a la que se llega por la **rejilla de secciones** (destino propio, como en el prototipo) y desde **Nutrición**. La vista Alimentos → Recetas desaparece (queda la pantalla única).
3. **Ver de las dos maneras**: la ficha enseña lo que aporta **por ración y por 100 g**, con un selector (`SegmentedControl` «Por ración / Por 100 g»). En la lista, todas por ración (las antiguas sin `raciones` cuentan como 1 ración = la receta entera); hoy el prototipo mezcla kcal/ración y kcal/100 g según tenga o no raciones, y hay que unificarlo.
4. **Registrar**: por defecto **una ración con sus gramos estándar**, y que se puedan **cambiar los gramos** antes de guardar (además de editar la entrada después, como cualquier otra). La hoja del prototipo solo tiene raciones de 0,5 en 0,5: añadir gramos editables.
5. **Lista de la compra con los ingredientes**, no la receta: al planificar una receta, la lista suma sus ingredientes **en proporción a lo planificado** (2 raciones de una receta de 4 → la mitad de cada ingrediente; gramos planificados / peso cocinado × gramos del ingrediente). Toca `lib/planificadas` y `components/ListaCompra`.
6. **Recetario del catálogo con pasos**: las 1.552 recetas de `scripts/catalogo/tipicos/recetas.json` salen en Recetas como recetas de solo lectura con ficha, ingredientes, raciones, tiempo y **pasos**, más «Copiar a mis recetas». Los pasos se escriben **con texto propio** (nunca copiados de Simone Ortega ni de otra fuente con derechos), coherentes con los ingredientes y cantidades de cada receta, **por tandas de ~100**, empezando por los platos más habituales. Víctor revisa la primera tanda (estilo, que los pasos cuadren) antes de seguir.
7. Fuera: fotos, compartir en Social, importar de una web.

## Handoff: siguiente sesión (Sonnet)

Datos comprobados el 2026-10-27:
- `recetas.json`: 1.552 recetas `{ id, nombre, categoria, referencia, pesoFinalG, ingredientes: [{ ciqual, gramos }] }`; 357 ingredientes CIQUAL distintos, **todos presentes** en `public/catalogo/ciqual-2025-es2.json`, así que en el móvil se resuelven sin datos nuevos de nutrientes. Ninguna tiene raciones, tiempo ni pasos. 854 son «Platos preparados»; muchas filas son bebidas, pan o bollería, que no necesitan pasos.
- El paquete `public/catalogo/tipicos-*.json` (formato 2) solo lleva los valores por 100 g de cada plato. Añadir ingredientes y peso final ocupa ~160 KB más sin comprimir (de ~330 a ~490 KB), más los pasos.
- Tubería: `scripts/catalogo/tipicos.ts` (E/S) y `tipicosLib.ts` (lógica pura), `npm run catalogo:tipicos`, `catalogo:validar`; formato y fuentes en `scripts/catalogo/README.md` y `tipicos/LEEME.md`. Sincronización en el móvil: ver `docs/features/nutricion.md` y `docs/arquitectura.md` (catálogo).

### Etapa 1 — Preparaciones, tanda 1 (lo primero)
1. Archivo nuevo de contenido, p. ej. `scripts/catalogo/tipicos/preparaciones.json`: `{ id (de recetas.json), raciones, tiempoMin, pasos: string[], notas? }`. Separado de `recetas.json` para no tocar las formulaciones.
2. Validación pura con tests (en `tipicosLib.ts` o junto a ella): el `id` existe, raciones enteras 1–50, tiempo 1–2.880, 1–40 pasos de ≤ 1.000 caracteres, sin pasos vacíos ni duplicados de id; mismos límites que `lib/recetas.ts`. Que `catalogo:validar` la ejecute.
3. **Tanda 1**: 100 recetas habituales (tortillas, legumbres, arroces, guisos, cremas, ensaladas, salsas básicas, postres caseros). Para cada una: leer sus ingredientes y gramos (nombre CIQUAL desde el paquete) y escribir pasos que usen esos ingredientes y cantidades del lote, raciones razonables para `pesoFinalG` y tiempo total. Si un paso necesita algo que no está en la lista (agua de cocción, por ejemplo), solo si no aporta energía; si falta algo que sí la aporta, anotarlo para Víctor en lugar de inventarlo.
4. Enseñar la tanda a Víctor (un listado legible, p. ej. un `.md` generado) y esperar su visto bueno antes de las tandas siguientes.

### Etapa 2 — El recetario en la app
1. Paquete de típicos con ingredientes, peso final y preparación (formato nuevo de paquete o campo opcional; documentarlo en `scripts/catalogo/README.md`), sin romper los paquetes ya instalados (la sincronización compara versión y filas).
2. Datos en el móvil: decidir si van en la tabla del catálogo existente (campo opcional) o en una tabla nueva; en ese caso seguir las reglas de `shared/db/db.ts` y `backup.ts` (versión nueva, test de migración, `TABLAS_CATALOGO`). Repos en `nutricion/data/`.
3. Recetas: «Mis recetas» arriba y «Recetario AppFit» debajo con buscador (1.552 no caben en una lista); ficha reutilizando `FichaReceta` en modo solo lectura (ingredientes desde CIQUAL); registrar con `anadirDesdeCatalogo`, planificar con `planificarAlimento` y ref de catálogo; «Copiar a mis recetas» crea una `Receta` con los ingredientes como snapshot con `catalogId` (resolver choque de nombre con un alimento propio). Las que aún no tienen pasos: aviso y «Copiar a mis recetas» para escribirlos.

### Etapa 3 — Mis recetas (decisiones 2–5) y cierre
Puntos 1–5 de § Fase 2 de abajo, más las decisiones 2–5: quitar la vista Alimentos → Recetas, lista por ración, selector «Por ración / Por 100 g», gramos editables al registrar e ingredientes proporcionales en la lista de la compra (también para recetas del catálogo).

### Etapa 4 — Resto de tandas
Tandas de ~100 con el mismo método hasta cubrir los platos que tengan sentido; anotar en `tipicos/LEEME.md` cuáles se dejan sin pasos y por qué.

## Qué tenía que decidir Víctor al ver el prototipo (resuelto en § Decisiones)

- Si se sigue adelante o se descarta (si se descarta, se borra la rama y aquí se anota en «Descartadas» de `docs/roadmap.md`).
- Dónde vive: destino propio en la rejilla, dentro de Nutrición (como Referencias está dentro de Ajustes, con `DENTRO_DE`) o las dos cosas. Recomendado: una sola pantalla, a la que se llega por los dos caminos; la vista Alimentos → Recetas desaparece o se queda como acceso directo.
- Si se registra por ración por defecto (recomendado) o por gramos.
- Si «Planificar» la receta debe añadir sus **ingredientes** a la lista de la compra en vez de la receta entera (hoy la lista suma lo planificado, así que saldría «Lentejas… 400 g»). Es la mejora con más valor, pero toca `lib/planificadas`.
- Fuera de la primera versión: fotos (pesan en IndexedDB, backup y copia cifrada), compartir en Social, importar desde una web (servicio externo y casi exige IA, contra las reglas del proyecto).

## Fase 2 — Implementación de verdad (aprobada; ver también § Handoff, etapa 3)

Partiendo del prototipo y con lo decidido:

1. Ajustar la navegación elegida (`navegacion.ts`, `navegacion.test.ts`, `rejilla.test.ts`, `seccionDe`, volver atrás en `volver.ts`).
2. Backup: confirmar que `exportar`/`importar` conservan los campos nuevos y añadir un test en `backup.test.ts`. Al ser campos opcionales de una tabla existente no hace falta subir `BACKUP_VERSION`. La copia cifrada de la cuenta reutiliza el backup, pero hay que comprobarlo en `copiaNube.test.ts`.
3. Si se elige: ingredientes de la receta en la lista de la compra (`lib/planificadas` y tests).
4. Validación completa en navegador (320/375/430, ambos temas, textos largos, cifras grandes, texto al 200 %), y anotar en `docs/roadmap.md` lo que falte probar en el iPhone (teclado en los pasos).
5. Documentos: `docs/features/nutricion.md` (Raciones propias y recetas), `docs/datos.md` (forma de `Receta`), `docs/arquitectura.md` (navegación), `docs/DESIGN-SYSTEM.md` (si sale un patrón nuevo), `README.md` (característica visible), entrada en `docs/PROCESO.md`. Un ADR solo si cambia la decisión del ADR 022 (no debería: la receta sigue siendo un `Food` propio).
6. Mover este plan a `docs/historico/`.
