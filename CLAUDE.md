# AppFit — instrucciones para Claude Code

PWA personal de nutrición y gimnasio para iPhone. Sin backend: todo vive en IndexedDB (Dexie) del dispositivo. Un solo usuario (Víctor). Documentación y UI en español.

Stack: Vite 8 + React 19 + TypeScript + Tailwind 3 (solo tokens) + Dexie 4 + Recharts + vite-plugin-pwa + Vitest (fake-indexeddb). Sin IA: las comidas se interpretan en el dispositivo (intérprete local + catálogo CIQUAL/Open Food Facts).

```bash
npm run dev                  # http://localhost:5173  (¡datos reales de Víctor!)
npm run test                 # vitest run (entorno node + fake-indexeddb, ver src/test/setup-db.ts)
npx vitest run <ruta>        # un solo archivo de tests
npm run build                # tsc -b && vite build  → también es el typecheck
npm run catalogo:ciqual      # regenera el paquete CIQUAL en public/catalogo/ (manual, ver scripts/catalogo/README.md)
npm run catalogo:off         # regenera la selección de Open Food Facts España (necesita el volcado en scripts/catalogo/raw/)
npm run catalogo:validar     # valida los paquetes publicados (errores de calidad)
```

Despliegue: `wrangler.jsonc` sirve `dist/` como estáticos en Cloudflare Workers (`npm run build && npx wrangler deploy`).

## Mapa del código (estado real)

```
src/app/                 App (router casero con useState, sin URLs), BottomNav, Ajustes
src/shared/db/           db.ts (esquema Dexie v5 + TABLAS_USUARIO/TABLAS_CATALOGO), types.ts, foodRef.ts, settings.ts
src/shared/lib/          dates, format, text, backup
src/shared/design/       tokens.css (única fuente de valores), theme, macros, chart, motion, carril, guard
src/shared/components/   primitives: Button, Card, Sheet, Toast, Input, NumberStepper, PageHeader, Metric, Badge,
                         ListGroup/ListRow, SegmentedControl, ProgressRing/Bar, StateMessage (Loading/Empty/ErrorState),
                         ConfirmacionDestructiva, Icon
src/shared/hooks/        useAviso (Toast con «Deshacer» y errores)
src/features/nutricion/  NutricionTab + pages/ components/ hooks/ data/ (repos) lib/ (lógica pura, catalogo/: paquete (formato 2), sincronización, ranking, erratas;
                         interprete/: intérprete local, medidas caseras en unidades.ts/medidas.ts; off/: Open Food Facts; escaner/: lector de códigos con carga perezosa)
src/features/inicio/     InicioTab (pantalla de arranque) + components/ data/pesosRepo.ts lib/peso.ts (tabla `pesos`; sin Recharts)
src/features/gym/        GymTab + pages/ components/ data/ (repos) lib/workout.ts (lógica pura)
src/test/                setup-db.ts (fake-indexeddb) y fixtures/ (backup-v1.json para probar migraciones)
scripts/catalogo/        Tubería offline CIQUAL + Open Food Facts España → paquetes JSON, con calidad.ts (validador común) e informes/ (Node, manual; no va en la app ni en el build)
public/catalogo/         Paquetes estáticos del catálogo (manifest.json + ciqual-*.json + offes-*.json, este último ODbL) que la app descarga sola
```

Tests colocados junto al código (`*.test.ts`). Varias reglas de abajo las vigilan tests: `shared/db/acceso.test.ts` (acceso a `db`), `shared/db/db.test.ts` (tablas en una lista, migraciones v1→v5), `shared/design/guard.test.ts` y `contrast.test.ts` (design system).

## Reglas del proyecto (no romperlas)

- En las features (Nutrición, Inicio y Gym), solo `features/*/data/*Repo.ts` toca `db.*`. Las lecturas nunca escriben (se usan en `useLiveQuery`).
- Escrituras de varias filas → `db.transaction(...)`; dentro, ningún `await` que no sea de Dexie (nada de `fetch`).
- Cambiar esquema → `this.version(n)` nuevo, sin tocar las anteriores, y test de migración en `db.test.ts`. Cambiar forma de registros → revisar `migrarBackup` en `shared/lib/backup.ts` (reglas escritas en la cabecera de `db.ts`/`backup.ts`).
- Tablas nuevas → añadirlas a `TABLAS_USUARIO` (entran en backup) o `TABLAS_CATALOGO` (datos de referencia, fuera del backup y de «borrar todo»). Una entrada/ítem referencia como mucho uno de `foodId`/`catalogId` (`shared/db/foodRef.ts`).
- Borrados: rutinas y plantillas → confirmación previa (`ConfirmacionDestructiva`); filas sueltas (series, entradas, alimentos) → borrado inmediato con aviso «Deshacer» (`useAviso`). Dentro de un Sheet el Toast queda debajo: errores en línea con `ErrorState`.
- Lógica de negocio en funciones puras con tests; componentes solo componen.
- Diseño: nada de colores/tamaños/radios sueltos ni emojis como iconos; tokens + primitives. Ver `docs/DESIGN-SYSTEM.md` (solo la sección que toque).
- Inputs a 16 px mínimo (Safari iOS hace zoom). Vista de referencia: 375×812, sin scroll horizontal.
- Imports relativos, sin alias.
- Pruebas en navegador en un origen aparte (`http://appfit-test.localhost:5173`), nunca en `localhost:5173` (datos reales). Open Food Facts se simula interceptando `fetch`.

## Forma de trabajar

- Implementa tú mismo en la sesión principal, sin subagentes ni bucles de revisión. Solo si Víctor pide un agente o un modelo concreto («hazlo con sonnet»), lanza **uno** con ese modelo y el plan completo.
- Antes de dar algo por terminado: `npm run test` y `npm run build` en verde. Si algo falla o no se pudo probar, dilo.
- Si una decisión depende de las preferencias de Víctor (producto, prioridades, datos reales), pregunta en vez de inventar.
- Al cerrar un cambio que afecte a lo documentado: nueva sección numerada en `docs/PROCESO.md` y, si cambia, el mapa/reglas de este archivo. Cuando pida «cierra la sesión»: `docs/progreso/sesion-NN/` (ver `docs/progreso/README.md`).
- Git: no hacer commits ni push si Víctor no lo pide. Ramas `feat/<tema>` desde `master` y PR a `master`; mensajes de commit en inglés estilo convencional (`feat: …`, `feat(parser): …`).

Contexto histórico y decisiones: `docs/PROCESO.md` (bitácora numerada). Estado por sesión: `docs/progreso/`. Planes: `docs/PLAN.md`, `docs/roadmap/`. Leer solo la sección que haga falta, no el archivo entero.
