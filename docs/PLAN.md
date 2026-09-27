# Plan: AppFit — PWA personal de nutrición y gimnasio (iPhone)

## Contexto
Víctor quiere una app privada para uso propio, sin publicarla en tiendas y con coste 0 €, con dos partes:
1. **Nutrición**: registrar comidas por texto o voz; un LLM interpreta lo comido y calcula los macros; resúmenes por día/semana/mes con objetivos.
2. **Actividad física**: iniciar entreno, registrar ejercicios, series, repeticiones y peso; rutinas plantilla; gráficas de progreso.

El móvil es un **iPhone**, así que un APK no sirve. La solución elegida es una **PWA** (web app instalable desde Safari con "Añadir a pantalla de inicio"), alojada gratis en **Cloudflare Pages**. Todos los datos (y la API key de Gemini) viven **solo en el móvil** (IndexedDB); el hosting solo sirve archivos estáticos.

Carpeta del proyecto: `C:\Users\Victor\Desktop\appfit` (vacía). En el PC hay Node + npm + git; no hay Android SDK (no hace falta).

**Primer paso al ejecutar:** copiar este plan a `C:\Users\Victor\Desktop\appfit\PLAN.md`.

## Stack (todo gratis)
- **Vite + React + TypeScript**, **Tailwind CSS** (UI en español, mobile-first).
- **vite-plugin-pwa**: manifest, service worker y uso offline.
- **Dexie** (IndexedDB) + `dexie-react-hooks` (`useLiveQuery`) para los datos locales.
- **Recharts** para las gráficas.
- **Gemini API free tier** vía `fetch` REST (sin SDK) con `responseMimeType: application/json` + `responseSchema`. El modelo se puede configurar en Ajustes (por defecto `gemini-2.5-flash`; comprobar en ai.google.dev qué modelo flash gratuito está vigente al implementar). El usuario pega la key de Google AI Studio en Ajustes.
- **Vitest** solo para lógica pura crítica.
- Deploy: `npx wrangler pages deploy dist` (cuenta gratuita de Cloudflare; el login lo hace Víctor).

## Estructura
```
src/
  db.ts                 # esquema Dexie + tipos
  lib/gemini.ts         # llamada a Gemini (texto o audio) -> items validados
  lib/nutrition.ts      # cálculo de macros por gramos, agregados día/semana/mes, normalización de nombres
  lib/workout.ts        # 1RM (Epley), volumen, últimas series de un ejercicio
  lib/backup.ts         # exportar/importar JSON
  lib/dates.ts          # helpers de fecha local (YYYY-MM-DD, semana lunes-domingo)
  components/           # BottomNav, MacroRing/Bar, VoiceRecorder, NumberStepper, Sheet/Modal
  pages/nutricion/      # Hoy.tsx, AnadirComida.tsx, Resumen.tsx, Alimentos.tsx
  pages/gym/            # GymHome.tsx, EntrenoActivo.tsx, Rutinas.tsx, Historial.tsx, Progreso.tsx
  pages/Ajustes.tsx     # API key, modelo, objetivos, backup
  App.tsx               # router de pestañas: Nutrición | Gym | Ajustes
```

## Modelo de datos (Dexie)
- `foods`: `++id, &nombreNorm, nombre, kcal100, prot100, carb100, grasa100, fuente('gemini'|'manual'), updatedAt` → caché/BD personal de alimentos (los valores editados por el usuario tienen prioridad).
- `entries`: `++id, fecha, comida('desayuno'|'comida'|'cena'|'snack'), foodId, nombre, gramos, kcal, prot, carb, grasa, textoOriginal, createdAt` (macros guardados como snapshot).
- `settings`: registro único `{apiKey, modelo, objetivos:{kcal, prot, carb, grasa}}`.
- `exercises`: `++id, &nombreNorm, nombre, grupo`.
- `routines`: `++id, nombre, exerciseIds[]`.
- `workouts`: `++id, inicio, fin, routineId?, notas`.
- `sets`: `++id, workoutId, exerciseId, [exerciseId+createdAt], orden, reps, peso, createdAt`.

## Funcionalidades

### Nutrición
1. **Añadir comida** (selector desayuno/comida/cena/snack, por defecto según la hora):
   - Texto libre ("200 g de arroz con pollo y una manzana"). También vale el dictado del teclado de iOS.
   - **Voz**: botón que graba con `MediaRecorder` (en iOS sale `audio/mp4`) y envía el audio en base64 (`inlineData`) a Gemini, que transcribe e interpreta en una sola llamada. Si el MIME no se acepta, se prueba `audio/aac`; como último recurso queda el dictado del teclado.
2. **`lib/gemini.ts`**: prompt en español con la lista de nombres de `foods` ya conocidos ("si coincide, usa exactamente ese nombre"). Esquema de respuesta: `{transcripcion?, items:[{nombre, gramos, kcal100, prot100, carb100, grasa100}]}`. Gramos estimados si no se dicen (ración típica). Validación de la respuesta (números ≥ 0, arrays) y errores claros (sin key, 429 por cuota, sin red).
3. **Pantalla de revisión**: lista editable (nombre, gramos, macros/100 g). Si el alimento existe en `foods`, se usan los valores locales. Al guardar se actualiza la caché `foods` y se crean las `entries`.
4. **Añadido rápido sin LLM**: recientes/frecuentes desde `foods` + gramos (funciona offline).
5. **Hoy**: totales vs objetivos (barras de kcal/P/C/G), comidas agrupadas y borrar/editar entradas; navegación entre días.
6. **Resumen**: pestañas Semana/Mes con barras apiladas de macros por día, media diaria y % de distribución P/C/G.
7. **Alimentos**: ver/editar/borrar la BD personal.

### Gym
1. **Inicio**: "Entreno vacío" o "Desde rutina", y un entreno activo en curso se reanuda (persistido en DB, sobrevive a cerrar la app).
2. **Entreno activo**: añadir ejercicio (buscador + crear nuevo); por ejercicio, lista de series con reps y peso y un botón "+ serie" que precarga la última serie; se muestra "la última vez: 3×8 @ 60 kg"; y "Terminar" guarda la hora de fin.
3. **Rutinas**: CRUD de plantillas (nombre + ejercicios ordenados).
4. **Historial**: lista de entrenos con detalle.
5. **Progreso**: selector de ejercicio con gráfica de línea del peso máximo, 1RM estimado y volumen por sesión.

### Ajustes
API key (input password), modelo, objetivos diarios, **Exportar/Importar JSON** (importante: los datos solo están en el móvil) y `navigator.storage.persist()` al arrancar.

## Detalles PWA para iOS
- `manifest`: `display: standalone`, iconos 192/512 y `apple-touch-icon` 180 (generar PNG simples).
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` y paddings `env(safe-area-inset-*)`.
- Inputs con `font-size ≥ 16px` (evita el zoom en iOS) e `inputmode="decimal"` en los números.
- Service worker con `registerType: 'autoUpdate'`.
- El micrófono requiere HTTPS: en el PC se desarrolla con `npm run dev` y la voz se prueba ya desplegada.

## Orden de implementación
1. Scaffold (Vite React TS, Tailwind, vite-plugin-pwa, Dexie, Recharts, Vitest), `db.ts`, navegación por pestañas y Ajustes con backup.
2. Nutrición por texto: `gemini.ts`, revisión, guardado, Hoy y objetivos.
3. Voz (`VoiceRecorder`).
4. Gym: ejercicios, entreno activo, rutinas e historial.
5. Resumen de nutrición y Progreso del gym (gráficas).
6. Build, deploy a Cloudflare Pages e instalación en el iPhone.

## Tests (solo lo crítico, Vitest)
- `nutrition.test.ts`: macros por gramos y agregados día/semana (límite lunes-domingo).
- `gemini.test.ts`: validación/parseo de la respuesta (JSON válido, campos faltantes o negativos).
- `workout.test.ts`: 1RM de Epley y volumen.

## Verificación end-to-end
1. `npm run test` en verde y `npm run build` sin errores.
2. `npm run dev` en el navegador del PC con vista móvil: meter la API key, registrar "150 g de pollo y 100 g de arroz", revisar y guardar, y comprobar Hoy/Resumen; hacer un entreno con 2 ejercicios y 3 series, terminarlo y ver Historial/Progreso; exportar, borrar datos e importar.
3. `npm run build && npx wrangler pages deploy dist`, abrir la URL en Safari del iPhone, "Añadir a pantalla de inicio", probar la voz, el modo avión (debe abrir y permitir el gym y el añadido rápido) y las actualizaciones tras un nuevo deploy.
