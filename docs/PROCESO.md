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
