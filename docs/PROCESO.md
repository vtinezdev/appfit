# Proceso: qué se ha hecho y por qué

Bitácora cronológica de cambios y decisiones, desde el [plan original](./historico/plan-original.md). Se cita como `PROCESO §N`.

> **Histórico, no normativo.** Cada sección describe el código *de su momento*: las antiguas hablan de cosas que ya no existen (Gemini, `src/pages/`, `wrangler pages deploy`…). El estado actual está en los documentos vivos (`CLAUDE.md` § Documentación). Consúltala por secciones con `grep -n '^## ' docs/PROCESO.md`, nunca entera. Se añade una sección al final por cambio relevante y nunca se reescriben las anteriores (formato: `desarrollo.md` § Mantener la documentación).

## 0. Punto de partida

La carpeta `C:\Users\Victor\Desktop\appfit` solo tenía `PLAN.md`. Sin API key de Gemini ni cuenta de Cloudflare, así que el objetivo fue **dejar toda la app funcional y probada en local**, dejando solo dos cosas pendientes de credenciales: interpretar comidas con IA real y el despliegue final.

## 1. Scaffold del proyecto

Se generó el proyecto base con `npm create vite@latest . -- --template react-ts`. El comando pedía sobrescribir la carpeta (por tener ya `PLAN.md`), así que se generó primero en una carpeta temporal del scratchpad y se recrearon a mano los ficheros de configuración (`package.json`, `tsconfig*.json`, `vite.config.ts`, `index.html`, `.gitignore`) directamente en el proyecto, **para no arriesgarme a borrar `PLAN.md`** con un `--overwrite`.

Stack elegido tal y como pedía el plan: Vite + React 19 + TypeScript + Tailwind, más las librerías del plan (Dexie, dexie-react-hooks, Recharts, vite-plugin-pwa, Vitest).

### Ajuste de versiones

Al instalar, `npm` dio un conflicto: `vite-plugin-pwa@0.21` no soporta Vite 8 (el que instala Vite "latest" ahora mismo). Se subió a `vite-plugin-pwa@^1.3.0`, que sí declara compatibilidad con Vite 8.

Después, al compilar, `vite.config.ts` daba un error de tipos porque `vitest@2` trae internamente una copia de Vite distinta a la instalada en el proyecto (Vite 8), y TypeScript veía dos tipos `Plugin` incompatibles. La solución correcta no era "silenciar" el error, sino **actualizar a `vitest@^5`**, que sí declara peer-dependency con Vite 8. Con eso el `defineConfig` de `vitest/config` vuelve a tipar bien sin trucos.

## 2. Configuración base

- `tsconfig.app.json` / `tsconfig.node.json`: copiados del scaffold oficial de Vite (son los que genera el propio `create-vite`), añadiendo `vite-plugin-pwa/client` a los tipos para que `virtual:pwa-register` no dé error.
- `vite.config.ts`: plugin de React + `VitePWA` con `registerType: 'autoUpdate'` (para que las actualizaciones futuras se apliquen solas, tal como pedía el plan) y `test: { environment: 'node' }` para Vitest (no hace falta DOM real porque los tests son de lógica pura, no de componentes).
- `tailwind.config.js` / `postcss.config.js`: configuración estándar, con una paleta `brand` (índigo) para no depender de los azules por defecto de Tailwind.
- `index.html`: metaetiquetas específicas de iOS desde el minuto uno (`viewport-fit=cover`, `apple-mobile-web-app-capable`, `theme-color`) para no tener que volver a tocarlo más adelante.

### Iconos de la PWA

Para los iconos (`apple-touch-icon.png`, `icon-192.png`, `icon-512.png`) no había ningún editor de imágenes a mano. En vez de dejarlos como placeholder roto, se escribió un pequeño script Node (`gen-icons.mjs`) que **construye un PNG válido a mano** (cabecera, chunk `IHDR`, píxeles comprimidos con `zlib`, chunk `IEND`) dibujando un fondo índigo con una línea de pulso blanca. Así la PWA tiene iconos reales desde ya, sin depender de ninguna librería de imágenes ni de internet.

## 3. Modelo de datos (`src/db.ts`)

Se implementó el esquema de Dexie tal cual lo definía el plan (`foods`, `entries`, `settings`, `exercises`, `routines`, `workouts`, `sets`).

**Decisión de tipado importante**: en Dexie, si el campo `id` de una interfaz se declara opcional (`id?: number`), TypeScript también infiere que el *retorno* de `.add()` puede ser `undefined`, lo que rompe en cascada un montón de código (`db.exercises.add(...)` usado inmediatamente después para crear una serie, por ejemplo). La forma correcta recomendada por Dexie 4 es declarar `id: number` (no opcional) en la interfaz, y dejar que el tipo `EntityTable<T, 'id'>` se encargue de permitir omitir el `id` solo al insertar. Se aplicó este patrón a las 6 tablas.

`getSettings()` se diseñó **de solo lectura** (nunca escribe en la base de datos) porque se usa dentro de `useLiveQuery` en varias pantallas, y Dexie prohíbe hacer una escritura dentro de una consulta reactiva (ver más abajo, sección de bugs). La creación del registro por defecto se separó en `ensureSettings()`, que se llama una única vez al arrancar la app (`main.tsx`).

## 4. Lógica pura (`src/lib/`)

Se separó toda la lógica de negocio de la UI para poder testearla con Vitest sin montar componentes, tal como pedía el plan:

- **`dates.ts`**: fechas en formato `YYYY-MM-DD` calculadas siempre con el reloj *local* del dispositivo (nunca `toISOString()` de UTC, que desplazaría el día en franjas horarias negativas). Semana de lunes a domingo, con `startOfWeek` calculando el offset correcto también cuando el día es domingo.
- **`nutrition.ts`**: escalado de macros por gramos, sumas, agregados por fecha y media diaria. Todo funciones puras sin efectos secundarios.
- **`workout.ts`**: fórmula de Epley para 1RM, volumen (`peso × reps`), y `formatUltimaVez` para el texto "3×8 @ 60 kg" que se ve en el entreno activo.
- **`gemini.ts`**: llamada `fetch` directa a la API REST de Gemini (sin SDK, como pedía el plan) con `responseMimeType: 'application/json'` y un `responseSchema` explícito, para que la IA devuelva siempre la misma forma de JSON. Incluye:
  - Un prompt que le pasa a Gemini los nombres de alimentos ya conocidos, pidiéndole que reutilice el nombre exacto si coincide.
  - Soporte para texto y para audio (`inlineData` en base64) en la misma función.
  - Una clase `GeminiError` y una función `validarResultado` que rechaza respuestas sin alimentos, con nombres vacíos, o con números negativos/no numéricos — para no guardar basura en la base de datos si la IA responde algo raro.
  - Mensajes de error en español y diferenciados por causa (sin key, 401/403, 429 de cuota, sin red, JSON inválido).
- **`backup.ts`**: exporta las 7 tablas a un único JSON descargable, y permite importarlo reemplazando todo lo que hubiera (pensado para restaurar en un iPhone nuevo).

## 5. Componentes reutilizables (`src/components/`)

- **`VoiceRecorder`**: prueba `MediaRecorder.isTypeSupported()` en este orden: `audio/mp4` (formato nativo de iOS Safari) → `audio/aac` → `audio/webm` → `audio/ogg`, tal como especificaba el plan, y avisa con un mensaje claro si no hay soporte (para caer al dictado del teclado como alternativa).
- **`NumberStepper`**: input numérico con botones −/+, pensado para dedos en pantallas táctiles. Se le añadió más tarde una prop `compact` (ver bugs de UI).
- **`Sheet`**: modal tipo *bottom sheet*, patrón habitual en apps móviles, usado para "añadido rápido", edición de alimentos, rutinas, etc.
- **`MacroBar`**: barra de progreso reutilizada tanto en "Hoy" como en Resumen.
- Todos los `input`/`select`/`button` fuerzan `font-size: 16px` por CSS global (`index.css`) porque **Safari en iOS hace zoom automático** en cualquier campo con letra más pequeña; es un detalle fácil de olvidar y que rompe la experiencia en el móvil real.

## 6. Nutrición

- **`Hoy.tsx`**: navegación día a día, totales vs. objetivos, comidas agrupadas por tipo, borrar entradas.
- **`AnadirComida.tsx`** es la pantalla más compleja: selector de comida, texto libre + voz, interpretación con Gemini, pantalla de revisión editable, y un modo "añadido rápido" que reutiliza alimentos ya guardados sin pasar por la IA (para que funcione sin conexión y sin gastar cuota). Al guardar, la función `upsertFood` decide si actualizar un alimento ya existente (dándole prioridad a lo que el usuario ve/edita en la revisión) o crear uno nuevo marcado como `fuente: 'gemini'`.
- **`Resumen.tsx`**: gráfico de barras apiladas (Recharts) por semana o mes, media diaria y distribución de macros en % de kcal (no en gramos, porque un gramo de grasa no "pesa" lo mismo en calorías que uno de proteína).
- **`Alimentos.tsx`**: CRUD manual de la base de datos personal de alimentos.

## 7. Gimnasio

- **`GymHome.tsx`**: crear entreno vacío o desde una rutina guardada.
- **`EntrenoActivo.tsx`**: se muestra automáticamente en vez del resto de la pestaña Gym en cuanto existe un `workout` sin `fin` en la base de datos (consulta reactiva en `GymTab.tsx`), así que **el entreno sobrevive a cerrar la pestaña o recargar la página**, tal como pedía el plan. Decisión de diseño: al añadir un ejercicio nuevo se le crea automáticamente una primera serie (con los valores de la última vez que se hizo ese ejercicio, o 8×20 kg por defecto) en lugar de dejarlo "vacío", porque si no, ese ejercicio desaparecería de la pantalla en cuanto el componente se remonte (por ejemplo, al cambiar de pestaña y volver), al no tener ninguna serie que lo referencie.
- **`Rutinas.tsx`**: CRUD de plantillas con buscador de ejercicios que permite crear uno nuevo al vuelo si no existe.
- **`Historial.tsx`**: lista de entrenos terminados con detalle de series y volumen por ejercicio.
- **`Progreso.tsx`**: selector de ejercicio con dos gráficas (peso máximo/1RM estimado, y volumen) por sesión.

## 8. Navegación

Se optó por un router "casero" basado en `useState` (pestañas Nutrición/Gym/Ajustes en `App.tsx`, y sub-vistas dentro de cada pestaña) en lugar de instalar `react-router`. Al ser una PWA de un único usuario, sin necesidad de compartir URLs ni de botón "atrás" del navegador entre pantallas internas, añadir un router de verdad habría sido peso extra sin beneficio real.

## 9. Tests (Vitest)

Se cubrieron exactamente los tres módulos que pedía el plan:

- `nutrition.test.ts`: escalado de macros, agregados por fecha, medias, distribución de macros.
- `workout.test.ts`: fórmula de Epley, volumen, peso máximo, formato de "última vez".
- `gemini.test.ts`: validación de respuestas de Gemini (JSON válido, items sin nombre, valores negativos o no numéricos) y los errores tempranos de `interpretarComida` cuando falta la API key o no hay texto/audio.

Los 26 tests pasan (`npm run test`).

## 10. Bugs encontrados probando la app real (y por qué pasaban)

Antes de dar la app por terminada se levantó con `npm run dev` y se probó a mano en el navegador integrado, en vista móvil, siguiendo el flujo del plan (añadir comida rápida, ver Resumen, crear rutina, entrenar, terminar, ver Historial/Progreso, Ajustes). Salieron dos fallos reales:

1. **`ReadOnlyError` de Dexie al abrir la app**: `getSettings()` hacía un `put()` (escritura) la primera vez que no existían ajustes, pero se llamaba desde dentro de un `useLiveQuery` en varias pantallas. Dexie no permite escribir dentro de una consulta reactiva porque rompería su sistema de re-ejecución automática. **Solución**: `getSettings()` pasó a ser puramente de lectura (devuelve valores por defecto en memoria si no existe el registro), y la escritura real se movió a `ensureSettings()`, llamada una sola vez al arrancar la app fuera de cualquier `liveQuery`.
2. **Los números de reps/kg no se veían en el entreno activo**: al poner dos `NumberStepper` completos (con botones de 36px) uno al lado del otro en una fila, en una pantalla de 375px de ancho no quedaba espacio para el número. **Solución**: se añadió una prop `compact` a `NumberStepper` (botones e input más pequeños) y se usó en `EntrenoActivo.tsx`. Se verificó visualmente que los valores (reps, kg) volvían a ser legibles y editables.

Tras el arreglo se repitió el flujo completo de principio a fin sin errores en consola: crear alimento manual, añadido rápido, Resumen con gráfico, crear rutina con ejercicio nuevo, entrenar desde rutina, editar series, terminar, ver detalle en Historial (con el volumen calculado correctamente) y ver el gráfico de Progreso.

## 11. Control de versiones

Se ejecutó `git init` en la carpeta del proyecto para tener el historial listo. **No se ha hecho ningún commit todavía**, a la espera de que Víctor lo pida explícitamente.

## 12. Modelo de Gemini desactualizado (404) tras probar con la key real

Víctor ya había probado la app con su API key real (fuera de estas sesiones) y le devolvía:

```
Error de Gemini (404). "This model models/gemini-2.5-flash is no longer available to new users.
Please update your code to use models/gemini-3.8-flash..."
```

El propio plan ya avisaba de este riesgo ("comprobar en ai.google.dev qué modelo flash gratuito está vigente al implementar"), porque Google retira modelos de Gemini con el tiempo. **Solución**: se cambió `DEFAULT_MODELO` en `src/db.ts` de `gemini-2.5-flash` a `gemini-3.8-flash` (el que el propio error de Google indicaba como reemplazo), y se actualizaron las cadenas equivalentes en `gemini.test.ts` por consistencia.

Como el campo "Modelo" de Ajustes es un texto libre editable, esto no rompe nada: quien ya tuviera guardado el modelo viejo solo tiene que escribir el nuevo nombre ahí (no hace falta borrar datos ni reinstalar).

**Verificación real**: se actualizó el modelo en el propio entorno de pruebas (que ya tenía la key real de Víctor guardada de una sesión anterior) y se repitió la llamada con el texto "2 huevos fritos y una tostada con aceite". Primero salió un 503 puntual ("modelo con mucha demanda ahora mismo", nada que ver con nuestro cambio), y al reintentar la llamada tuvo éxito: Gemini devolvió los 3 alimentos con sus macros, la pantalla de revisión los mostró editables, y al guardar los totales de "Hoy" se actualizaron correctamente (430 kcal, 20 g prot, 21 g carb, 29 g grasa). Las entradas de prueba se borraron después para no dejar basura en los datos reales de Víctor.

## 13. Qué queda pendiente (necesita credenciales de Víctor)

Según el propio plan, estos pasos no se podían completar sin cuentas externas:

1. ~~**API key de Gemini**~~: ✅ ya configurada por Víctor y verificada con una llamada real (ver punto 12).
2. **Cuenta de Cloudflare**: hacer login (`npx wrangler login`) y ejecutar `npm run build && npx wrangler pages deploy dist` para publicar la app en una URL propia con HTTPS.
3. **Prueba en el iPhone real**: una vez desplegada, abrir la URL en Safari, "Añadir a pantalla de inicio", y verificar ahí (no se puede hacer desde este PC): el micrófono real, el modo avión, y que las actualizaciones futuras se apliquen solas.

En cuanto tengas la cuenta de Cloudflare, decímelo y seguimos con esos dos puntos.

## 14. Nutrición v2 — Fase 0: red de seguridad antes de tocar nada

Se planificó la iteración siguiente de Nutrición en [`historico/plan-nutricion-v2.md`](./historico/plan-nutricion-v2.md) a partir de la lluvia de ideas de [`historico/ideas-nutricion-v2.md`](./historico/ideas-nutricion-v2.md). Antes de planificar, cada problema del documento de ideas se comprobó contra el código: P7 solo se confirmó en parte (la rejilla de añadido rápido no ordena por «editados», sino por «últimos tocados»), P9 tenía matices y aparecieron dos fallos nuevos (P11 y P12, más abajo).

Antes de cambiar una sola línea se prepararon dos cosas:

- **Un backup v1 de referencia** (`src/test/fixtures/backup-v1.json`), generado con el código *de la sesión 01* y datos sintéticos (4 alimentos, 9 entradas en 3 días, una rutina y un entreno). Se usa en los tests y en la prueba manual de importación, y garantiza que los backups antiguos siguen entrando.
- **Un origen de pruebas aparte**: todas las pruebas en el navegador se hacen en `http://appfit-test.localhost:5173` y no en `localhost:5173`. Para el navegador son orígenes distintos, así que cada uno tiene su propia IndexedDB, y los datos y la API key real que hay en `localhost` no se tocan. Esa base de datos de pruebas se queda en la versión 1 de Dexie a propósito, para probar después el upgrade real de la Fase 1.

Para testear la capa de datos sin navegador se añadió **`fake-indexeddb`** como devDependency: es una IndexedDB en memoria para Node, el estándar para testear Dexie, y no llega al bundle. Se carga en `src/test/setup-db.ts` (`setupFiles` de Vitest).

## 15. Reestructuración por funcionalidades

El código de Nutrición y lo compartido se reorganizó así (Gym se queda donde estaba; solo cambiaron sus imports):

```
src/app/                 App, BottomNav, Ajustes
src/shared/db/           db.ts (esquema), types.ts, settings.ts
src/shared/lib/          dates, format (round1), text (normalizeName), backup
src/shared/ai/           gemini.ts (cliente genérico)
src/shared/components/   Sheet, NumberStepper, VoiceRecorder, SegmentedControl, Toast
src/features/nutricion/  NutricionTab + pages/ components/ hooks/ data/ lib/
```

Decisiones:

- **Primero mover y después arreglar.** Los archivos se movieron con `git mv` (conserva el historial) y en un paso sin ningún cambio de contenido. Después se partió `db.ts` y se extrajeron componentes, siempre sin cambios visibles, y solo entonces vinieron los arreglos. Así cada diff se revisa por separado.
- **Imports relativos, sin alias** (`@/…`): habría obligado a tocar la configuración de Vite y de TypeScript para ganar solo estética.
- `getSettings()` ahora **completa con los valores por defecto** lo que falte en el registro guardado. Así, los campos nuevos de ajustes de fases posteriores (perfil, objetivos de descanso…) no necesitarán un `upgrade()` de Dexie. Sigue siendo de solo lectura: no reintroduce el `ReadOnlyError` del punto 10.
- La clase `AppFitDB` se exporta y acepta un nombre de base de datos para poder probar migraciones en los tests.
- `AnadirComida.tsx` pasó de 376 líneas a unas 150: `useInterpretarComida()` (un solo flujo para texto y audio, antes duplicado), `ItemRevisionCard`, `MacroInputs` (los 4 inputs por 100 g, antes duplicados con Alimentos), `QuickAddGrid` y `EntradaIA`.

## 16. Capa de repositorios

`features/nutricion/data/foodsRepo.ts` y `entriesRepo.ts` son lo único de Nutrición que toca `db.*`. Reglas:

- Las funciones de lectura **nunca escriben**, así que se pueden usar dentro de `useLiveQuery`.
- **Toda escritura de más de una fila va en `db.transaction(...)`** (arregla **P3**: antes, si fallaba el segundo alimento de una comida, el primero quedaba guardado). Hay un test que simula el fallo y comprueba que no queda nada.
- Dentro de una transacción de Dexie no puede haber `await` que no sean de Dexie (nada de `fetch`). Por eso la IA se llama siempre antes, en la revisión, y el guardado solo toca la base de datos.

## 17. Identidad de los alimentos por nombre (P4, P5, P11, P12)

Aquí estaban los fallos que más afectaban a los datos:

- **P4**: al reutilizar un alimento existente, siempre se marcaba como `manual` aunque no se hubiera tocado. Con el tiempo, todo acababa siendo «manual».
- **P5, peor de lo que decía el documento de ideas**: al guardar la edición de una entrada, se sobrescribía el alimento global con valores *reconstruidos desde el snapshot de la entrada* (redondeados y quizá obsoletos), aunque no se cambiara nada.
- **P11 (nuevo)**: renombrar un alimento en la revisión cambiaba su `nombre` pero **no su `nombreNorm`**, la clave única, que quedaba desfasada.
- **P12 (nuevo)**: en Alimentos, guardar un nombre que ya existía daba un `ConstraintError` sin capturar (el formulario no se cerraba y no salía ningún mensaje). Además, el buscador no ignoraba las tildes.

La solución es una regla única: **un alimento se identifica por su nombre normalizado**. La lógica vive en funciones puras de `lib/alimentos.ts`, con tests:

- `decidirGuardado(existente, item)` → `crear` / `reutilizar` (no se toca nada, ni la procedencia) / `actualizar` (el usuario cambió los valores: se corrigen y pasa a `manual`).
- Cada ítem de la revisión recuerda su **origen** (procedencia y valores iniciales). Si se guarda como alimento nuevo, será `manual` solo si el usuario cambió los valores. Si va a corregir un alimento ya guardado, la tarjeta lo avisa: «Actualizará el alimento guardado en «Alimentos»».
- Renombrar un ítem en la revisión lo convierte en **otro** alimento (se reutiliza si ese nombre ya existe o se crea si no), nunca renombra el guardado por accidente.
- **Editar una entrada solo cambia esa entrada** (decisión de Víctor). Una casilla «Aplicar también a «X» en Alimentos», desmarcada por defecto, permite corregir el alimento a propósito.
- `foodsRepo.crear/actualizar` recalculan `nombreNorm` y lanzan `NombreDuplicadoError` con un mensaje en español, que Alimentos y la edición muestran.
- `buscarPorNombre` es el único punto de búsqueda por nombre: los alias de la fusión de duplicados (E2, Fase 4) se añadirán ahí.

## 18. Medias reales en el Resumen (P1)

La media diaria dividía entre **todos** los días del periodo, futuros incluidos: a día 5 del mes salía unas 6 veces más baja de lo real. `resumenPeriodo(entries, fechas, hoy)` solo cuenta los días con al menos una entrada y fecha ≤ hoy, y el Resumen lo indica («De 3 días registrados»). Con los datos del fixture, la media del mes pasó de ≈ 56 a 559 kcal, que es lo que da el cálculo a mano.

## 19. Deshacer al borrar (P8)

Borrar una entrada en Hoy era inmediato. Ahora `entriesRepo.borrar` devuelve la entrada borrada, y un `Toast` de 5 s ofrece «Deshacer», que la vuelve a guardar con **el mismo id** (`bulkPut`). El toast deja libre la esquina del botón flotante «+» y queda por encima de la barra inferior.

## 20. Backup v2 (P9) y su regla de migración

El documento de ideas decía que los backups antiguos «dejarían de importarse»; en realidad eso solo pasaría si se exigiera la versión nueva. Los riesgos reales eran otros tres:

1. importar solo vaciaba las 7 tablas conocidas, así que una tabla nueva conservaría datos viejos tras importar;
2. los registros importados se saltan los `upgrade()` de Dexie;
3. importar sobrescribía la API key del móvil (y el backup la exportaba en claro).

El backup v2 (`shared/lib/backup.ts`):

- `migrarBackup(raw)` es una función pura que valida y convierte cualquier versión conocida a la actual (v1 → v2: mismos registros, solo se añaden metadatos: `dbVersion` e `incluyeApiKey`). Un backup de una versión más nueva se rechaza con un mensaje claro.
- Al importar se vacían **todas** las tablas (`db.tables`), no solo las conocidas.
- La API key **no se exporta por defecto** (casilla en Ajustes, desmarcada y sin guardarse). Al importar, si el móvil ya tiene una key, se conserva; si no, se usa la del backup.
- **Reglas para el futuro**, escritas también en `db.ts` y `backup.ts`: añadir una tabla nueva la hace *opcional* en el backup (si falta, se importa vacía) y no sube la versión. Cambiar la forma de los registros, o un `upgrade()` que transforme datos, obliga a añadir el paso equivalente en `migrarBackup`.

## 21. IA desacoplada y reintentos (P10)

`shared/ai/gemini.ts` ahora solo sabe hacer una llamada `generarJson({ apiKey, modelo, parts, schema })`: el fetch, los errores en español y los reintentos. El prompt, el schema y la validación de «interpretar comida» viven en `features/nutricion/lib/prompts/interpretarComida.ts`. Las tareas futuras (foto de etiqueta, foto del plato…) serán otro archivo de prompt, sin tocar el cliente.

Se adelantó a esta fase **P10** (decisión de Víctor): los 500/502/503/504 puntuales, como el 503 «modelo con mucha demanda» visto en la sesión 01, se reintentan 2 veces con esperas de 1 s y 3 s. Si siguen fallando, sale «Gemini está saturado ahora mismo. Prueba en unos segundos.». Un 429 (cuota agotada) no se reintenta. La espera se inyecta en los tests para que no tarden.

## 22. Carga diferida de las gráficas

`Resumen` (Nutrición) y `Progreso` (Gym, donde solo cambió esa línea de import) se cargan con `React.lazy`. Recharts sale del arranque: el chunk principal bajó de 738 kB a 366 kB y desapareció el aviso de «chunks > 500 kB». El service worker precachea también los chunks diferidos, así que la app sigue funcionando sin conexión.

## 23. Verificación end-to-end de la Fase 0

Probado en el navegador integrado en vista móvil (375×812), en el origen de pruebas. Gemini se simuló sustituyendo `fetch` solo para `generativelanguage.googleapis.com` (primero un 503 y después una respuesta válida) y con una clave ficticia en Ajustes, así que no hubo red real ni se gastó cuota. Resultados:

- Reintento: 2 llamadas separadas ~1 s, y la revisión usa los valores guardados de un alimento conocido.
- P4: reutilizar sin cambios mantiene `gemini`; cambiar las kcal muestra el aviso y lo deja en `manual`. P11: renombrar crea otro alimento y el original queda intacto.
- P5: sin la casilla solo cambia la entrada; con ella, también el alimento.
- P12: el mensaje de nombre duplicado aparece sin errores en consola, y «platano» encuentra «Plátano».
- P1: la media del mes es la de los 3 días registrados. P8: «Deshacer» recupera la entrada con el mismo id.
- P9: el export es `version: 2` y sin key; el **backup v1 de referencia se importó por el input real de archivo** y restauró exactamente los datos, conservando la key del móvil.
- Diseño: sin scroll horizontal en ninguna pantalla y todos los inputs de Nutrición a 16 px. Aquí apareció un fallo que ya existía: el nombre editable de la tarjeta de revisión tenía `text-sm` (14 px), que pisa la regla global y en iOS provoca zoom al tocarlo. Se corrigió a `text-base`. El `NumberStepper` compacto del Gym tiene el mismo problema, pero Gym quedaba fuera de esta iteración y queda anotado.

## 24. Nutrición v2 — Fase 1: esquema v2 y añadido rápido con buscador (A3)

- `db.version(2)` añade la tabla `meals` (plantillas, para A1) sin `upgrade()`: es una tabla nueva y vacía, y `Entry.rapida` (A5) es un campo opcional sin índice, así que los backups v1/v2 anteriores siguen entrando igual. Test de migración real: se crea una base de datos solo con v1, se llena, se cierra y se reabre con el código nuevo (`new AppFitDB(...)`), comprobando `verno === 2`, que los datos siguen intactos y que `meals` existe vacía.
- El añadido rápido (`QuickAddGrid`, en `AnadirComida`) muestra ahora los alimentos más usados en la comida actual en vez de solo los últimos tocados: `rankFrecuentes(entries, { comida, hoy })` en `features/nutricion/lib/alimentos.ts` puntúa cada alimento (3 si el uso fue en la misma comida, 1 si fue en otra, ventana de 60 días) y excluye las entradas sin alimento o marcadas `rapida`. Hay un buscador encima que ignora tildes (`filtrarAlimentos`, con `normalizeName`) sobre todos los alimentos guardados, no solo los frecuentes.
- Efecto colateral necesario: `entriesRepo.anadirDesdeAlimento` (añadido rápido) dejó de actualizar `updatedAt` del alimento, para que "frecuente en Nutrición" y "reciente en Alimentos" no se mezclen.

## 25. A5 — Kcal rápidas

- Nueva entrada sin alimento asociado (`Entry.rapida: true`, `gramos: 0`, sin `foodId`), para una comida fuera que no merece registrarse con detalle. `validarKcalRapidas` (`lib/alimentos.ts`) exige las kcal (> 0) y deja prot/carb/grasa opcionales (0 por defecto); si el nombre se deja vacío, usa «Comida fuera» (el mismo texto que el placeholder del campo).
- UI: botón «Kcal rápidas» en `AnadirComida`, junto al añadido rápido sin IA, que abre `KcalRapidasSheet`.
- **Decisión de flujo importante**: tocar una entrada `rapida` en Hoy no puede pasar por la pantalla de revisión normal, porque esa pantalla reconstruye los valores por 100 g dividiendo por los gramos (`por100DesdeEntrada`), y una entrada rápida tiene 0 g. `NutricionTab` detecta `entry.rapida` en `onEditarEntry` y abre directamente el mismo `KcalRapidasSheet` en modo edición (`entriesRepo.editarRapida`), sin tocar `AnadirComida` ni la revisión.
- Hoy la muestra sin «0 g», con los macros que no sean cero: «≈ 900 kcal · P40 · rápida».
- No hizo falta tocar `rankFrecuentes`: ya excluía las entradas `rapida` desde el punto 24 (A3), así que las kcal rápidas no ensucian los frecuentes del añadido rápido.

## 26. A2 — Copiar comida o día

- Lógica pura `planCopia(entries, destino, ahora)` en el nuevo `features/nutricion/lib/plantillas.ts` (que en A1 sumará la lógica de plantillas propiamente dicha): prepara el snapshot a insertar —mismos valores, alimento, `rapida`, etc., `createdAt` nuevo y sin `id`—; si `destino.comida` no se especifica, cada entrada conserva la suya (para "copiar el día entero" conservando cada comida).
- `entriesRepo.copiar({ origen, destino })` (atómico dentro de `db.transaction`) y `entriesRepo.borrarVarias(ids)` (borra varias y las devuelve, para poder deshacer con `restaurar`, igual que P8).
- En Hoy: el «⋯» de cada cabecera de comida abre un sheet con el formulario de copia (fecha destino con `<input type="date" max={hoy}>` y comida destino, por defecto la misma comida; en el punto 27 se convierte en el menú `AccionesComidaSheet`, con una segunda opción). El «⋯» de la cabecera de fecha abre `CopiarDiaSheet` (solo la fecha; conserva la comida de cada entrada). Tras copiar sale un toast «N entradas copiadas · Deshacer».
- Si una comida está vacía y el día anterior tiene entradas en esa misma comida, aparece el enlace «Repetir del día anterior (N)», que copia directamente sin abrir ningún sheet.
- El `Toast` de Hoy se generalizó: en vez de guardar las entradas a restaurar, guarda una función `onDeshacer` cualquiera (una closure), para reutilizar el mismo mecanismo al borrar una entrada y al deshacer una copia.
- **Corrección durante la verificación manual en navegador**: `<input type="date" max={hoy}>` no impide por sí solo que el valor programático supere `max` —el atributo solo restringe el selector nativo, no bloquea una escritura directa de `.value`—; se comprobó copiando a `hoy + 2` con el input, que se guardó sin avisar. Se añadió `fechaDestino > todayISO()` a la condición que deshabilita el botón «Copiar» en los dos sheets, así que no se puede confirmar una copia a un día futuro aunque se fuerce la fecha.

## 27. A1 — Plantillas

- **Lógica pura** en `features/nutricion/lib/plantillas.ts` (el mismo archivo de A2, tal como preveía el plan):
  - `itemsDesdeEntradas(entries)`: snapshot de cada entrada como `MealItem` (sin fecha/id/createdAt/textoOriginal), en objetos nuevos (nunca la misma referencia que la entrada de origen).
  - `resolverItemsPlantilla(items, foodsById)`: por cada ítem, si su `foodId` sigue existiendo en `foodsById` usa los valores **actuales** de ese alimento escalados a los gramos guardados (`macrosPorGramos`); si no (se borró, o el ítem es una «rápida» sin `foodId`), devuelve una **copia** del snapshot guardado en el ítem.
  - `entradasDesdePlantilla(meal, foodsById, destino, ahora)`: aplica `resolverItemsPlantilla` y da a cada resultado la fecha/comida de destino, `createdAt` nuevo y sin id.
  - Estas tres funciones siempre devuelven objetos nuevos, nunca el mismo objeto de entrada/ítem: hay un test explícito por función que muta el resultado y comprueba que el original (la entrada, el ítem de la plantilla, o `meal.items`) no cambia.
- **`foodsRepo.porIds(ids)`**: alimentos por id en una sola lectura (`bulkGet` + filtro), para resolver los ítems de una plantilla sin una consulta por alimento.
- **`mealsRepo.ts`** (nuevo, junto a `foodsRepo`/`entriesRepo`):
  - `listar()` (por `usadoAt` descendente), `obtener(id)`, `borrar(id)`.
  - `actualizar(id, { nombre?, items? })`: lectura + `put` dentro de una transacción (no `update`, porque el `UpdateSpec` de Dexie no tipa bien un reemplazo completo de un campo array como `items`).
  - `crearDesdeEntradas({ nombre, comida?, entries })`: una escritura; `usadoAt` se inicializa igual que `createdAt`, así la plantilla recién creada aparece la primera en la lista aunque no se haya usado nunca.
  - `aplicar(id, { fecha, comida })`: **tx rw meals+foods+entries**. Resuelve los ítems con los valores actuales (o el snapshot), inserta las entradas con `bulkAdd` e incrementa `usos`/`usadoAt`. Si la plantilla no existe o no tiene ítems, no hace nada (no cuenta como «uso»). Todo o nada: un fallo en la inserción no deja ni entradas nuevas ni `usos` incrementado.
- **UI — crear**: el «⋯» de una comida en Hoy pasó a abrir `AccionesComidaSheet`, un menú de dos pasos: «Copiar a otro día…» (el formulario de A2, sin cambios de comportamiento) y «Guardar como plantilla…» (pide un nombre, con el placeholder «Mi {comida} de siempre»). Guardar muestra el mismo tipo de toast que copiar («Plantilla «X» guardada», sin «Deshacer»: no hacía falta generalizar más el toast porque ya admitía una acción opcional desde A2).
- **UI — usar**: `PlantillasLista` (sección «Plantillas» en `AnadirComida`, encima del añadido rápido, ordenada por `usadoAt`; oculta si no hay ninguna). Al tocar una, `AplicarPlantillaSheet` resuelve los ítems en vivo (mismo `resolverItemsPlantilla` que usa `mealsRepo.aplicar`, así la vista previa nunca miente sobre lo que se va a guardar) y muestra cada alimento con sus gramos y kcal, el total, y un botón «Añadir a {la comida actual de AnadirComida}» (no la comida de origen de la plantilla, que es solo informativa).
- **UI — gestionar**: en Alimentos, `SegmentedControl` «Alimentos | Plantillas». La lista de plantillas abre `GestionPlantillaSheet`: renombrar, cambiar los gramos de un ítem (recalcula sus macros con la densidad implícita del propio snapshot del ítem —`por100DesdeEntrada`, reutilizado tal cual porque `MealItem` tiene la misma forma que necesita—, sin tocar el alimento en vivo ni volver a consultarlo), quitar un ítem, o borrar la plantilla entera. Los ítems «rápida» no muestran el stepper de gramos (no tienen gramos con sentido).
- **Aceptación verificada a mano**: se creó un alimento a 150 kcal/100g, se añadió a Desayuno (210 g) y se guardó como plantilla; se cambió el alimento a 200 kcal/100g en Alimentos; al aplicar la plantilla en Cena, la vista previa y la entrada guardada usaron 200 kcal/100g (no los 150 originales). Borrando después el alimento y aplicando la plantilla otra vez, se usó el snapshot guardado (sin errores en consola).
- **Bug de diseño encontrado y corregido en la verificación manual**: en `GestionPlantillaSheet`, la fila de cada ítem ponía el nombre+kcal (`min-w-0 flex-1`) en la misma fila que el `NumberStepper` y el botón de borrar; como estos dos últimos no tienen `min-w-0`, en 375 px se quedaban con todo el ancho y el nombre se quedaba a 0 px (visible solo un fragmento de la cifra de kcal). Se corrigió apilando nombre+borrar arriba y kcal+stepper abajo, en dos filas en vez de una.

## 28. D1 — Resumen navegable (P2)

- **`dates.ts`**: `PeriodoRango` (`'semana' | 'mes'`) y cuatro funciones puras:
  - `fechasPeriodo(rango, iso)`: reutiliza `weekDates`/`monthDates` según el rango.
  - `desplazarPeriodo(rango, iso, delta)`: en semana, `addDays(iso, delta * 7)`. En mes, **ancla siempre en el día 1 antes de cambiar de mes** (`new Date(year, month + delta, 1)`); si no se fija el día antes, desplazar desde el día 31 se desborda en los meses cortos (31 de enero + 1 mes con `setMonth` sin fijar el día caería en marzo, no en febrero, porque el día 31 no existe en febrero y JS lo normaliza al mes siguiente).
  - `etiquetaPeriodo(rango, iso)`: «22–28 sep» (semana dentro del mismo mes), «28 sep – 4 oct» (cruza de mes, sin año) o «septiembre 2026» (mes). La semana nunca muestra el año, ni siquiera al cruzar de diciembre a enero.
  - `esPeriodoActual(rango, iso)`: el periodo que contiene `iso` es el mismo que contiene hoy → no se puede avanzar más allá.
  - Tests (12 nuevos en `dates.test.ts`): cambio de mes desde el día 31 (enero→febrero sin saltarse a marzo, marzo→febrero al retroceder), diciembre→enero y enero→diciembre cruzando de año, semana que cruza de mes y de año en la etiqueta, y `esPeriodoActual` para impedir avanzar al futuro.
- **`Resumen.tsx`**: `fechaAncla` (estado, inicial `todayISO()`) sustituye a los `weekDates(todayISO())`/`monthDates(todayISO())` fijos. Cambiar de «Semana» a «Mes» (o viceversa) resetea `fechaAncla` a hoy, para no aterrizar en un periodo derivado raro al cambiar de rango tras navegar hacia atrás.
  - Fila «‹ {etiqueta} ›» con el mismo estilo que la navegación de fecha de `Hoy.tsx` (botones redondos 36 px). El botón «›» se deshabilita (`disabled:opacity-30`) con `esPeriodoActual`, igual que en `Hoy.tsx`.
  - **Nueva gráfica «Kcal por día»** (antes solo estaba la de macros) con `<ReferenceLine y={objetivos.kcal}>` marcando el objetivo.
  - **Bug encontrado en la verificación manual**: por defecto, una `ReferenceLine` de Recharts **no extiende el dominio del eje Y** aunque se le pase `ifOverflow="extendDomain"` — en la prueba, con kcal diarias de ~400 y un objetivo de 2200, la línea se dibujaba fuera del área visible del gráfico (coordenadas Y negativas) y no llegó a verse. Se corrigió en su lugar fijando el propio `domain` del `YAxis`: `domain={[0, (dataMax) => Math.max(dataMax, objetivos.kcal)]}`, así el eje siempre llega al menos hasta el objetivo. Verificado con capturas: la línea aparece en 2200 kcal aunque los datos reales del fixture sean mucho más bajos.
  - La tarjeta «Media diaria» ahora muestra «valor / objetivo» para las 4 métricas (antes solo el valor), igual que hace `MacroBar` en Hoy.
- **Verificado a mano en el origen de pruebas (375×812)**: navegación semana atrás/adelante con la etiqueta correcta y «›» deshabilitado en el periodo actual; cambio a «Mes» resetea al mes actual; retroceder dos meses desde septiembre pasa por agosto (31 días) sin saltarse ningún mes; sin scroll horizontal (`scrollWidth === innerWidth === 375`) y sin errores en consola en ningún paso.

## 29. Verificación E2E de la Fase 1 (§7 del plan) y cierre de fase

Con D1 terminado, se hizo la verificación conjunta de toda la Fase 1 que pedía el plan (§7, «Tras la F1»), en un origen de pruebas nuevo (`http://appfit-upgrade.localhost:5173`) para no tocar ni el origen de pruebas de la Fase 0 ni los datos reales de `localhost`.

1. **Upgrade real v1→v2**: se creó a mano, con la API cruda de IndexedDB (sin pasar por Dexie), una base de datos `appfit` en la versión 10 que replica exactamente el esquema `version(1)` de `db.ts` (mismos object stores, key paths e índices, incluido el índice compuesto `[exerciseId+createdAt]`), con datos de prueba en las 5 tablas con datos (`foods`, `entries`, `settings`, `exercises`, `routines`). Al cargar la app real (que declara `version(2)`), Dexie hizo el upgrade en caliente a la versión 20: `meals` apareció vacía, el resto de tablas conservó sus recuentos exactos, y la UI (Hoy, con el día siguiente al de los datos de prueba) mostró las entradas migradas correctamente. Sin errores en consola.
2. **Importar `backup-v1.json` bajo el esquema v2**: con esa misma base ya en v2, se importó el fixture v1 (idéntico a `src/test/fixtures/backup-v1.json`) por el input real de archivo (`DataTransfer` + evento `change`, como en la Fase 0). Mensaje «Backup importado correctamente», los recuentos de todas las tablas pasaron a coincidir exactamente con el fixture (9 entries, 4 foods, 2 exercises, 1 routine, 1 workout, 5 sets) y `meals` quedó vacía (el backup v1 no la trae, y al importar se vacían todas las tablas, conocidas o no). La API key del móvil (`clave-ficticia-v1`) se conservó porque el backup traía `apiKey: ''` (regla P9).
3. **A3**: en «Añadir comida», «Frecuentes en el snack» mostró los 4 alimentos usados; el buscador encontró «Plátano» escribiendo «platano» sin tilde.
4. **A5**: se creó una entrada «Kcal rápidas» (900 kcal, P40) desde Snack; se vio en Hoy como «≈ 900 kcal · P40 · rápida» sin «0 g», sumó bien a los totales del día, y tocarla volvió a abrir el mismo sheet (no la revisión normal) con los valores precargados.
5. **A2**: «Repetir del día anterior» copió la entrada esperada con el toast «1 entrada copiada · Deshacer»; deshacer la quitó y los totales bajaron a lo que había antes (comprobado con dos ejecuciones: deshacer dentro de los 5 s revierte, y dejar pasar los 5 s deja el borrado/copia en firme, regresión de P8 confirmada de paso). El menú «⋯ → Copiar a otro día…» copió correctamente a la fecha y comida elegidas. Se repitió también la comprobación de la Fase 1 de que forzar una fecha futura en el input (vía JS, saltándose el `max` del picker) mantiene el botón «Copiar» deshabilitado.
6. **A1**: se guardó «Comida» del día como plantilla («Mi comida de prueba»), se aplicó desde «Añadir comida» (vista previa con el total correcto) a Snack. Se cambió después el alimento «Yogur natural» de 61 a 100 kcal/100 g en Alimentos y se volvió a abrir la vista previa de la misma plantilla: pasó de 76 a 125 kcal para los mismos 125 g, confirmando que usa el valor **actual** del alimento, no uno congelado.
7. **D1**: ya verificado en el punto 28, en el origen de pruebas de la Fase 0.
8. **Backup v2 con `meals`**: se interceptó `URL.createObjectURL` para capturar el JSON que genera el botón «Exportar» sin depender de la descarga real del navegador. El backup incluyó `version: 2`, `meals` con la plantilla creada en el punto 6, y `apiKey: ''` (casilla «Incluir la API key» desmarcada). Ese mismo JSON se reimportó por el input real de archivo: todos los recuentos de tabla (incluida `meals`) coincidieron exactamente con los del export, y la API key del móvil se conservó. Sin errores en consola ni scroll horizontal en ningún paso de toda la verificación (`scrollWidth === innerWidth === 375`).

**Conclusión**: 167 tests en verde, `npm run build` sin errores, y el checklist completo de §7 pasado sin encontrar ningún bug nuevo (los únicos bugs de esta sesión —el `ReferenceLine` de D1 y el bug de infraestructura que cortó la sesión anterior— ya están descritos y corregidos). **Fase 1 (Nutrición v2) dada por terminada.** Sigue sin haber ningún commit; todo el trabajo de Fase 0 y Fase 1 está en el árbol de trabajo, pendiente de que Víctor lo revise y decida cuándo commitear.

## 30. Gym a `features/`, repositorios de Gym y patrón de borrado

Gym era lo último que seguía en la estructura antigua (`src/pages`, `src/lib`). Ahora vive en `src/features/gym/` con la misma forma que Nutrición: `GymTab.tsx`, `pages/` (GymHome, Rutinas, Historial, Progreso, EntrenoActivo), `lib/workout.ts` (+ test) y `data/`. Las carpetas `src/pages` y `src/lib` desaparecen.

1. **Repositorios de Gym** (`features/gym/data/`): `exercisesRepo` (`obtenerOCrear` atómico por `nombreNorm`), `routinesRepo` (listar, obtener, guardar, borrar), `workoutsRepo` (activo, terminados, listar, empezar, terminar) y `setsRepo` (todas, delWorkout, delEjercicio, agregar, agregarConEjercicio, actualizar, borrar, restaurar). Tests en `gymRepos.test.ts`.
   - `workoutsRepo.empezar` es transaccional: si ya hay un entreno activo devuelve ese, así un doble toque no crea dos activos.
   - `setsRepo.agregar` calcula el `orden` (máximo + 1) dentro de la transacción, y toma reps/peso de la última serie del ejercicio con el índice `[exerciseId+createdAt]`; un doble toque en «Serie» ya no repite orden. La lógica pura está en `lib/workout.ts` (`valoresNuevaSerie`, `siguienteOrden`). `agregarConEjercicio` crea el ejercicio (si no existe) y la serie en una sola transacción.
2. **La regla de acceso a `db` ya cubre todas las features**: solo `features/*/data/*Repo.ts` importa `db`. Lo vigila `shared/db/acceso.test.ts`, cuya regex detecta también `import()` dinámico.
3. **`useAviso`** (`shared/hooks/useAviso.tsx`, carpeta nueva): devuelve `{ avisar, avisarError, toast }` y soporta `onDeshacer` (si deshacer falla, avisa del error). `Hoy.tsx` se migró a él sin cambiar su comportamiento. El Toast queda por debajo de los Sheet (z-40 frente a z-50), por eso dentro de un Sheet los errores se muestran en línea con `ErrorState`.
4. **Regla de borrado, decidida por Víctor**: rutinas y plantillas → confirmación previa con el nuevo primitive `ConfirmacionDestructiva`; filas sueltas (series, entradas, alimentos) → borrado inmediato con aviso «Deshacer». Implementado en: serie (`EntrenoActivo`, `setsRepo.borrar` devuelve la serie y `restaurar` la repone), alimento (`foodsRepo.borrar` ahora devuelve el `Food` y `foodsRepo.restaurar` lanza `NombreDuplicadoError` si entretanto se creó otro con el mismo nombre), rutina (`Rutinas`) y plantilla (`GestionPlantillaSheet`). Las entradas de Hoy ya tenían deshacer. Ver [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) («Patrón de borrado»).
5. **Errores**: todas las escrituras de Gym van con `try/catch` (toast de error fuera de sheets, `ErrorState` dentro); el borrado de alimento y de plantilla muestra el error en línea.
6. **Sin cambios de esquema Dexie ni de backup**: el esquema de Gym es idéntico y `migrarBackup` ya cubre sus tablas.

**Verificación**: 285 tests, `tsc -b` y build en verde. Prueba en navegador (Edge headless por CDP, origen `http://appfit-test.localhost:5173`, 375×812): 26/26 comprobaciones OK (doble toque en entreno → 1 activo; doble toque en Serie → órdenes distintos; borrar/deshacer serie y alimento conservando el id; confirmar y cancelar en rutina y plantilla; avisos de error forzando fallos de IndexedDB; sin scroll horizontal).

**Pendiente observado (preexistente, no tocado)**: en `EntrenoActivo` a 375 px los `NumberStepper` compactos no muestran el valor numérico (campo muy estrecho); y en Rutinas sale «1 ejercicios» sin singular.

## 31. food-database, Fase 1: esquema v3 y repositorio del catálogo

Primer paso para tener un catálogo de alimentos local (de referencia, separado de los alimentos propios de Víctor). Esta fase solo prepara datos: no hay UI, ni Gemini, ni dependencias nuevas, y no se importa ningún dataset.

1. **Dexie v3** (`shared/db/db.ts`): tablas nuevas `catalogFoods` (`&id, *tok, gtin, fuente`) y `catalogSources` (`&id`), más el índice `entries.catalogId` (la tabla `entries` se redeclara entera, como exige Dexie). **Sin `upgrade()`**: Dexie crea tablas e índices al abrir y no toca los registros existentes; lo cubren los tests de migración v2→v3 y v1→v3. Decisiones: no se indexa `grupo` (duplicados; queda para una fase futura) y se pospusieron `foodPrefs` y `aliases` (una tabla nueva más adelante tampoco necesita `upgrade()`).
2. **Tablas de usuario vs. de catálogo**: constantes exportadas `TABLAS_USUARIO` y `TABLAS_CATALOGO`; un test exige que toda tabla del esquema esté en una de las dos.
3. **Backup** (`shared/lib/backup.ts`): exportar, importar y `borrarTodosLosDatos` operan solo sobre `TABLAS_USUARIO` (antes `db.tables`). El catálogo no entra en el backup, ni se pisa al importar, ni se borra con «borrar todo»: se puede volver a descargar. `BACKUP_VERSION` sigue en 2 porque los campos nuevos son opcionales.
4. **Tipos** (`shared/db/types.ts`): `CatalogFood`, `CatalogSource`, `Entry.catalogId?` y `MealItem.catalogId?`. En `nutrientes` (por código) clave ausente = desconocido y `0` = conocido. Los ids son `fuente:idExterno`. Invariante: una entrada/ítem referencia como mucho uno de `foodId` o `catalogId`; `shared/db/foodRef.ts` lo encapsula (`FoodRef`, `refDe`, `camposDeRef`, `catalogId`, `normalizarGtin` → GTIN-13).
5. **`features/nutricion/data/catalogRepo.ts`**: `obtener`, `porIds`, `buscarPorGtin`, `buscar` (prefijo con `where('tok').startsWith(guía).distinct().and(resto de tokens).limit(n)`: cursor sobre el índice, sin `toArray` global, sin tope de candidatos —el primer diseño con 300 candidatos podía ocultar coincidencias con prefijos frecuentes— y sin ranking: devuelve las primeras `n` en orden de índice; se revisará al medir 5.000–10.000 alimentos en WebKit real), `guardarLote` (por lotes con `bulkPut`), `borrarVersionesAntiguas`, `borrarFuente`, `borrarCatalogo`, `fuentes`, `guardarFuente`, `contar`. `distinct()` es necesario porque un índice multiEntry devuelve la fila una vez por cada token coincidente; `tokenizar` usa `normalizeName` (ñ→n, solo para buscar; `nombre` y `nombreOriginal` se guardan intactos) y separa por lo que no sea letra/número Unicode. Test de propagación de `catalogId` por los repos reales (copiar → plantilla → editar → aplicar) y comprobación en la IndexedDB migrada de que existen los índices nuevos. La búsqueda de catálogo no usa `useLiveQuery`.
6. **Copiar/plantillas**: `planCopia`, `itemsDesdeEntradas` y `entradasDesdePlantilla` (`lib/plantillas.ts`) propagan `catalogId`.

**Verificación**: 318 tests, `tsc -b` y build en verde. Sin commits.


## 32. food-database, Fase 2: paquete CIQUAL y descarga automática

Segunda fase del catálogo: hay datos reales (CIQUAL) y la app los instala sola. Sin dependencias nuevas ni cambios de esquema Dexie ni de `backup.ts`. La búsqueda desde la UI queda para la fase siguiente.

**2a — Tubería offline (`scripts/catalogo/`)**

1. **Qué es**: scripts de Node (type stripping, sin dependencias; `npm run catalogo:ciqual -- extraer|construir`) que convierten los XML de CIQUAL 2025 (ANSES; entrepôt data.gouv, licencia Etalab 2.0, ver `scripts/catalogo/README.md`) en un paquete JSON estático en `public/catalogo/`. Es una herramienta manual: no forma parte del build ni de la app, y `scripts/catalogo/raw/` (los XML, ~70 MB) va en `.gitignore`. La lógica pura está en `ciqualLib.ts` con tests.
2. **Datos**: 3.484 alimentos, 161 descartados por no tener kcal, proteína, glúcidos o lípidos conocidos (mejor no tener el alimento que mostrarlo con ceros falsos) → **3.323 filas**. Nutrientes por 100 g y localizados por nombre en `const.xml`, no por código ni posición. Convenciones: coma decimal; vacío o `-` = desconocido (la clave se omite); `traces` = 0; `< x` = x/2; redondeo a 1 decimal. Extras solo si se conocen: `fibra`, `azucares`, `sal`, `agSat`. `completitud` no se guarda en el paquete: se deduce como (4 + nº de claves de `nutrientes`) / 8.
3. **Formato**: `manifest.json` (`formato: 1`, lista de fuentes con `id`, `version`, `archivo`, `filas`, `licencia`, `atribucion`) y un JSON por fuente con filas-array `[idExterno, nombre, nombreOriginal, categoria, kcal, prot, carb, grasa, nutrientes?, alias?]` (más compacto que objetos: **626 KB, ~128 KB gzip**). La versión es `2025-es1` (año de CIQUAL + sufijo de traducción, para poder republicar solo los nombres). Los 12 grupos de CIQUAL se mapean a categorías en español (`CATEGORIAS_CIQUAL`).
4. **Traducción por lotes con Claude**: los nombres franceses se traducen al español de España en tres partes (`raw/traducciones-parte-*.csv`, que se fusionan en `ciqual/traducciones.csv`, `code;nombre_es;alias`), siguiendo la guía `scripts/catalogo/GUIA-TRADUCCION.md` (estilo CIQUAL «sustantivo, descriptores», equivalencias de cocina y pescados, alias solo para sinónimos reales). `construir` falla listando los códigos sin traducir. Los `code` de CIQUAL son estables, así que en una versión futura solo hay que traducir los códigos nuevos.
5. **Arreglo de `nombres.csv`**: el registro 24230 traía un salto de línea entre comillas en el nombre inglés y el CSV tenía 3.325 líneas físicas en vez de 3.324. `construirAlimentos` ya limpiaba los nombres (`limpiarNombre`) y el CSV estaba desactualizado; ahora `nombresCsv` también los limpia (test) y se ha regenerado (cabecera + 3.323 = 3.324 líneas; también desaparecen algunos dobles espacios).

**2b — Descarga e importación en la app**

1. **`lib/catalogo/paquete.ts`** (puro): tipos mínimos duplicados de los de `scripts/` (la app no importa de `scripts/`), `validarManifest`, `validarPaquete` y `aCatalogFoods`. Se valida todo lo descargado antes de tocar la base (formato 1, campos, números finitos y no negativos, ids repetidos, claves de `nutrientes` conocidas, `archivo` del manifest como nombre simple sin rutas). `id` = `catalogId('ciqual', idExterno)`; `tok` sale de nombre + alias (no del nombre francés, para no ensuciar la búsqueda); `tipo: 'generico'`. Un test valida además el paquete real de `public/catalogo/` contra su manifest.
2. **`tokenizar`** se mueve de `catalogRepo` a `shared/lib/text.ts`, junto a `normalizeName`: ahora lo usa también la conversión del paquete, que no debe depender de un repositorio.
3. **`catalogRepo.importarFuente(meta, foods)`**: `guardarLote` → `borrarVersionesAntiguas` → `guardarFuente`, en ese orden. La fuente se anota **al final** a propósito: si la importación se interrumpe (cierre de la app, cuota) la fuente no consta como instalada y se reintenta en el siguiente arranque; es idempotente por `bulkPut`. No hay una transacción única porque un paquete grande no cabe en una (`guardarLote` ya escribe por lotes). Solo toca filas de `meta.id`: rechaza filas de otra fuente y no toca `off` ni las tablas de usuario.
4. **`lib/catalogo/sincronizar.ts`**: `crearSincronizador(deps)` con `fetchJson`, `fuentesInstaladas`, `importarFuente` y `ahora` inyectados (tests sin red). Descarga el manifest con `cache: 'no-cache'` (el precache de Workbox no incluye `.json`; así siempre se revalida), y solo para las fuentes cuya versión difiere de la instalada descarga el paquete, lo valida, comprueba que coincide con el manifest (fuente, versión y nº de filas: un paquete cortado no sustituye lo instalado) y lo importa. Los `fetch` van siempre fuera de transacciones. Un cerrojo en memoria hace que dos llamadas simultáneas (arranque + botón de Ajustes) compartan la promesa; se libera también tras un error. Solo toca las fuentes del manifest. `sincronizarCatalogo` es la instancia cableada con `fetch` y `catalogRepo`.
5. **Arranque** (`main.tsx`): tras `ensureSettings()`, a los ~2 s y con el navegador ocioso (`requestIdleCallback`; Safari iOS no lo tiene y lanza sin más), solo si `navigator.onLine`; los errores se ignoran en silencio (se reintenta en el siguiente arranque). No bloquea el primer render.
6. **Ajustes** (`components/CatalogoAjustes.tsx` + `lib/catalogo/textos.ts`): sección «Catálogo de alimentos» con las fuentes instaladas (nombre legible, versión, nº de alimentos, leído con `useLiveQuery` de `catalogSources`), la atribución que exige la licencia, «Buscar actualización» (resultado en línea: «Actualizado a …», «Ya está al día» o `ErrorState`) y «Borrar catálogo» con `ConfirmacionDestructiva` (no afecta a los datos del usuario; se vuelve a descargar). «Borrar todos los datos» sigue sin tocar el catálogo (`TABLAS_CATALOGO`).

**Verificación**: `npm run test` y `npm run build` en verde. Falta la prueba en navegador (origen de pruebas) de la descarga real en Safari/iPhone.

## 33. food-database, Fase 3: buscar y añadir desde el catálogo

El catálogo ya se usa: en «Añadir comida» el buscador encuentra tus alimentos y los del catálogo, y se añaden con un toque, sin IA y sin conexión. Sin dependencias nuevas ni cambios de esquema Dexie ni de `backup.ts`.

1. **Consultas** (`shared/lib/text.ts`): `tokensConsulta` quita las palabras vacías («de», «con», «la»…; «sin» no, porque cambia el alimento) y pasa cada palabra a una raíz singular aproximada (`singular`: «lentejas» → «lenteja», «limones» → «limon», «nueces» → «nuez»). Como la búsqueda es por prefijo, basta con que la raíz sea prefijo del singular. `catalogRepo.buscar` la usa, así que «pechuga de pollo» ya encuentra «Pollo, pechuga…» y «lentejas» encuentra «Lenteja…».
2. **Ranking** (`lib/catalogo/ranking.ts`, puro): `buscar` devuelve en orden del índice (id), no por relevancia, así que se piden 300 candidatos (con CIQUAL, el prefijo habitual más frecuente, «queso», tiene unas 250 filas) y `rankCatalogo` los ordena: nombre exacto > empieza por la consulta como palabras completas (antes que como prefijo: «pan» antes que «panceta») > el primer tramo del nombre (hasta la coma) es la consulta («Pollo, carne cruda» antes que «Pollo a la vasca, envasado») > más palabras enteras > coincidencias más al principio > nombre más corto > más completo > fuente (`PRIORIDAD_FUENTE`, preparado para USDA) > alfabético. Un test de regresión ordena el paquete real publicado y comprueba el primer resultado de búsquedas típicas (pollo, arroz, plátano, leche semi, huevo(s), pechuga de pollo, pan, lentejas).
3. **`hooks/useBusquedaCatalogo`**: espera de 150 ms entre teclas, descarta respuestas que llegan tarde y mantiene los últimos resultados mientras llega la siguiente (sin parpadeo). No usa `useLiveQuery` (el catálogo no cambia mientras se escribe).
4. **`AlimentoElegible`** (`lib/alimentos.ts`): `{ ref: FoodRef, nombre, detalle?, …por100 }`, lo que se puede elegir para añadir, sea tuyo o del catálogo (`elegibleDeFood` / `elegibleDeCatalogo`; `detalle` = categoría). `claveRef` (`shared/db/foodRef.ts`) da una clave de texto que no confunde un id propio con uno del catálogo.
5. **Frecuentes con catálogo**: `rankFrecuentes` devuelve `FoodRef[]` y cuenta tanto `foodId` como `catalogId` (una entrada que incumple el invariante se ignora en vez de romper la lista). `foodsRepo.frecuentes` resuelve ambos (`porIds` + `catalogRepo.porIds`), descarta los que ya no existen (alimento borrado, catálogo borrado o actualizado sin ese id) y completa con tus recientes.
6. **`entriesRepo.anadirDesdeCatalogo`**: entrada con `catalogId` y el snapshot de sus valores; **no crea ningún alimento en «Alimentos»** (decisión de la Fase 1: la referencia al catálogo es blanda y el snapshot hace que la entrada no dependa de él). Editar después esa entrada solo cambia su snapshot; «Aplicar también a…» sigue siendo solo para alimentos propios.
7. **UI** (`components/AlimentosRapidos.tsx`, `pages/AnadirComida.tsx`): el buscador aparece siempre (antes se ocultaba sin alimentos propios), «Buscar alimento…». Sin búsqueda: «Frecuentes en …» (propios y del catálogo). Con búsqueda: bloque «Tus alimentos» y bloque «Catálogo» (nombre a 2 líneas, categoría debajo, kcal/100 g). Si el catálogo aún no se ha descargado, un `EmptyState` lo explica. El Sheet de gramos es el mismo para ambos (`gramosRapido` pasa a llevar un `AlimentoElegible`).

**Verificación**: 418 tests y `npm run build` en verde. Víctor lo revisó en el origen de pruebas a 375×812 (buscador, dos bloques, estados vacíos): OK. Falta medir la búsqueda en Safari/iPhone con el catálogo completo. Siguiente: `docs/progreso/sesion-04/handoff-fases-4-5.md`.

## 34. food-database, Fase 4: intérprete local (texto y dictado, sin IA)

«Interpretar» ya no necesita Gemini ni conexión para las frases típicas. El dictado lo pone el micrófono del teclado de iOS (escribe el texto), así que no hace falta audio. Sin cambios de esquema Dexie ni de `backup.ts`: el origen de catálogo usa `fuente: 'manual'` (no se amplía `FuenteAlimento`).

1. **Lógica pura** en `lib/interprete/` (con tests):
   - `parsear.ts`: frase → `ParteComida { texto, cantidad?, unidad?, nombre, consulta }`. Separa por `,` (no la decimal), `;`, `+`, salto de línea, punto seguido, «y»/«e» (no «y medio»); **no por «con»** («arroz con pollo» es un plato). Números: cifras, coma decimal, `1/2`, `½`, «un/una», «medio/media», «un cuarto», «dos»…«doce», «un par de», «media docena», «1 y medio». Cantidad al principio o al final («arroz 200 g»). Un número ≥ 20 sin unidad son gramos («arroz 200»). `consulta` = `tokensConsulta(nombre)` (no replica la lógica de singular). Corpus de ~45 frases en `parsear.test.ts`.
   - `unidades.ts`: g, kg, ml, cl, l (ml ≈ g) y medidas caseras (cucharada 15, cucharadita 5, vaso 200, taza/bol 250, rebanada 30, puñado 30, lata 80, loncha 20, cazo/scoop 30, plato 250, ración 150, chorrito 10).
   - `raciones.ts`: tabla curada (~45) con peso por unidad (huevo 60, plátano 120, manzana 180, yogur 125…), medidas por alimento (lata de atún 60, de cerveza 330; loncha de jamón 15) y, para palabras cuyo primer resultado del ranking no es el habitual, un **alimento preferido** de CIQUAL («huevo» → Huevo crudo y no «en polvo»; «pasta» → Pasta seca y no «de almendra»; «macarrones» → pasta). Se busca por la consulta con `mismaRaiz` (nuevo en `shared/lib/text.ts`: «tomat» = «tomate»). Sin dato: 100 g por unidad y `gramosEstimados`.
   - `emparejar.ts`: gana **uno tuyo con coincidencia fuerte** (todas las palabras y el nombre empieza por una); si no, el catálogo (preferido o primero del ranking, con las formas procesadas —polvo, deshidratado, concentrado…— detrás salvo que se nombren); si no, uno tuyo débil. Hasta 5 alternativas. Un test contra el paquete real comprueba 16 frases típicas y que los preferidos existen.
2. **Modelo de revisión** (`lib/alimentos.ts`): `OrigenItem.catalogId?`/`alternativas?`, `ItemRevision.gramosEstimados?`/`sinCoincidencia?`, `ItemGuardado.catalogId?`. `aItemGuardado` solo pone `catalogId` si nombre normalizado y valores siguen iguales; si no, alimento propio `manual` como siempre. Nuevas: `itemDesdeElegible`, `itemSinCoincidencia`, `faltanValores` (no se guarda un «no encontrado» sin valores), `procedencia` (tuyo / catálogo / estimado por IA).
3. **`entriesRepo.guardarComida`**: un ítem con `catalogId` → entrada con `catalogId`, sin `foodId` ni `resolverParaGuardar` (no crea ni toca `Food`). Test del invariante de `foodRef`.
4. **Hook** `useInterpretarLocal`: parsear → por parte, `foodsRepo.buscar` + `catalogRepo.buscar(consulta, 300)` (+ el preferido por id) → `rankCatalogo` → `emparejar` → `ItemRevision[]`. Sin `useLiveQuery`.
5. **UI**: `EntradaIA` → botón principal «Interpretar» (local); «Con IA» secundario y el micrófono de grabación **solo con API key**; placeholder que sugiere el dictado. `ItemRevisionRow`: etiqueta de procedencia (Tuyo, CIQUAL, Estimado), «Cambiar», avisos de gramos estimados y de no encontrado. `CambiarAlimentoSheet`: otras opciones + buscador. `ListaElegibles` y `ResultadosBusqueda` salen de `AlimentosRapidos` para reutilizarlos. El flujo de Gemini (`revisarItems`, `useInterpretarComida`) y el de editar una entrada no cambian.

**Verificación**: tests y build en verde. Pendiente la prueba en navegador de Víctor (origen de pruebas, modo Offline).

## 35. food-database, Fase 5: código de barras con Open Food Facts

Escanear un producto de marca y añadirlo. A Open Food Facts **solo se le envía el código de barras**.

1. **Escáner**: `barcode-detector` 3.2.2 (polyfill de `BarcodeDetector` sobre `zxing-wasm`; Safari iOS no lo trae). Se carga con `import()` solo al abrir el escáner (`lib/escaner/detector.ts` → `zxing.ts`). El `.wasm` se sirve **desde el propio origen**: `prepareZXingModule({ overrides: { locateFile } })` con `zxing-wasm/reader/zxing_reader.wasm?url` (no jsDelivr). `zxing-wasm` se fija a la versión exacta que pide `barcode-detector` (3.1.3) y un test lo vigila. Tamaños en el build: chunk `zxing` 43 KB (15 KB gzip), precacheado; `.wasm` 1.093 KB (464 KB gzip), **fuera del precache** (decisión recomendada en el handoff: la instalación no crece y el escáner casi siempre necesita red para OFF), con una regla `CacheFirst` de Workbox que lo guarda la primera vez y después funciona sin conexión. Formatos: EAN-13/8, UPC-A/E.
2. **`components/EscanerCodigo.tsx`** (Sheet): `getUserMedia({ video: { facingMode: 'environment' } })`, análisis cada 200 ms, **apaga los tracks al desmontar o al detectar**, mensajes según el error (permiso denegado, sin cámara, cámara ocupada, sin HTTPS, lector sin cargar) y **siempre** input manual (`inputMode="numeric"`, 16 px). Botón con icono `barcode` junto al buscador de «Añadir comida».
3. **Flujo** (`lib/off/buscarProducto.ts`, dependencias inyectadas): `normalizarGtin` → `catalogRepo.buscarPorGtin` (un producto ya escaneado funciona sin conexión) → si no, `fetch` a `api/v2/product/{gtin}.json?fields=…` con `AbortSignal.timeout(10 s)`, fuera de transacciones → `mapearProducto` → completo: `catalogRepo.guardarProductoOff` y Sheet de gramos de la Fase 3; incompleto: revisión con lo conocido (`itemDeProductoIncompleto`, acaba como alimento propio `manual`); no encontrado: «Escribir valores» o «Kcal rápidas»; error de red: mensaje que dice qué hacer.
4. **`lib/off/mapearProducto.ts`** (puro): `CatalogFood { id: off:{gtin13}, fuente: 'off', tipo: 'marca', marca, gtin, version: 'live', tok: nombre + marca }`. Nombre `product_name_es` > `product_name`. kcal de `energy-kcal_100g` o kJ ÷ 4,184. Nutrientes con las claves de CIQUAL (`fibra`, `azucares`, `sal`, `agSat`); ausente = desconocido, nunca 0. Acepta cifras en texto y descarta negativas.
5. **`catalogRepo.guardarProductoOff`**: `put` + `CatalogSource` `off` (ODbL, «Open Food Facts») con el número de productos, en una transacción sin red. La sincronización del paquete solo toca las fuentes del manifest: test con un producto escaneado que sobrevive a una versión nueva de CIQUAL. Ajustes muestra «Open Food Facts · N productos escaneados»; «Borrar catálogo» también los borra (se vuelven a consultar al escanear). En listas, el detalle de un producto de marca es su marca.

**Verificación**: tests y build en verde. Pendiente: prueba en navegador simulando OFF (origen de pruebas, webcam y entrada manual) y, tras un deploy HTTPS, 3 productos reales en el iPhone.

## 36. Pantalla Inicio, registro de peso (esquema v5) y comidas en Card

Rama `feat/mejorar-home`. La app arranca en una pantalla general de **Inicio** (primera pestaña) y las comidas de Nutrición → Hoy dejan de ser una lista plana.

1. **Tabla `pesos` (Dexie v5)**: `{ id, fecha, kg, createdAt }` con `&fecha` único (un pesaje por día; registrar de nuevo el mismo día sobrescribe). Tabla nueva y vacía, sin `upgrade()`. Entra en `TABLAS_USUARIO` y en el backup como tabla opcional (`pesos?`; un backup antiguo la importa vacía). **`BACKUP_VERSION` no sube** (no cambia la forma de ningún registro existente).
2. **`features/inicio/`**: `InicioTab` (cabecera con la fecha, `ResumenDiaCard`, `PesoCard`, `RegistrarPesoSheet`), `data/pesosRepo.ts` (`delRango` de solo lectura; `registrar` = upsert por fecha en transacción) y `lib/peso.ts` puro (`validarPeso` 20–300 kg a 1 decimal, `tendenciaPeso`, `puntosSparkline`). La variación a 7 días compara el último pesaje con el último cuya fecha sea ≤ la suya − 7; sin ese pesaje no se muestra. La mini gráfica de 30 días es un SVG propio: **Recharts no entra en Inicio** (sigue en su chunk perezoso). Borrar pesajes queda fuera de esta versión.
3. **`ProgressRing`** (primitive nuevo): el carril de `ProgressBar` en forma de anillo (pista, relleno, marca de meta, exceso atenuado, dominio `max(objetivo, valor)`). La geometría es pura: `shared/design/carril.ts` (`tramosCarril`). La frase de kcal («Quedan 312 kcal») se extrae a `fraseKcal` en `nutrition.ts` y la comparten `KcalDia` y el resumen de Inicio.
4. **Navegación**: `Tab` gana `'inicio'` (primero, icono `home`) y es la pestaña por defecto; «Ver día» lleva a Nutrición.
5. **Comidas en Card**: `ComidaSection` pasa a una Card por comida con cabecera (nombre + kcal + acciones), `FranjaMacros` (barra segmentada P/C/G por reparto de kcal y gramos debajo), filas con hairlines y pie «Añadir a desayuno» / «Repetir del día anterior (n)». Sin entradas la card es compacta. Un día vacío muestra las cuatro cards compactas: **`ComidasVacias` se elimina**. «Añadir a …» abre Añadir comida con esa comida preseleccionada (`comidaInicial`); la CTA grande sigue eligiendo por hora.

**Verificación**: tests y build en verde (Recharts sigue en su chunk `chart`, fuera del de arranque).

## 37. Se retira la IA (Gemini)

Rama `feat/quitar-ia`. Gemini estaba saturado casi siempre y el intérprete local (§34) ya cubre el uso diario, así que se quita la IA entera.

1. **Fuera**: `shared/ai/gemini.ts`, `lib/prompts/interpretarComida.ts`, `hooks/useInterpretarComida.ts`, `VoiceRecorder` (la voz grabada solo iba a Gemini; el dictado del teclado sigue funcionando) y el icono `mic`. En `lib/alimentos.ts` salen `revisarItems` y la procedencia `estimado` (etiqueta «Estimado» en la revisión). `EntradaIA` pasa a llamarse `DescribirComida`, con un único botón «Interpretar».
2. **Ajustes**: sin la tarjeta Gemini (API key y modelo) ni «Incluir la API key en el backup».
3. **Datos**: `Settings` pierde `apiKey` y `modelo`. `conDefaults` los descarta al leer y al importar, y `ensureSettings` (al arrancar) reescribe el registro sin ellos, así que la key desaparece del dispositivo. Sin `upgrade()` de Dexie.
4. **Backup**: sale el metadato `incluyeApiKey` (se ignora si llega). **`BACKUP_VERSION` no sube**: los backups antiguos importan igual (se descartan `apiKey`/`modelo`) y ningún registro cambia de forma.
5. **Se conserva** `FuenteAlimento = 'gemini'`: los alimentos creados con la IA siguen existiendo; en «Alimentos» mantienen su icono. `fuenteSiNuevo` queda siempre en `manual` para lo nuevo.

**Verificación**: `tsc -b`, tests y build en verde.

## 38. Rediseño visual: naranja / negro / blanco (rama `feat/mejorar-diseno`)

Renovación visual completa **sin tocar datos, esquema, lógica ni flujos**. Principios: negro estructura, naranja actúa/progresa, blanco respira, gris informa. Detalle en `docs/DESIGN-SYSTEM.md`.

1. **Tokens** (`tokens.css`, único sitio): acento `250 100 20` (relleno; texto sobre él en negro, 6:1), `--c-accent-strong` `180 65 0` para naranja como texto/icono (5,7:1), `--c-selected/--c-on-selected` (segmento/chip activo, negro; cambiable a naranja aquí), `--c-on-destructive`, `--c-focus`, `--c-kcal: var(--c-accent)`; macros apagados (pizarra, salvia, malva) con ≥3:1 sobre blanco y sobre ink; radios 10/14/24; `--space-page` 20 px, `section` 32 px; tokens de barra flotante (`--nav-*`) y escala `hero`.
2. **Superficie `ink`**: bloques `[data-surface='ink']` (claro y oscuro) que redefinen los tokens semánticos (surface negro, textos claros, pistas grises, `accent-strong` naranja claro, `selected` invertido, `goal` y `focus` redeclarados porque las variables derivadas se resuelven donde se declaran). `Card tone="ink"`, `Toast` y `BottomNav` la usan; ProgressRing/Bar, Button, Badge y Metric se adaptan solos.
3. **Tests**: `contrast.test.ts` resuelve `var(--c-…)` y lee los bloques ink; añade pares de acento fuerte, selected, on-destructive y todo el conjunto dentro de ink. `guard.test.ts` comprueba que ink solo redefine tokens de color existentes y redeclara `goal`/`focus`. Tests nuevos: `saludoPorHora`, `formatDuracion`, `formatHora`, `resumenUltimoEntreno`.
4. **Primitives**: nuevos `PageHeader`, `Metric`, `Badge`, `ListGroup`; cambian `Button` (todo pill, sin `shape`; `contrast`, `loading`, hover solo con puntero fino), `IconButton`, `Card` (`tone ink`), `SectionHeader` (`variant section|label`), `SegmentedControl` (activo `bg-selected`), `ListRow` (`plain|muted|accent|flat`; sin `surface`), campos (`aria-invalid`), `Sheet`, `Toast` (ink, sobre la nav), `EmptyState` (`icon`/`title`). `future.hoverOnlyWhenSupported` en Tailwind.
5. **Navegación**: `BottomNav` flotante negra en pill (`aria-current`), activa = pastilla naranja con etiqueta; `App` usa `pb-nav`.
6. **Pantallas**: `ResumenNutricional` (hero ink compartido por Inicio y Hoy; sustituye `KcalDia` y `ResumenDiaCard`); Inicio con saludo por hora y `TarjetaEntreno` (entreno en curso o último terminado; lee `workoutsRepo.activo/ultimoTerminado` y `setsRepo.delWorkout`, sin escribir); Hoy con comidas planas (sin Card por comida); Resumen con hero de media diaria y `Metric`; Alimentos/Rutinas/Historial en `ListGroup`; Entreno activo con cabecera ink (inicio, series, volumen) y columnas Serie·Reps·Kg; Historial con tabla y `formatNumber` (arregla «22.5»); Progreso con `Metric` y ejes con `formatInt`; Ajustes con `PageHeader` y grupos. Nutrición y Gym llevan `PageHeader`.
7. **Cambios funcionales**: solo el nuevo `workoutsRepo.ultimoTerminado()` (lectura). En Alimentos se pierde el icono de procedencia (`gemini`/`manual`). Los botones de guardado usan `loading`.
8. **PWA**: `favicon.svg` y PNG 192/512/apple-touch regenerados (negro con pulso naranja) con un script puntual fuera del repo.

**Verificación**: tests y build en verde; revisión en navegador (Edge headless a 375×812, claro y oscuro, origen `appfit-test.localhost`) de Inicio, Hoy, Resumen, Alimentos, Plantillas, Añadir comida, Gym (4 pestañas), Entreno activo y Ajustes sin scroll horizontal. Pendiente: probar en un iPhone real (safe areas, teclado, tacto).


## 39. Catálogo ampliado y fiable: CIQUAL 2025-es2 + Open Food Facts España (rama `feat/ampliar-alimentos`)

Objetivo: catálogo fiable, consistente y fácil de ampliar, con prioridad a lo habitual en España. Sin cambio de esquema Dexie ni de `migrarBackup`; ningún id se pierde. Detalle técnico, fuentes, licencias y medidas en `scripts/catalogo/README.md`.

1. **Fuentes**: CIQUAL 2025 (Etalab 2.0) sigue como base genérica; nueva segunda capa `offes` (Open Food Facts, ODbL 1.0): 3.000 productos de marca populares en España, offline. Descartadas y documentadas: BEDCA (licencia: exige autorización de AESAN/BEDCA), USDA FDC y UK CoFID (inglés, duplicarían CIQUAL).
2. **Paquete formato 2** (`tipo`, `extra` con `alias`, `marca`, `gtin`, `ml`, `oculto`, `secundario`). Formato 1 rechazado; un cliente antiguo reintenta tras actualizarse. `offes` es fuente distinta de `off` (escaneados `live`) porque `importarFuente` borra por versión.
3. **Validador común `calidad.ts`**: errores bloquean; el aviso de energía (4P+4C+9G+2fibra+7alcohol) es solo un detector: en CIQUAL va al informe sin tocar valores oficiales (7 avisos: vinagres, grosella roja, chicles/caramelos sin azúcar), en OFF excluye el producto. Informes versionados en `scripts/catalogo/informes/`. `npm run catalogo:validar` y un test lo ejecutan sobre lo publicado.
4. **CIQUAL 2025-es2**: 29 categorías AppFit (antes 12) por sub-subgrupo > subgrupo > grupo; secundarios (Martinica/Reunión, infantiles: 52); 4 nombres duplicados y la errata «Tomate racimo, cruda» corregidos; 144 alimentos con alias nuevos (170 en total); 10 ocultos curados (leche UHT/pasterizada, aguas, nectarinas, sal fluorada; el id se conserva); invariante de ids frente al paquete anterior.
5. **OFF España**: filtro por `top-country-es-scans-*` porque el volcado no trae idioma; más nombre/marca/GTIN válidos, calidad y heurística de idioma; dedup por GTIN y por nombre+marca; ≥5 escaneos; top 3.000. Decisión: sin `lc`, la señal de mercado principal es lo más fiable disponible.
6. **App**: `ranking` con alias exacto = exacto, criterio `frecuente`, genérico antes que marca (puesto el PRIMERO, no tras `exactas`, porque una marca llamada exactamente «Pechuga de pollo» ganaba al genérico; una marca ya usada no se penaliza), secundarios detrás y `offes` en `PRIORIDAD_FUENTE`. Corrección de erratas (`erratas.ts`, Damerau-Levenshtein, 0/1/2 letras según longitud, solo si la búsqueda no encuentra nada; empate: candidata no más corta, luego más frecuente) con `catalogRepo.vocabulario()` en caché e invalidación en cada escritura; «Resultados para «…»» en el buscador; el intérprete también reintenta. `CANDIDATOS` 300 → 600. Detalle «Marca · Categoría» y «kcal/100 ml».
7. **Tests**: `calidad`, `offLib`, `erratas`, ampliación de `ciqualLib`, `paquete`, `ranking` (regresión con el paquete real), `catalogRepo` (vocabulario, ocultos), compatibilidad es1→es2 con datos de usuario (fixture `src/test/fixtures/ciqual-2025-es1-muestra.json`), preferidos no ocultos, escalado 100/200/50 g.
8. **Pendiente / límites**: prueba en Safari/iPhone real y medir importación (~6.300 filas) e índice en WebKit; no hay genéricos españoles (manchego, etc.: BEDCA no es redistribuible); la categoría y el idioma de OFF son heurísticos; el vocabulario tarda ~3,5 s en fake-indexeddb la primera vez que hay una errata.

## 40. Reestructuración de la documentación (rama `feat/ampliar-alimentos`)

Objetivo: que cada tema tenga una sola fuente de verdad, que `CLAUDE.md` sea contexto global mínimo y que el resto se lea solo cuando haga falta. Sin cambios de código.

1. **Documentos vivos nuevos**: `arquitectura.md` (capas, mapa, navegación, arranque, PWA), `datos.md` (tablas, invariantes, repos, backup, trampas de Dexie), `features/{nutricion,gym,inicio}.md`, `desarrollo.md` (tests, navegador, Git/PR, despliegue, Claude Code), `roadmap.md` (pendientes, ideas y descartadas) y `decisiones/001–006` (ADR de las decisiones de base). Hasta ahora buena parte del estado actual solo estaba en esta bitácora.
2. **`CLAUDE.md`**: pierde el mapa detallado (pasa a `arquitectura.md` y `features/`), los comandos del catálogo y del despliegue, y gana una tabla «documento → fuente de verdad de → cuándo actualizarlo», que sustituye a las listas equivalentes de `AGENTES.md` y `documentation-agent.md`.
3. **Eliminados o movidos**: `AGENTES.md` (su contenido pasa a `desarrollo.md` § Claude Code), `roadmap/prompt-plan-nutricion-v2.md` (prompt ya usado); `PLAN.md` y `roadmap/*` pasan a `historico/`.
4. **Corregido lo que no coincidía con el código**: `DESIGN-SYSTEM.md` describía Hoy con una card por comida (son secciones planas desde §38), usaba la prop `Button shape` (eliminada), mencionaba `ResumenDiaCard` y `VoiceRecorder` (eliminados) y daba por pendientes `SearchInput` en Gym y los ejes de Progreso (ya hechos). `herramientas.md` y `README.md` seguían con el despliegue «pendiente», Git «sin commits», solo CIQUAL como catálogo y sin las dependencias del escáner.
5. **Hueco documentado**: el esquema v4 (tabla `notasMedida`, pantalla «Medidas», medidas caseras ambiguas en `lib/interprete/medidas.ts`, rama `feat/mejorar-parser`) y el reparto de objetivos (`lib/objetivos.ts`) no tenían sección aquí; ahora constan en `datos.md` y `features/nutricion.md`.

## 41. Separación de cenas y registro por tandas (rama `feat/parser-comidas`)

El registro de varios alimentos podía unir cantidades independientes: «2 huevos y medio aguacate» quedaba como un solo alimento, igual que «200 g de arroz con 150 g de pollo». La revisión tampoco permitía incorporar otro alimento sin reinterpretar lo anterior.

Se distingue el «y medio» de una cantidad del comienzo de otro alimento; «con» separa únicamente delante de una nueva cantidad explícita, conservando los nombres de platos. Se limpian introducciones habituales del dictado y viñetas. La descripción recomienda un alimento por línea y muestra la separación antes de interpretar. «Añadir otro alimento» incorpora nuevas tandas a la revisión conservando las correcciones; el guardado sigue siendo único y transaccional. El flujo y sus límites se documentan en [Nutrición](features/nutricion.md), sin cambios de esquema ni de catálogo.

Se añaden regresiones de separación y cenas completas contra el paquete CIQUAL real. La comprobación en Chromium a 375×812, claro y oscuro, verifica añadido sin conexión, conservación de cantidades editadas, cancelación, guardado conjunto de cinco entradas, recuperación del texto al reinterpretar y eliminación de un ítem, sin errores de consola ni scroll horizontal.

**Verificación**: 843 tests en 43 archivos y `npm run build` (TypeScript + PWA) en verde.

## 42. Distinción visual entre alimentos al escribir (rama `feat/parser-comidas`)

La vista previa de la descripción pasa de viñetas a tarjetas numeradas, con borde y separación entre cada alimento. Se actualiza mientras se escribe: «2 huevos fritos y una longaniza» muestra dos bloques con sus cantidades originales. Se usan `Card` y `Badge` del sistema de diseño, y los textos largos pueden ocupar varias líneas. El mismo componente se usa al añadir una nueva tanda. Detalle del patrón en [Design system](DESIGN-SYSTEM.md#lenguaje-de-añadir-comida) y del flujo en [Nutrición](features/nutricion.md#añadir-comida).

**Verificación**: 843 tests y build en verde. Chromium a 375×812, claro y oscuro: aparición de las dos tarjetas al escribir, separación entre bloques, nombres largos sin desbordar, coma decimal, vaciado y nueva tanda, sin errores de consola.

## 43. Básicos compartidos entre buscador e intérprete (rama `feat/parser-comidas`)

El orden por coincidencias textuales priorizaba pato para «pechuga», huevo en polvo para «huevo» o mazapán para «pasta». Los preferidos curados que solo usaba el intérprete pasan de `raciones.ts` a `catalogo/preferidos.ts`; los pesos y medidas se mantienen aparte. Se añaden «pollo» y «pechuga» como consultas completas del básico ya existente: pechuga de pollo sin piel cruda (`ciqual:36017`). Se conservan los demás defaults, incluida la equivalencia de tostada con pan tostado.

`buscarCatalogo` y `rankCatalogo` comparten la selección. Si el básico queda fuera de los 600 candidatos, se recupera por id únicamente si existe, es visible y compatible; no se duplica. Las consultas específicas no reciben el básico genérico, los propios con coincidencia fuerte siguen ganando en el intérprete y los frecuentes personalizan las alternativas. Se relegan contradicciones explícitas de preparación o piel: «arroz cocido» ya no empieza por una fila etiquetada también como cruda. El hook conserva «con piel» al buscar y evita volver a ordenar los resultados con una consulta que pierde esa información.

**Comparativa**: [28 búsquedas antes y después](historico/prioridad-alimentos-2026-10-02.md), usando los paquetes publicados y una IndexedDB en memoria. Cambia el primer resultado en 14; en las 28 se conserva el número de candidatos. Se mantienen las 6.323 filas, ids, nutrientes, esquema, historial, plantillas y dependencias. No se regeneran paquetes ni se incorporan servicios de IA. Agrupar variantes o ampliar la selección curada queda para una siguiente iteración si hace falta.

**Verificación**: 937 tests en 45 archivos y `npm run build` en verde. Nuevas regresiones de preferidos, consultas específicas, marcas, frecuentes, alimentos propios, erratas, recuperación fuera del límite y preferidos ausentes/ocultos/incompatibles. Chromium a 375×812, claro y oscuro, en el origen aislado de pruebas: ocho búsquedas y dos descripciones completas por tema; básicos, pechuga con piel, arroz cocido y tostadas correctos, cantidades conservadas, sin errores de consola ni desbordamientos. Pendiente únicamente la comprobación en iPhone real.

## 44. Conservación de registros y primer traslado desde Safari (rama `feat/persistencia-datos`)

Tras integrar §41–§43 en `master` (PR #9), Víctor comunica que pierde registros al actualizar/cerrar la app y concreta el caso: registró una comida desde un enlace en Safari y después añadió el acceso de pantalla de inicio. En iOS, esos accesos pueden usar almacenes separados; no hay un traslado automático. La revisión no encuentra un borrado al arrancar ni al actualizar: los únicos vaciados de usuario son la importación de una copia y el borrado confirmado desde Ajustes.

Se crea la rama desde el `master` actualizado. La base sigue siendo `appfit` con el mismo esquema; el manifest explicita su identidad estable (`id: '/'`). La solicitud de persistencia conserva un permiso existente y distingue concesión, rechazo, API no disponible y error; Ajustes muestra el acceso actual y el estado real, con reintento. La ayuda de primer inicio en iOS explica cómo recuperar los registros del enlace original: exportar en Safari e importar en el acceso nuevo. La detección de datos es de solo lectura y no confunde catálogo/ajustes por defecto con registros personales.

La importación desde Ajustes se valida al elegir el archivo y solo sustituye los registros al confirmar «Importar copia». Muestra las comidas incluidas, advierte si hay datos actuales y permite exportar antes. Cancelar, una copia inválida o un fallo de exportación/importación no se presenta como éxito ni dispara una sustitución. Detalle y límites en [Datos](datos.md#conservación-y-primer-traslado-en-iphone).

**Verificación**: 956 tests en 47 archivos y build en verde. En Chromium con perfil persistente, sobre una build de producción y el origen aislado `appfit-test.localhost`, 11 comidas más datos de todas las tablas de usuario sobreviven a recarga, cierre completo, actualización real de build/service worker y nueva reapertura: export idéntico salvo fecha de exportación. En claro/oscuro a 375×812, traslado entre dos almacenes aislados, permiso rechazado/reintento, confirmación/cancelación, archivo inválido y reapertura sin conexión correctos, sin errores de consola ni scroll horizontal. Las señales de iOS están emuladas; pendiente verificar el traslado y el permiso en iPhone real. No se ha añadido un backend ni una sincronización entre almacenes.

## 45. Instrucciones claras desde Inicio (rama `feat/persistencia-datos`)

Víctor pide un aviso sencillo de primera vez que lleve a las instrucciones de Ajustes. Inicio resume la explicación en «Añade AppFit a tu pantalla de inicio» (Safari) o «¿Primera vez abriendo AppFit?» (PWA sin datos), con «Ver instrucciones». La guía queda al principio de Ajustes, con pasos numerados para añadir el acceso y trasladar una copia de las comidas registradas en Safari. Se recuerda exportar antes de añadirlo si ya hay registros. Un segundo botón lleva a Exportar/Importar; se elimina el párrafo duplicado de ese bloque.

Ambos saltos desplazan la vista y el foco a su sección, para que la persona no tenga que buscar las instrucciones entre los objetivos y el resto de Ajustes. La guía también está disponible entrando desde la barra inferior; la navegación habitual no fuerza ese salto.

**Verificación**: 956 tests en 47 archivos y build en verde. Chromium a 375×812 en claro/oscuro, con Safari y pantalla de inicio emulados: aviso breve, destino de pestaña, desplazamiento y foco en la guía, listas de pasos, salto al backup y disponibilidad al volver a abrir Ajustes. Sin errores de consola ni desbordamiento horizontal.

## 46. Alimentos guardados juntos como un plato (rama `feat/agrupar-platos`)

Rama desde `master` tras el merge de PR #10. Víctor pide distinguir en Nutrición cada conjunto de alimentos añadido a la vez como un único plato. La revisión con varios alimentos (incluidas las tandas de «Añadir otro alimento») se guarda con un `platoId` compartido y un nombre opcional; sin nombre, se muestran los nombres de los ingredientes. En Hoy cada plato tiene una fila desplegable con sus kcal/macros totales. Dentro se mantienen gramos, edición y borrado individual. La papelera del plato borra todos sus ingredientes transaccionalmente y «Deshacer» restaura los mismos ids y snapshots.

La agrupación es metadato opcional en `Entry` y `MealItem`, sin nueva tabla, índice, migración ni cambio de versión del backup. No se fusionan ni reinterpretan registros antiguos. Los totales y frecuentes siguen usando las entradas por ingrediente, sin doble conteo. Editar gramos conserva el plato; mover un ingrediente a otra comida lo separa. Copiar, repetir y aplicar plantillas conserva los grupos y renueva su identidad en cada operación para no mezclar guardados sucesivos. Las plantillas antiguas sin agrupación mantienen sus filas individuales. Lógica pura en `lib/platos.ts`; flujos e invariantes en los documentos vivos.

**Verificación**: 969 tests en 48 archivos y build TypeScript/PWA en verde. Regresiones de agrupación explícita, historial intacto, límites de fecha/comida, guardados con la misma hora, edición/movimiento, copias sucesivas, plantillas y backup. Chromium aislado a 375×812, claro y oscuro: dos platos y un alimento individual, añadido por tandas, desplegado, edición de gramos, borrado completo/parcial con deshacer, recarga, copiar/repetir y exportar/importar conservando los grupos. Sin errores de consola ni desbordamiento horizontal. Pendiente únicamente la comprobación en iPhone real.

## 47. Nombres cortos para la pantalla de Nutrición (rama `feat/nombres-cortos`)

Víctor acepta una solución mixta para que la revisión conserve el nombre completo del catálogo y Nutrición muestre una etiqueta breve. `nombresCortos.ts` aplica solo reglas locales exactas conocidas (café instantáneo sin azúcar listo para beber → «Café») y elimina el sufijo estadístico «promedio» de nombres de leche; no recorta descriptores desconocidos. El resto mantiene el nombre completo. Desde la revisión o la edición se propone el texto corto, se puede corregir y se puede volver a la propuesta automática.

Las correcciones personales se guardan por FoodRef estable en la nueva tabla `nombresAlimentos` (Dexie v6). Aparecen también en registros anteriores del mismo alimento, grupos/platos y añadidos rápidos. Las tablas de usuario incluyen esa preferencia; los backups viejos la dejan vacía, la versión del formato se mantiene porque la tabla opcional no modifica los registros previos. Nombres, referencias y snapshots nutricionales de alimentos/entradas originales permanecen intactos.

**Verificación**: `npm run build` correcto (TypeScript y PWA). No se ejecutaron tests automatizados en esta sesión.

## 48. Alimento principal en las cuatro comidas (rama `feat/nombres-simples-nutricion`)

Víctor pide ver «Pollo», «Arroz» y «Hamburguesa» en Desayuno, Comida, Cena y Snack, manteniendo el nombre completo al añadir alimentos. Se amplían las reglas locales de presentación para reconocer alimentos habituales, quitar cortes/variedades/preparaciones y conservar nombres compuestos que identifican el alimento. Los nombres desconocidos mantienen su encabezado sin descripciones reconocidas. Se aplican al historial y a los títulos automáticos e ingredientes de platos; las preferencias personales siguen teniendo prioridad. No se modifica el almacenamiento ni los snapshots nutricionales. Flujo y reglas vigentes: [Nutrición](features/nutricion.md); presentación: [DESIGN-SYSTEM](DESIGN-SYSTEM.md).

Se añaden pruebas de ejemplos reales, nombres compuestos, referencias antiguas o inválidas, alias y agrupación sin alterar los registros. La suite detectó un fixture anterior incompleto para `nombresAlimentos` en la prueba de conservación de datos; se añade su registro de prueba.

**Verificación**: `npm run test` (49 archivos, 1.009 tests) y `npm run build` correctos. Prueba en `appfit-test.localhost:5173` a 375×812, en claro y oscuro: nombre completo al buscar/seleccionar/editar, etiquetas breves en las cuatro comidas y platos, personalizar/restablecer el nombre, snapshots intactos y ausencia de desbordamiento horizontal y errores de consola.

## 49. Simplificación general de todos los alimentos (rama `feat/nombres-simples-nutricion`)

Víctor aclara que quiere nombres simples para cualquier alimento añadido. Se elimina la lista cerrada que activaba la simplificación y se aplica una regla general a cualquier nombre: se omiten cantidades, artículos y tamaños, se resuelven cortes con «de/del» y se muestra la primera palabra salvo excepciones que conservan nombres compuestos. Los alimentos desconocidos y propios reciben también una etiqueta breve. El nombre completo sigue disponible al añadir y editar; los datos guardados conservan sus nombres y nutrientes. Reglas vigentes: [Nutrición](features/nutricion.md); presentación: [DESIGN-SYSTEM](DESIGN-SYSTEM.md).

**Verificación**: 1.037 tests en 49 archivos y build TypeScript/PWA correctos. Se comprueban etiquetas breves para los 6.323 alimentos publicados en CIQUAL y Open Food Facts, además de ejemplos de productos y alimentos no contemplados por la lista anterior. Navegador aislado a 375×812 en claro/oscuro: doce nombres variados en las cuatro comidas, nombres completos al seleccionar/editar, nombres compuestos, grupos, alias y snapshots intactos, sin errores de consola ni scroll horizontal.

## 50. Separación visual de platos en Nutrición (rama `feat/nombres-simples-nutricion`)

Víctor pide distinguir con claridad las tandas de alimentos guardadas como platos. Cada plato pasa a tener un bloque con fondo, borde y separación entre guardados. Al desplegarlo, todos sus ingredientes quedan dentro del mismo contenedor, con líneas interiores; cada plato se abre de forma independiente. Se reutiliza `Card` y los tokens del diseño. El cambio es de presentación; las referencias de los ingredientes, agrupación, cálculos y operaciones de guardado se conservan. Flujo: [Nutrición](features/nutricion.md); patrón: [DESIGN-SYSTEM](DESIGN-SYSTEM.md).

**Verificación**: 1.037 tests en 49 archivos y build TypeScript/PWA correctos. Navegador aislado a 375×812 en claro/oscuro: platos cerrados y varios abiertos, espacio visible entre bloques, ingredientes dentro de sus bordes, edición, borrado completo/parcial con deshacer, totales, recarga, copiar/repetir y backup. Sin errores de consola ni desbordamiento horizontal.

## 51. Rediseño completo de UI/UX (rama `feat/rediseno-ui-ux`, 2026-10-03)

Tras auditar todas las pantallas y flujos, se define una identidad de precisión deportiva y calma: [DESIGN.md](../DESIGN.md). Apple aporta jerarquía/espacio; Nike, presencia de métricas; Linear, precisión/listas. Se estudian los repositorios awesome-design-md y Taste Skill, usando redesign-skill y principios móviles con criterio, sin copiar marketing ni añadir fotografías, animación decorativa o librerías. Análisis previo: [auditoría](historico/auditoria-diseno-2026-10-02.md).

Se reemplazan foundations/primitives y se migra toda la aplicación: fuente variable local, neutrales cálidos, naranja funcional, listas planas, métricas inmediatas, navegación inferior con espacio propio, pestañas distintas de selectores, capas con portal/foco/inert/viewport y acciones persistentes. Inicio abre el registro directamente y permite consultar historial de peso; Nutrición conserva nombres simples/platos, mejora revisión y muestra una métrica por gráfica; Gym usa campos directos y tendencias honestas con datos textuales; Ajustes prioriza objetivos/tema/copias y despliega explicaciones. Se retiran halo, anillo, contador animado, ink/contrast y variantes compactas. Arquitectura pequeña: [ADR 007](decisiones/007-sistema-visual-movil.md), [DESIGN-SYSTEM](DESIGN-SYSTEM.md), [arquitectura](arquitectura.md) y docs de features actualizadas.

La migración detecta y corrige contraste de campos, CSS de desarrollo obsoleto, escritura interrumpida por respuestas asíncronas del Gym, identidad de formularios al quitar ingredientes, cabeceras largas con teclado, palabras partidas y ejes demasiado anchos. El código de datos, parser, cálculos, privacidad y funcionamiento local-first se conserva.

**Verificación**: 1.066 tests en 52 archivos, build TypeScript/Vite/PWA y diff check correctos. 512 estados en Chromium (458 capturas), tres tamaños móviles, ambos temas, datos vacíos/habituales/extremos y tablet; recorridos de edición/guardado/deshacer, modales, errores y backups. Producción: actualización del SW/reapertura conserva todas las tablas de un perfil anterior; offline funcionan fuente, destinos, gráficos, interpretación, guardado y recarga. Informe y límites: [validación](historico/validacion-rediseno-2026-10-03.md). Teclado/safe areas/cámara en dispositivo real permanecen en roadmap. Trabajo en rama separada, sin merge a master.

## 52. Vista nutricional sencilla y detallada (rama `feat/nutrientes-detallados`, 2026-10-03)

Víctor pide ver fibra, azúcares, sal y grasas saturadas, sin añadir minerales, con un selector superior en Nutrición y modo sencillo por defecto. Hoy mantiene su resumen habitual de kcal/P/C/G y ofrece «Vista detallada» para mostrar los totales adicionales del día. «Detalles del alimento» siempre incluye los cuatro extras editables por 100 g y su aporte para la cantidad indicada, independientemente del modo del diario. Los alimentos propios también permiten introducirlos. Flujo: [Nutrición](features/nutricion.md); presentación: [DESIGN-SYSTEM](DESIGN-SYSTEM.md).

Los valores disponibles en el catálogo se conservan al interpretar y guardar como snapshots opcionales en entradas y plantillas. Edición de gramos, añadido rápido, copias, plantillas y backups los propagan sin compartir objetos mutables ni completar datos históricos desconocidos. Cero conocido, datos ausentes y totales parciales se distinguen explícitamente; los escaneos incompletos conservan los extras conocidos y pequeñas cantidades de sal. No se cambian tablas, índices ni versiones de Dexie/backup. Invariantes: [Datos](datos.md).

**Verificación**: 1.078 tests en 55 archivos y build TypeScript/Vite/PWA correctos. Regresiones de cobertura, escalado, identidad de alimentos, snapshots, copias/plantillas, edición, compatibilidad antigua y exportación/importación. `validar-nutrientes.cjs` pasa con el catálogo real en 320/375/430 px y ambos temas: modo inicial, detalles, totales numéricos, cantidades, datos parciales, alimentos propios, cero conocido, eliminación de un dato y recarga; sin errores de consola ni overflow horizontal. Los recorridos existentes de `validar-rediseno.cjs` pasan en claro/oscuro (38 estados). Comandos reproducibles: [Desarrollo](desarrollo.md).

## 53. Añadir alimentos a un plato existente (rama `feat/anadir-alimentos-plato`, 2026-10-03)

Víctor pide una rama nueva y un botón de editar que permita añadir alimentos a un plato ya registrado, manteniendo el borrado individual. Cada bloque de plato ofrece «Editar plato», visible también cerrado. Reutiliza la revisión de comida para describir, buscar o escanear nuevos ingredientes, consultar los actuales y confirmar con «Añadir al plato». La fecha/comida quedan fijadas; cancelar no guarda. Los ingredientes anteriores siguen editándose y borrándose desde el diario.

`guardarComida` acepta un destino explícito, valida su existencia en esa fecha/comida dentro de la transacción y hereda su identidad/nombre. Inserta solo los añadidos y preserva todos los snapshots originales; admite un ingrediente nuevo o varias tandas y platos con un único ingrediente restante. Un destino borrado/movido se rechaza sin recrearlo; cualquier fallo revierte alimentos y entradas nuevos. No cambia el esquema ni el backup. Flujo e invariantes en [Nutrición](features/nutricion.md) y [Datos](datos.md).

**Verificación**: 1.085 tests en 55 archivos y build TypeScript/Vite/PWA correctos. Siete casos nuevos cubren selección de plato, snapshots/nutrientes intactos, un solo ingrediente, destino borrado/otra fecha/otra comida/id vacío y rollback de todos los añadidos. `validar-platos.cjs` comprueba descripción en tandas, búsqueda con revisión, cancelación, detalles nutricionales, totales actualizados, platos separados, escáner con 404 simulado, borrado/deshacer, ingrediente único, recarga y destino desaparecido; 320/375/430 px, claro/oscuro, sin overflow ni errores de consola, con targets y campos correctos. Los recorridos existentes pasan en ambos temas (38 estados). Sin commit ni push, a la espera de petición expresa.

## 54. Copiar un plato a otra comida del mismo día (misma rama, 2026-10-03)

Víctor pide conservar la rama y copiar platos entre Desayuno, Comida y Cena sin cambiar de día. Cada plato ofrece «Copiar plato», con acciones limitadas a ese grupo: copiar a otra comida del día seleccionado, a otro día o guardar como plantilla. El menú de una comida también ofrece la nueva vía para toda la sección. El selector bloquea un destino idéntico al origen y cancelar no guarda. Las copias conservan el original y lo que ya hubiera en destino, crean platos independientes y ofrecen «Deshacer».

`entriesRepo.copiar` filtra por id de plato opcional además de fecha/comida y lee los snapshots actuales dentro de la transacción. Conserva referencias, cantidades y nutrientes, sin recalcular desde el alimento ni incluir otros platos; cada operación renueva la identidad del grupo. Un origen desaparecido no copia otro plato por accidente. La operación es atómica y el repositorio protege también el no-op. No cambian esquema ni backup. Flujo/invariantes en [Nutrición](features/nutricion.md) y [Datos](datos.md).

**Verificación**: 1.096 tests en 55 archivos y build TypeScript/Vite/PWA correctos. Once casos nuevos cubren los tres destinos del mismo día, snapshots intactos aunque cambie el alimento, deshacer selectivo, copias independientes, ingrediente único, no-op, origen ausente/otra fecha/otra comida/id vacío, otro día y rollback tras una inserción parcial. `validar-copia-platos.cjs` pasa en 320/375/430 px, claro/oscuro, con cancelación, destinos ocupados, copia individual/de comida completa, plantilla individual, recarga e histórico; textos largos/cifras grandes, sin overflow ni errores, targets y campos correctos. La regresión del añadido a platos también pasa en las seis configuraciones y los recorridos anteriores en ambos temas (38 estados). Trabajo sin commit ni push.

## 55. Recuadro del resumen nutricional diario (rama `feat/diseno-resumen-nutricional`, 2026-10-03)

Víctor pide recuperar un recuadro bonito para el resumen diario en Inicio y Nutrición, con separación clara respecto al contenido siguiente y conservando el diseño general. `ResumenNutricional` reutiliza Card: superficie del tema, borde fino, radio de 16 px y padding de 16 px; cabecera más clara con divisor, kcal destacadas y tres columnas de macros. Se mantiene el espacio exterior de sección de 28 px. «Ver día» y «Registrar comida» conservan sus acciones; este último sigue fuera de la tarjeta.

El desglose adicional de la vista detallada queda dentro del mismo contorno. No cambian cálculos, objetivos, datos ni el resumen semanal/mensual. La validación detecta el desbordamiento de cifras extremas al reducir el ancho interior: los valores y objetivos de MacroBar ahora pueden envolver sin ocultarse ni reducir su tipografía. Intención en [DESIGN](../DESIGN.md); implementación en [DESIGN-SYSTEM](DESIGN-SYSTEM.md); flujos en [Inicio](features/inicio.md) y [Nutrición](features/nutricion.md).

**Verificación**: 1.101 tests en 56 archivos, build TypeScript/Vite/PWA y diff check correctos. Cinco contratos nuevos del panel cubren superficie, accesibilidad/acción, detalle opcional, exceso y día vacío/sin objetivos. `validar-resumen-diario.cjs` pasa en 24 contextos aislados: 320/375/430 px × claro/oscuro × vacío/habitual/exceso/extremo. Comprueba borde/radio/padding, separación, overflow interior/exterior, targets, cifras/barras, navegación/fechas, detalles dentro de la tarjeta y backup intacto tras navegar. Los recorridos existentes pasan en ambos temas (38 estados), y la regresión de nutrientes pasa en las seis configuraciones móviles. Sin commit ni push.

## 56. Menú principal en rueda (rama `feat/menu-radial`, 2026-10-03)

Víctor pide una rama nueva y sustituir los cuatro destinos inferiores por un único botón que abra una rueda. BottomNav muestra Menú y conserva el espacio inferior/safe area. Reutiliza Sheet: Inicio, Nutrición, Gym y Ajustes rodean un cierre central, con iconos/nombres y marca de la sección actual. Cerrar desde el centro, cabecera, fondo o Escape conserva pantalla/scroll y devuelve el foco. Flechas/Home/End recorren los destinos y Enter/Espacio los eligen; Tab permanece en la capa.

La lista central de destinos define también Tab. La geometría/paginación pura reparte futuros destinos en grupos de cuatro, sin reducir botones ni crear otra capa modal. Se añade identidad opcional a Sheet para aria-controls y retorno al botón estable Menú si desaparece un disparador. No cambian datos, esquema, backup, cálculos ni pestañas internas. Intención y consecuencias en [ADR 008](decisiones/008-menu-radial.md); implementación en [DESIGN-SYSTEM](DESIGN-SYSTEM.md), [Arquitectura](arquitectura.md) y [Desarrollo](desarrollo.md).

**Verificación**: 1.118 tests en 58 archivos, build TypeScript/Vite/PWA y diff check correctos. `validar-menu-radial.cjs` pasa en doce contextos: 320/375/430 px × claro/oscuro × movimiento normal/reducido. Comprueba geometría sin solapes, targets, aislamiento, teclado, cuatro cierres, foco, navegación, scroll/estado conservados y backup intacto. Monta además la rueda real con seis destinos para comprobar páginas, límites, foco y selección futura. Regresiones existentes correctas: 38 estados de los recorridos, seis contextos de nutrientes, seis de edición de platos, seis de copia y 24 del resumen diario. Los scripts comparten el nuevo recorrido Menú→destino.

El servidor preexistente conservaba el CSS anterior de Tailwind: se usó un servidor nuevo sin detenerlo, encaminando las solicitudes de Playwright desde el mismo origen aislado de pruebas. Los archivos reales de producción también pasan navegación/geometría/overflow en seis contextos, con SW bloqueado; no se reejecutó el ensayo completo de actualización/offline del SW. Safe areas y tacto de WebKit quedan para el iPhone real. Sin commit ni push.

## 57. Rediseño profundo y motion con Impeccable (2026-10-03)

Víctor delega reemplazar el mundo visual y pide un menú que nazca de su botón, además de una experiencia de entrenamiento más satisfactoria. La critique independiente distingue problemas de jerarquía/densidad y continuidad de las fortalezas de datos honestos, componentes, plantillas y Deshacer. Se construye la identidad tinta/mineral/naranja y un sistema compartido de movimiento; el abanico anclado sustituye la rueda dentro de Sheet. Confirmar series, configurar descanso y terminar una sesión tienen estados claros y reversibles, sin modificar histórico, cálculos ni backups. Se mantiene la PWA y no se añaden dependencias.

La documentación normativa se reemplaza por el sistema implementado y los documentos vivos de arquitectura/features se actualizan. Decisiones y límites: [ADR 009](decisiones/009-identidad-y-motion-impeccable.md), [DESIGN](../DESIGN.md), [DESIGN-SYSTEM](DESIGN-SYSTEM.md). Informe de alcance, evidencia y oportunidades descartadas: [rediseño Impeccable](historico/rediseno-impeccable-2026-10-03.md).

**Verificación**: 1.133 tests en 59 archivos y build TypeScript/Vite/PWA correctos. Matriz de 514 estados; 12 contextos de navegación y 12 de motion/entrenamiento, con interrupciones, foco, Atrás, texto ampliado, Reduce Motion, cancelación de gesto y fallo/reintento de guardado. Producción offline/SW/fuente/chunks/export íntegro en ambos temas. La revisión final de Impeccable valida los cinco fixes solicitados usando 136 capturas renovadas; documentación y snippets comprobados. Sin commit, push ni despliegue. Safari/iOS, Android físicos, lectores de pantalla y rendimiento/haptics en hardware siguen pendientes; emulación no equivale a validación nativa.

## 58. Ingredientes, movimiento de platos y referencias diarias (2026-10-04)

Víctor pide una rama nueva tras integrar el rediseño y cuatro mejoras en Nutrición. `feat/mejoras-diario-nutricional` hace explícito «Añadir ingredientes», incorpora arrastre y alternativa accesible «Mover» con Deshacer, añade barras de referencias justificadas y destaca los títulos de comidas. El gesto conserva el primer pointerId o cancela limpiamente; la escritura completa es transaccional y no modifica snapshots ni totales diarios. No hay cambios de esquema/backup ni funcionalidad de Gym.

La referencia de azúcar total se diferencia expresamente del límite de azúcares libres y no se inventan rangos ausentes. Decisión/fuentes en [ADR 010](decisiones/010-mover-platos-y-referencias-nutricionales.md); flujos en [Nutrición](features/nutricion.md), invariantes en [Datos](datos.md), patrones en [DESIGN-SYSTEM](DESIGN-SYSTEM.md) y dependencia/carga diferida en [Herramientas](herramientas.md) y [Arquitectura](arquitectura.md).

**Verificación**: 1.154 tests en 61 archivos, build TypeScript/Vite/PWA y diff check correctos. Nueve contextos del diario (tacto CDP, mouse, teclado, texto al 200%, Reduce Motion, interrupciones, autoscroll y fallo/reintento), 18 contextos de regresión de ingredientes/copia/nutrientes y 40 estados de flujos. Artefacto de producción con SW/offline/fuente/chunks/export intacto; revisión visual acotada con Impeccable. Evidencia y límites en [informe](historico/mejoras-diario-nutricional-2026-10-04.md). Sin commit ni push; hardware iOS/Android pendiente.

## 59. Cabeceras de comidas (rama `feat/cabeceras-comidas-nutricion`, 2026-10-04)

Víctor aporta una referencia y pide limitar el cambio a las cabeceras de Desayuno/Comida/Cena/Snack. `CabeceraComida`, compartida por `ComidaSection`, separa cada comida de platos e ingredientes: tinta existente, radio de 16 px, icono SVG circular, título de 22 px / 800, kcal naranja y borde tenue sin sombra ni halo. La información secundaria es el número real de registros, no una hora inventada. Se conservan las acciones y los cálculos; Añadir/Repetir se coloca debajo del bloque cuando está vacío. No cambian datos, esquema, navegación, librerías ni otras pantallas.

El contexto local `meal-header` resuelve lectura/hover/foco en ambos temas y reutiliza el naranja existente. La rejilla da otra fila a cifras largas/espacio estrecho, y ancho completo al título con texto ampliado; altura natural, sin abreviar ni reducir targets. La primera inspección conjunta detecta contraste de hover y poco espacio para títulos al 200%; se corrigen en una tanda y se confirma el resultado. Documentación en [DESIGN](../DESIGN.md), su sidecar de Impeccable, [DESIGN-SYSTEM](DESIGN-SYSTEM.md), [Nutrición](features/nutricion.md) y comandos en [Desarrollo](desarrollo.md).

**Verificación**: 1.170 tests en 61 archivos, build TypeScript/Vite/PWA, sintaxis de scripts y diff check correctos. Diez configuraciones de cabeceras (320/375/430/1440 px, claro/oscuro y dos con texto al 200%/Reduce Motion): totales, registro vacío, nombres/cifras extremos, targets, solapes, acciones/cancelación/foco y registros intactos. Confirmación adicional con ingredientes desplegados en oscuro y con texto ampliado en claro. Los nueve contextos de regresión del diario pasan, incluyendo arrastre, autoscroll, teclado, tacto CDP, Deshacer y fallo/reintento. La prueba retira el dedo del borde antes de medir el destino, centra la cabecera y espera su medición tras el scroll; también corrige el ámbito de la captura inicial del gesto multitáctil, sin tocar la interacción de producto.

Evidencia: `/tmp/appfit-cabeceras-comidas/informe.json`, `/tmp/appfit-cabeceras-confirmacion/` y `/tmp/appfit-cabeceras-regresion/resultado.json`. Revisión visual acotada con Impeccable en móvil/escritorio y ambos temas. Chromium emulado; Safari/iOS, Android físicos y lectores de pantalla siguen pendientes. Sin commit ni push.

## 60. Consumo diario y sección global Referencias (rama `feat/referencias-nutricionales`, 2026-10-04)

Víctor pide simplificar las barras adicionales y separar metodología del diario. Nutrición conserva nombre, gramos, barra y cobertura; cada IconButton info abre criterio/fuente en Sheet y permite continuar a su referencia global. Referencias reúne catálogo, objetivos, recomendaciones alimentarias futuras y limitaciones de datos. El abanico conserva cinco destinos amplios, sin nueva dependencia.

`shared/lib/referenciasNutricionales` y `ReferenciaNutrienteContenido` sirven ambas vistas. Los objetivos personales vienen de Ajustes; las referencias generales conservan exactamente los criterios previos. Fuentes reales: CIQUAL/Open Food Facts y OMS/UE ya utilizados. Grupos futuros tienen tipos y colección vacía, sin raciones inventadas. No cambian cálculos, persistencia, esquema, parser ni registros. Principio en [DESIGN](../DESIGN.md), estructura en [Referencias](features/referencias.md) y [ADR 011](decisiones/011-consumo-y-referencias.md); documentación y sidecar sincronizados.

**Verificación**: 1.186 tests / 64 archivos, TypeScript/build Vite/PWA, sintaxis de scripts y diff check correctos. Diez contextos de Referencias (320/375/430/1440 px, ambos temas, texto al 200%/Reduce Motion), nueve de diario/arrastre, doce de menú y seis por regresión de nutrientes/ingredientes. Primera apertura de Referencias offline, SW, fuente/chunks y export íntegro en ambos temas. La revisión visual inicial detecta wrapping/carril y se corrige en una tanda; confirmación final conjunta correcta. Informe, evidencia y límites: [revisión de entrega](historico/referencias-nutricionales-2026-10-04.md).

Chromium emulado; hardware iOS/Android y lectores de pantalla pendientes. Sin commit ni push.

## 61. Registros de comida compactos y equivalentes (rama `feat/registros-comida-compactos`, 2026-10-04)

Víctor pide igualar la jerarquía de platos y alimentos individuales sin modificar cabeceras, resumen nutricional ni navegación. `RegistroComida` comparte superficie, borde, tipografía, cantidad/conteo, macros y kcal con unidad; el plato solo añade chevrón y menú «…». Se elimina su barra permanente de acciones. Los ingredientes desplegados conservan edición y papelera como filas interiores, sin tarjetas anidadas; el asa de arrastre se muestra al desplegarlos. Los registros rápidos conservan aproximación y no presentan gramos inventados.

`AccionesPlatoSheet` reutiliza Sheet/ListGroup/ListRow para añadir ingredientes, mover, copiar y borrar. Espera `onExited` antes de continuar, evitando capas apiladas y manteniendo visible Deshacer tras borrar. Foco, Escape/Atrás y la alternativa de mover sin arrastre siguen disponibles. No cambian cálculos, repositorios, datos, esquema, parser ni dependencias. Alturas naturales y rejilla contextual permiten nombres/cifras extensos y texto ampliado. [DESIGN](../DESIGN.md), sidecar Impeccable, [DESIGN-SYSTEM](DESIGN-SYSTEM.md), [Nutrición](features/nutricion.md), arquitectura y comandos actualizados.

**Verificación**: 1.192 tests / 65 archivos y build TypeScript/Vite/PWA correctos. Diez configuraciones nuevas (320/375/430/1440 px, claro/oscuro y dos con texto al 200%/Reduce Motion) comprueban jerarquía/altura, cifras, macros, ingredientes, targets, overflow, acciones, foco, cancelación, borrado/Deshacer y backup íntegro. Cabecera, resumen y navegación mantienen su HTML tras el recorrido. También pasan nueve contextos de diario/arrastre, diez de cabeceras y seis por cada regresión de ingredientes, copia y nutrientes; 40 estados de flujos generales. Se actualizan selectores al acceso contextual real, sin alterar los recorridos de producto. Producción: SW, recarga offline, fuente local, destinos, chunks y export intactos en ambos temas. Sintaxis de scripts, sidecar JSON y diff check correctos; no existe script de lint separado.

La revisión visual acotada con Impeccable inspecciona móvil/escritorio, ambos temas, ingredientes, menú, cifras/nombres extremos y texto ampliado; no necesita otra tanda de cambios. Evidencia en `/tmp/appfit-registros-comida/informe.json` y capturas de esa carpeta; regresiones en `/tmp/appfit-registros-diario/resultado.json` y `/tmp/appfit-registros-flujos/resultado.json`. Chromium emulado; dispositivos físicos iOS/Android y lectores de pantalla siguen pendientes. Sin commit ni push.

## 62. Identidad enfocada y enérgica (rama `feat/identidad-enfocada-energica`, 2026-10-05)

Víctor elige la opción 3 de su referencia y pide rediseñar toda APPFIT conservando producto y datos. Se reemplaza azul tinta por negro/grafito, blanco y naranja intenso de acento. Barlow Condensed 700 local para títulos/métricas, Manrope para lectura y edición; superficies compactas, contornos de control y radios contenidos. Inicio prioriza entrenar y después consumo/peso, con resultados existentes; sesión activa enfatiza ejercicio, series, campos y métricas. El sistema compartido alcanza Nutrición/detalle, comidas, rutinas, progreso, referencias, ajustes, capas y menú.

Se conservan Claro/Sistema, abanico, motion/Reduce Motion, fuentes contextualizadas, registros equivalentes, Deshacer y flujos de entrenamiento. Sin fotografía genérica, nuevas dependencias, cálculos, repositorios, esquema o cambios de backup. Barlow lleva licencia/procedencia local y funciona offline. Decisión en [ADR 012](decisiones/012-identidad-enfocada-energica.md), tokens en [DESIGN](../DESIGN.md)/sidecar y patrones en [DESIGN-SYSTEM](DESIGN-SYSTEM.md); documentación viva actualizada.

**Verificación**: 1.193 tests / 65 archivos y TypeScript/build Vite/PWA correctos; 145 guards/contraste/componentes tras el ajuste final. Matriz de 514 estados, 12 contextos de motion, 10 de registros, 10 de referencias, 6 de nutrientes, 9 de diario/arrastre y 24 de consumo compartido. Producción: SW/offline, ambas fuentes, destinos/chunks y export íntegro en ambos temas. Sintaxis de scripts, JSON/YAML y diff check correctos; sin script de lint separado. Se adaptan las aserciones del resumen a Inicio integrado/Hoy panel, manteniendo números y datos protegidos.

Revisión final manual con Impeccable en la sesión principal según CLAUDE.md; inspección inicial conjunta y confirmación móvil/escritorio del ajuste tipográfico de duración. Detector: cero hallazgos principales, un aviso no bloqueante de radio preexistente en paginación futura. Resultado/evidencia/límites: [informe](historico/identidad-enfocada-energica-2026-10-05.md). Chromium emulado; Safari/iOS, Android físicos, lectores de pantalla y haptics reales pendientes. Sin commit, push ni despliegue.

## 63. Atmósferas fotográficas aprobadas (2026-10-05)

Tras validar una preview estática, Víctor pide implementar los fondos propios de Inicio, Nutrición y Gym. Se generan escenas sin UI/texto y se integran mediante `AtmosferaApp` y tokens compartidos: fotografía secundaria, overlay, desaturación y desvanecimiento; variantes discretas para Referencias/Ajustes y claro. Sin añadir altura decorativa, animación o dependencia; capas, acciones, datos y cálculos intactos. Tres WebP locales suman 175.712 bytes y funcionan offline mediante precache; prompts/procedencia documentados.

Principios en [DESIGN](../DESIGN.md), implementación en [DESIGN-SYSTEM](DESIGN-SYSTEM.md), arquitectura en [ADR 013](decisiones/013-atmosferas-fotograficas.md) y evidencia en [informe](historico/atmosferas-fotograficas-2026-10-05.md). Sidecar Impeccable sincronizado.

**Verificación**: 1.208 tests / 66 archivos y build TypeScript/Vite/PWA correctos; 514 estados, 12 contextos de motion y producción offline con imágenes presentes en CacheStorage, decodificadas y datos intactos. Revisión visual inicial conjunta móvil/escritorio y ambos temas; no necesita otra tanda de cambios. Detector: cero hallazgos principales y un aviso preexistente no bloqueante. Sin script de lint separado. Chromium emulado; Safari y dispositivos físicos pendientes. Sin commit, push ni despliegue.

## 64. Atmósferas propias del tema claro (2026-10-06)

Víctor pide el equivalente para claro y fotografías distintas que encajen con él. En `feat/atmosferas-tema-claro` se generan escenas de luz natural para Inicio, cocina/meal prep y Gym, con velo marfil y fade más rápido. `AtmosferaApp` selecciona una sola foto mediante el tema resuelto existente; Claro/Oscuro/Sistema actualizan escena y tokens juntos. Oscuro conserva su apariencia. Sin cambios de datos, cálculos, navegación, motion ni dependencias.

Los nuevos assets añaden 156.792 bytes; los seis suman 332.504, con prompts/procedencia y precache offline. Se actualizan [DESIGN](../DESIGN.md), sidecar/surface Impeccable, [DESIGN-SYSTEM](DESIGN-SYSTEM.md), arquitectura y [ADR 013](decisiones/013-atmosferas-fotograficas.md). Evidencia y límites en [informe](historico/atmosferas-tema-claro-2026-10-06.md).

**Verificación**: 1.212 tests / 66 archivos, TypeScript/build Vite/PWA y producción offline correctos. Recorrido de 44 estados de navegación/sesión/tema con tamaños de 320 a 1440 px, texto al 200%, Reduce Motion, Forced Colors y backups intactos. Revisión visual acotada inicial/confirmación; sin cambios extra de pulido. La confirmación estabilizada encuentra desbordamiento previo en campos de objetivos de Ajustes al 200%, documentado fuera del alcance de fondos. Detector sin hallazgos principales, un aviso preexistente no bloqueante; sin script de lint separado. Chromium emulado; Safari y hardware iOS/Android pendientes. Sin commit ni push.

## 65. Catálogo de ejercicios y selector compartido (2026-10-06)

Víctor pide 100–150 ejercicios comunes, búsqueda/filtros, recientes y personalizados para evitar escribir cada ejercicio. En `feat/catalogo-ejercicios` se añaden 116 definiciones editoriales locales con ids estables, músculos principales/secundarios y equipo. ModalPage compartida entre rutinas y sesión, chips combinables y recientes derivados de las series. Personalizado conserva formulario al fallar y queda disponible después; selección/primera serie transaccional.

Se mantienen los ids numéricos de rutinas/series y los valores históricos; catálogo separado de datos personales, lectura sin escritura y enlace exacto solo al seleccionar. Campos opcionales conservan Dexie v6/backup v2. No hay nuevas dependencias, red, tabla de recientes ni funciones futuras ficticias. Decisión en [ADR 014](decisiones/014-catalogo-ejercicios-local.md), flujo en [Gym](features/gym.md), datos/arquitectura/diseño y sidecar Impeccable actualizados. Evidencia y límites: [informe](historico/catalogo-ejercicios-2026-10-06.md).

**Verificación**: 1.236 tests / 68 archivos y build TypeScript/Vite/PWA correctos. 32 estados en ocho contextos de catálogo/rutinas/sesión, caso adicional de viewport reducido y cierre bloqueado/reintento, doce contextos de motion. Producción abre catálogo por primera vez offline en ambos temas con export intacto. Revisión visual acotada inicial/confirmación corrige título ampliado y protege espacio de lista; detector sin hallazgos. Sintaxis, sidecar JSON y diff check correctos; sin script de lint separado. Chromium emulado; hardware Safari/iOS/Android pendiente. Sin commit ni push.

## 66. Mapa muscular del entrenamiento terminado (2026-10-06)

Antes de cerrar `feat/catalogo-ejercicios`, Víctor solicita mapa muscular dinámico en resumen/historial. Se separan taxonomía, clasificación, carga por ejercicio, agregación, normalización y SVG original frontal/trasero de once grupos. Trabajo estimado desde series/reps/peso relativo por ejercicio, principales 1,0/secundarios 0,5; niveles relativos al máximo de sesión. «Cuerpo completo» sigue como filtro, pero sus ocho oficiales aportan músculos concretos. Personalizados específicos participan y desconocidos muestran cobertura, sin pintar zonas arbitrarias.

`workoutsRepo.terminar` guarda fin y snapshot semántico v1 (id/nombre/músculos), conservando series y backup v2/Dexie v6. Cierre idempotente/rollback; consultar no escribe. Sesiones antiguas usan asociaciones actuales con aviso, sin inventar su clasificación original. Detalle accesible en filas táctiles, temas/Forced Colors y texto ampliado. No interpreta intensidad fisiológica, fatiga, recuperación o riesgo; mapas temporales y nuevas medidas de esfuerzo quedan para después. Decisión en [ADR 015](decisiones/015-mapa-muscular-de-sesion.md); documentos vivos y sidecar/surface Impeccable sincronizados.

**Verificación**: 1.264 tests / 71 archivos y build TypeScript/Vite/PWA correctos. 32 estados del mapa en ocho contextos, 32 de catálogo y doce de motion con iPhone/Pixel emulados. Producción abre mapa y catálogo por primera vez offline en ambos temas, con export íntegro. Revisión visual inicial/confirmación ajusta nivel debajo del nombre con texto grande; sin palabras partidas, overflow ni targets pequeños. Se evita mezclar series previas durante consultas rápidas del historial. Detector sin hallazgos; sintaxis, JSON y diff check correctos. Sin script de lint separado; hardware físico Safari/iOS/Android y lectores de pantalla pendientes. Evidencia: [informe](historico/mapa-muscular-2026-10-06.md). Sin commit ni push.

## 67. Publicación del catálogo y mapa muscular (2026-10-06)

Víctor autoriza commit, push y merge de `feat/catalogo-ejercicios` a `master` mediante PR. Se publica conjuntamente el catálogo/selector y el mapa por sesión descritos en §§65–66, con sus tests y documentación. Se mantienen fuera del commit las carpetas locales `.agents/` y `.codex/`. La validación previa sigue en verde: 1.264 tests / 71 archivos, TypeScript/build, UI y producción offline; esta operación no cambia el código del producto.

## 68. Preview opt-in de fondo largo en Gym (2026-10-06)

Víctor solicita recuperar color y continuidad ambiental durante scroll, pero exige primero una prueba en Gym. En `feat/preview-fondos-gym`, `?preview=fondo-gym` activa exclusivamente el fondo de Gym oscuro: foto existente al 60% de saturación, brillo/contraste reducidos, velo menos opaco y máscara continua sobre dos radiales cálidos muy discretos a lo largo del contenido. Sin foto repetida/segunda cabecera, blur, fixed, scroll listeners, nuevas dependencias ni cambios de UI, layout, motion o datos. URL normal/otras secciones/Claro conservan su diseño. No se extiende ni publica definitivamente antes de feedback.

**Verificación**: 1.267 tests / 71 archivos y TypeScript/build correctos. Contraste ≥4,5:1, Playwright 320/375/430/1440 px, misma geometría/export, preview aislada, capas y Forced Colors. Revisión inicial/una tanda/confirmación; detector sin hallazgos principales, aviso de radio preexistente fuera de alcance. Capturas reales de cuatro tramos y scroll completo en `/tmp/appfit-preview-fondos-gym`. Evidencia, parámetros, archivos y límites: [informe](historico/preview-fondos-gym-2026-10-06.md). Chromium emulado, hardware Safari/iOS/Android pendiente. Sin commit ni push.

## 69. Extensión del fondo aprobado a toda AppFit (2026-10-06)

Víctor aprueba la preview de Gym y pide implementarla en toda la app. Se elimina el opt-in, el shell selecciona pares de luz por sección (Inicio cobre/piedra; Nutrición oliva/arena; Gym ember/ámbar), y conserva foto/velo enmascarados de 50 rem sobre radiales estáticos por toda la longitud. Claro usa sus imágenes propias y protección clara; Referencias/Ajustes atenúan foto y luces. Sin cambio de layout, superficies, contenido, controles, motion, datos o navegación; sin nuevos assets/dependencias ni trabajo ligado al scroll.

**Verificación:** 1.270 tests / 71 archivos, TypeScript/build y validación de producción offline correctos. Contraste ≥4,5:1 en ambos temas y los tres pares ambientales, incluyendo fade; recorrido aislado 320/375/430/1440 en oscuro/claro, datos/export intactos y capas/Forced Colors. Revisión conjunta y confirmación; capturas reales en `/tmp/appfit-fondos`. El script espera a Referencias antes de capturar, evitando un loading intermedio. Sin commit/push. Evidencia: [informe](historico/fondos-appfit-2026-10-06.md).

## 70. Tipografía Saira en tres voces (2026-10-06)

Víctor instala la skill `typography-selector` (davepoon/buildwithclaude, a nivel de usuario) y pide rediseñar la tipografía. Se preparan muestrarios estáticos fuera del repo con contenido real de la app: cuatro direcciones, cinco atrevidas y ocho combinaciones con las cifras de «Velocidad». Elige «Saira recta»: Saira local en una sola familia, títulos 900 condensados rectos, cifras en cursiva 800 condensada y lectura a ancho normal. Se sustituyen Barlow Condensed y Manrope por Saira variable recta/cursiva (OFL), tokens de peso/anchura/estilo, escala de títulos y métricas ~8 % mayor; sin cambios de layout, datos ni red. La skill propone Google Fonts por CDN; se descarta por la regla de red y las fuentes quedan en `public/fonts/`. Decisión: [016](decisiones/016-tipografia-saira.md).

**Verificación:** 1.270 tests / 71 archivos y TypeScript/build correctos. `validar-rediseno.cjs` (514 estados, 320/375/430 en ambos temas, vacío/normal/extremo y flujos) y `validar-build.cjs` (SW, offline, Saira cargada, export íntegro) correctos con Edge vía Playwright en lugar de Chromium. `validar-produccion.cjs` no se ejecutó (requiere perfil de pruebas). Sin hardware iOS. Sin commit/push.

## 71. Paleta Cobalto y composición respirada (2026-10-06)

Víctor instala en local las skills UI/UX Pro Max e impeccable (ignoradas en `.gitignore`, sin hooks ni subagentes) y pide una auditoría. Resultado: `/impeccable audit` 16/20 y 16 mejoras; contraste AA ya correcto, pero naranja repetido como acción y kcal, macros casi iguales con daltonismo (ΔE 1,8), acción/borrar casi iguales en claro (ΔE 3,5) y comidas como tres cajas apiladas. Entre cinco direcciones maquetadas elige **Cobalto** y pide un diseño más minimalista y respirado, con menos colores y una jerarquía cromática clara, sin cambiar funciones ni información, y que se apliquen las mejoras.

Cambios: tokens en OKLCH con grafito frío, cobalto para actuar, ámbar solo para kcal, P/C/G índigo/turquesa/arcilla, aviso en familia ámbar y mapa muscular en rampa de cobalto. Las luces de ambiente pasan a pizarra/niebla, arena/pizarra y cobalto/acero. Las cabeceras de comida pierden la placa grafito, el círculo y el divisor; cada comida es una `Card` con filas planas y «Añadir a…» en la nueva variante `subtle`. Pestañas sin carril, navegador de día sin línea ni caja, velo de cabecera como franja que se desvanece, panel del Diario sin título repetido ni separador, pestaña «Diario», «Hidratos», «Sin datos» discreto, pista de Gym corregida, sin «AF/» en la barra, menú sin contorno y paginador del abanico con tokens. Descartados con motivo: ocultar las kcal del registro único (lleva la marca «≈») y unificar papelera/«…» (velocidad de registro). Decisión: [ADR 017](decisiones/017-paleta-cobalto-y-composicion-respirada.md).

**Verificación:** 1.266 tests / 71 archivos (contraste más distancias ΔE nuevas entre macros, acción/borrar y kcal/acción) y TypeScript/build correctos. Detector impeccable sin hallazgos. Capturas con Edge vía Playwright a 375×812 en claro/oscuro con datos sintéticos (origen `appfit-test.localhost`, servidor del worktree): sin scroll horizontal, 0 controles <44 px y sin errores de consola. Nutrición mide ~200 px menos con más aire entre comidas. Los scripts `validar-*.cjs` se actualizan a «Diario» pero no se ejecutaron (requieren `/usr/bin/chromium`). Sin hardware iOS. Víctor revisa las capturas antes/ahora y pide commit y PR a `master`.

## 72. Fondo quieto al hacer scroll y foto más presente en claro (2026-10-06)

Víctor pide que la foto de fondo se quede quieta al bajar, para seguir viéndola, y después que en claro tenga más presencia (oscuro se queda igual). `AtmosferaApp` sale del contenido con scroll: es hermana de `main` dentro de un contenedor `relative isolate` del shell, centrada en la columna y bajo la safe area; foto y velo miden `min(100%, 50 rem)`. Sin `position: fixed`, eventos de scroll ni cambios de layout o datos. En claro la saturación sube a 85% y el velo baja de 76/88/95% a 71/86/90%, el mínimo que los tests de contraste aceptan sobre el negro fotográfico; oscuro fija su saturación (60%) para no heredar el cambio. Al rebasar sobre la paleta Cobalto (§71), su franja de lectura de cabecera pasa de la capa de la foto a `.app-view[data-atmosphere]::before`, para que se desplace con la cabecera y no tape siempre la parte alta de la foto quieta. `validar-fondos.cjs` comprueba ahora que la foto no se mueve en cada tramo de scroll.

**Verificación:** tests y build en verde. Capturas con Edge vía Playwright en `appfit-test.localhost` (320/375/1440, ambos temas, Inicio/Gym/Nutrición): la foto conserva su posición tras desplazar, sin scroll horizontal ni errores de consola. `validar-fondos.cjs` completo no se ejecutó. Sin hardware iOS. Víctor lo prueba en el servidor del worktree y pide commit y push.

## 73. Fondo quieto también en Gym y Referencias (2026-10-06)

Víctor ve que en Gym y Referencias la foto se sigue moviendo al hacer scroll, a diferencia de Inicio y Nutrición. Causa: esas secciones caben en la pantalla, `main` no tiene nada que desplazar y iOS entrega el gesto al documento, cuyo rebote arrastra a la vez foto y contenido (el `overscroll-behavior` estaba en `body`, que no se aplica al viewport). Arreglo solo en `index.css`: `html { overscroll-behavior: none }` y, en táctil (`pointer: coarse`), `.app-view[data-atmosphere]` con `min-height: calc(100% + 1px)` para que `main` siempre capture el gesto; el rebote queda dentro de `main`, sobre la foto quieta, como en las secciones largas. En escritorio no cambia nada (sin barra de scroll por 1 px).

**Verificación:** tests y build en verde. Edge headless con emulación táctil a 375×812 en `appfit-test.localhost`: `pointer: coarse` activo, Gym y Referencias pasan a tener 1 px de scroll en `main`, el documento no se desplaza y la capa de la foto no cambia de posición en ninguna sección. El rebote real de iOS no se puede reproducir aquí: queda por confirmar en el iPhone.

## 74. Sección Perfil con estimación energética (2026-10-06)

Víctor pide una sección principal que estime el gasto y el objetivo energético a partir de datos personales. En `feat/perfil` (desde `master`): gasto en reposo como media de Mifflin-St Jeor y Harris-Benedict revisada (Roza-Shizgal 1984), documentada como criterio de AppFit y no como método publicado; factor de actividad en cinco niveles (1,2–1,9) atribuidos a McArdle, Katch y Katch (1996) como convención, con la limitación PAL < 1,40 de FAO en Referencias; objetivo definición −200…−600 / volumen +200…+600 kcal en pasos de 100 (por defecto 400, campo `intensidadKcal`), aviso si el ritmo supera el 1 % del peso por semana, IMC < 18,5 bloquea el déficit y suelo max(TMB, 800 kcal). «Perfil manda»: los objetivos vigentes se derivan al leer (`perfilRepo.objetivosVigentes`: kcal del perfil y macros reescalados con `reajustarObjetivos`); sin perfil completo y objetivo, siguen los manuales. Se guarda `Settings.perfil` con la fecha de nacimiento; el peso es el último pesaje ≤ hoy. Sin Dexie v7 ni cambio de `BACKUP_VERSION`; `updateSettings` pasa a ser transaccional.

Menú de seis destinos (Inicio · Nutrición · Gym · Perfil · Referencias · Ajustes) en rueda 3+3 con dianas circulares de 84 px; el modo compacto conserva la rejilla rectangular. `SegmentedControl` gana `valor={null}` y la variante vertical con descripción. Nueva área Referencias › Energía y objetivo con fuentes (registro `fuentesEnergia.ts`); `referenciaNutricional` recibe el origen. Decisiones en [ADR 019](decisiones/019-perfil-y-estimacion-energetica.md) y [ADR 018](decisiones/018-menu-de-seis-destinos.md); flujo en [Perfil](features/perfil.md).

Verificación de fuentes: DOI y títulos cotejados con Crossref (Harris-Benedict 1918, Roza-Shizgal, Mifflin, Frankenfield, Henry, ten Haaf, Helms, Garthe, Iraki, Slater, Hall, EFSA); FAO, OMS TRS 894 y NICE NG246 comprobadas solo como URL accesibles. **Sin verificar**: edición y página del manual de McArdle, y la cifra de 600 kcal/día de NICE en NG246 (procede de CG189). Coeficientes de las ecuaciones cotejados con una fuente secundaria (Wikipedia: Harris–Benedict equation y Basal metabolic rate), no con el texto de los artículos originales (de pago); los tests fijan casos calculados a mano.

Tests de cálculo, validación, objetivos vigentes, repositorio (lecturas sin escribir, backup con/sin perfil), rueda a 320 px, estados de UI y SegmentedControl vertical; `guard.test.ts` y `contrast.test.ts` sin excepciones nuevas.

Rebasado sobre `master` actualizado (Saira §70, Cobalto §71, fondo quieto §72–73): conflictos en `index.css` (dianas circulares con el borde y el paginador tokenizado de Cobalto; `--menu-pages-offset` pasa a −19,375 rem), `arquitectura.md` y esta bitácora; los ADR de Perfil y del menú pasan a 019 y 018 porque 017 ya era la paleta Cobalto. Vitest excluye `.claude/**` (copias de trabajo de otras ramas) y `.gitignore` ignora `.claude/worktrees/`. **Verificación**: 1.348 tests / 77 archivos y build correctos. Navegador con Edge vía Playwright (instalado fuera del repo) en `appfit-test.localhost`, servidor propio en 5175 porque el de 5173 servía CSS anterior al cambio de Tailwind: 90/90 comprobaciones. Menú de seis sin solapes, dentro de pantalla y circular (84 px) a 320/375/430 en ambos temas; con texto al 200 % pasa a la rejilla. Flujo completo de Perfil (vacío, incompleto, menor de 18 y altura en metros rechazados, sin objetivo, 2.370 kcal que coincide con el cálculo a mano, −600/+600, IMC < 18,5, aviso «Objetivo actualizado», borrar y deshacer); Inicio, Diario y Ajustes (kcal en solo lectura) usan el objetivo derivado; salto a Referencias › Energía y objetivo con foco; export con el perfil y sin cifras calculadas; importar backups con y sin perfil. Sin scroll horizontal ni errores de consola. Producción: chunk de Perfil precacheado; Perfil y Referencias abren sin conexión. Los scripts `scripts/ui/validar-*.cjs` siguen sin ejecutarse (rutas a `/usr/bin/chromium` y puerto 5174 fijos). Sin hardware iOS. Sin commit ni push.

## 75. Evolución visual: acento naranja y superficies suaves (2026-10-07)

Víctor aporta una referencia visual (`images/`) y pide explorar, sin implementar, cómo refinar AppFit con ella sin perder su identidad ni hacer un mashup. Preview temporal en una copia del proyecto en el scratchpad (hoja `preview-evolucion.css` importada al final, sin tocar el repo) y capturas antes/después de Inicio, Nutrición, Entreno, Progreso y Perfil en claro y oscuro. Víctor la aprueba tal cual e indica integrarla.

Implementación solo en tokens y primitives ([ADR 020](decisiones/020-acento-naranja-y-superficies-suaves.md)): grafito neutro (claro 245/244/241 con superficies blancas, oscuro 10/11/13), un único acento naranja para acción/selección/foco con la barra de kcal en la misma familia, borrar a carmín en claro, rampa muscular naranja, radios 8/14/22/28 px, sección 32 px y card 20 px. Nuevas sombras `shadow-card` (Card, `.training-surface`, ListGroup agrupada; `none` en oscuro) y `shadow-control` (botón secundario, selector, Menú). `ListGroup` gana `variante` (`agrupada` por defecto, `plana` en la cadena de energía de Perfil y en el Sheet de acciones del plato). ViewTabs con barra corta y negrita; SegmentedControl y Menú en cápsula; nav sin línea; contexto de sección con icono naranja. `Button ghost` en grafito con el icono en acento; línea de peso e icono de las tarjetas de entreno neutros; Progreso en tres Cards; Inicio sin divisor sobre los accesos rápidos. `theme-color` del manifest y del HTML a `#0a0b0d`. `contrast.test.ts`: kcal debe quedar en la familia del acento (ΔE ≤ 10) y acción textual/borrar ≥ 8 (antes ≥ 15). DESIGN.md (frontmatter y prosa), DESIGN-SYSTEM, `.impeccable/design.json`, README, PRODUCT y el estado de ADR 017 actualizados.

**Verificación:** tests y build en verde. Capturas con Edge vía Playwright (instalado fuera del repo) en `appfit-test.localhost` con datos sintéticos, servidor propio en 5181: las cinco pantallas a 390 y 320 px en ambos temas coinciden con la preview aprobada, sin scroll horizontal ni errores de consola. Los scripts `scripts/ui/validar-*.cjs` no se ejecutaron (rutas a `/usr/bin/chromium` y puertos fijos). Sin hardware iOS. Sin commit ni push.

## 76. Imágenes de referencia en el selector de ejercicios (2026-10-07)

Cada fila de «Añadir ejercicio» muestra una miniatura de 48 px para reconocer el ejercicio sin depender del nombre. Fuente: free-exercise-db (The Unlicense, comprobada en el repositorio). Tubería manual `scripts/ejercicios/` (`imagenes.ts`, `mapeo.json`, README) con `sharp` como dependencia de desarrollo: descarga la foto mapeada, recorta a cuadrado, 192 px, WebP calidad 70 (2–7 KB), escribe `public/ejercicios/<slug>.webp` y `lib/ejerciciosConImagen.ts`; idempotente y valida que el mapeo cubra exactamente el catálogo. Mapeo editorial revisado a mano y con una hoja de contactos de todas las miniaturas: 101 con imagen, 15 sin equivalente fiel (`null`), listados en el roadmap junto a los dudosos. App: `imagenEjercicio` (puro, con test que también comprueba que cada archivo existe), `MiniaturaEjercicio` (hueco con icono para personalizados, sin imagen o `onError`), token `--thumb-size`/`thumb` y `--thumb-filter` (en oscuro `brightness(0.85)`; las fotos no son de fondo blanco sino de gimnasio, claras y con mucho rojo, así que un atenuado leve basta). No se amplían al tocar: la fila es un botón y anidar otro rompería accesibilidad y el objetivo de añadir. PWA: `globIgnores: ['ejercicios/**']` y `CacheFirst` en la caché `ejercicios` (200 entradas); el precache sigue en 34 entradas. Documentados gym, arquitectura, DESIGN-SYSTEM, herramientas, README y roadmap.

**Verificación:** 1.351 tests y build correctos. Edge vía Playwright (instalado fuera del repo) en `appfit-test.localhost`: selector a 320/375/430 px en ambos temas, sin scroll horizontal ni errores de consola, imágenes cargadas y filas de 72–90 px. `validar-catalogo-ejercicios.cjs` no se ejecutó (ruta fija a `/usr/bin/chromium`). Sin hardware iOS ni prueba offline de la caché de imágenes. Sin commit ni push.

## 77. Ilustraciones propias de ejercicios por lotes (2026-10-07)

Las fotos de free-exercise-db no convencen a Víctor; aporta una referencia de estilo (render anatómico 3D gris con el músculo trabajado resaltado, estilo Gym Visual). Se descarta copiar o licenciar esas imágenes (la licencia de Gym Visual, < 0,75 $/ilustración, prohíbe además usarlas como base para IA) y se prueba una imagen 2×2 con cuatro ejercicios en Artlist (Nano Banana 2.1, generación gratuita): estilo muy parecido, con errores técnicos en dos de las cuatro (barra sobre el cuello en press banca, asiento detrás en la sentadilla). Víctor prefiere generarlas con ChatGPT (plan gratuito, poco a poco) en lotes de cuatro.

`scripts/ejercicios/ilustraciones.json`: 29 lotes fijos de cuatro `[slug, postura en inglés, músculos a resaltar]`, cada ejercicio del catálogo una sola vez (validado). `imagenes.ts` escribe `prompts.md` (estilo común + cuatro posturas por lote, con ☐/✔), recorta cada cuarto de `ia/lote-NN.*` (−2 % por borde contra líneas divisorias, `trim` del blanco, cuadrado con 8 % de margen, 192 px, WebP 78, ~3 KB) y da prioridad a la ilustración sobre la foto; `ia/<slug>.*` sustituye un recuadro suelto (`--prompt <slug>` imprime su prompt). `ia/` queda fuera de Git. Trampa de sharp: `resize` se aplica antes que `extend` en la misma cadena, así que el margen va en un paso aparte. La app no cambia.

**Verificación:** recorte probado con la imagen de Artlist como lote ficticio (cuatro miniaturas de 192 px sin líneas divisorias) y revertido; tests y build en verde. Sin lotes reales todavía.

## 78. Ilustraciones de los 116 ejercicios (2026-10-07)

Víctor genera los 29 lotes con ChatGPT (1254×1254 px) y los deja en `scripts/ejercicios/ia/` como `1`…`29` (los tres primeros sin extensión); se renombran a `lote-NN.png`. Primer recorte con mitades fijas: dos fallos. (1) `bad extract area` en 87 recuadros: sharp aplica `trim` antes que `extract` dentro de una misma cadena; cada operación va ahora en su propio paso. (2) La IA no respeta las mitades: el thruster perdía las mancuernas, que invadían el cuarto vecino, y varios recuadros arrastraban trozos de otro. `cajasLote` busca el corte por la línea más blanca entre el 35 y el 65 % (horizontal por mitad izquierda/derecha y vertical por banda superior/inferior) y, en cada cuarto, descarta las componentes conexas (rejilla de 4 px) que tocan un corte y ocupan menos del 8 % de la tinta. Resultado: 116/116 ilustraciones, 358 KB en total (~3 KB cada una), sustituyen a todas las fotos; free-exercise-db queda como respaldo de la tubería.

**Verificación:** hojas de contactos de las 116 revisadas a ojo (postura, equipo y músculo resaltado coherentes; sin fragmentos vecinos); tests y build en verde. Sin revisión en navegador en esta entrada (el servidor de desarrollo se cerró por falta de memoria).


## 79. Inicio minimalista con rueda de energía (2026-10-07)

A Víctor no le acababa de gustar Inicio y pidió algo más minimalista. Lienzo de bocetos (390×844, ambos temas, tokens reales): A poda, B lista del día, C una cifra protagonista. Eligió C con las kcal como tarjeta pequeña algo mayor, en rueda; después rueda ancha frente a alta, negro frente a gris para lo que falta y tres formas del exceso (llena, segunda vuelta, color de aviso). Eligió ancha, negro y segunda vuelta, mantener «Registrar comida» y retirar la regla «sin anillo» ([ADR 021](decisiones/021-inicio-minimalista-rueda-energia.md)).

Inicio: «Hoy» + fecha, `TarjetaEnergia` (rueda SVG propia: tramos P/C/G por kcal 4/4/9, tramo `otros` para kcal sin desglose, resto en el token nuevo `kcal-rest`, segunda vuelta interior hasta una vuelta completa; geometría pura en `inicio/lib/anilloEnergia.ts`), `AccesoEntreno` y `AccesoPeso` sobre `TarjetaAcceso` (toda la tarjeta es un botón; el «+» del peso es hermano en la esquina) y «Registrar comida» como acción principal. Retirados por quedar sin uso: `TarjetaEntreno destacado` (y `.training-feature`), `ResumenNutricional` `integrado`/`accion`/`footer`/`tituloVisible`, `PesoCard`, `BrandMark`, `saludo.ts`, la mini gráfica (`puntosSparkline`, `serie30d`). `fraseVariacion` pasa a `inicio/lib/peso.ts` con test. Regla de CLAUDE.md: «sin halo ni contador animado». La foto de fondo de Inicio se mantiene (los bocetos no la llevaban; Víctor no pidió quitarla).

**Verificación:** 1.353 tests y build en verde. Edge vía Playwright (`playwright-core` en el scratchpad, fuera del repo) en `appfit-test.localhost`, servidor propio en 5182, datos sintéticos: escenarios normal, exceso con entreno en curso y kcal rápidas, vacío y cifras grandes (12.450 kcal, 145,6 kg) a 320/375/430 px en ambos temas; sin scroll horizontal, sin botones < 44 px, sin errores de consola. Recorrido: «+» abre Registrar peso, la tarjeta de peso abre el historial, Entreno abre Gym y Energía abre Nutrición. A 320 px el texto de energía pasa bajo la rueda. Sin hardware iOS. Sin commit ni push.

## 80. Mejoras funcionales: seguridad de datos, Gym, Nutrición y análisis (2026-10-07)

Plan de 26 puntos ejecutado de una vez en `feat/mejoras-funcionales` (sin commits), con dos ajustes de Víctor a mitad: la sugerencia de progresión (8) y las kcal extra en días de entreno (18) **no se implementan** (pasan al roadmap), la proteína por kg (17) va activada por defecto con rango 1,6–2,2 g/kg y el objetivo de agua (19) sale de EFSA por sexo.

**Esquema.** Dexie v7 con cinco tablas nuevas (`porciones`, `recetas`, `agua`, `objetivosDia`, `medidas`), backup v3 (importa v1 y v2) y campos opcionales sin versión (ADR 022). Tests de migración v6 → v7 y de ida y vuelta del backup.

**Datos y fallos básicos.** Aviso de copia en Inicio (`ultimaExportacion`, 14 días configurables, «Más tarde» 3 días). Descartar entreno en curso, «Terminar» con 0 series descarta. Detalle del historial convertido en vista de la pestaña (`DetalleEntreno`) con edición de horario, series, ejercicios, orden y notas, borrado con confirmación y recálculo del `muscleSnapshot`; registrar entreno pasado; borrar pesaje con «Deshacer» en línea; Mis ejercicios; reordenar ejercicios (`Workout.ordenEjercicios`).

**Gym.** Notas, series de calentamiento (excluidas de volumen, récords, mapa, progreso y precarga) y RIR en un menú por serie, récords (peso, 1RM Epley, repeticiones con un peso ya usado), objetivos de rutina con series precargadas con los últimos valores, descanso por ejercicio y pitido Web Audio, calculadora de discos y resumen semanal por grupo muscular.

**Nutrición.** Raciones propias que el intérprete reconoce como unidad (`unidadPropia`), recetas caseras como `Food` propio, proteína por kg, agua con objetivo EFSA, objetivo de cada día (snapshots escritos solo por acciones del usuario), adherencia, rachas y top de alimentos en Resumen.

**Cuerpo y análisis.** Gráfica del peso con media de 7 días (Recharts diferido), gasto observado (≥ 28 días, 80 % de registro, 2 pesajes por semana) con opción de usarlo, medidas corporales; exportación CSV para Excel (`;`, coma decimal, BOM).

**Fuentes.** DOI, título y año contra Crossref; cifras contra el texto de cada fuente: Morton 2018 (1,62 g/kg/día, IC 95 % 1,03–2,20, PubMed Central), Jäger 2017 (1,4–2,0 g/kg/día), EFSA 2010 (2,0 L mujeres y 2,5 L hombres de agua total, resumen de una copia archivada porque efsa.europa.eu devuelve 403). El 20 % descontado por la humedad de los alimentos es criterio de AppFit, y consta así en Referencias › Proteína y agua.

**Decisiones propias.** Precarga de rutina = últimos valores efectivos (sin sugerencia); Deshacer en línea dentro de Sheets y ModalPage porque el Toast queda debajo; un fallo al congelar el objetivo del día no estropea la acción principal; la variación de peso de Inicio no cambia a la media.

**Revisión posterior.** Objetivo de hoy siempre en vivo (el snapshot solo manda para fechas pasadas; `congelar(hoy)` hace upsert) y borrar/restaurar pesaje o perfil lo actualizan; importar una copia fija `ultimaExportacion` a su fecha. Validación en navegador (Edge headless con `playwright-core` instalado fuera del repo, en `appfit-test.localhost`, datos sintéticos, 320/375/430 px × claro/oscuro, capturas en el scratchpad): Inicio (aviso, agua, historial de peso con gráfica y borrado), Gym (registrar pasado, detalle y edición, Semanas, récords, Rutinas con objetivos, Mis ejercicios, sesión con menú de serie, discos, reordenar, notas, descartar y terminar sin series), Nutrición (recetas, raciones, «2 tostadas de pan bimbo» = 64 g, Resumen con adherencia), Perfil (proteína, gasto observado, medidas), Ajustes (CSV, recordatorio, barra, sonido) y Referencias. Sin scroll horizontal, controles ≥44 px, inputs ≥16 px y sin errores de consola. Fallos hallados y corregidos: «Mis ejercicios» (la vuelta de editar a la lista cerraba la ModalPage entera: ahora el editor es una segunda ModalPage), RIR como segmentos de 43 px a 320 px (ahora botones en rejilla de 3 columnas con «Sin dato») y el Toast tapando el último botón del detalle y de la sesión (más margen inferior).

**Verificación:** tests y build en verde; recorrido en Edge emulado. Sigue sin probarse en iPhone (ver roadmap).


## 81. Agua «−» en Inicio y decimales en los campos de nutrición (2026-10-07)

Rama `feat/agua-y-decimales`. **Agua:** la tarjeta de Inicio suma un «−» junto al «+» que quita la última toma del día (`aguaRepo.quitarUltima`) con «Deshacer» (la vuelve a añadir); desactivado con 0 ml. **Decimales:** al crear un alimento sin coincidencia, los valores por 100 g no admitían decimales: el `type="number"` con valor numérico controlado devolvía `''` (o `12` con «12,0») a medio escribir y `Number(...) || 0` pisaba el campo. Nuevo `DecimalInput` (y hook `useCampoDecimal`, también en `NumberStepper`): campo de texto con teclado decimal, acepta coma o punto, conserva el borrador mientras tiene el foco y muestra el valor con coma. Aplicado a `MacroInputs` (macros y nutrientes adicionales), `KcalRapidasSheet` y todos los `NumberStepper`. Parseo puro en `shared/lib/format.ts` (`esDecimalParcial`, `leerDecimal`, `decimalEditable`) con tests.

**Verificación:** tests y build en verde. Sin recorrido en navegador (Playwright no está instalado en el entorno) ni en iPhone.

## 82. Categoría en cada alimento (2026-10-08)

Rama `feat/categorias-alimentos`. Víctor preguntó cómo cuenta el café con leche en el agua (no cuenta: el agua es independiente del registro de comida y el 20 % del objetivo solo descuenta la humedad de lo que se come) y, en vez de sumar bebidas al agua, pidió que cada alimento tenga una categoría. Eligió: verla, filtrar, estadísticas; obligatoria al crear; los antiguos, revisados a mano ([ADR 023](decisiones/023-categorias-de-alimentos.md)).

- **Lista única**: las 29 categorías y las reglas de OFF pasan de `scripts/catalogo` a `nutricion/lib/catalogo/categorias.ts` (sin imports; la tubería lo importa con `.ts`). Tests de `categoriaDeOff` movidos con ella.
- **Datos**: `Food.categoria` opcional sin índice (sin versión de Dexie ni de backup). Obligatoria en `foodsRepo.crear`, `resolverParaGuardar` (crear) y `recetasRepo` (`CategoriaRequeridaError` / `RecetaInvalidaError`); `actualizar` sin ella la conserva; reutilizar un alimento antiguo le pone la del ítem. `foodsRepo.categoriasDeEntradas` la resuelve en vivo por `FoodRef`.
- **OFF**: `CAMPOS_OFF` pide `categories_tags` y `pnns_groups_2`; completo sin coincidencia → «Otros»; incompleto lleva la suya si encaja. Un `off` guardado sin categoría se vuelve a pedir al escanearlo con conexión.
- **UI**: `SelectorCategoria` en Alimentos (obligatorio), en recetas («Platos preparados» por defecto) y en la revisión cuando el ítem crea un alimento (`creaAlimentoNuevo` / `faltaCategoria` bloquean Guardar). Alimentos: «Filtrar por categoría», aviso de pendientes con «Revisar» y la categoría en cada fila. Revisión: «Tu alimento · Bebidas». Diario: «150 g · Carnes». Buscar/frecuentes: la categoría como detalle de los propios. Resumen: «Por categoría» (kcal, % y proteína; `repartoPorCategoria`).
- Fixtures de `scripts/ui/*.cjs` con `categoria` en los ítems y el paso de categoría en `validar-nutrientes.cjs` (no ejecutados: Playwright no está instalado en este entorno).

**Verificación:** tests y build en verde (lógica pura, repos y render estático de la revisión y del diario). Sin recorrido en navegador ni en iPhone.

**Iconos de categoría (mismo día).** Víctor pidió iconos o emojis por categoría, mostrados como icono y con el nombre al pulsarlos. Emojis no (regla de diseño y guard); 15 SVG propios por familia (`Icon` `cat-*`, contacto revisado a 48 y 20 px renderizado con sharp), mapa en `lib/iconosCategoria.ts` y `IconoCategoria` (toggletip de 44 px al lado de la fila). En Alimentos, Diario, Buscar/frecuentes y revisión sustituyen al texto de la categoría (el detalle de Buscar queda para la marca); en el Resumen se ven icono y nombre. Tests y build en verde; sin recorrido en navegador.

## 83. Pie de las comidas solo con iconos y cards más claras en oscuro (2026-10-08)

Víctor veía muy cargado el pie de cada comida («Añadir a desayuno» + «Repetir del día anterior (3)», que a 375 px partía en dos líneas) y, en oscuro, la card de la comida casi igual que el fondo. Antes de implementar pidió una preview (artifact con los tokens reales: cuatro opciones de acciones y cuatro de card). Eligió la fila de iconos con un «+» que se vea bien («+» sobre gris) y el tono más claro con borde fino, para toda la app.

- **Comidas** (`ComidaSection`): el pie de la card y la fila de una comida vacía son «+» (`IconButton` nueva variante `tonal`, velo `fg/10` que funciona sobre página y card) a la izquierda y Repetir (`copy`, `ghost`) con el número de ayer en una pastilla `aria-hidden` a la derecha; los nombres completos van en `aria-label` («Repetir desayuno del día anterior (3 alimentos)»; «Repitiendo…» con `aria-busy` y loader). Tests en `RegistroComida.test.tsx`.
- **Cards en oscuro** (`tokens.css`): Card default y ListGroup agrupada (no muted ni `.training-surface`) redefinen dentro superficie 38/39/44, `surface-muted`, `border`, `border-strong`, `selected` y `surface-elevated`, con borde visible y brillo interior arriba. ListGroup agrupada gana `border-transparent` para la geometría. `contrast.test.ts` añade el caso «card en oscuro».

**Verificación:** tests y build en verde. Edge headless (`playwright-core` fuera del repo) en `appfit-test.localhost` con datos sintéticos, Nutrición a 375 claro/oscuro y 320 oscuro: sin scroll horizontal ni errores de consola, botones de 44 px. Sin probar en iPhone.

## 84. Repetir con selección (2026-10-08)

Rama `feat/pie-comidas-y-cards-oscuro`. Víctor pidió que Repetir no copiase toda la comida del día anterior sino que abriese una tarjeta para elegir alimentos/platos.

- **UI**: Repetir abre `RepetirComidaSheet` con la comida del día anterior: un check por plato (entero, con sus ingredientes listados si tiene nombre propio) o entrada suelta, cantidad/conteo y kcal; todo marcado al abrir (repetirlo todo sigue siendo un toque más), «Desmarcar/Marcar todo», total de lo marcado y «Añadir a …» en el footer. Error en línea; al terminar, Toast «N entradas copiadas» con «Deshacer». `ComidaSection` pierde `ocupado`/`repitiendo` (el progreso va en el botón del sheet).
- **Datos/lógica**: `entriesRepo.copiar` admite `origen.ids`; `platos.idsElegidos` traduce la selección (claves desmarcadas) a ids. Tests en `entriesRepo.test.ts`, `platos.test.ts` y `RegistroComida.test.tsx`.

**Verificación:** tests y build en verde. Edge headless (Playwright de la caché de npx) en `appfit-test.localhost` con datos sintéticos (plato con nombre largo, entradas sueltas, kcal rápidas de 5 cifras), 320/375/430 claro/oscuro: sin desbordamiento ni scroll horizontal, controles del sheet ≥ 44 px, «Añadir» desactivado sin selección y solo se copian las marcadas conservando el plato. Sin probar en iPhone.

## 85. Pulido visual «precisión silenciosa» (2026-10-08)

Rama `feat/pie-comidas-y-cards-oscuro` (sin commit). Víctor pidió una auditoría visual para evolucionar AppFit sin rediseñarla. Se hizo con capturas reales (Edge con `playwright-core` fuera del repo, datos sintéticos en `appfit-test.localhost`) y un laboratorio en un artifact con los tokens reales, Saira y las fotografías: recreación «Actual» frente a variantes, informe y un control Sí/No/Otra por propuesta guardado en la base de datos del artifact. Marcó las quince propuestas y las variantes (P1-B, P2-B, P3-C, P4-C, P5-C, P6-C, P7-B, P8-B, P9-B, P10-B y P11–P15). Decisión: [ADR 024](decisiones/024-precision-silenciosa.md).

- **Barras** (`ProgressBar`, `tramosCarril.marca`): sin marca mientras no te pasas; carril en `bg-line`.
- **Inicio**: rueda con lo que falta en un carril de 6; a 20 rem o menos de tarjeta la rueda se centra (container query `energia`). Agua en `bg-fg-muted` con valor/unidad separados (`partesAgua`); acciones de peso y agua en neutro.
- **Diario**: chevrón del plato en la columna del icono (`.food-record-plato`), kcal de cabecera en una línea, Repetir con el número como texto. Macros siempre con `resumenMacros` («P 11 · C 57 · G 7»).
- **Cards**: títulos de sección fuera de la card en Perfil, Progreso y «Último entreno»; `Disclosure` sin línea duplicada tras una lista plana ni al final de una card (`.app-disclosure`, `.app-list-flat`).
- **Entreno en oscuro**: `--c-training` 50 51 56, `--c-training-track` 76 78 84 y borde `--c-training-border`; brillo interior como las cards.
- **Cifras**: kcal rectas en Alimentos y recetas; unidades fuera de `font-numeric` en el entreno en curso; `formatUltimaVez` con coma y grupos sin partir; fila y check de serie con `--radius-md`.
- **Resumen**: media diaria en card con `MacroBar` y navegador sin línea. **Progreso**: `escalaAjustada` (paso 1/2/5 × 10ⁿ), `chartGrid`, rótulo del último valor y nota del eje.
- **Nombres y fechas**: destino «Entreno» (antes «Gym»), primera vista «Empezar»; `formatDiaMes`, `formatFechaHora`, `formatFechaHoraConDia`; Historial con rutina · duración · volumen (`detalleSesion`). `scripts/ui/` navega a «Entreno».
- **Controles**: primario deshabilitado en neutro; «Nuevo» y «Nueva receta» secundarios.

**Verificación:** tests y build en verde. Edge headless en `appfit-test.localhost` con datos sintéticos: capturas de todas las secciones a 320/375/430 px en ambos temas y la matriz de `validar-rediseno.cjs` (copia adaptada: 320/375/430 × claro/oscuro × vacío/normal/extremo, 456 estados) sin desbordamiento, con controles de 44 px, campos de 16 px y sin errores de consola. Sin probar en iPhone.

## 86. Plan de mejoras de Entreno (2026-10-08)

Tras sincronizar master hasta `cb1e9c5`, Víctor aporta diez mejoras y pide un documento y ayuda para planificar, especialmente negativas, dropsets y agarres. Se crea [mejoras.md](../mejoras.md) en `feat/plan-mejoras-entreno` como propuesta viva: estado real del código, solución inicial por mejora, fases, dependencias, compatibilidad y preguntas abiertas. Roadmap enlaza al plan en lugar de duplicar las reglas de progresión.

Hallazgos relevantes: RIR ya persistido; notas solo del entreno; completar series es estado de sesión no incluido en el historial, y se guardan también series precargadas/no marcadas. La progresión exige distinguir realización confirmada y variantes comparables. Quitar ejercicio de una rutina solo en la sesión necesita recordar omisiones además de borrar series. Peso corporal, asistencia y unilateral afectan a volumen, récords, precarga y mapa; negativas y dropsets no deben compararse como series convencionales sin definir su semántica.

**Verificación:** únicamente documentación; `git diff --check` y enlaces nuevos comprobados. El código sigue en la misma base ya validada con 1.607 tests / 105 archivos y TypeScript/build correctos al sincronizar. Sin implementación, cambios de datos, commit ni push.

Víctor confirma posteriormente el alcance de gráficas: mostrar/ocultar curvas y métricas. Se actualiza el plan y se retira esa pregunta de las decisiones abiertas; no implica cambiar tipos de gráfica ni periodos.

Confirma también unilateral: datos comunes para ambos lados por defecto y opción para distinguir izquierda/derecha cuando haga falta. Queda registrado en el plan, sin implementar todavía.

## 87. Papelera de ejercicio por sesión, primera mejora (2026-10-08)

Rama `feat/quitar-ejercicio-entreno`. Víctor pide implementar las mejoras de una en una y parar tras la primera. Orden registrado en [mejoras.md](../mejoras.md): papelera, RIR visible, notas por ejercicio, gráficas configurables, peso corporal, unilateral, agarres, dropsets, negativas y progresión. Solo se implementa la papelera; RIR visible será el siguiente paso cuando indique continuar.

- `PanelEjercicio` comparte la papelera de cabecera en activo/editor del historial; detalle de lectura no ofrece borrado. `hooks/useQuitarEjercicio` comparte bloqueo, Toast Deshacer y foco al siguiente/anterior título o Añadir ejercicio. Deshacer devuelve el foco al panel restaurado.
- `workoutsRepo.quitarEjercicio` borra todas las series de ese ejercicio y guarda `Workout.ejerciciosOmitidos` en una transacción; no modifica catálogo, rutina ni otras sesiones. Sin ese campo, los ejercicios de rutina volverían a aparecer. El orden recordado se conserva; `restaurarEjercicio` devuelve ids/reps/kg/RIR/calentamiento y clasificación muscular histórica sin revertir notas, movimientos u otras omisiones. La UI retira/restaura sus marcas de completado; espera las escrituras de series pendientes y consulta el estado de sesión más reciente.
- `setsRepo.agregar` cancela la omisión si se vuelve a añadir desde el selector. Campo opcional sin índice ni migración: Dexie v7/backup v3 conservados, export/import probado.
- Impeccable guía una integración contenida con icono/primitive/tokens existentes. La revisión con texto al 200% detecta controles de cabecera y series comprimidos: se permite envolver controles y una container query distribuye series en dos columnas cuando no caben. El selector de duración existente del historial también desbordaba: se limita el ancho de `NumberStepper`, se permite encoger su campo y envolver su fila. No cambian cálculos ni comportamiento de registro.
- Documentación viva actualizada: plan/roadmap, Gym, datos, arquitectura, sistema de diseño, desarrollo y README. Sin dependencias nuevas de la aplicación, commit ni push.

**Verificación:** `npm run test` (1.620 tests, 106 archivos), `npm run build` (incluye TypeScript y PWA) y `git diff --check` correctos. No hay script de lint independiente; guard de diseño/acceso/contraste incluido en la suite. Detector Impeccable sobre los componentes afectados sin hallazgos. `validar-quitar-ejercicio.cjs` pasa ocho contextos Chromium efímeros en `appfit-test.localhost:5173`: 320/375/430 px en claro/oscuro, 375 px con texto al 200% y Reduce Motion, y escritorio 1440 px. Comprueba datos y otras sesiones intactos, Deshacer exacto/marcas/posición/foco, fallo y rollback, doble toque, recarga, reañadir mediante selector, historial/snapshot, ejercicio sin series y quitar todos los paneles. Capturas activo/historial inspeccionadas; informe en `/tmp/appfit-quitar-ejercicio/report.json`. Sin validación física de iOS/Android. Build conserva el aviso conocido de chunk >500 kB.

## 88. RIR, notas por ejercicio, gráficas y carga corporal, mejoras 2–5 (2026-10-08)

En la misma rama `feat/quitar-ejercicio-entreno`, Víctor autoriza continuar con los pasos 2, 3, 4 y 5. Se implementa ese bloque y se para antes de unilateral. [mejoras.md](../mejoras.md) recoge el estado y [ADR 025](decisiones/025-carga-corporal-y-notas-de-sesion.md) fija la semántica de carga y notas.

- **RIR:** selector visible por serie en `PanelEjercicio`, también en el editor del historial; «—» sigue significando sin dato y 0 es un valor distinto. Editarlo conserva la marca de completado. Las filas se redistribuyen mediante container queries cuando falta ancho, sin comprimir los controles táctiles. «…» conserva las acciones secundarias.
- **Notas:** `NotaEjercicio` usa Sheet y guarda `Workout.notasEjercicios` mediante transacción; la nota general permanece independiente. La última nota anterior terminada se consulta con fecha, sin copiarla. Guardado fallido mantiene el borrador para reintentar. Historial, backup y CSV conservan las notas.
- **Gráficas:** `ChartVisibility` comparte botones con texto e indicador de selección. Progreso permite ocultar métricas y separa los modos de carga; Nutrición permite ocultar Consumo/Objetivo. Ejes, tooltip y rótulos responden a las curvas visibles, sus colores mantienen identidad y ocultarlas todas ofrece un estado explicativo. Los datos textuales siguen accesibles y no se escriben preferencias nuevas.
- **Carga:** `CargaEjercicio` distingue externa, corporal, lastre y asistencia. `lib/carga.ts` centraliza formato, validación, cambio de modo y kg externos. Se propone el pesaje hasta la fecha de la sesión y se guarda un snapshot opcional, admitiendo masa desconocida. Cambiar modo reinicia kg para no reinterpretarlos; corregir masa conserva kg añadidos/de ayuda. La configuración se aplica a las series del ejercicio y solo las realmente modificadas pierden su marca.
- **Comparaciones:** volumen suma kg externos/lastre × reps; corporal y asistencia no suman tonelaje. Epley se limita a carga externa. Récords/Progreso comparan ejercicio + modo; menos asistencia exige reps comparables. Precarga, Última vez, nuevas series, mapa muscular y CSV expresan estos significados. El mapa corporal usa series/reps sin inferir precisión de esfuerzo a partir de la masa o ayuda.
- **Compatibilidad:** campos opcionales sin índices, Dexie v7/backup v3 conservados; registros antiguos siguen representando kg externos. Quitar/Deshacer también retira/restaura notas y configuración. Sin dependencias nuevas de la aplicación, commit ni push.

**Verificación:** `npm run test` (1.636 tests, 109 archivos), `npm run build` (TypeScript y PWA) y `git diff --check` correctos. No hay script de lint independiente; guards existentes de diseño, acceso y contraste pasan, y el detector Impeccable no encuentra incidencias en la UI nueva. `validar-mejoras-entreno.cjs` pasa ocho contextos Chromium efímeros en `appfit-test.localhost:5173`: 320/375/430 px en ambos temas, 375 px con texto al 200% y Reduce Motion, y 1440 px oscuro. Comprueba RIR, notas/errores, carga corporal/lastre/asistencia con masa desconocida, snapshots, marcas, Deshacer, recarga, historial, curvas y datos intactos, sin errores de página ni desbordamiento. Capturas revisadas de activo, notas y Progreso; informe en `/tmp/appfit-mejoras-entreno/report.json`. Regresión de la papelera con texto al 200% también correcta. Sin validación física de iOS/Android; permanece el aviso conocido de chunk >500 kB.

## 89. Unilateral, agarres, dropsets, negativas y progresión, mejoras 6–10 (2026-10-08)

Víctor autoriza completar el resto de [mejoras.md](../mejoras.md) en la misma rama `feat/quitar-ejercicio-entreno`, sin commit/push. Se implementan las cinco mejoras y se documenta el criterio en [ADR 026](decisiones/026-ejecucion-tecnicas-y-progresion-confirmada.md). No se añaden dependencias de aplicación, tablas, índices ni migraciones: Dexie v7/backup v3 conservados.

- `lib/ejecucion` separa ejecución, significado de kg, agarre, lados, técnicas, volumen y clave comparable. Unilateral permite ambos iguales o lados distintos, incluidos lados ausentes. Kg totales o por lado explícitos; cambiar interpretación vacía valores. Configuración de sesión y preferencia habitual opcional; cada serie conserva la utilizada.
- `EjecucionEjercicio` reutiliza Sheet/Select para configuración pertinente. `TecnicaSerie`, desde «…», usa un borrador Guardar/Cancelar para variante, datos por lado, tempo, solo negativas y bajadas de dropset con id estable. RIR por lado sigue directamente accesible. Una dropset cuenta una serie extendida y suma todos los tramos una vez; Deshacer restaura la semántica completa.
- Volumen, Última vez, precarga, mapa, récords, Progreso, historial y CSV integran esos datos. El mapa promedia lados, aplica un único techo de reps a la dropset y no inventa bonus por técnicas. Negativas se comparan en su variante, sin récords convencionales ni Epley; dropsets quedan fuera de curvas/recomendaciones convencionales. Agarre no reescribe músculos del catálogo.
- `SetEntry.realizada` registra explícitamente confirmación. Ausente permanece desconocida en histórico; false es pendiente y no cuenta como trabajo realizado. El editor permite confirmar series antiguas/pasadas. Cambiar datos físicos exige reconfirmar; RIR/tipo no desmarcan. Marcas se recuperan desde IndexedDB y sessionStorage queda para presentación/descanso. Al terminar se guardan todas las filas, con true/false según sus marcas; no se eliminan pendientes ni se infiere realización de una precarga.
- `lib/progresion` exige tres sesiones terminadas/comparables confirmadas y objetivo explícito. Propone incremento real tras dos al máximo o una repetición en una única serie sostenida; evita recomendar ante regresión o datos inválidos. Separa variantes/modos y excluye técnicas/tempo. Lastre/asistencia exige masa conocida/estable; asistencia nunca se propone negativa. Incremento/RIR son configurables, sin asumir preferencias del usuario.
- `ProgresionEjercicio` y el selector muestran señal, motivo y fechas; Aplicar/Mantener/Descartar guarda decisiones por propuesta/sesión. Aplicar revalida transaccionalmente, conserva ids existentes y crea las series objetivo faltantes, sin marcarlas realizadas ni copiar RIR histórico. Fallo revierte también esos cambios. Mantener/Descartar no modifica series.
- Documentación viva actualizada: mejoras, ADR, datos, Gym, arquitectura, sistema de diseño, identidad (confirmación persistida), desarrollo, roadmap y README. El alcance inicial queda completo; anatomía lateral, progresión independiente por lado y superseries/rest-pause se mantienen como ampliaciones futuras.

**Verificación:** `npm run test` (1.667 tests, 112 archivos), `npm run build` (TypeScript, Vite/PWA) y `git diff --check` correctos. Nuevos tests puros/de repos cubren lados, kg totales, ausencia, tramos, negativas, comparabilidad, RIR vacío/0, extremos, confirmación, precarga, snapshots, Deshacer/backup, datos escasos, regresión, propuestas obsoletas y rollback. Guards de diseño/acceso/contraste pasan; no existe lint independiente. Detector Impeccable sin hallazgos en los componentes nuevos/afectados.

`validar-tecnicas-progresion.cjs` pasa ocho contextos Chromium efímeros en `appfit-test.localhost:5173`: 320/375/430 px en claro/oscuro, 375 px con texto al 200% y Reduce Motion, 1440 px oscuro. Comprueba variantes, lados/asimetría, bajadas/tempo/negativas, cancelar, fallo/reintento, confirmación, Deshacer, recarga, selector y Aplicar, historial/editor y Progreso; sin desbordamiento, targets menores de 44 px ni errores de página. La revisión de capturas compacta controles secundarios y evita un RIR global engañoso en lados distintos. Informe/capturas en `/tmp/appfit-tecnicas-progresion`. Regresión de mejoras 2–5 en 375 oscuro también pasa (`/tmp/appfit-regresion-mejoras`). Sin prueba física iOS/Android; build mantiene el aviso conocido de chunk >500 kB.

## 90. Separar tareas del registro de entrenamiento y RIR compacto (2026-10-08)

Tras probar las diez mejoras, Víctor valida papelera, sugerencias y notas (numeración original 1/6/9), pero pide distinguir mejor carga corporal, unilateral, negativas, dropsets y agarres; RIR con −/+ en la fila y mayor claridad sobre las gráficas. Se trabaja en `feat/claridad-registro-entreno`. [mejoras.md](../mejoras.md) recoge su revisión; flujos actuales en [Gym](features/gym.md) y patrones en [sistema de diseño](DESIGN-SYSTEM.md).

- `PanelEjercicio` presenta carga y ejecución bajo «Ajustes del ejercicio». `OpcionEjercicio` comparte filas con tarea/valor actual, en lugar de botones mezclados. Progresión mantiene una fila visible propia; sus campos distinguen objetivo de reps y criterios para subir.
- `CamposEjecucion` separa ejecución y agarre. Carga muestra explicación del modo seleccionado y metodología bajo demanda. Carga/ejecución usan el footer persistente de Sheet para Guardar/Cancelar.
- Opciones de serie separa Ejecución y agarre, Negativas y tempo, Dropset. Cada fila abre su pestaña de `TecnicaSerie`; un único borrador conserva datos al cambiar de pestaña, se guarda atómicamente y Cancelar conserva el original. Las acciones permanecen fuera del scroll.
- `RirStepper` ofrece −/+ compactos con targets completos y estado «—» distinto de 0. Reducir desde 0 quita el dato. La fila mantiene Reps/Kg/RIR juntos en móvil normal; texto ampliado redistribuye controles. El borrador inmediato evita perder pulsaciones rápidas y revierte ante fallo. Se reutiliza para RIR por lado. No cambian fórmulas, modelo de datos ni criterios de progresión.
- Progreso antepone controles/gráficas al resumen de última sesión, rotula la visibilidad y explica las dos sesiones comparables necesarias. Expone también las reps ya calculadas en externa/lastre. Peso/1RM, reps y volumen conservan gráficas por unidad; Nutrición mantiene sus métricas y controles existentes.

**Verificación:** 1.667 tests en 112 archivos, TypeScript/Vite/PWA y `git diff --check` correctos. Guards de diseño/acceso/contraste incluidos; no existe lint independiente. Detector Impeccable sin hallazgos. `validar-mejoras-entreno.cjs` y `validar-tecnicas-progresion.cjs` pasan ocho configuraciones cada uno (320/375/430 px en ambos temas, 375 px texto 200%/Reduce Motion y 1440 px oscuro). Comprueban alineación RIR, límites/sin dato, pulsaciones rápidas, rollback, borradores entre pestañas, cancelar, carga/lados, propuestas, historial, recarga, gráficas y conservación de datos. Regresión `validar-quitar-ejercicio.cjs` correcta con texto 200%. Capturas revisadas de fila/activo, gráficas, ejecución, negativas y dropset; informes en `/tmp/appfit-claridad-mejoras-final`, `/tmp/appfit-claridad-tecnicas-final` y `/tmp/appfit-claridad-papelera`. Chromium emulado, sin validación física iOS/Android. Permanece el aviso conocido de chunk >500 kB. Sin dependencias nuevas, commit ni push.

## 91. RIR secundario y opciones en la misma fila (2026-10-08)

Víctor pide un RIR menor que los campos de reps/kg y mantener «…» en su fila. `RirStepper` elimina el fondo de pastilla y utiliza la cifra secundaria de 14 px, frente a 18 px de reps/kg. −/+ se apilan en una columna estrecha con targets completos; la rejilla conserva Serie/Reps/Kg/RIR/opciones en una fila a 320/375/430 px. Con texto ampliado mantiene la redistribución accesible. No cambian límites, guardado, marcas ni datos. Patrón actualizado en [sistema de diseño](DESIGN-SYSTEM.md), [Gym](features/gym.md) y [mejoras](../mejoras.md).

**Verificación:** 1.667 tests en 112 archivos, TypeScript/Vite/PWA y `git diff --check` correctos. Regresión de RIR/gráficas en ocho configuraciones y técnicas/lados con texto 200%/Reduce Motion; comprueba centros de Reps/Kg/RIR/«…», menor tamaño de cifra, targets ≥44 px, pulsaciones rápidas, rollback, historial y conservación de datos. Captura del panel real revisada; resultados en `/tmp/appfit-rir-compacto` y `/tmp/appfit-rir-compacto-tecnica`. Detector Impeccable sin hallazgos. Chromium emulado, sin prueba física iOS/Android; aviso conocido de chunk >500 kB. Sin dependencias nuevas, commit ni push.

## 92. Sincronización con los cambios de Codex (2026-10-08)

Víctor ha trabajado desde Codex en la nube (§86–91, PR #40 y #41) y pide actualizar en local lo necesario. `master` avanza por fast-forward hasta `15c3b4b`; `package.json` y el lockfile no cambian, así que no hace falta reinstalar. Los ajustes de documentación van en la rama `chore/docs-tras-codex`.

- **Documentos que contradecían al código** tras persistir `SetEntry.realizada` ([ADR 026](decisiones/026-ejecucion-tecnicas-y-progresion-confirmada.md)): README, [Gym](features/gym.md) y [arquitectura](arquitectura.md) seguían describiendo las marcas como ayuda visual de la sesión; Gym daba además volumen = Σ peso × reps y un mapa que contaba series «marcadas o no». ADR 009 y 015 tachan lo que sustituye ADR 026, como el resto de ADR.
- **Texto añadido al final del archivo en vez de en su sección**: README (tras Licencia → lista de Gimnasio), arquitectura (tras Despliegue → bloque de Gym), DESIGN-SYSTEM (en Trampas de UI → patrones de Gym), desarrollo (en Claude Code → Pruebas en navegador) y datos (junto a Notas/carga). [Arquitectura](arquitectura.md) añade `gym → inicio/data/pesosRepo` a la composición entre features.
- **Scripts de navegador**: los seis `scripts/ui/validar-*.cjs` que fijaban `/usr/bin/chromium` aceptan `APPFIT_CHROMIUM` como los demás; [desarrollo](desarrollo.md) explica una vez los requisitos comunes, en lugar de la ruta `NODE_PATH` del entorno de Codex.
- `mejoras.md` sigue en la raíz como plan vivo (la segunda entrega está pendiente de validación); al cerrarlo, pasa a `docs/historico/`.

**Verificación:** al sincronizar y tras los cambios, `npm run test` (1.667 tests, 112 archivos) y `npm run build` en verde, con el aviso conocido de chunk >500 kB; `git diff --check` y `node --check` de los scripts tocados correctos. Los recorridos de navegador no se ejecutan: solo cambia cómo eligen el ejecutable. Sin commit ni push.

## 93. Registro de series en la fila (2026-10-08)

Víctor pidió una revisión visual de Entreno: le gustan RIR, ejecución y agarre, negativas y dropsets, pero no cómo se integraron. Se le presentó una comparativa (capturas reales y opciones dibujadas con los tokens de AppFit, en un artifact) y eligió todas las recomendadas, manteniendo Reps · Kg. Rama `feat/registro-series-entreno` (lleva también los cambios de documentación sin commit de §92). Decisión en [ADR 027](decisiones/027-registro-de-series-en-la-fila.md); flujos en [Gym](features/gym.md) y patrones en [sistema de diseño](DESIGN-SYSTEM.md).

- **Fila:** tipo/número · Reps · Kg · RIR · ✓. El número muestra C/D/N y abre `MenuSerie` (tipo, bajada lenta, agarre de la serie, discos, borrar), que guarda al tocar. El ✓ pasa al final de la fila. Lados (I/D) y bajadas (↓) son filas hijas editables con conector; quitar una bajada tiene Deshacer.
- **RIR:** `RirSheet` (0 al fallo … 5+, «Quitar RIR») desde la celda; se abre al marcar una serie efectiva sin RIR, con el ajuste nuevo `rirAlCompletar` en Ajustes › Entreno. Desaparece `RirStepper`.
- **Variante y acciones del ejercicio:** botones bajo el título para carga, ejecución y agarre; hojas con opciones visibles (`SegmentedControl`, `FilterChips` de una opción) en lugar de desplegables. Nota, progresión, subir/bajar y quitar pasan al «…» de la cabecera; la sugerencia de progresión solo aparece si hay una propuesta pendiente. Desaparecen «Ajustes del ejercicio», `TecnicaSerie` y `OpcionEjercicio`; la ejecución ya no se cambia por serie.
- **Datos:** sin tablas, índices ni cambios de backup. `setsRepo.actualizar` acepta una función de la serie guardada para combinar lados y bajadas dentro de la transacción. Lógica pura nueva en `gym/lib/serie` con tests.
- **Scripts de navegador:** `validar-tecnicas-progresion.cjs` reescrito para el nuevo registro; `validar-mejoras-entreno.cjs` y `validar-quitar-ejercicio.cjs` adaptados al selector de RIR y al menú; `validar-catalogo-ejercicios.cjs` y `validar-motion.cjs` desactivan el RIR al completar en su fixture, y el primero compara con el estado ya marcado (marcar persiste desde ADR 026, por lo que ese script fallaba antes de este cambio).

**Verificación:** `npm run test` (1.681 tests, 113 archivos) y `npm run build` en verde, con el aviso conocido de chunk >500 kB. En Edge con Playwright (`appfit-test.localhost`, Vite en 127.0.0.1, datos sintéticos) pasan en sus ocho configuraciones (320/375/430 × claro/oscuro, 375 con texto al 200 % y Reduce Motion, 1440 oscuro) `validar-tecnicas-progresion`, `validar-mejoras-entreno`, `validar-quitar-ejercicio` y `validar-catalogo-ejercicios`. Capturas revisadas a 320/375 en ambos temas y con texto al 200 %, sin desbordamiento ni targets menores de 44 px. `validar-motion.cjs` sigue fallando antes de llegar a Entreno: espera una marca de destino activo en el menú radial que se retiró en la auditoría visual (§85); no se toca aquí. Sin prueba en iPhone. Sin commit ni push.

## 94. Catálogo de ejercicios ampliado a 204 y grupo Aductores (2026-10-09)

Víctor pide ampliar la lista de ejercicios y, como con la primera, los prompts para generar sus imágenes. Elige +40 (10 lotes de cuatro), repartidos por grupos y con foco en máquinas/poleas y peso libre. Se añaden en su grupo de `catalogoEjercicios.ts` (ids `appfit:*` nuevos, los existentes intactos):

- **Pecho:** press inclinado en máquina y en multipower, aperturas inclinadas, cruce de poleas de abajo arriba.
- **Espalda:** dominadas supinas, jalón supino, jalón unilateral, remo unilateral en polea, remo Pendlay, encogimientos con barra.
- **Hombros:** press en multipower, elevaciones laterales en máquina, remo al mentón, pájaros en polea, elevaciones frontales en polea.
- **Brazos:** curl bayesiano, curl araña, curl martillo con cuerda, curl con barra Z; extensión de tríceps unilateral en polea, press francés con mancuernas, fondos en máquina y en banco.
- **Pierna:** sentadilla péndulo, prensa horizontal, zancadas con barra, sentadilla sissy, curl femoral de pie, rumano en multipower, hip thrust en multipower, patada de glúteo en máquina, abducción en polea, sentadilla sumo, gemelos con mancuernas.
- **Core:** crunch en máquina, elevaciones de rodillas en silla romana, giros rusos, inclinaciones laterales, elevaciones de piernas tumbado.
- **Cuerpo completo:** peso muerto con barra hexagonal (participación propia en `PARTICIPACION_COMPLETA`).

En una segunda petición Víctor pide el apartado **Aductores**: zona nueva en `musculos.ts` (entre glúteos y gemelos, así que aparece en filtros, personalizados, mapa y resumen semanal), con forma propia en el mapa en las dos vistas (cara interna del muslo, provisional) y ocho ejercicios: aducción en máquina, en polea, con banda y tumbado de lado, plancha Copenhague, sentadilla cosaca, zancada lateral y aducción isométrica con balón. Peso muerto sumo y sentadilla sumo pasan a tener aductores como secundario (las sesiones ya cerradas conservan su snapshot). El test del catálogo pasa de 100–150 a 100–200 y comprueba que nombres y alias no se repiten entre ejercicios (`catalogoDeLocal` enlaza registros antiguos por coincidencia exacta). Imágenes: lotes 30–41 en `ilustraciones.json`; `mapeo.json` los deja en `null` para no mezclar fotos con las ilustraciones: hasta generarlos muestran el hueco con icono. Víctor quiere cambiar el muñeco del mapa: `scripts/ejercicios/mapa-muscular.md` reúne cuatro direcciones de estilo (vector plano, geométrico, anatómico suave, línea), cada una con hombre y mujer de frente y de espaldas, las doce zonas y la rampa `--c-muscle-*`; `imagenes.ts` lo añade al final de los prompts. Cuando elija, aportará la imagen de referencia para redibujarlo en SVG (anotado en el roadmap).

Tercera petición: otros 40 (lotes 42–51), con el mismo reparto: flexiones declinadas, press declinado con mancuernas, aperturas en polea en banco, press con mancuernas juntas; remo Seal, remo Meadows, rack pull, jalón en máquina; press militar sentado, elevaciones en Y, press con kettlebell, elevaciones laterales con banda; curl predicador con mancuerna, Zottman, en polea alta y en TRX; flexiones diamante, patada de tríceps en polea, extensión de tríceps en máquina y con banda; rodillo de muñeca, curl de muñeca por detrás; sentadilla con cinturón, zancadas caminando, sentadilla a una pierna, sentadilla isométrica en pared; glute ham raise, curl femoral con fitball, peso muerto con piernas rígidas; puente a una pierna, hiperextensión para glúteo, almejas, patada en cuadrupedia; gemelos tipo burro; hollow hold, escaladores, abdominales en V, crunch bicicleta y en banco declinado; empuje de trineo (cuerpo completo, con participación propia). Total 204; el test del catálogo admite hasta 250. Víctor pide además los prompts de esta sesión en otro archivo: `imagenes.ts` escribe `prompts.md` con la primera tanda (lotes 1–29, hechos) y `prompts-2.md` con los lotes 30–51 y el mapa muscular al final.

Sin cambios de Dexie ni backup: los músculos son cadenas en campos opcionales y un backup antiguo sigue siendo válido. Documentados gym, arquitectura, datos, ADR 014 y 015, DESIGN-SYSTEM, roadmap, README y el README de `scripts/ejercicios`.

## 95. Revisión semanal en Inicio (2026-10-09)

Víctor eligió la revisión semanal entre las propuestas de funcionalidades nuevas. Decidió que aparezca el lunes y se quede hasta cerrarla; los bloques (peso, nutrición, entreno, récords y agua) y el tono neutro se tomaron de la propuesta por defecto, a falta de respuesta explícita. Rama `feat/revision-semanal` desde `master`. Flujo y reglas en [Inicio](features/inicio.md).

- **Lógica pura** en `inicio/lib/revisionSemanal.ts` (con tests): semana revisada, cuándo sale, bloques de peso, nutrición, entreno, récords y agua, y `formatDiferencia`. Reutiliza `resumenSemanal` y `recordsDeEntreno` de Gym y `calcularAdherencia` de Nutrición, sin duplicar criterios.
- **Lecturas** en `inicio/hooks/useRevisionSemanal.ts`: la tarjeta no lee series (solo comidas, pesos, agua y entrenos); el detalle sí, y va en un chunk diferido para no pesar en el arranque de Inicio.
- **UI**: `TarjetaRevisionSemanal` (filas en una card, «Hecho» y «Ver revisión» neutros) y `RevisionSemanal` (`ModalPage` con flechas de semana; compone `ListaRecords` de Gym). «Hecho» con «Deshacer» en el Toast.
- **Datos**: campo opcional `Settings.revisionSemanalCerrada` (lunes de la última semana cerrada). Sin versión de Dexie ni de backup.

**Verificación:** `npm run test` (1.699 tests, 115 archivos) y `npm run build` en verde, con el aviso conocido de chunk >500 kB. Edge headless con `playwright-core` fuera del repo, Vite propio en 5182 y `appfit-test.localhost`, datos sintéticos: 320/375/430 px × claro/oscuro, cifras grandes a 320 oscuro y a 375 con texto al 200 %, y semana sin datos (sin tarjeta). Recorrido: tarjeta, detalle con sus cinco bloques, flechas (no pasa de la última semana cerrada; una semana vacía lo dice), volver, «Hecho», «Deshacer», «Hecho» y recarga (sigue cerrada). Sin scroll horizontal, sin botones < 44 px y sin errores de consola. A 320 px «Ver revisión» ocupa dos líneas. Sin prueba en iPhone. Sin commit ni push.

## 96. Ilustraciones de los lotes 30–51 y nuevo muñeco del mapa muscular (2026-10-09)

Víctor deja en `scripts/ejercicios/ia/parte2/` las 22 imágenes de los lotes 30–51 (`30.png`…`51.png`) y la imagen del mapa muscular en el estilo A (vector plano segmentado), y pide integrarlas.

- **Ilustraciones**: copiadas como `ia/lote-NN.png` y convertidas con `npm run ejercicios:imagenes`; los 204 ejercicios del catálogo tienen ya ilustración propia (88 WebP nuevos). Revisados los 88 recortes en una hoja de contactos: cada figura cae en su ejercicio, sin trozos de la vecina.
- **Mapa muscular**: en vez de redibujarlo a mano, `scripts/ejercicios/mapa-muscular.ts` (`npm run ejercicios:mapa`) traza la imagen (`ia/mapa-muscular.png`): segmenta las formas por las líneas blancas y el color, reparte los píxeles de las líneas a la forma más cercana, asigna cada forma a una zona con rectángulos simétricos por figura y escribe curvas cuadráticas con coordenadas enteras relativas. `mapaMuscularGeometria.ts` pasa a `CUERPOS.{hombre,mujer}.{frontal,trasera}` con silueta, detalles neutros y una forma por zona, en un viewBox común. Pesa unos 45 kB, así que `MapaMuscular` se carga con `React.lazy` en el resumen final y el detalle del historial (el bundle principal baja de 478 a 473 kB).
- **Estilo**: las formas se rellenan con surface-muted o su nivel y el hueco entre músculos es el trazo del color del fondo; la silueta va encima, sin relleno. Forced Colors: formas Canvas/Highlight con separaciones CanvasText.
- **Hombre o mujer**: decisión que el roadmap dejaba abierta. Se toma el sexo de Perfil (`gym/hooks/useFiguraMapa`): mujer si lo indica, hombre en cualquier otro caso, sin ajuste nuevo. Pendiente de confirmar con Víctor.

**Verificación:** `npm run test` y `npm run build` en verde. Edge con `playwright` fuera del repo, Vite en 127.0.0.1 y `appfit-test.localhost`, datos sintéticos (entreno terminado con press banca, remo, sentadilla, curl, hip thrust y press militar): detalle del historial a 320/375/430 px, claro/oscuro, hombre y mujer, y Forced Colors; sin scroll horizontal ni errores de consola, y el muñeco cambia con el sexo de Perfil. `validar-mapa-muscular.cjs` falla también en `master` antes de llegar al dibujo (espera pecho en nivel 5 tras «Guardar y terminar» y obtiene 0; su fixture es anterior a las series confirmadas); no se toca aquí. Sin prueba en iPhone. Sin commit ni push.

## 97. Rediseño visual v2 (2026-10-09)

Víctor pidió ejecutar entero el plan aprobado ese mismo día ([histórico](historico/plan-rediseno-visual-2026-10-09.md)). Antes de empezar respondió las preguntas abiertas: acciones de pantalla en neutro, «Más» como Sheet, flechas de semana en Nutrición, el calendario sustituye a «Semanas» y abre la sesión, una métrica cada vez en Progreso, fuera «Última vez», «Anterior» con su par en calentamientos/lados/bajadas y vaso vacío sin objetivo de agua. Al no autorizar commits, todo va en una sola rama `feat/rediseno-visual`, creada desde `feat/mapa-muscular-figuras` (pendiente de merge: póster e Inicio usan su mapa nuevo) en lugar de una rama por fase desde `master`. Sin cambios de esquema ni de backup.

- **E1 + M3 · Entreno en sesión**: columna «Anterior» (`gym/lib/anterior`: la última sesión terminada que empezó antes; calentamientos con calentamientos, efectivas por su número, lados y bajadas con su par; también en el editor del historial), rejilla de la serie por áreas con nombre (`.celda-*`), «Anterior» como columna desde paneles de 20,5rem y en línea propia por debajo. Cabecera del panel con miniatura y «Pecho · barra» (`lib/presentacionEjercicio`). Cabecera de grafito fija (estática con texto muy ampliado). Descanso en píldora flotante con −15/+15/Saltar (`session.ajustarDescanso`), sin desmontar los botones; los avisos suben por encima (`--nav-toast` redefinido) y la página deja sitio. Serie hecha: el tinte de éxito recorre la serie entera (`.series-set::after`), directo con Reducir movimiento. `formatUltimaVez` desaparece.
- **F1 + H1 + P1 · Cierre, historial y progreso**: `PosterSesion` (rutina en display, «vie 9 oct · 18:05 – 18:57», tres cifras con filetes y las figuras sobre grafito con una rampa propia, `--c-muscle-poster-*`) al terminar y en el detalle; `MapaMuscular figuras={false}` deja lista y metodología. Historial: calendario del mes con la rampa por volumen cuantizado (`lib/calendarioEntrenos`), semana compacta y sesiones del mes. Arreglado el orden: un test confirma que `workoutsRepo.terminados` ya devuelve de más reciente a más antiguo y se quita la segunda inversión de `Historial`. Progreso: cabecera con miniatura, selector segmentado, área al 12 %, último valor en grande, mejor serie / 1RM máximo / cambio y sesiones con su mejor serie (`datosProgreso.mejor`, `cifrasClave`). `ChartVisibility` sigue en el Resumen de Nutrición.
- **M7 · Rutinas**: cards con mosaico 2 × 2 de miniaturas («+N»), series objetivo, última vez (`lib/rutinas`, `cuandoFue`) y «Empezar».
- **NV2 · Navegación** ([ADR 028](decisiones/028-barra-de-pestanas-y-registrar.md), sustituye 008 y 018): barra Inicio · Nutrición · [+] · Entreno · Más; «+» abre `app/AccionesRapidas` (comida, empezar/volver al entreno con elección de rutina, peso y agua vía `inicio/components/RegistroRapido`); «Más» en Sheet. Fuera `RuedaNavegacion`, `rueda.ts`, tokens `--menu-*`, CSS del abanico y `validar-menu-radial.cjs`; `navegar.cjs` y los scripts que esperaban «Menú» o el título «Sesión guardada» se adaptan sin ejecutarlos. Acciones naranjas de pantalla a neutro (sobre grafito, `training-secondary`). Iconos nuevos `scale` y `droplet`.
- **I3 · Inicio**: rueda de energía igual; Peso con minigráfica SVG (`lib/miniGrafica`) y Agua con vaso (`nivelVaso`, acciones al pie) en la misma fila; Último entreno ancho con `MiniMapa` diferido y «Cuádriceps y glúteos, lo más trabajado» (`masTrabajados`). Fuera el botón «Registrar comida».
- **N1 · Nutrición**: `SemanaKcal` arriba del diario (`lib/semanaKcal`, `entreFechas` + `objetivosPorFecha`), flechas de semana y «Copiar el día» en el «…»; `ResumenNutricional` en carriles con el selector de detalle dentro. Comidas sin cambios.

**Verificación:** `npm run test` (1.715 tests, 119 archivos) y `npm run build` en verde. El build vuelve a avisar de un chunk de más de 500 kB: el `workoutsRepo` que antes iba en un chunk compartido aparte se funde con el principal al usarlo `AccionesRapidas` (unos 8 kB más de JS de arranque en total). Edge sin interfaz con `playwright` fuera del repo, el Vite ya abierto en 5173 y solo `appfit-test.localhost` con datos sintéticos (`importarBackup`): entreno activo (marcar, píldora y +15 con el foco conservado, cabecera fija), terminar → póster, calendario (orden descendente, abrir un día), detalle, Progreso, rutinas (Empezar), barra (+ → peso, empezar desde rutina, volver, comida; Más → Ajustes), Inicio y Nutrición (semana, semana anterior, vista detallada), a 320/375/430 px en claro y oscuro y 375 con texto al 200 % y Reducir movimiento. Sin scroll horizontal, sin controles por debajo de 44 px en el entreno y sin errores de consola. Con texto al 200 % se corrigieron la cabecera del panel (la miniatura pasa encima), las etiquetas de la barra (quedan para el lector) y la cabecera fija (vuelve a desplazarse). Los días del calendario y de la semana miden unos 37–39 px de ancho a 320 px. Sin prueba en iPhone ni ejecución de `scripts/ui/validar-*.cjs`. Sin commit ni push.

**Auditoría visual (misma sesión):** Víctor pide revisar que todo se ve bien antes del PR. Recorrido completo (Inicio, «+» y «Más», Nutrición Diario/Resumen/Alimentos, Entreno Empezar/Rutinas/Historial/detalle/edición/Progreso, entreno activo con RIR y descanso, terminar, póster, Perfil, Referencias y Ajustes) a 375 claro y oscuro, 320 claro y 430 oscuro, con hojas de contacto. Sin scroll horizontal, sin controles pequeños ni errores de consola (los únicos «recortes» detectados son textos `sr-only`). Dos ajustes: la miniatura del panel de ejercicio bajaba a su propia línea a 320 px (el título ahora pide 8 rem en lugar de 10 y solo se separa con texto ampliado) y la línea del objetivo de la semana de Nutrición se pegaba a la letra del día (la escala deja un 15 % de aire arriba).


## 98. Mapa muscular en rojo (2026-10-09)

Víctor pide que el mapa de calor corporal deje el marrón-naranja y vaya de un rojo más claro (menos trabajado) a un rojo más intenso (más trabajado).

- **Solo tokens** (`shared/design/tokens.css`): `--c-muscle-1…5` en claro van de rosa pálido 255/214/213 a rojo profundo 188/25/29 y en oscuro de rojo apagado 103/41/38 a rojo vivo 255/48/42 (el número claro del calendario obliga a que los niveles 1–3 sean oscuros); `--c-muscle-poster-1…5` (póster sobre grafito, igual en ambos temas) van de rojo pálido 233/186/186 a rojo intenso 240/33/33. Calculadas en OKLCH con ΔE ≥ 6 entre niveles vecinos. La misma rampa colorea el calendario del Historial, la leyenda, la lista de grupos y el mapa en miniatura de Inicio, así que todo pasa a rojo a la vez.
- **Rojo de borrar**: la rampa comparte familia con `destructive`; se acepta porque el mapa no es un aviso y siempre lleva niveles en texto. `DESIGN.md`, `DESIGN-SYSTEM.md`, `features/gym.md` y ADR 015 lo recogen.

**Verificación:** `contrast.test.ts` en verde (texto del calendario sobre cada nivel ≥ 4,5:1 en ambos temas). `npm run test` y `npm run build` en verde. Edge con `playwright-core` fuera del repo, el Vite ya abierto en 5173 y `appfit-test.localhost` con datos sintéticos: póster al terminar, lista de grupos y calendario del Historial a 375 px en claro y oscuro. Sin prueba en iPhone. Sin commit ni push.

## 99. Exploración de gamificación (2026-10-10)

Víctor pide investigar cómo gamificar AppFit, sin implementar nada: apps y videojuegos de referencia, propuestas, reglas de progresión y un artifact para compararlas.

- **Artifact** (privado de Víctor): https://claude.ai/artifact/4KYsAz8G3ss1WhV1E1no6a. Investigación de 27 apps y juegos y 11 estudios con fuentes, seis propuestas (Atributos, Liga fantasma, Tablón, Ritmo, Vitrina y Cumbres), maquetas con los tokens y piezas de AppFit, simulador de semana y evaluación con pesos.
- **Decisión de Víctor**: Atributos, Ritmo y Vitrina; Liga fantasma reinterpretada como una liga por ejercicio y Cumbres como sistema global, por concretar; rachas autorizadas si alguna función las necesita. Recogido en `gaming.md` (raíz) y enlazado desde el roadmap.
- Sin cambios de código ni de esquema. `DESIGN.md`, `PRODUCT.md` y ADR 021 siguen diciendo «sin rachas»: el ADR que los revise llega con la implementación.

**Verificación:** el artifact se probó fuera del repo en Edge sin interfaz (perfil temporal): todas las pestañas, las 288 combinaciones de maqueta (escenario × tema × ancho) y las semanas de ejemplo del simulador, sin errores ni scroll horizontal a 1280 y 390 px. Sin commit ni push.

## 100. Atributos: nivel y XP (2026-10-10)

Víctor pide aplicar la parte de Atributos de `gaming.md`, solo eso por ahora (Vitrina y Ritmo después; Liga y Cumbres en otras sesiones), e implementar lo que haga falta de Ritmo.

- **Decisión**: [ADR 029](decisiones/029-gamificacion-atributos.md), que recoge las salvaguardas y la autorización de rachas. `DESIGN.md`, `PRODUCT.md` y ADR 021 se actualizan en consecuencia.
- **Lógica pura**: `features/atributos/lib/atributos.ts` (XP derivada del historial, nivel, títulos, descanso y textos) y `features/ritmo/lib/plan.ts` (plan semanal por tramos y semana cumplida), con sus tests. Los parámetros son los de `gaming.md`; los títulos que faltaban (25 Curtido, 35 Experto, 40 Maestro, 45 Referente) y «Recién llegado» para los niveles 1–4 los elijo yo. Decisiones tomadas sin preguntar, porque Víctor no las contestó: plan por defecto 3 entrenos y 5 días, XP retroactiva (todo el historial cuenta), nutrición incluida con interruptor, y las tres pantallas exploradas (tarjeta en Inicio, página en Más y bloque al terminar), sin «Maestría muscular».
- **Datos**: solo campos opcionales de `Settings` (`planSemanal`, `gamificacionVisible`, `gamificacionConNutricion`). Sin versión de Dexie ni de backup. «Series efectivas» usa `esEfectiva`, así que el historial anterior a la confirmación de series cuenta.
- **UI**: `AtributosTab` (Más, diferida), `inicio/components/AccesoNivel`, `atributos/components/XpSesion` bajo los récords del fin de sesión (`WorkoutSummary.workoutId`) y `AtributosAjustes` en Ajustes. Destino `atributos` en `DESTINOS`/`EN_MAS`, icono `rank` y `BottomNav.ocultos`.
- **Rendimiento**: la primera versión tardaba unos 900 ms con un historial sintético de 500 entrenos y 12.500 series. `detectarRecords` copiaba el array en cada serie al agrupar (cuadrático). Ahora agrupa en su sitio y expone `acumularComparables`/`recordsFrenteA`, y Atributos compara con un historial que crece entreno a entreno: unos 60 ms, con el mismo resultado.

**Verificación:** `npm run test` (1.744 tests, 121 archivos) y `npm run build` en verde, con el aviso conocido de chunk >500 kB (el principal mide 543 kB; la página va aparte, en 7 kB). `git diff --check` correcto. Edge sin interfaz con `playwright-core` fuera del repo, Vite propio en 5182 y `appfit-test.localhost`, con datos sintéticos importados con `importarBackup`. Recorrido (79 comprobaciones, todas bien): tarjeta de Inicio, página de Atributos con los desplegables y «Ver más días», y Ajustes a 320/375/430 px en claro y oscuro y a 375 con texto al 200 % y Reducir movimiento. Además: terminar un entreno que suma (+275 XP, ×2 y tres récords, «Subes al nivel 14») y otro al tope semanal, cambiar el plan (se guarda un tramo), «Solo entreno» (desaparece Nutrición), «Ocultar» (sin tarjeta ni entrada en Más) y el estado sin datos. Sin scroll horizontal, sin botones por debajo de 44 px y sin errores de consola. Capturas revisadas. Sin prueba en iPhone ni con los datos reales. Sin commit ni push.

## 101. Ritmo y Vitrina (2026-10-10)

Víctor pide implementar Ritmo y Vitrina; Liga por ejercicio y Cumbres quedan para otras sesiones. Sin respuestas a las preguntas abiertas de `gaming.md`, tomo los parámetros que allí se proponían y elijo yo lo que faltaba. Todo queda recogido en el ADR 029 (ampliado) y en `docs/features/ritmo.md` y `vitrina.md`.

- **Ritmo** (`features/ritmo/`):
  - estado de cada semana (cumplida, parcial, presente o vacía);
  - hilo semanal, comodines (1 por 4 cumplidas, máximo 2), vueltas e hitos;
  - pausas total o de entreno, que rigen si cubren 4 días de la semana o más;
  - tarjeta «Tu semana» en Inicio, página en Más con el calendario del año, hoja «Pausar» y sello en la revisión semanal.

  Atributos toma ahora la semana cumplida de Ritmo, con las pausas incluidas.
- **Vitrina** (`features/vitrina/`):
  - 27 piezas retroactivas: Entrenos, Coleccionista de récords, Atlas completo, Semanas cumplidas, Hilo, Días registrados, Proteína, Herbario 30 y tres ocultos (Madrugador, Vuelta al ruedo y Descanso bien llevado);
  - muro de récords con la mejor marca vigente;
  - Herbario (`nutricion/lib/herbario.ts`, también en Nutrición › Resumen) y Atlas;
  - «Nuevo en la Vitrina» al terminar un entreno.
- **Elegido por mí**:
  - umbrales de Hilo, Días registrados, Proteína y Coleccionista;
  - que un entreno es siempre uno de 6 series efectivas o más, también para la presencia y los logros;
  - la clave de planta (nombre corto en singular aproximado);
  - los motivos de pausa, la regla de 4 días y que «Reanudar hoy» cierra la pausa ayer.

  Queda fuera la proteína opcional del plan semanal.
- **Datos**: solo `Settings.pausas` (las escribe `ritmo/data/pausasRepo` en una transacción), sin versión de Dexie ni de backup. Los interruptores pasan a llamarse `gamificacionVisible` y `gamificacionConNutricion` (no había nada publicado con el nombre anterior) y valen para los tres sistemas.
- **Código común**:
  - `calcularAtributos` devuelve también el Ritmo, los entrenos que cuentan y todos los récords;
  - `leerAtributos` se comparte entre `useAtributos` y `useVitrina`;
  - Inicio lee Atributos una vez para sus dos tarjetas;
  - `tailwind.config.js` añade `grid-cols-13`.
- **Arreglo**: en `RitmoTab` la hoja «Pausar» y el Toast compartían la key `1` (React avisaba de claves repetidas). La hoja usa ahora `pausar-N`.

**Verificación:** `npm run test` (1.771 tests, 127 archivos) y `npm run build` en verde; el chunk principal mide 496 kB y ya no sale el aviso de >500 kB. Todo el historial sintético denso (500 entrenos, 12.500 series y 8.000 entradas) se calcula en unos 150 ms en escritorio con la Vitrina y en unos 70 ms solo con Atributos y Ritmo.

Edge sin interfaz con `playwright-core` fuera del repo, Vite propio en 5182 y `appfit-test.localhost` con datos sintéticos (alimentos con categoría, entrenos a las 7:00). 155 comprobaciones, todas bien:
- Inicio, Atributos, Ritmo (calendario, lista de semanas y «Cómo funciona»), Vitrina (las tres vistas) y Ajustes, a 320/375/430 px en claro y oscuro y a 375 con texto al 200 % y Reducir movimiento.
- Terminar un entreno tras 21 días sin entrenar: «Vuelta al ruedo» en «Nuevo en la Vitrina».
- Pausar con motivo, «Reanudar hoy» y «Deshacer»; sello de Ritmo en la revisión; «Plantas distintas» en el Resumen.
- Plan, «Solo entreno» y «Ocultar»: sin tarjetas ni destinos.

Sin scroll horizontal, sin botones por debajo de 44 px y sin errores de consola. Capturas revisadas. Sin prueba en iPhone ni con los datos reales. Sin commit ni push.

## 102. Atributos: XP proporcional y el plan como tope (2026-10-10)

Víctor pide que un entreno con menos de 6 series efectivas dé experiencia (menos, pero que dé) y que la del entreno dependa del plan que se marca, no del descanso. Elige en las preguntas: XP proporcional, contar para el plan desde 5 series, quitar el multiplicador y aplicar el umbral de 5 también a la Vitrina.

- **Reglas** (`atributos/lib/atributos.ts`):
  - `xpDeEntreno`: 100 con ≥ 6 series efectivas (`SERIES_COMPLETAS`) y `round(100 × series / 6)` por debajo.
  - `SERIES_MINIMAS` pasa de 6 a 5: es el entreno que cuenta para el plan, Ritmo y la Vitrina.
  - Fuera el multiplicador de descanso y `ENTRENOS_EXTRA`: el tope semanal es el plan.
  - `VERSION_REGLAS` sigue en 1: las reglas anteriores solo estuvieron publicadas unas horas (PR #48, el mismo día) y la XP se recalcula sobre todo el historial.
- **Elegido por mí**:
  - si hay varios entrenos un día, suma el de más series (antes, el primero);
  - los entrenos cortos (< 5) suman mientras quede plan, pero no ocupan hueco, para que uno corto no le quite la XP a uno que cuenta;
  - un entreno sin series efectivas no suma.
- **Textos**: `descansoActual`/`textoDescanso` pasan a `entrenoHoy`/`textoEntrenoHoy` («Quedan 2 entrenos del plan esta semana»), en Inicio y en Atributos. «Cómo se gana XP», Ajustes, Ritmo y la Vitrina toman los umbrales de las constantes.

**Verificación:** `npm run test` (1.775 tests, 127 archivos) y `npm run build` en verde. Sin prueba en navegador ni en iPhone (solo cambian textos de la UI). Commit, PR y merge a petición de Víctor.

## 103. Liga por ejercicio: decisiones y lógica (2026-10-10)

Víctor pide planificar la Liga por ejercicio de `gaming.md` y decide: Élite a las 16 semanas (no 13), bajada gradual, variantes como el mismo ejercicio, «Mantener» en todos los ejercicios y básicos sin aviso, sin XP (solo logros) y todo dentro de Entreno (Progreso, sin destino en Más). Acepta la lista de básicos propuesta. Plan por fases en `gaming.md` y [ADR 030](decisiones/030-liga-por-ejercicio.md).

- **Fase 1, solo lógica** (`src/features/liga/lib`, sin pantallas):
  - `liga.ts`: semanas con cada ejercicio (primera sesión de la semana y último día), evolución semana a semana (sube una división; la primera semana sin él no cuenta y desde la segunda baja una; las pausas de Ritmo congelan; la semana en curso no baja), `divisionDe` (5 ligas × 3 divisiones y Élite), racha, fantasma, ascensos de un entreno y ciclos.
  - `basicos.ts`: sentadilla, press banca, peso muerto, press militar, dominadas y remo con barra; `avisarElite`.
- **Elegido por mí**: una semana cuenta con una serie efectiva con repeticiones (`tieneReps`, para los lados distintos); la racha la rompen dos semanas seguidas sin el ejercicio; el fantasma es el pico de las rachas anteriores, con el último día en que se alcanzó; el ascenso lo da la primera sesión de la semana por hora de inicio.
- Documentos: `docs/features/liga.md`, ADR 030, `arquitectura.md`, `CLAUDE.md` (mapa) y `gaming.md`.

**Verificación:** 22 tests nuevos; `npm run test` (1.797 tests, 128 archivos) y `npm run build` en verde. Unos 20 ms con 500 entrenos y 12.500 series en escritorio. Sin prueba en navegador: no hay interfaz. Sin commit ni push.

## 104. Liga por ejercicio: Entreno › Progreso (2026-10-10)

Fase 2 de la Liga, con el visto bueno de Víctor.

- **Lista** (`liga/components/LigasLista`): en Progreso, sin ejercicio elegido, sustituye a «Elige un ejercicio». Grupos de Élite a Bronce (`agruparPorLiga`), cada ejercicio con su racha o «Sin hacerlo desde…» y su división; «Sin liga ahora» y «Cómo funciona la liga» en desplegables. Tocar uno lo elige en Progreso.
- **Bloque** (`BloqueLiga`): entre la cabecera del ejercicio y la gráfica (o antes de «Aún sin sesiones terminadas»), una card con la división, la barra hacia Élite en grafito, qué pasa ahora (`textoSiguiente`), racha, pico anterior, veces en Élite y «Ver todas las ligas».
- **Lecturas**: `liga/hooks/useLigas` (entrenos terminados, todas las series y ajustes). Con la gamificación oculta, Progreso queda como antes.
- **Lógica nueva**: `semanasSin` y `hechaEstaSemana` en cada liga y `lib/textos.ts`.
- **Elegido por mí**:
  - elegir desde la lista devuelve el foco al selector de ejercicio (`Select` acepta ahora `ref`), que sube la vista y anuncia el ejercicio;
  - en Élite el texto no repite las semanas (ya están en «Racha»); en los básicos, «Es un ejercicio básico: es habitual mantenerlo mucho tiempo», sin decir «recomendable» hasta tener fuente;
  - mientras cargan las ligas no se muestra el estado vacío, para que no parpadee.
- Documentos: `liga.md`, `gym.md`, `DESIGN-SYSTEM.md` (Progreso y `Select`), `arquitectura.md` y `gaming.md`.

**Verificación:** `npm run test` (1.803 tests, 129 archivos) y `npm run build` en verde. Recorrido en Edge sin interfaz con `playwright-core` fuera del repo, Vite propio en 5182 y `appfit-test.localhost` con datos sintéticos (seis ejercicios: dos en Élite, uno básico, uno bajando, uno con la semana de gracia y uno sin liga): 320/375/430 px en claro y oscuro, 375 con texto al 200 % y Reducir movimiento, y la gamificación oculta. 114 comprobaciones, todas bien: grupos y orden, desplegables, foco al elegir, bloque encima de la gráfica, textos de Élite, básico y bajada, volver a la lista, selector, sin scroll horizontal, botones ≥ 44 px y sin errores de consola. Capturas revisadas. Sin prueba en iPhone ni con los datos reales. Sin commit ni push.

## 105. Liga por ejercicio: entreno activo y fin de sesión (2026-10-10)

Fase 3 de la Liga.

- **Entreno activo**: `EntrenoActivo` calcula la liga de cada ejercicio con lo que ya lee (`liga/hooks/useLigasSesion`: solo recalcula si cambian los entrenos terminados, sus series o las pausas, no a cada toque) y la pasa a `PanelEjercicio`:
  - en Élite y si no es básico, `AvisoElite` bajo los botones de ajuste, con la forma de la sugerencia de progresión: «Élite: llevas 17 semanas seguidas con este ejercicio»;
  - fila «Liga» con la división en el menú «…»;
  - `LigaSheet`: lo mismo que la card de Progreso (ahora `DetalleLiga`, compartido), «Este entreno cuenta al terminarlo» y «Cómo funciona la liga».
- **Fin de sesión**: `AscensosLiga` entre «Experiencia» y «Nuevo en la Vitrina», con los ascensos del entreno (`ascensosDeEntreno`). Los cambios de liga y Élite van a la vista; las subidas dentro de la misma liga, en un desplegable (`ascensoDestacado`).
- **Elegido por mí**:
  - la liga del entreno activo es la de antes de esa sesión, y la hoja lo dice;
  - el aviso no aparece en el editor del historial, solo en la sesión activa;
  - en el fin de sesión, para no repetir cada lunes una fila por ejercicio, solo los cambios de liga van a la vista;
  - icono `rank` para la Liga (la Vitrina usa `trophy`).
- Documentos: `liga.md`, `gym.md`, `DESIGN-SYSTEM.md`, `arquitectura.md` y `gaming.md`.

**Verificación:** `npm run test` (1.805 tests, 129 archivos) y `npm run build` en verde. El recorrido de §104, ampliado con un entreno activo de cinco ejercicios (uno en Élite, uno básico en Élite, uno en Diamante I sin hacer esta semana, uno bajando y uno sin liga) y su cierre, en Edge sin interfaz, 320/375/430 px en claro y oscuro y 375 con texto al 200 %: 198 comprobaciones, todas bien. Solo avisa el ejercicio en Élite que no es básico; el aviso y el menú abren la hoja; al terminar, «Entra en la liga», «Llega a Élite» y la subida de Platino III a Platino II en el desplegable, sin los ejercicios que ya contaban esa semana; sin scroll horizontal, botones ≥ 44 px y sin errores de consola. Capturas revisadas. Sin prueba en iPhone ni con los datos reales. Sin commit ni push.

## 106. Liga por ejercicio: alternativas y «Mantener» (2026-10-10)

Fase 4 de la Liga.

- **Alternativas** (`liga/lib/alternativas.ts`): hasta 5 ejercicios del catálogo o propios con el mismo músculo principal, sin el propio ni los que están en Élite. Orden: división más baja; a igualdad, los ya hechos alguna vez, los del mismo material y el orden del catálogo. Cada una con su estado: «Nunca lo has hecho», «Sin liga ahora» o la división.
- **«Mantener»** (`liga/data/ligaRepo.ts`, `Settings.ligaMantener`, opcional y sin versión, como `pausas`): el ejercicio deja de avisar en el entreno; «Volver a avisar» lo deshace.
- **Pantalla** (`components/VariarElite`, en la card de Progreso y en la hoja del entreno activo, solo en Élite):
  - «Si te apetece variar» con las alternativas (miniatura, nombre y «Bíceps · barra · Nunca lo has hecho»);
  - «Mantener este ejercicio» o, si ya lo está, «Volver a avisar», con su consecuencia y errores en línea;
  - en los básicos, sin «Mantener» y con las alternativas en el desplegable «Si aun así quieres variar».
- **Elegido por mí**:
  - las alternativas son información, no un botón de sustituir: para cambiar, se añade el ejercicio al entreno o a la rutina (sustituir en la rutina queda como opcional de la fase 5);
  - entre las de liga baja van primero las ya hechas alguna vez (técnica conocida) y luego las nuevas;
  - «Mantener» no lleva Toast con Deshacer: es un interruptor y «Volver a avisar» queda en el mismo sitio;
  - el texto de los básicos sigue siendo descriptivo; no he buscado fuente para decir «recomendable».
- Documentos: `liga.md`, `datos.md`, `DESIGN-SYSTEM.md`, `arquitectura.md`, ADR 030 y `gaming.md`.

**Verificación:** `npm run test` (1.809 tests, 131 archivos) y `npm run build` en verde. El recorrido de §105, ampliado con las alternativas (en la hoja y en Progreso), «Mantener» (se guarda `[2]` en ajustes y desaparece el aviso), «Volver a avisar» (vuelve el aviso) y el básico sin «Mantener», en Edge sin interfaz, 320/375/430 px en claro y oscuro y 375 con texto al 200 %: 254 comprobaciones, todas bien, con botones ≥ 44 px también en la hoja. Capturas revisadas: la etiqueta «Si te apetece variar» salía con estilo de título dentro de la hoja y pasó a un `h3` de etiqueta. Sin prueba en iPhone ni con los datos reales. Sin commit ni push.

## 107. Cumbres: decisión y motor (2026-10-10)

Víctor pide afinar Cumbres sin implementarla. Se comparan alternativas a subir una montaña (Caminos, Constelaciones y Temporadas) y se hacen maquetas de Cumbres y Caminos lado a lado: https://claude.ai/artifact/7RYQxMtyxzXcNszPEynA9M (privado de Víctor).

- **Decisión de Víctor**: las dos, por partes. Ahora Cumbres; Caminos cuando AppFit registre caminatas, carreras u otra actividad con distancia, y con kilómetros reales.
- **Propuesta para Cumbres, pendiente de confirmar**: montañas reales sin plazo, del mar a la cumbre, hitos cada 1.000 m, una sola tarjeta en Inicio (en lugar de la de Nivel) y arranque al elegir la primera montaña.
- **Motor**: Víctor no descarta la XP, pero pide alternativas de entreno y nutrición. Recogidas en `gaming.md` (XP, plan cumplido, semanas de Ritmo, fuerza real y series por grupo); recomiendo «plan cumplido». Después Víctor pregunta por recuperar los víveres: añadida la variante «etapas y víveres» (la etapa sin víveres queda preparada y se completa al registrar, sin perderse). **Víctor elige etapas y víveres**, con 800 m por semana de plan y medio víver los días con una sola comida; se implementará más adelante.
- Documentos: `gaming.md` (sección Cumbres reescrita) y `roadmap.md`.

**Verificación:** solo documentación y un artifact; sin cambios de código. Commit de la documentación de Cumbres a petición de Víctor, sin push.

## 107. Liga por ejercicio: Vitrina, sin récords y «Usar» en la rutina (2026-10-10)

Fase 5 y cierre de la Liga («termina lo que quede»).

- **Vitrina**: logro «Ciclos completados» (Entreno, 1 · 5 · 10 ejercicios distintos que llegan a Élite), retroactivo con la fecha y el entreno de la primera llegada de cada ejercicio (`liga/lib/liga.primerosCiclos`; `LigaEjercicio.ciclos` pasa a guardar también el entreno). `calcularVitrina` recibe las pausas. 30 piezas (22 sin nutrición).
- **Sin récords**: `liga/lib/estancamiento.sesionesSinRecord` (la detección de `gym/lib/records`, solo el ejercicio). En Élite, si no es básico ni mantenido y lleva 4 sesiones o más seguidas sin récord, el texto lo dice. En el entreno se calcula dentro de `useLigasSesion`, con la misma caché.
- **«Usar» en la rutina**: `gym/lib/rutinas.sustituirEnRutina` (puro: mismo lugar y mismo objetivo; error si ya está) y `routinesRepo.sustituirEjercicio` (transacción sobre rutinas y ejercicios; crea el del catálogo con `resolverSeleccion`) y `restaurar`. En `VariarElite`, cada alternativa lleva «Usar» si el ejercicio está en una rutina: en el entreno, la de la sesión («Este entreno no cambia»); en Progreso, las que lo incluyen, con selector si son varias. Lo hecho, en una línea con «Deshacer» en línea.
- **Elegido por mí**:
  - descartado «Explorador» (logro por probar 3 ejercicios nuevos), que el plan dejaba como opcional: empujaría a cambiar por cambiar;
  - el umbral de 4 sesiones sin récord y que el aviso de la cabecera no lo repita (solo el texto de la card y de la hoja);
  - «Usar» no pide confirmación: es una edición con «Deshacer», no un borrado.
- **Corregido de paso**: el README aún decía que el descanso multiplica la XP (retirado en §102).
- Documentos: `liga.md`, `vitrina.md`, `gym.md`, `datos.md`, `DESIGN-SYSTEM.md`, `arquitectura.md`, ADR 030, `roadmap.md`, `README.md` y `gaming.md`.

**Verificación:** `npm run test` (1.817 tests, 133 archivos) y `npm run build` en verde. El recorrido de §106, ampliado con una rutina en la sesión y un curl sin récords en 16 sesiones, en Edge sin interfaz, 320/375/430 px en claro y oscuro y 375 con texto al 200 %: 284 comprobaciones, todas bien. Entre ellas: el texto de sin récords; cinco «Usar» en Progreso; en la hoja, «Usar» cambia la rutina con su objetivo y «Deshacer» la devuelve; y la Vitrina muestra «Ciclos completados» con «2 de 5 ejercicios». Capturas revisadas. Sin prueba en iPhone ni con los datos reales. Sin commit ni push.
