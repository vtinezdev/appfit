# Arquitectura

Estado actual del código. El porqué de las decisiones de base está en `decisiones/`; los datos, en `datos.md`; la identidad, en `../DESIGN.md`; la UI, en `DESIGN-SYSTEM.md`; cada feature, en `features/`.

## Visión general

- SPA estática (Vite) instalada como PWA en iOS. Sin backend ni cuentas: todo en IndexedDB del dispositivo ([ADR 001](decisiones/001-pwa-local-sin-backend.md)).
- La red solo se usa para:
  - descargar el catálogo de alimentos (`/catalogo/*.json`, del propio origen);
  - consultar Open Food Facts con un código de barras escaneado (solo se envía el GTIN);
  - cargar el `.wasm` del lector de códigos (del propio origen);
  - cargar las miniaturas de ejercicios (`/ejercicios/*.webp`, del propio origen) al abrir el selector.
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
- `nutricion/lib/arrastrePlatos.ts` y `PlatoPointerSensor.ts` son adaptadores de interacción con dnd-kit/DOM (coordenadas, eventos y captura), sin escrituras ni acceso a `db`; no son cálculos de nutrientes.
- Composición entre features: `inicio/InicioTab` usa `nutricion/data/entriesRepo` y `nutricion/lib/nutrition`; `inicio/components/AccesoEntreno` lee `gym/data/workoutsRepo`, `setsRepo`, `routinesRepo` y `exercisesRepo`, usa `gym/lib/workout`, `gym/lib/cargaMuscular`, `gym/lib/presentacionEjercicio`, `gym/hooks/useFiguraMapa` y carga diferido `MiniMapa` de `gym/components/MapaMuscular`; `app/AccionesRapidas` compone `gym/data/workoutsRepo`/`routinesRepo` e `inicio/components/RegistroRapido`; la revisión semanal de Inicio (`inicio/hooks/useRevisionSemanal`, `lib/revisionSemanal`, `components/RevisionSemanal`) lee los repos de comidas, entrenos, series, ejercicios y `perfil/data/objetivosDiaRepo`, reutiliza `gym/lib/resumenSemanal`, `gym/lib/records` y `nutricion/lib/adherencia`, y compone `ListaRecords` de `gym/components/WorkoutFinished`; `inicio/lib/anilloEnergia` usa el tipo `Macros` de `nutricion/lib/nutrition`. `gym/components/CargaEjercicio` lee `inicio/data/pesosRepo.ultimoHasta` para proponer la masa corporal, sin escribir pesajes; `gym/hooks/useFiguraMapa` lee `perfil/data/perfilRepo.getPerfil` (sexo) para elegir el muñeco del mapa muscular. `app/Ajustes` monta `nutricion/components/ObjetivosAjustes` y `CatalogoAjustes`, y usa `inicio/lib/agua` (objetivo de agua) y `shared/lib/exportarCsv`. `nutricion` (Hoy, Resumen, Añadir comida) usa `perfil/data/objetivosDiaRepo` para leer y congelar el objetivo de cada día, y `perfil/lib/proteina` en Ajustes. `inicio/InicioTab` usa `perfil/data` (sexo para el objetivo de agua, `objetivosDiaRepo`) y `inicio/components/AvisoBackup` lee `shared/db/settings`. `referencias/components/ProteinaAguaReferencias` lee `perfil/lib/proteina` e `inicio/lib/agua`. Perfil: `nutricion`, `inicio`, `referencias` y `app` leen `perfil/data/perfilRepo.objetivosVigentes` (fuente única de objetivos); `perfil` usa `inicio` (`pesosRepo`, `RegistrarPesoSheet`, `validarPeso`) y `nutricion/lib/objetivos`; `referencias/components/EnergiaReferencias` lee `perfil/lib` (ecuaciones, niveles y fuentes). `nutricion/components/NutrientesDetalle` compone `referencias/components/ReferenciaNutrienteContenido`; ambos consultan la lógica pura central `shared/lib/referenciasNutricionales`, sin dependencias de shared hacia features.

## Mapa de carpetas

```
src/main.tsx             arranque (ver abajo)
src/index.css            CSS global: inputs a 16 px, utilidades (.no-spin, .tabular…)
src/app/                 App (pestañas), navegacion (destinos/Tab, EN_MAS), BottomNav (barra de pestañas), AccionesRapidas («+»), TrasladarDatos, Ajustes
                         AtmosferaApp (decoración local de cada destino, sin acceso a datos)
src/shared/db/           db.ts (esquema y listas de tablas), types.ts, settings.ts, estadoDatos.ts, foodRef.ts
src/shared/lib/          dates (fechas locales, periodos), format (formatInt/formatNumber/formatCompact), text (normalizeName, tokenizar,
                         tokensConsulta, singular, mismaRaiz), almacenamiento (protección y modo PWA), backup (exportar/importar/migrar/borrar)
src/shared/design/       tokens.css (única fuente de valores), theme, viewport, selection, macros, chart, motion, carril, guard
src/shared/components/   primitives (lista en DESIGN-SYSTEM.md § Primitives)
src/shared/hooks/        useModalLayer, useOverlayPresence y useListMotion (capas, presencia y continuidad)
src/features/inicio/     → features/inicio.md
src/features/nutricion/  → features/nutricion.md
src/features/gym/        → features/gym.md
src/features/perfil/      → features/perfil.md (estimación energética, objetivos vigentes)
src/features/referencias/ → features/referencias.md (sección global, contenido compartido, catálogo y futuros grupos)
src/test/                setup-db.ts (fake-indexeddb, cargado como setupFiles de Vitest) y fixtures/
public/                  iconos de la PWA, favicon.svg, fonts/ (Saira recta y cursiva, OFL) y catalogo/ (paquetes que la app descarga)
                         images/atmosferas/ (seis fondos WebP locales por sección/tema y procedencia)
scripts/catalogo/        tubería offline del catálogo → scripts/catalogo/README.md (solo importa de src archivos sin imports: `nutricion/lib/catalogo/categorias.ts`)
```

## Navegación

Router casero con `useState`, sin rutas URL ni historial de pestañas ([ADR 002](decisiones/002-router-casero.md)). Las capas tienen entradas efímeras de History para que Atrás cierre la superior antes de salir de la app; no son rutas de producto.

- El shell flex ocupa 100dvh. `main` posee el scroll y la barra inferior su espacio propio; el fondo fotográfico (`AtmosferaApp`) es hermano de `main`, detrás de él, y por eso no se desplaza (en táctil `main` siempre puede desplazarse 1 px y el viewport no rebota, para que el gesto nunca mueva el documento entero); ancho de lectura máximo 512 px. Navegar restablece el scroll.
- `app/App.tsx`: pestaña activa (`Tab` derivado de `DESTINOS` en `navegacion.ts`): `inicio` (por defecto) · `nutricion` · `gym` · `perfil` · `referencias` · `ajustes`. `BottomNav` es la barra de pestañas Inicio · Nutrición · «+» · Entreno · Más ([ADR 028](decisiones/028-barra-de-pestanas-y-registrar.md)); `EN_MAS` (Perfil, Referencias, Ajustes) se abre en una Sheet. El «+» abre `app/AccionesRapidas`, que compone `gym/data/workoutsRepo` y `routinesRepo` (empezar o volver al entreno) e `inicio/components/RegistroRapido` (peso y agua), y devuelve a App las navegaciones (Añadir comida en Nutrición, Entreno). La lista central fija nombres, iconos y orden. Incorporar una pantalla requiere además conectarla en App.
- Inicio muestra tarjetas breves (energía, entreno, peso y agua) que abren su sección, y un aviso discreto de copia de seguridad si toca, ; Añadir comida se abre desde el «+» de la barra. El aviso de primer inicio en iOS abre Ajustes con `abrirGuia`: después de cargar, desplaza la vista y enfoca la guía abierta «Instalación y traslado de registros». La navegación habitual de la barra no activa ese salto. La guía tiene un segundo salto a Exportar/Importar, sin cambiar la URL.
- `NutricionTab`: vistas `hoy` · `resumen` · `alimentos` (ViewTabs; Alimentos tiene Alimentos · Plantillas · Recetas). Hoy se carga con React.lazy: el arrastre de platos y dnd-kit no se ejecutan al abrir Inicio o Gym. `arrastrePlatos` y `PlatoPointerSensor` son adaptadores de interacción del diario, sin acceso a datos; las escrituras pasan por `entriesRepo`. «Añadir comida» (y la edición de una entrada) usa ModalPage; «Mover plato» usa Sheet y comparte la escritura con el gesto. `ComidaSection` compone filas compartidas de plato/alimento (`RegistroComida`) y un menú contextual (`AccionesPlatoSheet`); su `onExited` encadena las tareas existentes sin apilar capas ni escribir datos nuevos. «Medidas» se abre encima de Añadir.
- `GymTab` (visible como «Entreno»): vistas `inicio` (rotulada «Empezar») · `rutinas` · `historial` · `progreso`. Si hay un entreno sin `fin`, la pestaña entera pasa a ser `EntrenoActivo` (carga diferida); al terminar muestra `WorkoutFinished` con los resultados (y los récords). Abrir un entreno del Historial (o registrar uno pasado) sustituye la pestaña por `DetalleEntreno`, una vista y no un Sheet, para que el «Deshacer» de las series (Toast) quede visible. Descanso y presentación en `gym/lib/session.ts` son estado por sesión, separado de los repositorios; la marca de cada serie se persiste en `SetEntry.realizada` mediante `setsRepo`/`workoutsRepo`. Resumen e historial comparten `MapaMuscular` (diferido): taxonomía/catálogo → `lib/cargaMuscular` (carga/agregación/normalización) → SVG y detalle accesible. `workoutsRepo.terminar` captura asociaciones semánticas sin alterar las series; no hay cálculos en el SVG. Ver [ADR 015](decisiones/015-mapa-muscular-de-sesion.md).
- Gym también usa ViewTabs. Segmentación de valores (comida, periodo, tema) mediante SegmentedControl, con semántica radio.
- `gym/hooks/useQuitarEjercicio` comparte bloqueo, aviso reversible y retorno de foco entre sesión activa y editor del historial; no accede a IndexedDB. `workoutsRepo` realiza borrado/restauración transaccionales y `lib/workout.ordenEjerciciosSesion` filtra omisiones de esa sesión. Datos y comportamiento: [Gym](features/gym.md).
- `gym/components/NotaEjercicio` y `CargaEjercicio` comparten los editores de sesión/historial; escriben mediante `workoutsRepo`, que conserva configuración por ejercicio y snapshots por serie. Masa propuesta desde `inicio/data/pesosRepo.ultimoHasta`, sin escribir pesajes. `gym/lib/carga` centraliza modalidad/formato/volumen externo; `lib/progreso` agrega sesiones terminadas comparables. `shared/components/ChartVisibility` comparte controles de curvas entre Gym y Nutrición, sin acceso a datos ni persistencia. [ADR 025](decisiones/025-carga-corporal-y-notas-de-sesion.md).
- Ejecución y técnicas de Entreno: `lib/ejecucion` es la fuente de clave comparable, volumen por lado/tramo y validación; `lib/progresion` calcula propuestas a partir de datos confirmados. `EjecucionEjercicio`, `MenuSerie`, `RirSheet` y `ProgresionEjercicio` componen primitives compartidas; `lib/serie` decide el tipo visible, bajadas, lados y etiquetas de la fila ([ADR 027](decisiones/027-registro-de-series-en-la-fila.md)). `PanelEjercicio` abre una sola hoja a la vez (serie, RIR, nota, carga, variante, progresión o menú); las del menú se encadenan en `onExited`. Solo repos escriben configuraciones, confirmación y decisiones; el motor y las lecturas del selector no escriben. [ADR 026](decisiones/026-ejecucion-tecnicas-y-progresion-confirmada.md).
- `gym/components/SelectorEjercicios` comparte ModalPage entre rutinas y sesión. `gym/lib/catalogoEjercicios` contiene 204 definiciones locales; `selectorEjercicios` mezcla lectura de ejercicios guardados, búsqueda/filtros y recientes derivados de series. Solo `exercisesRepo.resolverSeleccion` escribe la identidad local; sesión lo compone con la primera serie transaccional en `setsRepo.agregarSeleccion`. Sin tabla, red o preferencia nuevas. `FilterChips` es una primitive de multiselección con `aria-pressed`; `ModalPage.busy` bloquea cierre mientras se confirma una escritura.
- `PerfilTab`, diferida, estima la energía diaria ([features/perfil.md](features/perfil.md)). «Ver método y fuentes» navega con `App.areaReferencias` a Referencias › Energía y objetivo y enfoca su título; Ajustes enlaza a Perfil con `onIrAPerfil`.
- `ReferenciasTab`, diferida, contiene un índice de seis áreas (incluida «Proteína y agua») con vuelta y retorno de foco. `App.referenciaInicial` enlaza desde un nutriente a Objetivos nutricionales, abre su Disclosure y enfoca/desplaza esa referencia; se limpia al navegar normalmente. El salto espera `Sheet.onExited` para retirar aislamiento y restaurar History antes de cambiar pestaña. Las referencias leen los objetivos vigentes sin escribir, y sus explicaciones/fuentes no se duplican en Nutrición. No hay rutas nuevas, tablas ni migraciones.
- Sheet y ModalPage usan portales en body y `useModalLayer` para foco, Escape/Atrás, Tab, inert y retorno. `useOverlayPresence` comparte una única frontera de cierre y cancela tareas al reabrir. Si el disparador desaparece, el foco vuelve a la pestaña activa o al «+» de la barra (`data-nav-trigger`). Estado local de pantalla; visualViewport ajusta alto/offset al área visible. `Sheet.onExited` notifica la salida terminada también si el padre cambió open, para enfocar un plato movido tras retirar el aislamiento.

## Arranque (`src/main.tsx`)

1. `initTheme()` (Sistema/Claro/Oscuro desde Ajustes, preferencia visual en localStorage) e `initViewport()` (geometría de capas). Ver DESIGN-SYSTEM.md.
2. `solicitarPersistencia()` (`shared/lib/almacenamiento.ts`): conserva un permiso existente o pide protección frente al borrado automático; fallos y rechazo no impiden abrir la app. Ajustes consulta el estado real y permite reintentar. No es una garantía ni una copia de seguridad.
3. `ensureSettings()`: la **única** escritura de ajustes al arrancar (las lecturas nunca escriben; ver `datos.md`).
4. Unos 2 s después, con el navegador ocioso y solo si hay conexión: `sincronizarCatalogo()` en segundo plano. Los errores se ignoran y se reintenta en el siguiente arranque (Ajustes permite lanzarlo a mano).

## PWA, caché y tamaño del bundle

- `vite.config.ts`: `VitePWA` con `registerType: 'autoUpdate'` (un deploy nuevo se aplica solo).
- Manifest con `id: '/'`, `start_url: '/'` y `scope: '/'` estables entre builds. Los archivos precacheados se actualizan; la base IndexedDB `appfit` conserva los registros en el mismo origen. La PWA y Safari pueden tener almacenes separados en iOS (traslado: `datos.md`).
- El precache (`globPatterns`) incluye js/css/html/svg/png/webp/ico/woff2, incluidas las seis escenas locales. **No** incluye:
  - los `.json` del catálogo: el manifest se pide con `cache: 'no-cache'`;
  - el `.wasm` del escáner: regla `CacheFirst` en tiempo de ejecución, así que funciona sin red desde su primer uso.
- Saira variable (recta y cursiva) es local, precargada y precacheada; no añaden un origen de red. Manifest/theme-color inicial usan grafito. Iconos/id/scope permanecen estables; BrandMark presenta la marca dentro de la UI.
- AtmosferaApp introduce una sola imagen decorativa por destino/tema resuelto (unos 333 KB para las seis escenas), sin solicitudes externas ni espacio de layout. Consume `getResolvedTheme`/`subscribeTheme` del sistema existente mediante `useSyncExternalStore`; Claro/Oscuro y los cambios de Sistema actualizan la foto sin duplicar preferencias ni escribir registros. Referencias/Ajustes reducen la intensidad; menús y tareas conservan sus capas. No hay cache runtime nueva ni cambios de registros/migraciones. La prueba de producción comprueba las seis entradas de CacheStorage y la escena correspondiente al tema al navegar offline.
- Chunks diferidos (`React.lazy` / `import()`): `ReferenciasTab`, `PerfilTab`, `Hoy` (dnd-kit), `EntrenoActivo`, `Resumen`, `Progreso`, `MapaMuscular` (geometría de los muñecos: póster, detalle y miniatura de Inicio) y `GraficaPeso` (Recharts, dentro del historial de peso de Inicio), y el lector de códigos (`nutricion/lib/escaner/`). Recharts y dnd-kit no deben entrar en el chunk de arranque (Inicio usa un SVG propio y carga la gráfica del peso aparte). Las referencias nutricionales son constantes locales; solo abrir explícitamente sus enlaces consulta fuentes externas, sin enviar datos personales.
- Despliegue estático en Cloudflare Workers: `desarrollo.md` § Despliegue.
