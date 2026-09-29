# Sesión 03 — Resumen técnico

Estado al cierre de esta entrada: Gym migrado a `features/`, repositorios de Gym, patrón de borrado unificado. Además, el rediseño piloto de Hoy y Añadir comida (ver [`hoy-rediseno.md`](./hoy-rediseno.md) y [`anadir-comida-rediseno.md`](./anadir-comida-rediseno.md)). Sin commits.

## Qué se hizo (detalle en PROCESO §30)

- Gym en `src/features/gym/` (`GymTab`, `pages/`, `data/`, `lib/workout.ts`); eliminadas `src/pages` y `src/lib`.
- Repos: `exercisesRepo`, `routinesRepo`, `workoutsRepo`, `setsRepo` (+ `gymRepos.test.ts`). `empezar` y `agregar` transaccionales (sin dobles entrenos activos ni órdenes de serie repetidos).
- `shared/db/acceso.test.ts`: solo `features/*/data/*Repo.ts` importa `db`.
- `shared/hooks/useAviso.tsx` y primitive `ConfirmacionDestructiva`.
- Borrado: rutinas y plantillas con confirmación; series, entradas y alimentos con «Deshacer» (`foodsRepo.borrar` devuelve el `Food`, `foodsRepo.restaurar`).
- Escrituras de Gym con manejo de errores. Sin cambios de esquema ni de backup.

## Validación

285 tests, `tsc -b` y build OK; 26/26 comprobaciones en navegador (375×812, origen de pruebas).

## Problemas conocidos / cómo continuar

- `EntrenoActivo` a 375 px: los `NumberStepper` compactos no muestran el valor.
- Rutinas: «1 ejercicios» sin singular.
- Pendiente de propagar el design system a Gym (ver `docs/DESIGN-SYSTEM.md`, ejes de Progreso y `SearchInput`).
