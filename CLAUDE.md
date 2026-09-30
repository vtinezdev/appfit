# AppFit — instrucciones para Claude Code

PWA personal de nutrición y gimnasio para el iPhone de Víctor (único usuario). Sin backend: todos los datos viven en IndexedDB (Dexie) del dispositivo y Cloudflare solo sirve estáticos. Sin IA: las comidas se interpretan en el dispositivo (intérprete local + catálogo CIQUAL / Open Food Facts). UI, nombres de dominio en el código y documentación, en español.

Stack: Vite 8 · React 19 · TypeScript · Tailwind 3 (solo nombra tokens) · Dexie 4 + dexie-react-hooks · Recharts · vite-plugin-pwa · Vitest + fake-indexeddb. Versiones: `package.json`.

## Comandos

```bash
npm run dev                  # http://localhost:5173 — ¡datos reales de Víctor! (para probar, ver «Pruebas en navegador»)
npm run test                 # vitest run (entorno node + fake-indexeddb)
npx vitest run <ruta>        # un solo archivo de tests
npm run build                # tsc -b && vite build; es también el typecheck
```

Catálogo (`npm run catalogo:*`): `scripts/catalogo/README.md`. Despliegue y resto: `docs/desarrollo.md`.

## Mapa

```
src/app/            shell: App (router casero con useState, sin URLs), BottomNav, Ajustes
src/shared/         db/ (esquema Dexie, tipos, ajustes) · lib/ (fechas, formato, texto, backup) · design/ (tokens, guard)
                    · components/ (primitives) · hooks/ (useAviso)
src/features/       inicio/ · nutricion/ · gym/ — cada una: <X>Tab, pages/, components/, data/ (repos), lib/ (lógica pura)
src/test/           setup-db.ts (fake-indexeddb) y fixtures/
scripts/catalogo/   tubería offline (Node, manual) que genera los paquetes de public/catalogo/
```

Dónde está cada cosa: `docs/arquitectura.md` y `docs/features/<feature>.md`.

## Reglas críticas (no romperlas)

**Datos** (detalle en `docs/datos.md`)
- En las features, solo `features/*/data/*Repo.ts` toca `db`. Las lecturas nunca escriben (se usan en `useLiveQuery`). Lo vigila `shared/db/acceso.test.ts`.
- Escrituras de varias filas → `db.transaction(...)`; dentro, ningún `await` que no sea de Dexie (nada de `fetch`).
- Esquema, tablas o forma de los registros: seguir las reglas de la cabecera de `shared/db/db.ts` y `shared/lib/backup.ts` (versión nueva sin tocar las anteriores, test de migración en `db.test.ts`, `migrarBackup`, toda tabla en `TABLAS_USUARIO` o `TABLAS_CATALOGO`).
- Una entrada o ítem de plantilla referencia como mucho uno de `foodId`/`catalogId` (`shared/db/foodRef.ts`).

**Código**
- Lógica de negocio en funciones puras con tests colocados al lado (`*.test.ts`); los componentes solo componen.
- Imports relativos, sin alias.
- Red: solo el catálogo del propio origen y Open Food Facts con el código de barras (nada más sale del móvil). Ningún servicio externo nuevo sin preguntar.

**UI** (detalle en `docs/DESIGN-SYSTEM.md`: lee solo la sección que toque)
- Nada de colores, tamaños, radios ni cifras sin formato sueltos, ni emojis como iconos: tokens + primitives. Lo vigilan `shared/design/guard.test.ts` y `contrast.test.ts`.
- Inputs a 16 px como mínimo (Safari iOS hace zoom). Vista de referencia 375×812, sin scroll horizontal.
- Borrados: rutinas y plantillas → confirmación previa (`ConfirmacionDestructiva`); filas sueltas (series, entradas, alimentos…) → borrado inmediato con «Deshacer» (`useAviso`). Dentro de un Sheet el Toast queda debajo: errores en línea con `ErrorState`.

**Pruebas en navegador**
- Solo en `http://appfit-test.localhost:5173`, **nunca** en `localhost:5173` (datos reales). Cómo: `docs/desarrollo.md` § Pruebas en navegador.

## Forma de trabajar

- Implementa tú en la sesión principal, sin subagentes ni bucles de revisión. Solo si Víctor pide un agente o un modelo concreto («hazlo con sonnet»), lanza **uno** con ese modelo y el plan completo (ver `docs/desarrollo.md` § Claude Code).
- Si una decisión depende de las preferencias de Víctor (producto, prioridades, datos reales), pregunta en vez de inventar.
- Antes de dar algo por terminado: `npm run test` y `npm run build` en verde. Si algo falla o no se pudo probar, dilo.
- Git: ni commits ni push si Víctor no lo pide. Ramas `feat/<tema>` desde `master` y PR a `master`; commits en inglés, estilo convencional (`feat: …`, `feat(parser): …`).
- Al cerrar un cambio: actualiza los documentos vivos afectados (tabla de abajo) y añade una entrada a `docs/PROCESO.md`. Si Víctor pide «cierra la sesión»: `docs/progreso/README.md`.

## Documentación

Los documentos vivos describen el estado actual y cada tema vive en uno solo. Si uno contradice al código, manda el código: corrige el documento.

| Documento | Fuente de verdad de | Actualízalo cuando |
|---|---|---|
| `docs/arquitectura.md` | capas y dependencias, mapa de carpetas, navegación, arranque, PWA/offline, red | cambian carpetas, capas, arranque o caché |
| `docs/datos.md` | tablas, invariantes, repositorios, ajustes, backup, trampas de Dexie | cambian tablas, invariantes, repos o el backup |
| `docs/features/nutricion.md`, `gym.md`, `inicio.md` | flujos de cada feature y dónde vive su lógica | cambia un flujo o dónde vive su lógica |
| `docs/DESIGN-SYSTEM.md` | tokens, primitives, patrones y lenguaje de las pantallas | cambian tokens, primitives o patrones |
| `docs/desarrollo.md` | requisitos, tests, pruebas en navegador, Git/PR, despliegue, uso de Claude Code | cambian comandos, flujo de trabajo o despliegue |
| `scripts/catalogo/README.md` | fuentes y licencias del catálogo, formato de paquete, tubería | cambia la tubería, una fuente o el formato |
| `docs/decisiones/` | el porqué de las decisiones de base vigentes (un ADR por archivo) | se toma o se revierte una decisión duradera |
| `docs/roadmap.md` | pendientes conocidos, ideas y descartadas | se termina, añade o descarta algo |
| `docs/herramientas.md` | para qué sirve cada dependencia (para personas) | se añade o quita una dependencia |
| `README.md` | presentación para personas (qué hace, privacidad) | cambian las características visibles |

Histórico, no normativo (describe código que puede ya no existir; consultar con `grep`, nunca entero): `docs/PROCESO.md` (bitácora `§N`), `docs/progreso/` (por sesión), `docs/historico/` (planes ya ejecutados).
