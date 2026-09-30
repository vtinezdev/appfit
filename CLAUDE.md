# AppFit — instrucciones para Claude Code

PWA personal de nutrición y gimnasio para iPhone. Sin backend: todo vive en IndexedDB (Dexie) del dispositivo. Un solo usuario (Víctor). Documentación y UI en español.

Stack: Vite 8 + React 19 + TypeScript + Tailwind 3 (solo tokens) + Dexie 4 + Recharts + vite-plugin-pwa + Vitest (fake-indexeddb). IA: API REST de Gemini, llamada directa desde el cliente.

```bash
npm run dev      # http://localhost:5173  (¡datos reales de Víctor!)
npm run test     # vitest run
npm run build    # tsc -b && vite build
```

## Mapa del código (estado real)

```
src/app/                 App (router casero con useState), BottomNav, Ajustes
src/shared/db/           db.ts (esquema Dexie v4 + TABLAS_USUARIO/TABLAS_CATALOGO), types.ts, foodRef.ts, settings.ts
src/shared/lib/          dates, format, text, backup
src/shared/ai/           gemini.ts (cliente genérico generarJson)
src/shared/design/       tokens.css (única fuente de valores), theme, macros, chart, guard
src/shared/components/   primitives (Button, Card, Sheet, Toast, NumberStepper, ConfirmacionDestructiva…)
src/shared/hooks/        useAviso (Toast con «Deshacer» y errores)
src/features/nutricion/  NutricionTab + pages/ components/ hooks/ data/ (repos) lib/ (lógica pura, prompts/, catalogo/: paquete, sincronización, ranking;
                         interprete/: intérprete local sin IA, medidas caseras en unidades.ts/medidas.ts; off/: Open Food Facts; escaner/: lector de códigos con carga perezosa)
src/features/gym/        GymTab + pages/ data/ (repos) lib/workout.ts (lógica pura)
scripts/catalogo/        Tubería offline CIQUAL → paquete JSON (Node, manual; no va en la app ni en el build)
public/catalogo/         Paquete estático del catálogo (manifest.json + ciqual-*.json) que la app descarga sola
```

## Reglas del proyecto (no romperlas)

- En las features (Nutrición y Gym), solo `features/*/data/*Repo.ts` toca `db.*` (lo vigila `shared/db/acceso.test.ts`). Las lecturas nunca escriben (se usan en `useLiveQuery`).
- Escrituras de varias filas → `db.transaction(...)`; dentro, ningún `await` que no sea de Dexie (nada de `fetch`).
- Cambiar esquema o forma de registros → revisar `migrarBackup` en `shared/lib/backup.ts` (reglas escritas en `db.ts`/`backup.ts`).
- Tablas nuevas → añadirlas a `TABLAS_USUARIO` (entran en backup) o `TABLAS_CATALOGO` (datos de referencia, fuera del backup y de «borrar todo»). Una entrada/ítem referencia como mucho uno de `foodId`/`catalogId` (`shared/db/foodRef.ts`).
- Borrados: rutinas y plantillas → confirmación previa (`ConfirmacionDestructiva`); filas sueltas (series, entradas, alimentos) → borrado inmediato con aviso «Deshacer» (`useAviso`). Dentro de un Sheet el Toast queda debajo: errores en línea con `ErrorState`.
- Lógica de negocio en funciones puras con tests; componentes solo componen.
- Diseño: nada de colores/tamaños sueltos; tokens + primitives. Ver `docs/DESIGN-SYSTEM.md` y `shared/design/guard.test.ts`.
- Inputs a 16 px mínimo (Safari iOS hace zoom). Vista de referencia: 375×812, sin scroll horizontal.
- Imports relativos, sin alias.
- Pruebas en navegador en un origen aparte (`http://appfit-test.localhost:5173`), nunca en `localhost:5173` (datos y API key reales). Gemini se simula interceptando `fetch`.
- No hacer commits ni push si Víctor no lo pide.

Contexto histórico y decisiones: `docs/PROCESO.md` (bitácora numerada). Estado por sesión: `docs/progreso/`. Leer solo la sección que haga falta, no el archivo entero.
