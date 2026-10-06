# Desarrollo: tests, pruebas en navegador, Git y despliegue

Los comandos de todos los días están en `CLAUDE.md` § Comandos. Los scripts, en `package.json`.

## Requisitos

- Node.js compatible con Vite 8 (`^20.19` o `>= 22.12`) y npm. Los scripts del catálogo (`scripts/catalogo/*.ts`) se ejecutan con el *type stripping* nativo de Node, sin compilar: se usan con Node 24.
- `npm install` para empezar; `npm run preview` sirve el build de `dist/`.
- Sin variables de entorno ni backend: la configuración se hace dentro de la app (Ajustes).

## Tests (Vitest)

- Entorno `node` con `fake-indexeddb` (`src/test/setup-db.ts`, `setupFiles` en `vite.config.ts`): se prueban la lógica pura y los repositorios contra una IndexedDB real en memoria. Los contratos básicos de componentes se comprueban con render estático de React DOM (sin jsdom); la interacción se valida en navegador.
- Colocados junto al código (`*.test.ts` / `*.test.tsx`); también los de `scripts/catalogo/`.
- Fixtures: `src/test/fixtures/backup-v1.json` (backup antiguo para las migraciones) y `ciqual-2025-es1-muestra.json` (compatibilidad de ids entre versiones del paquete).
- Tests que vigilan reglas del proyecto (si fallan, no se «arreglan» relajándolos):

| Test | Vigila |
|---|---|
| `shared/db/acceso.test.ts` | en `features/`, solo `data/*Repo.ts` importa `db` |
| `shared/db/db.test.ts` | toda tabla está en `TABLAS_USUARIO` o `TABLAS_CATALOGO`; migraciones v1→actual y v2→actual |
| `shared/design/guard.test.ts` | nada de paleta de Tailwind, hex, emojis, tamaños, radios, cifras sin formato ni valores arbitrarios (DESIGN-SYSTEM.md § Guard) |
| `shared/components/components.test.tsx`, `shared/design/selection.test.ts` | navegación estable, semántica de tabs/radios, targets y teclado |
| `shared/design/contrast.test.ts` | contraste WCAG de los tokens en claro, oscuro e `inverse`; también macros como texto y bordes de campos |
| `lib/escaner/detector.test.ts` | `zxing-wasm` fijado a la versión que pide `barcode-detector` |
| `lib/catalogo/paquete.test.ts`, `scripts/catalogo/calidad.test.ts` | los paquetes publicados en `public/catalogo/` son válidos |

- Varios tests usan el paquete real de `public/catalogo/` (ranking, emparejado, erratas, compatibilidad): **regenerar el catálogo puede romperlos**, y eso es intencionado.
- En fake-indexeddb, construir el vocabulario del catálogo tarda unos 3,5 s: los tests de erratas son lentos a propósito.

## Pruebas en navegador

- `npm run dev` (o la configuración `appfit-dev` de `.claude/launch.json`) y abrir **`http://appfit-test.localhost:5173`**. `localhost:5173` tiene los datos reales de Víctor: nunca se prueba ahí. Cada origen tiene su propia IndexedDB; para probar un upgrade desde cero se puede usar otro subdominio (`appfit-upgrade.localhost`).
- Referencias 320×568, 375×812 y 430×932, claro/oscuro, sin datos/con datos/textos largos/cifras grandes. Sin scroll horizontal: `document.documentElement.scrollWidth === innerWidth`. Sin errores en consola.
- **Open Food Facts se simula** sustituyendo `fetch` solo para `world.openfoodfacts.org` (producto completo, incompleto, 404, sin red). Nunca se llama a la API real en las pruebas.
- Un backup se importa por el input real de archivo (`DataTransfer` + evento `change`) y el export se captura interceptando `URL.createObjectURL`.
- En el iPhone, la cámara del escáner necesita HTTPS: solo se puede probar tras desplegar.
- Lo que solo se confirma en un iPhone real (WebKit): safe areas, teclado, tacto, rendimiento de la importación y de la búsqueda. Pendientes en `roadmap.md`.

### Recorrido del rediseño

Con Vite en 5173, Playwright y Chromium disponibles en el entorno:

```bash
node scripts/ui/validar-rediseno.cjs
```

No es una dependencia de la PWA ni del runner Vitest. El script usa solo el origen de pruebas y contextos nuevos. Simula Open Food Facts; importa fixtures mediante repositorios/backup. Matriz de tres tamaños × dos temas × tres estados, todas las áreas, formularios y capas; verifica overflow, targets, tipografía, footer y posición de navegación. Los recorridos comprueban platos/alias/borradores, deshacer, cantidades/búsqueda, plantillas, entreno/recarga, tema y archivos de backup. Capturas e informe en `/tmp/appfit-ui` (`APPFIT_UI_OUTPUT` cambia destino); `APPFIT_CHROMIUM` cambia ejecutable. `APPFIT_UI_SOLO_FLUJOS=1` ejecuta únicamente los recorridos; `APPFIT_UI_SOLO_MODALES=1`, formularios largos y muchas series en 320 px/tablet.

El viewport reducido simula espacio disponible con teclado, no un teclado real. La validación offline/SW se hace con producción; este script de desarrollo importa módulos src para preparar fixtures. Reiniciar Vite al cambiar Tailwind si el CSS servido conserva reglas anteriores.

`node scripts/ui/validar-nutrientes.cjs` comprueba el selector sencilla/detallada, interpretación con el catálogo real, extras siempre visibles en Detalles, guardado por cantidad, totales/cobertura, alimentos propios, cero conocido, eliminación de un dato y recarga. Usa contextos nuevos en el origen de pruebas, tres tamaños móviles y ambos temas; bloquea la API externa. Informe/capturas en `/tmp/appfit-nutrientes-ui` (`APPFIT_UI_OUTPUT` cambia destino).

`node scripts/ui/validar-platos.cjs` comprueba «Añadir ingredientes», cancelación, añadido en varias tandas, búsqueda con revisión, extras en detalles, conservación de snapshots/otros platos, escáner con 404 simulado, borrado/deshacer, plato con un único ingrediente, recarga y destino eliminado durante la revisión. Valida overflow, targets y campos en 320/375/430 px, claro/oscuro, usando contextos nuevos del origen de pruebas. Informe/capturas en `/tmp/appfit-platos-ui` (`APPFIT_UI_OUTPUT` cambia destino).

`node scripts/ui/validar-diario-mejoras.cjs` comprueba mover platos por Sheet, teclado, mouse y touch de Chromium mediante CDP; conservación de snapshots/ids, Deshacer, foco, cancelar/soltar fuera, copia dentro del viewport, cobertura y referencias diarias, jerarquía de comidas, targets y overflow. Nueve contextos: 320/375/430 px en ambos temas, dos a 375 px con Reduce Motion y texto al 200%, y escritorio 1440 px. Incluye segundo dedo, pérdida de captura/blur sintetizado, autoscroll y fallo/reintento de IndexedDB en un contexto aislado. Capturas/informe en `/tmp/appfit-diario-mejoras` (`APPFIT_UI_OUTPUT` cambia destino). Los eventos sintetizados no validan Safari/iOS ni Android físicos.

`node scripts/ui/validar-cabeceras-comidas.cjs` valida las cuatro cabeceras, totales y número de registros, comida vacía, acciones/cancelación/retorno de foco y datos intactos. Diez contextos nuevos: 320/375/430/1440 px en ambos temas y 375 px con texto al 200%/Reduce Motion en ambos temas. Monta también la cabecera real con título largo y cifra extrema sin escribir esos valores en la base. Comprueba contenido sin solapes/overflow y targets ≥44 px. Capturas del diario e informe en `/tmp/appfit-cabeceras-comidas`; `APPFIT_UI_OUTPUT` cambia destino y `APPFIT_UI_CASE` filtra una configuración. El contraste de lectura/hover/foco se verifica también en `shared/design/contrast.test.ts`. Emulación de Chromium, sin validación física de iOS/Android.

`node scripts/ui/validar-copia-platos.cjs` comprueba copia de un plato de Desayuno a Comida/Cena en el mismo día, origen/destino idénticos, cancelar, deshacer, platos sucesivos separados y snapshots/nutrientes conservados. Incluye destinos ocupados, otro día, plantilla solo del plato, copia de una comida completa con kcal rápidas, recarga y copia dentro de un día histórico. Valida texto largo, cifras grandes, overflow, targets y campos en 320/375/430 px, claro/oscuro, en contextos nuevos del origen de pruebas. Informe/capturas en `/tmp/appfit-copia-platos-ui` (`APPFIT_UI_OUTPUT` cambia destino).

`node scripts/ui/validar-resumen-diario.cjs` valida el consumo compartido de Inicio/Hoy (integrado en Inicio, panel en Hoy), espacio de lectura/separación, cifras/barras, «Ver día», modo detallado dentro del mismo contorno y cambios de fecha. Matriz de 320/375/430 px × claro/oscuro × día vacío/habitual/exceso/cifras extremas, con comprobaciones de overflow (también dentro de la tarjeta), targets y backup intacto tras navegar. Usa contextos aislados en el origen de pruebas; informe/capturas en `/tmp/appfit-resumen-diario-ui` (`APPFIT_UI_OUTPUT` cambia destino).

`node scripts/ui/validar-menu-radial.cjs` comprueba el único botón inferior, abanico ascendente sin solapes conectado al origen, targets, sección actual, Escape/Atrás/cierre/backdrop, aislamiento y foco, flechas/Home/End/Enter/Espacio, navegación y scroll. Cancelar conserva vista/scroll; navegar no cambia el backup. Monta siete destinos sintéticos para validar paginación de cinco en cinco. Doce contextos: 320/375/430 × claro/oscuro × movimiento normal/reducido. Informe/capturas en `/tmp/appfit-menu-radial-ui`; `APPFIT_UI_OUTPUT` permite otra carpeta.

`node scripts/ui/validar-motion.cjs` cubre 320/375/430/768/1440 en ambos temas y perfiles táctiles de iPhone/Pixel con Reduce Motion (emulación Chromium, no dispositivos reales). Prueba cierres durante entrada, resize abierto, texto al 200%, landscape, check dentro del destino activo, etiquetas completas y primera serie visible a 320 px, marks reversibles que no alteran backups, edición que desmarca, persistencia por sesión, descanso con tiempo de pared, alta/borrado/undo, Atrás, touchCancel de Sheet, cancelación de fin, fallo/reintento de guardado y resumen real. Capturas estabilizadas desde arriba en `.impeccable/review`; no usa el origen de datos personales.

`npm run preview -- --host 0.0.0.0 --port 5174`, seguido de `node scripts/ui/validar-build.cjs`, valida el build en `appfit-test.localhost:5174`: SW, recarga offline, fuentes locales Manrope/Barlow Condensed, los seis fondos WebP presentes en CacheStorage y decodificados según sección/tema, chunks diferidos, themes y exportación intacta. Contexto efímero y fixture sintético importado mediante UI. No utiliza ni modifica un perfil personal.

`node scripts/ui/validar-referencias.cjs` comprueba barras sin texto técnico permanente, cobertura, las cuatro Sheet, cierres rápidos/Escape/Atrás/foco, salto al nutriente correcto, las cuatro áreas globales, objetivos personalizados y fuentes reales. Verifica cinco destinos sin overflow, targets ≥44 px, datos/export intactos y consola sin errores. Diez contextos: 320/375/430/1440 px claro/oscuro y dos a 375 px con texto al 200%/Reduce Motion. Capturas estabilizadas e informe en `/tmp/appfit-referencias`; `APPFIT_UI_OUTPUT` cambia destino y `APPFIT_UI_CASE` filtra un caso. Emulación Chromium; no acredita dispositivos físicos. `validar-build.cjs` abre Referencias por primera vez offline para comprobar su chunk precacheado.

`node scripts/ui/validar-registros-comida.cjs` comprueba la misma familia visual/altura comparable de plato e individual, cantidades/macros/kcal, acciones bajo «…», desplegar ingredientes, cierres rápidos/Escape/Atrás/foco y transición entre tareas sin capas superpuestas. Mover/copiar/borrar/deshacer, editar/cancelar, registro rápido y recarga conservan snapshots/export. Compara cabecera de comida, resumen superior y navegación con el estado inicial. Diez contextos: 320/375/430/1440 px claro/oscuro y dos a 375 px con texto al 200%/Reduce Motion; incluye título y cifras largas. Capturas e informe en `/tmp/appfit-registros-comida`; filtros `APPFIT_UI_CASE` / `APPFIT_UI_OUTPUT`. `acciones-plato.cjs` centraliza el recorrido público del menú para las regresiones existentes de añadido/copia/arrastre.

### Regresión de conservación de datos

Probar con una build de producción (`npm run preview -- --host 0.0.0.0 --port 5173 --strictPort`) y el origen `appfit-test.localhost`, con un perfil de navegador persistente (no crear un contexto vacío en cada reapertura):

1. Importar una copia de prueba con datos de todas las tablas de usuario y registrar una comida desde la UI. Exportar el resultado como referencia.
2. Recargar, cerrar completamente el navegador y reabrir con el mismo perfil y dirección. Comparar todas las tablas del export, ignorando solo `exportedAt`.
3. Compilar la nueva build, actualizar el service worker y recargar. Repetir la comparación y la reapertura. Mantener el mismo nombre de BD y origen.
4. Para el primer traslado, usar otro contexto aislado, importar la copia con la confirmación y comprobar que cancelar/elegir un archivo inválido conserva los datos. Probar también sin conexión y a 375×812 en claro/oscuro.

`scripts/ui/validar-produccion.cjs <perfil-de-pruebas> [export-esperado.json]` automatiza actualización del SW, cierre/reapertura, comparación de todas las tablas, fuentes/chunks offline y registro/recarga sin red. Requiere un perfil aislado ya preparado y su export de referencia, por defecto `registros-esperados.json` dentro del perfil. Restaura esa referencia al terminar. Solo ignora fecha de exportación y metadato de esquema; una tabla opcional vacía de preferencias equivale a su ausencia en backups antiguos.

Emular `navigator.standalone` y el user agent de iPhone permite verificar la guía y la UI, pero no reproduce el aislamiento real de WebKit. El traslado real Safari → pantalla de inicio se valida en el iPhone.

## Git y pull requests

Reglas (commits, ramas, mensajes): `CLAUDE.md` § Forma de trabajar. Antes de proponer una PR:
  1. `npm run test` y `npm run build` en verde.
  2. Si cambia la UI: prueba en el origen de pruebas (arriba).
  3. Documentación actualizada según la tabla de `CLAUDE.md` § Documentación, más la entrada de `docs/PROCESO.md`.
  4. Si cambia el esquema o el backup: checklist de `datos.md`.

## Despliegue (Cloudflare Workers)

`wrangler.jsonc` sirve `dist/` como estáticos, sin código de Worker (`not_found_handling: single-page-application`).

```bash
npx wrangler login      # una vez
npm run build
npx wrangler deploy
```

- El service worker se actualiza solo (`autoUpdate`): la app instalada toma la versión nueva tras abrirla.
- Instalar en el iPhone: abrir la URL en Safari → Compartir → «Añadir a pantalla de inicio».
- Hacer un backup desde Ajustes antes de desplegar un cambio de esquema.

## Mantener la documentación

- Qué documento es fuente de verdad de qué, y cuándo se actualiza: `CLAUDE.md` § Documentación. No se copia información entre documentos: se enlaza.
- Solo se documenta lo que ya existe en el código, con la implementación terminada y validada.
- `docs/PROCESO.md`: una sección `## N.` nueva al final por cambio relevante: qué se hizo y **por qué**, con enlaces a los documentos vivos en lugar de repetir su contenido. Nunca se reescriben las secciones antiguas.
- Una decisión duradera (de las que alguien podría querer revertir sin saber por qué se tomó) va en `docs/decisiones/NNN-titulo.md` con Contexto, Decisión y Consecuencias.

## Claude Code

| Archivo | Qué es |
|---|---|
| `CLAUDE.md` | contexto global y reglas; se carga en cada sesión |
| `.claude/settings.json` | modelo de la sesión principal |
| `.claude/launch.json` | servidor de desarrollo para las pruebas en navegador |
| `.claude/agents/architecture-auditor.md` | auditor técnico (datos, Dexie, build, tests) |
| `.claude/agents/product-ux-auditor.md` | auditor de flujos, UX y design system |
| `.claude/agents/documentation-agent.md` | cierre documental |

La regla de uso de agentes está en `CLAUDE.md` § Forma de trabajar. Lo que no dice:
- Por qué no se usan por defecto: cada subagente arranca sin contexto y tiene que volver a leer el código; en este proyecto no ha compensado (Víctor lo decidió el 2026-09-30).
- Si Víctor nombra un agente, se le da un encargo mínimo (objetivo, alcance o `git diff`, pregunta concreta) y se traslada su informe tal cual, sin revisiones después.
- Si la sesión está en modo plan, hay que salir antes de lanzar un agente (Shift+Tab): el agente hereda el modo plan y no podría editar.
- Los alias `opus`/`sonnet` apuntan siempre al modelo más reciente de cada familia. `/model` en una sesión manda sobre `.claude/settings.json`; `/agents` muestra y edita los subagentes.
