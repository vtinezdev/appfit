# Arquitectura

Estado actual del código. El porqué de las decisiones de base está en `decisiones/`; los datos, en `datos.md`; la UI, en `DESIGN-SYSTEM.md`; cada feature, en `features/`.

## Visión general

- SPA estática (Vite) instalada como PWA en iOS. Sin backend ni cuentas: todo en IndexedDB del dispositivo ([ADR 001](decisiones/001-pwa-local-sin-backend.md)).
- La red solo se usa para:
  - descargar el catálogo de alimentos (`/catalogo/*.json`, del propio origen);
  - consultar Open Food Facts con un código de barras escaneado (solo se envía el GTIN);
  - cargar el `.wasm` del lector de códigos (del propio origen).
- El resto funciona sin conexión.

## Capas y dependencias

```
src/main.tsx ─► src/app/ ─► src/features/* ─► src/shared/
```

| Capa | Contiene | Puede importar |
|---|---|---|
| `shared/` | `db/` (esquema Dexie, tipos, `settings.ts`, `foodRef.ts`), `lib/` (`dates`, `format`, `text`, `backup`), `design/` (tokens y su JS), `components/` (primitives), `hooks/useAviso` | solo `shared/` (nunca `features/` ni `app/`) |
| `features/<x>/data/` | repositorios `*Repo.ts`: los **únicos** que tocan `db` | `shared/` |
| `features/<x>/lib/` | lógica pura con tests (sin React ni `db`) | `shared/`, otras `lib/` |
| `features/<x>/hooks/` | acciones asíncronas y estado de UI (p. ej. búsqueda con espera entre teclas) | `data/`, `lib/`, `shared/` |
| `features/<x>/pages/`, `components/` | composición de primitives | todo lo anterior |

Excepciones conocidas:
- `nutricion/lib/catalogo/sincronizar.ts` y `nutricion/lib/off/buscarProducto.ts` reciben sus dependencias inyectadas (así se testean sin red), pero además exportan una instancia ya cableada con `fetch` y `catalogRepo`.
- Composición entre features: `inicio/InicioTab` usa `gym/components/TarjetaEntreno`, `nutricion/components/ResumenNutricional`, `nutricion/data/entriesRepo` y `nutricion/lib/nutrition`. `app/Ajustes` monta `nutricion/components/ObjetivosAjustes` y `CatalogoAjustes`.

## Mapa de carpetas

```
src/main.tsx             arranque (ver abajo)
src/index.css            CSS global: inputs a 16 px, utilidades (.no-spin, .tabular…)
src/app/                 App (pestañas), BottomNav, Ajustes (objetivos, backup, catálogo, borrar todo)
src/shared/db/           db.ts (esquema y listas de tablas), types.ts, settings.ts, foodRef.ts
src/shared/lib/          dates (fechas locales, periodos), format (formatInt/formatNumber), text (normalizeName, tokenizar,
                         tokensConsulta, singular, mismaRaiz), backup (exportar/importar/migrar/borrar)
src/shared/design/       tokens.css (única fuente de valores), theme, macros, chart, motion, carril, guard
src/shared/components/   primitives (lista en DESIGN-SYSTEM.md § Primitives)
src/features/inicio/     → features/inicio.md
src/features/nutricion/  → features/nutricion.md
src/features/gym/        → features/gym.md
src/test/                setup-db.ts (fake-indexeddb, cargado como setupFiles de Vitest) y fixtures/
public/                  iconos de la PWA, favicon.svg y catalogo/ (paquetes que la app descarga)
scripts/catalogo/        tubería offline del catálogo → scripts/catalogo/README.md
```

## Navegación

Router casero con `useState`, sin URLs ni historial ([ADR 002](decisiones/002-router-casero.md)).

- `app/App.tsx`: pestaña activa (`Tab` en `BottomNav.tsx`): `inicio` (por defecto) · `nutricion` · `gym` · `ajustes`.
- `NutricionTab`: vistas `hoy` · `resumen` · `alimentos` (SegmentedControl). «Añadir comida» (y la edición de una entrada) es un overlay a pantalla completa; «Medidas» se abre encima de él.
- `GymTab`: vistas `inicio` · `rutinas` · `historial` · `progreso`. Si hay un entreno sin `fin`, la pestaña entera pasa a ser `EntrenoActivo`.
- Los Sheets (`shared/components/Sheet`) son estado local de cada pantalla.

## Arranque (`src/main.tsx`)

1. `initTheme()` (tema claro/oscuro/sistema; ver DESIGN-SYSTEM.md § Arquitectura).
2. `navigator.storage.persist()` (pide que el navegador no borre los datos).
3. `ensureSettings()`: la **única** escritura de ajustes al arrancar (las lecturas nunca escriben; ver `datos.md`).
4. Unos 2 s después, con el navegador ocioso y solo si hay conexión: `sincronizarCatalogo()` en segundo plano. Los errores se ignoran y se reintenta en el siguiente arranque (Ajustes permite lanzarlo a mano).

## PWA, caché y tamaño del bundle

- `vite.config.ts`: `VitePWA` con `registerType: 'autoUpdate'` (un deploy nuevo se aplica solo).
- El precache (`globPatterns`) incluye js/css/html/svg/png/ico/woff2. **No** incluye:
  - los `.json` del catálogo: el manifest se pide con `cache: 'no-cache'`;
  - el `.wasm` del escáner: regla `CacheFirst` en tiempo de ejecución, así que funciona sin red desde su primer uso.
- Chunks diferidos (`React.lazy` / `import()`): `Resumen` y `Progreso` (llevan Recharts) y el lector de códigos (`nutricion/lib/escaner/`). Recharts no debe entrar en el chunk de arranque (Inicio usa un SVG propio).
- Despliegue estático en Cloudflare Workers: `desarrollo.md` § Despliegue.
