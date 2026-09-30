# 003 — Los repositorios son el único acceso a la base de datos

- **Estado**: vigente (Nutrición desde §16, todas las features desde §30)
- **Historia**: `PROCESO.md` §15, §16 y §30. Reglas y patrones actuales: `../datos.md` § Repositorios.

## Contexto

Al principio las pantallas llamaban a `db` directamente. Eso dio fallos reales: guardados de varias filas sin transacción que quedaban a medias, escrituras dentro de `useLiveQuery` (`ReadOnlyError`) y lógica duplicada entre pantallas.

## Decisión

- En `features/`, solo `data/*Repo.ts` importa `db` (lo vigila `shared/db/acceso.test.ts`).
- Las lecturas no escriben nunca, para poder usarlas en `useLiveQuery`.
- Las escrituras de varias filas van en una transacción de Dexie, sin red dentro.
- La lógica de negocio va en `lib/` como funciones puras con tests; los repositorios solo leen y escriben.

## Consecuencias

- Las reglas de integridad (todo o nada, un solo entreno activo, orden de las series) viven en un único sitio y se prueban con fake-indexeddb.
- Una pantalla nueva que necesite datos necesita una función de repositorio, aunque sea trivial.
