# Arquitectura

Estado actual del código. El porqué de las decisiones de base está en `decisiones/`; los datos, en `datos.md`; la identidad, en `../DESIGN.md`; la UI, en `DESIGN-SYSTEM.md`; cada feature, en `features/`.

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
| `shared/` | `db/` (esquema Dexie, tipos, `settings.ts`, `foodRef.ts`), `lib/` (`dates`, `format`, `text`, `backup`), `design/` (tokens y su JS), `components/` (primitives), `hooks/useAviso`, `hooks/useModalLayer` | solo `shared/` (nunca `features/` ni `app/`) |
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
src/app/                 App (pestañas), navegacion (destinos/Tab), BottomNav, RuedaNavegacion, TrasladarDatos, Ajustes
src/shared/db/           db.ts (esquema y listas de tablas), types.ts, settings.ts, estadoDatos.ts, foodRef.ts
src/shared/lib/          dates (fechas locales, periodos), format (formatInt/formatNumber/formatCompact), text (normalizeName, tokenizar,
                         tokensConsulta, singular, mismaRaiz), almacenamiento (protección y modo PWA), backup (exportar/importar/migrar/borrar)
src/shared/design/       tokens.css (única fuente de valores), theme, viewport, selection, rueda, macros, chart, motion, carril, guard
src/shared/components/   primitives (lista en DESIGN-SYSTEM.md § Primitives)
src/shared/hooks/        useModalLayer, useOverlayPresence y useListMotion (capas, presencia y continuidad)
src/features/inicio/     → features/inicio.md
src/features/nutricion/  → features/nutricion.md
src/features/gym/        → features/gym.md
src/test/                setup-db.ts (fake-indexeddb, cargado como setupFiles de Vitest) y fixtures/
public/                  iconos de la PWA, favicon.svg, fonts/ (Manrope OFL) y catalogo/ (paquetes que la app descarga)
scripts/catalogo/        tubería offline del catálogo → scripts/catalogo/README.md
```

## Navegación

Router casero con `useState`, sin rutas URL ni historial de pestañas ([ADR 002](decisiones/002-router-casero.md)). Las capas tienen entradas efímeras de History para que Atrás cierre la superior antes de salir de la app; no son rutas de producto.

- El shell flex ocupa 100dvh. `main` posee el scroll y la barra inferior su espacio propio; ancho de lectura máximo 512 px. Navegar restablece el scroll.
- `app/App.tsx`: pestaña activa (`Tab` derivado de `DESTINOS` en `navegacion.ts`): `inicio` (por defecto) · `nutricion` · `gym` · `ajustes`. `BottomNav` muestra Menú y la sección actual; abre por portal un abanico (`RuedaNavegacion`) anclado al botón, sin Sheet intermedio. La lista central fija nombres, iconos y orden; los destinos futuros se paginan de cuatro en cuatro ([ADR 009](decisiones/009-identidad-y-motion-impeccable.md)). Incorporar una pantalla requiere además conectarla en App.
- Inicio permite abrir Añadir comida directamente en Nutrición. El aviso de primer inicio en iOS abre Ajustes con `abrirGuia`: después de cargar, desplaza la vista y enfoca la guía abierta «Instalación y traslado de registros». La navegación habitual de la barra no activa ese salto. La guía tiene un segundo salto a Exportar/Importar, sin cambiar la URL.
- `NutricionTab`: vistas `hoy` · `resumen` · `alimentos` (ViewTabs). «Añadir comida» (y la edición de una entrada) usa ModalPage a pantalla completa; «Medidas» se abre encima de él.
- `GymTab`: vistas `inicio` · `rutinas` · `historial` · `progreso`. Si hay un entreno sin `fin`, la pestaña entera pasa a ser `EntrenoActivo` (carga diferida); al terminar muestra `WorkoutFinished` con los resultados guardados. Marcas/descanso en `gym/lib/session.ts` son presentación por sesión, separados de los repositorios.
- Gym también usa ViewTabs. Segmentación de valores (comida, periodo, tema) mediante SegmentedControl, con semántica radio.
- Sheet, ModalPage y el abanico usan portales en body y `useModalLayer` para foco, Escape/Atrás, Tab, inert y retorno. `useOverlayPresence` comparte una única frontera de cierre y cancela tareas al reabrir. Si el disparador desaparece, el foco vuelve al destino activo o al botón estable Menú (`data-nav-trigger`). Estado local de pantalla; ninguna dependencia nueva. visualViewport ajusta alto/offset al área visible.

## Arranque (`src/main.tsx`)

1. `initTheme()` (Sistema/Claro/Oscuro desde Ajustes, preferencia visual en localStorage) e `initViewport()` (geometría de capas). Ver DESIGN-SYSTEM.md.
2. `solicitarPersistencia()` (`shared/lib/almacenamiento.ts`): conserva un permiso existente o pide protección frente al borrado automático; fallos y rechazo no impiden abrir la app. Ajustes consulta el estado real y permite reintentar. No es una garantía ni una copia de seguridad.
3. `ensureSettings()`: la **única** escritura de ajustes al arrancar (las lecturas nunca escriben; ver `datos.md`).
4. Unos 2 s después, con el navegador ocioso y solo si hay conexión: `sincronizarCatalogo()` en segundo plano. Los errores se ignoran y se reintenta en el siguiente arranque (Ajustes permite lanzarlo a mano).

## PWA, caché y tamaño del bundle

- `vite.config.ts`: `VitePWA` con `registerType: 'autoUpdate'` (un deploy nuevo se aplica solo).
- Manifest con `id: '/'`, `start_url: '/'` y `scope: '/'` estables entre builds. Los archivos precacheados se actualizan; la base IndexedDB `appfit` conserva los registros en el mismo origen. La PWA y Safari pueden tener almacenes separados en iOS (traslado: `datos.md`).
- El precache (`globPatterns`) incluye js/css/html/svg/png/ico/woff2. **No** incluye:
  - los `.json` del catálogo: el manifest se pide con `cache: 'no-cache'`;
  - el `.wasm` del escáner: regla `CacheFirst` en tiempo de ejecución, así que funciona sin red desde su primer uso.
- La fuente local variable se precarga y precachea; no añade un origen de red. El logotipo/iconos existentes se mantienen.
- Chunks diferidos (`React.lazy` / `import()`): `Resumen` y `Progreso` (llevan Recharts) y el lector de códigos (`nutricion/lib/escaner/`). Recharts no debe entrar en el chunk de arranque (Inicio usa un SVG propio).
- Despliegue estático en Cloudflare Workers: `desarrollo.md` § Despliegue.
