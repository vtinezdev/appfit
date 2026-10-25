# 022 — Esquema v7: recetas como alimento, raciones propias y objetivos por día

Fecha: 2026-10-07. Estado: vigente. Complementa [004](004-identidad-alimentos-y-snapshots.md) (identidad de alimentos y snapshots) y [019](019-perfil-y-estimacion-energetica.md) (Perfil y objetivos).

## Contexto

Un paquete de 26 mejoras funcionales (seguridad de datos, Gym, Nutrición, cuerpo y análisis) necesitaba datos nuevos: raciones propias por alimento, recetas, agua, el objetivo de cada día y medidas corporales. Todo sigue en IndexedDB, sin backend ni servicios nuevos.

## Decisión

- **Una sola versión de esquema (Dexie v7)** con cinco tablas nuevas y vacías, sin `upgrade()`: `porciones` (índice `ref`), `recetas` (`&nombreNorm`, `foodId`), `agua`, `objetivosDia` y `medidas` (`&fecha`). Todas en `TABLAS_USUARIO`. El backup pasa a la v3 y sigue importando v1 y v2 (las tablas nuevas, vacías). Los campos opcionales nuevos de tablas existentes (`Workout.ordenEjercicios`, `Routine.objetivos`, `SetEntry.tipo`/`rir`, ajustes y perfil) no llevan índice ni versión.
- **Una receta es un `Food` propio.** `recetas` guarda el snapshot de los ingredientes y el peso cocinado; `recetasRepo` mantiene, en la misma transacción, un alimento con los valores por 100 g del peso cocinado. Búsqueda, frecuentes, intérprete, plantillas y entradas lo tratan como cualquier alimento propio, así que el invariante «como mucho un `foodId` o `catalogId`» no cambia. Editar la receta actualiza el alimento; las entradas antiguas conservan su snapshot (ADR 004). Alternativa descartada: un tipo de referencia nuevo para recetas, que habría tocado entradas, plantillas, backup y todos los consumidores de `FoodRef`.
- **Raciones propias por `FoodRef`.** `porciones.ref` es la clave estable (`user:<id>` o `catalog:<id>`), de modo que sobreviven a las actualizaciones del catálogo. El nombre es una sola palabra para que el intérprete la reconozca como unidad (`unidadPropia`); solo se aplica si el alimento encaja con lo escrito, con prioridad sobre las raciones fijas.
- **Objetivo por día como snapshot escrito solo por acciones del usuario.** `objetivosDia` guarda kcal y macros de cada día. Se crea (si falta) al guardar comidas de esa fecha y se actualiza el de hoy al registrar peso o editar Perfil o Ajustes; nunca desde una lectura, para poder usarse en `useLiveQuery`. Hoy y Resumen usan el snapshot para fechas pasadas (o, sin él, los vigentes); **para hoy siempre se calculan en vivo**, porque casi cualquier cambio (borrar un pesaje, el perfil, importar un backup, cumplir años) altera los vigentes y un snapshot de hoy quedaría desfasado. El snapshot de hoy se escribe igualmente (upsert) para que, al pasar el día, conserve el último objetivo. No se reescribe el pasado: los días anteriores a esta versión se siguen comparando con el vigente.
- **Proteína por kg**, activada por defecto (1,8 g/kg, rango 1,6–2,2), aplicada en `objetivosVigentes` después de las kcal del Perfil; el gasto observado (adaptativo) y las medidas viven en Perfil, desactivado por defecto lo primero. Las cifras citadas se verificaron contra Crossref y el texto de cada fuente; lo no verificado consta en Referencias.
- **Sin sugerencia de progresión ni kcal extra en días de entreno**: se aplazan (el incremento depende del ejercicio; la integración Gym ↔ Nutrición se decidirá más adelante).

## Consecuencias

- El backup v3 crece con cinco tablas opcionales; un backup antiguo importa con ellas vacías y `importarBackup` las vacía igualmente.
- Un día con snapshot ya no cambia al editar el Perfil después (salvo hoy). Registrar comida de un día pasado congela el objetivo vigente de ese momento, no el de entonces.
- `calcularVigentes` lee `entries` cuando está activado el gasto observado, así que las transacciones que lo llaman incluyen esa tabla.
- Detalle por feature: [datos](../datos.md), [nutrición](../features/nutricion.md), [perfil](../features/perfil.md), [gym](../features/gym.md), [inicio](../features/inicio.md).
