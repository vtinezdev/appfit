# Desarrollo: tests, pruebas en navegador, Git y despliegue

Los comandos de todos los días están en `CLAUDE.md` § Comandos. Los scripts, en `package.json`.

## Requisitos

- Node.js compatible con Vite 8 (`^20.19` o `>= 22.12`) y npm. Los scripts del catálogo (`scripts/catalogo/*.ts`) se ejecutan con el *type stripping* nativo de Node, sin compilar: se usan con Node 24.
- `npm install` para empezar; `npm run preview` sirve el build de `dist/`.
- Sin variables de entorno ni backend: la configuración se hace dentro de la app (Ajustes).

## Tests (Vitest)

- Entorno `node` con `fake-indexeddb` (`src/test/setup-db.ts`, `setupFiles` en `vite.config.ts`): se prueban la lógica pura y los repositorios contra una IndexedDB real en memoria. Los contratos básicos de componentes se comprueban con render estático de React DOM (sin jsdom); la interacción se valida en navegador.
- `vite.config.ts` excluye `.claude/**` además de los valores por defecto: ahí pueden vivir copias de trabajo de otras ramas (`.claude/worktrees/`, ignorada en Git) cuyos tests no son de esta rama.
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

Los recorridos `scripts/ui/validar-*.cjs` necesitan Vite en 5173 y Playwright + Chromium fuera del proyecto (no son dependencias de la PWA): Playwright resoluble por Node (p. ej. `NODE_PATH=<carpeta>/node_modules`) y Chromium en `/usr/bin/chromium` o el ejecutable que indique `APPFIT_CHROMIUM` (en Windows vale Edge). Los scripts resuelven `appfit-test.localhost` a `127.0.0.1`: si Vite escucha solo en IPv6, arrancarlo con `npm run dev -- --host 127.0.0.1`.

`node scripts/ui/validar-mejoras-entreno.cjs` valida el selector de RIR (al completar, 5+, quitar y fallo de escritura con error en la hoja), menor tamaño de cifra y Reps/Kg/RIR/✓ alineados en móvil normal, nota actual/última nota sin copia, corporal con/sin pesaje, lastre/asistencia, precarga, Deshacer con metadatos, recarga/cierre/historial, Progreso por modo y ocultar todas/una curva, y Consumo/Objetivo en Nutrición. Incluye fallo/reintento de nota con IndexedDB en un contexto; ocho contextos efímeros en el origen aislado: 320/375/430 × claro/oscuro, 375 texto al 200%/Reduce Motion y 1440 oscuro. Comprueba overflow/targets y que consultar gráficas no escribe datos. Informe/capturas en `/tmp/appfit-mejoras-entreno`; `APPFIT_UI_CASE`/`APPFIT_UI_OUTPUT` filtran caso/destino. Chromium emulado, sin dispositivos físicos. Tests de cálculo, comparabilidad, rollback, snapshots/notas y export/import en `gym/lib/carga`, `progreso` y `data/notasCarga`.

`node scripts/ui/validar-quitar-ejercicio.cjs` valida «Quitar de este entreno» (menú del ejercicio) en activo e historial, Deshacer con ids/valores/clasificación/marcas originales, rutina y otras sesiones intactas, omisión tras recargar, reañadir desde el selector, doble toque y rollback ante fallo de IndexedDB. Incluye ejercicio de rutina sin series y eliminación de todos los paneles con retorno de foco a Añadir ejercicio. Ocho contextos efímeros en `appfit-test.localhost:5173`: 320/375/430 px en ambos temas, 375 px con texto al 200%/Reduce Motion y escritorio 1440 px. Capturas/informe en `/tmp/appfit-quitar-ejercicio`; `APPFIT_UI_CASE`/`APPFIT_UI_OUTPUT` filtran caso/destino. Emulación Chromium, sin dispositivos físicos.

`node scripts/ui/validar-tecnicas-progresion.cjs` valida el registro de series de [ADR 027](decisiones/027-registro-de-series-en-la-fila.md): variante en la cabecera (unilateral, agarre con chips, recordar), filas I/D con RIR por lado y copia de la izquierda a la derecha (tecla a tecla, sin arrastrar una derecha distinta), «ambos iguales» antiguo convertido a I/D sin perder datos ni la confirmación, tipo en el número (dropset con bajadas en línea y Deshacer al quitar una, negativas, bajada lenta, fallo de escritura en la hoja), RIR al completar, quitar/Deshacer, recarga, aviso y aplicación de progresión, historial y confirmación en el editor sin selector de RIR. Ocho configuraciones con datos sintéticos y contextos efímeros en `appfit-test.localhost:5173`. Capturas/informe en `/tmp/appfit-tecnicas-progresion`; `APPFIT_UI_CASE`/`APPFIT_UI_OUTPUT` filtran caso/destino. Emulación Chromium, sin dispositivos físicos.

`node scripts/ui/validar-fondos.cjs` prepara fixtures efímeros y recorre Inicio/Nutrición/Gym/Referencias/Ajustes en ambos temas y 320/375/430/1440 px. Comprueba fotografía por sección/tema, fade y luz ambiental, geometría independiente de la decoración, contenido/export intactos, detalle nutricional/subvistas, capas, cambio de tema, Forced Colors y scroll natural. Capturas superior/inferior por sección, cuatro posiciones y tramos de Gym a 375 en `/tmp/appfit-fondos`; `APPFIT_UI_OUTPUT` cambia la carpeta. Es el fondo normal aprobado; `?preview=fondo-gym` ya no altera el diseño. Perfil efímero/origen aislado, sin datos personales.

`node scripts/ui/validar-mapa-muscular.cjs` prueba cierre real, resumen/historial/recarga, detalle, cobertura incompleta y sesión vacía con fixtures efímeros. 320/375/430 px en ambos temas, texto al 200%, Reduce Motion y Forced Colors. Comprueba targets, desbordamiento, snapshot y export intacto al leer. Capturas en `/tmp/appfit-mapa-muscular`, filtro con `APPFIT_UI_CASE`/`APPFIT_UI_OUTPUT`. `validar-build.cjs` también abre el mapa antiguo por primera vez offline y verifica export en ambos temas. Lógica/normalización y cierre transaccional/backup tienen tests junto a `cargaMuscular`, `MapaMuscular` y `mapaMuscularRepo`.

`node scripts/ui/validar-catalogo-ejercicios.cjs` recorre catálogo/rutinas/sesión en 320/375/430 px claro/oscuro, 1440 claro y 375 oscuro con texto al 200%/Reduce Motion. Comprueba recientes, búsqueda/filtros combinables sin escritura, crear personalizado y reintentar fallo, cierre bloqueado al guardar, ids antiguos, orden de rutina, primera serie, recarga y backups. El caso 375 claro reduce el viewport a 430 px para simular el espacio disponible con teclado. Capturas/informe en `/tmp/appfit-catalogo-ejercicios`; `APPFIT_UI_CASE` y `APPFIT_UI_OUTPUT` filtran caso/carpeta. `validar-build.cjs` abre el selector por primera vez offline sin modificar los datos. Emulación Chromium, no hardware físico.

- `npm run dev` (o la configuración `appfit-dev` de `.claude/launch.json`) y abrir **`http://appfit-test.localhost:5173`**. `localhost:5173` tiene los datos reales de Víctor: nunca se prueba ahí. Cada origen tiene su propia IndexedDB; para probar un upgrade desde cero se puede usar otro subdominio (`appfit-upgrade.localhost`).
- Referencias 320×568, 375×812 y 430×932, claro/oscuro, sin datos/con datos/textos largos/cifras grandes. Sin scroll horizontal: `document.documentElement.scrollWidth === innerWidth`. Sin errores en consola.
- **Amigos se prueba con un Supabase falso** (`scripts/ui/supabase-falso.mjs`, instrucciones en su cabecera): Vite en otro puerto (`appfit-test.localhost:5174`) con `VITE_SUPABASE_URL` apuntando a él y una sesión falsa en localStorage; nunca contra el proyecto real. El SQL se prueba aparte con `supabase/pruebas/social.sql`.
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

La navegación se recorre con `scripts/ui/navegar.cjs` (la media luna y, para los destinos de dentro, la sección que los abre). `validar-motion.cjs`, `validar-referencias.cjs` y `validar-rediseno.cjs` aún miden la barra anterior ([ADR 043](decisiones/043-media-luna-de-secciones.md)).

`node scripts/ui/validar-motion.cjs` cubre 320/375/430/768/1440 en ambos temas y perfiles táctiles de iPhone/Pixel con Reduce Motion (emulación Chromium, no dispositivos reales). Prueba cierres durante entrada, resize abierto, texto al 200%, landscape, check dentro del destino activo, etiquetas completas y primera serie visible a 320 px, marks reversibles que no alteran backups, edición que desmarca, persistencia por sesión, descanso con tiempo de pared, alta/borrado/undo, Atrás, touchCancel de Sheet, cancelación de fin, fallo/reintento de guardado y resumen real. Capturas estabilizadas desde arriba en `.impeccable/review`; no usa el origen de datos personales.

`npm run preview -- --host 0.0.0.0 --port 5174`, seguido de `node scripts/ui/validar-build.cjs`, valida el build en `appfit-test.localhost:5174`: SW, recarga offline, fuente local Saira, los seis fondos WebP presentes en CacheStorage y decodificados según sección/tema, chunks diferidos, themes y exportación intacta. Contexto efímero y fixture sintético importado mediante UI. No utiliza ni modifica un perfil personal.

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

- Las actualizaciones se descargan en segundo plano. Inicio muestra el estado y abre Ajustes › Actualizaciones, donde se puede comprobar y aplicar la versión nueva. Solo «Actualizar ahora» recarga esa página; no se fuerza la recarga de otras pestañas. Guarda antes las ediciones pendientes. Los registros guardados se conservan.
- Instalar en el iPhone: abrir la URL en Safari → Compartir → «Añadir a pantalla de inicio».
- Hacer un backup desde Ajustes antes de desplegar un cambio de esquema.
- La cuenta usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (públicas; nunca la *secret key*), que entran en el build. En local van en `.env` (copiar `.env.example`; `.env` está en `.gitignore`); en Cloudflare, en el Worker `appfit` › Settings › Builds › Variables and secrets, con los mismos valores. Sin ellas el build sale sin la sección Cuenta. Cloudflare construye desde `vtinezdev/appfit` (rama de producción `master`, `npm run build` y `npx wrangler deploy`). Un cambio del servidor va en un SQL nuevo de `supabase/migrations/` y se ejecuta a mano en el SQL Editor del proyecto antes de desplegar la app que lo usa.

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

### Validación de Creatina

Con Vite en 5173, `node scripts/ui/validar-creatina.cjs` recorre ocho contextos aislados en `appfit-test.localhost:5173` (320/375/430 px en claro/oscuro y 375 con texto al 200 % y Reduce Motion). Prueba activación por defecto, sin pesaje, mínimo, dosis manual con coma e inválida, marcar/desmarcar, fallo/reintento, recarga, historial, cinco días de carga y vuelta automática, cancelación, desactivación con datos conservados, XP/Ritmo intactos al marcar y backups antiguo/nuevo. Comprueba geometría y targets de los nuevos controles. Usa datos sintéticos; `APPFIT_UI_CASE`, `APPFIT_UI_OUTPUT` y `APPFIT_CHROMIUM` siguen el patrón de los otros recorridos. Informe y capturas en `/tmp/appfit-creatina`. Migración, compatibilidad y rollback tienen tests en `shared/db/db.test.ts`, `shared/lib/backup.test.ts` e `inicio/data/creatinaRepo.test.ts`. Sin prueba en iPhone real.

`node scripts/ui/validar-cuenta.cjs` simula Supabase con `page.route` (nunca llama al proyecto real) y usa dos contextos efímeros como dos móviles en `appfit-test.localhost` (`APPFIT_UI_URL` cambia la dirección): crear la cuenta (contraseña corta rechazada, clave de recuperación, copia subida cifrada), «Guardar ahora», entrar en otro móvil con datos (contraseña incorrecta, resúmenes, quedarse con la nube), conflicto avisado en Inicio y resuelto quedándose con el móvil, y cerrar sesión conservando los datos. Targets de la sección, la hoja y el aviso, sin scroll horizontal ni errores de consola, en 320/375/430 px × claro/oscuro. Capturas en `/tmp/appfit-cuenta`; `APPFIT_UI_CASE`, `APPFIT_UI_OUTPUT` y `APPFIT_CHROMIUM` como en los demás. Acepta `playwright` o `playwright-core`. La lógica tiene tests con una nube en memoria (`src/test/fixtures/nubeFalsa.ts`). Lo que solo se prueba de verdad con el proyecto real y en el iPhone: el correo con el código, la RLS y las funciones SQL, y la sesión dentro de la PWA.

### Validación de Cheat day

Con Vite en 5173, `node scripts/ui/validar-cheat-day.cjs` fija el reloj en el jueves 15 oct 2026 y recorre siete contextos aislados en `appfit-test.localhost:5173` (320/375/430 px en claro/oscuro y 375 con texto al 200 % y Reduce Motion). Prueba marcar un día con comida y uno vacío (aviso del 2.º de la semana), marca en la cabecera y en la franja, fallo de escritura con error en la hoja, medias, nota, adherencia y racha del Resumen, XP de proteína, quitar con «Deshacer», «Copiar el día…» desde el mismo menú y backup de ida y vuelta. Comprueba overflow y targets de la hoja, la semana y la media. Datos sintéticos; `APPFIT_UI_CASE`, `APPFIT_UI_OUTPUT` y `APPFIT_CHROMIUM` como en los demás recorridos (en Windows, Playwright fuera del proyecto con `NODE_PATH` y Edge). Informe y capturas en `/tmp/appfit-cheat-day`. Migración y backup en `shared/db/db.test.ts` y `shared/lib/backup.test.ts`; reglas en `nutricion/lib/cheatDays.test.ts` y junto a cada cálculo. Sin prueba en iPhone real.

### Validación del creador de rutinas

Con Vite en 5173, `node scripts/ui/validar-creador-rutinas.cjs` recorre siete contextos aislados en `appfit-test.localhost:5173` (320/375/430 px en claro/oscuro y 375 con texto al 200 % y Reduce Motion). Prueba «Crear rutina» → «Con el asistente», días por defecto desde Ritmo, preguntas, plan sin escribir datos, «Otra sugerencia», «Cambiar» con sugerencia y con «Elegir otro…», «Regenerar todo», guardar con nombre libre («Torso A (2)»), objetivos guardados, «Deshacer» y, en 375 claro, fallo de escritura con error en línea y reintento, y empezar un entreno con las series objetivo. Comprueba overflow y targets. Datos sintéticos; `APPFIT_UI_CASE`, `APPFIT_UI_OUTPUT` y `APPFIT_CHROMIUM` como en los demás recorridos. Informe y capturas en `/tmp/appfit-creador-rutinas`. Lógica en `gym/lib/creadorRutinas.test.ts` y guardado en `gym/data/guardarPlan.test.ts`. Sin prueba en iPhone real.


### Validación de insignias

Con Vite en 5173, `node scripts/ui/validar-insignias.cjs` prueba la Vitrina y las seis ligas de Progreso con historial sintético, el detalle de Élite y una galería de los componentes reales con todos los logros conseguidos/pendientes, nuevos logros y ascensos. Ocho contextos aislados en el origen de pruebas: 320/375/430 px en ambos temas y 375 con texto al 200 %/Reduce Motion. Comprueba ausencia de desbordamiento, SVG decorativos sin encoger, ids de recorte únicos, candados idénticos sin pistas en los ocultos y backup intacto al consultar. Capturas/informe en `/tmp/appfit-insignias`; filtros `APPFIT_UI_CASE`, `APPFIT_UI_OUTPUT`, `APPFIT_CHROMIUM`. Los colores se verifican en `shared/design/contrast.test.ts`. Emulación Chromium, sin iPhone físico.



### Validar la ampliación social

Con `node scripts/ui/supabase-falso.mjs` en 54329 y Vite en 5174 con `VITE_SUPABASE_URL=http://127.0.0.1:54329` y `VITE_SUPABASE_PUBLISHABLE_KEY=falsa`, ejecutar `node scripts/ui/validar-social.cjs`. Usa solo `appfit-test.localhost:5174`, contextos efímeros y una sesión falsa; no entra en cuentas reales ni envía correo. Matriz 320/375/430 en claro/oscuro y 375 con texto al 200 %/Reduce Motion. `APPFIT_UI_CASE` filtra caso y `APPFIT_UI_OUTPUT` cambia `/tmp/appfit-social`. Valida texto/vista previa/reintento, comunidades de no seguidos, unirse/salir, comentarios, crear comunidad, compartir logro y mapa del entreno en seguidores/comunidad. Conserva el backup salvo la marca explícita del entreno publicado. Comprueba también mapa compacto, ausencia de borrado en publicaciones ajenas, confirmación/cancelación, borrado en comunidad sin tocar la marca de seguidores y borrado del entreno desde Social con reintento tras perder la respuesta; al volver al historial se puede compartir otra vez.

Las pruebas reales de SQL están en `supabase/pruebas/comunidades.sql` (tras 0006, rollback completo, resultado `PRUEBAS_COMUNIDADES_OK`). Se han probado en PostgreSQL 17 local aislado junto a las migraciones sociales 0003–0006 y la suite anterior. Víctor confirmó la ejecución correcta de 0006 en el SQL Editor del proyecto real el 2026-10-16. La suite SQL nueva está verificada localmente; no se ha confirmado su ejecución en el proyecto real. No requiere acceso directo a tablas desde los clientes.

### Actualizaciones visibles de la PWA

Ajustes › App › Actualizaciones muestra el estado de la página abierta, la fecha de su build y la última comprobación. «App al día» requiere consultar con éxito `version.json` y que su identidad coincida; sin conexión o si falla la consulta se informa de que no se puede comprobar. El aviso pequeño de Inicio y la fila del índice de Ajustes comparten el mismo estado. «Actualizar ahora» instala/activa el SW y recarga; si falla, conserva el estado pendiente y permite reintentar.

La guía de esa pantalla explica el recurso para iPhone: con conexión, comprobar y actualizar; si no termina, cerrar completamente desde el selector de aplicaciones, reabrir desde el mismo icono y esperar unos segundos. No requiere reinstalar ni borrar datos. La versión que ya estaba abierta antes de introducir esta pantalla necesita cargar esta build para mostrarla.

Prueba de producción, sin cuentas reales:

```bash
APPFIT_BUILD_ID=prueba-a VITE_SUPABASE_URL='' VITE_SUPABASE_PUBLISHABLE_KEY='' npm run build -- --outDir /tmp/appfit-actualizaciones-a
APPFIT_BUILD_ID=prueba-b VITE_SUPABASE_URL='' VITE_SUPABASE_PUBLISHABLE_KEY='' npm run build -- --outDir /tmp/appfit-actualizaciones-b
node scripts/ui/validar-actualizaciones.cjs /tmp/appfit-actualizaciones-a /tmp/appfit-actualizaciones-b
```

El script sirve exclusivamente las builds locales en el puerto 5173 y navega a `appfit-test.localhost`; si el puerto está ocupado, no detiene el proceso que lo ocupa. Ocho contextos (320/375/430, claro/oscuro y 375 con texto al 200 %/Reduce Motion) verifican estado al día, sin conexión, fallo de consulta, actualización disponible, guía e Inicio. Después usa un perfil persistente con un fixture local: actualización real A→B con fallo/reintento de descarga, dos pestañas sin recargas ajenas y reapertura offline conservando todas las tablas. Informe/capturas en `/tmp/appfit-actualizaciones` (`APPFIT_UI_OUTPUT` para cambiarlo). `APPFIT_BUILD_ID` solo fija la identidad de prueba; en builds normales se genera una distinta automáticamente. No sustituye la prueba de instalación/actualización en un iPhone físico.

### Permisos de publicación de comunidades

Víctor confirmó la ejecución de `supabase/migrations/0007_comunidades_solo_creador.sql` en el proyecto real el 2026-10-16 con «Success. No rows returned», después de 0006 y antes de publicar la opción «Quién puede publicar». Es una transacción completa y conserva el modo abierto de las comunidades anteriores. `supabase/pruebas/comunidades_solo_creador.sql` termina con `PRUEBAS_COMUNIDADES_SOLO_CREADOR_OK` y hace rollback. Se verifica junto a las suites sociales anteriores en PostgreSQL 17 aislado y sin datos reales. El recorrido `scripts/ui/validar-social.cjs` incluye creación restringida, publicación del creador, comentarios de miembros y exclusión de comunidades ajenas restringidas en los destinos del editor.

### Descripción editable de comunidades

`supabase/migrations/0008_editar_descripcion_comunidad.sql` se ejecuta tras 0007 en el SQL Editor y antes de desplegar «Editar descripción»; Víctor confirmó su ejecución en el proyecto real el 2026-10-16. Es una transacción completa y solo añade un RPC. `supabase/pruebas/comunidades_editar_descripcion.sql` termina con `PRUEBAS_EDITAR_DESCRIPCION_OK` y hace rollback. `scripts/ui/validar-social.cjs` y `supabase-falso.mjs` cubren la edición.
