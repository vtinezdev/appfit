# Proceso: qué se ha hecho y por qué

Registro detallado de la ejecución de [`PLAN.md`](./PLAN.md), en orden cronológico. Sirve como referencia de las decisiones tomadas, no solo de los pasos.

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
