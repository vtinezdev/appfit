# 014 — Catálogo local y conservación de identidad de ejercicios

Fecha: 2026-10-06. Estado: vigente.

## Contexto

Gym guardaba ejercicios por nombre normalizado y los referenciaba por `Exercise.id` numérico en rutinas/series. Víctor solicita 100–150 ejercicios comunes, búsqueda/filtros, recientes y personalizados, sin romper el histórico ni añadir dependencias.

## Decisión

116 definiciones editoriales (204 desde el 2026-10-09, a petición de Víctor, con el grupo Aductores) incluidas en código con ids estables `appfit:*`, nombre, músculos principales/secundarios, equipo y alias opcionales. Se mantienen separadas de los ejercicios locales y no se instalan en IndexedDB al abrir. Al seleccionar se crea solo ese ejercicio, o se reutiliza un vínculo `catalogId`/nombre o alias exacto de un antiguo sin metadatos. No se fusionan parecidos, renumeran ids ni renombra el histórico. Personalizados no llevan `catalogId` y conservan sus propios metadatos.

Los campos nuevos de `Exercise` son opcionales y no indexados: según las reglas de `db.ts`/`backup.ts`, no requieren cambiar Dexie v6/backup v2. Los backups existentes siguen importándose sin transformación; los nuevos exportan/restauran metadatos y personalizados. Catálogo incorporado al bundle y precache, no fuente externa ni tabla nueva. Una definición retirada deja intacto el ejercicio local y su histórico.

`SelectorEjercicios` comparte ModalPage entre editor de rutina y sesión. Búsqueda directa/prefijos/alias con tolerancia acotada a una letra; coincidencias claras delante. Filtros OR dentro de músculo/equipamiento, AND entre familias y búsqueda. Recientes de las series existentes, sin dato duplicado de uso. La primera serie y la identidad se escriben en la misma transacción; un fallo conserva la tarea y revierte los datos.

## Consecuencias

Favoritos, imágenes/instrucciones, variantes y futuras estadísticas pueden añadirse por id sin sustituir el histórico. No se implementan ahora. Un registro antiguo no reconocible permanece sin clasificar y visible sin filtros. El índice único actual de nombre impide duplicar un personalizado con el mismo nombre; la UI pide elegir el existente o usar otro nombre. Los recientes reflejan uso en entrenos, no una rutina cancelada.

Flujo vigente: [Gym](../features/gym.md). Invariantes: [Datos](../datos.md). UI: [DESIGN-SYSTEM](../DESIGN-SYSTEM.md).
