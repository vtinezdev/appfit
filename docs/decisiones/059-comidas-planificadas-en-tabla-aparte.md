# 059 — Comidas planificadas en una tabla aparte

Fecha: 2026-10-24. Estado: vigente.

## Contexto

El plan de evolución (B16, NUT-04) pide poder colocar comidas en hoy y en los próximos días sin que cuenten hasta comerlas, y sacar de ahí una lista de la compra. Había dos caminos: un campo `planificada` en `entries` o una tabla propia. En las previews de B9–B16, Víctor decide implementarlo sin días pasados: solo hoy y días futuros.

## Decisión

- **Tabla `planificadas`** (Dexie v14, `++id, fecha`), con la misma forma que una entrada sin `textoOriginal` (`Planificada`). No es un campo de `entries`: así ninguna lectura de entradas (medias, rachas, comidas típicas, objetivo congelado, gasto observado, Herbario, XP, Ritmo, B14 o B15) las ve sin querer, y no hay que añadir un filtro a cada una.
- **Solo hoy y los siete días siguientes** (`nutricion/lib/planificadas.sePuedePlanificar`). El repositorio rechaza otra fecha con `FechaNoPlanificable`.
- **«Lo he comido»** mueve las filas a `entries` en una transacción, con `createdAt` nuevo, y el componente congela el objetivo del día como al registrar. Un día futuro no se puede marcar todavía; uno pasado que quedó sin marcar, sí.
- **Se planifica desde las comidas típicas**, que ya resuelven alimento, cantidades y platos (`entradasDesdePlantilla`).
- **En el Diario de hoy** y no en los días futuros: el Diario sigue sin abrir días futuros (su semana los deja sin acción), y lo planificado se ve junto, agrupado por día.
- **Backup**: `planificadas` va en `TABLAS_USUARIO` y es opcional en el backup v3, sin subir la versión.

## Consecuencias

- Una tabla más en el backup y en la copia cifrada de la cuenta; los backups anteriores la importan vacía.
- Las planificadas de días pasados que nunca se marcaron se quedan hasta que se quitan o se marcan: siguen visibles en la sección, con su fecha.
- Si algún día se quieren ver en la rueda o en la semana del Diario, habrá que leer las dos tablas a propósito.
