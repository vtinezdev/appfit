# Sesión 01 — Resumen técnico

Fecha: 2026-09-27 → 2026-09-28
Estado al cierre de la sesión: **app funcional completa en local, pendiente solo de despliegue en Cloudflare**.

## Stack (versiones reales instaladas)

- Vite 8.3.x + `@vitejs/plugin-react` 6
- React 19.2, TypeScript ~6.0 (`strict` vía tsconfig de Vite por defecto)
- Tailwind CSS 3.4 + PostCSS/Autoprefixer
- Dexie 4 + dexie-react-hooks 1 (IndexedDB)
- Recharts 2.15
- vite-plugin-pwa 1.3 (⚠️ no 0.21 del plan original — 0.21 no soporta Vite 8)
- Vitest 5.0 (⚠️ no 2.x — 2.x tiene un Vite interno incompatible con Vite 8, daba error de tipos en `vite.config.ts`)
- Node 24.21, npm 11.19

## Estructura del proyecto

```
appfit/
├── docs/                     # documentación del proyecto (este árbol)
│   ├── PLAN.md                # plan original completo
│   ├── herramientas.md        # qué tecnologías se usan y por qué (nivel usuario)
│   ├── PROCESO.md             # bitácora acumulada de decisiones técnicas
│   └── progreso/               # histórico sesión a sesión (este documento vive aquí)
├── public/                    # favicon.svg, apple-touch-icon.png, icon-192/512.png
├── src/
│   ├── db.ts                   # esquema Dexie + tipos + getSettings/ensureSettings
│   ├── main.tsx / App.tsx / index.css
│   ├── vite-env.d.ts
│   ├── lib/
│   │   ├── dates.ts             # fechas locales YYYY-MM-DD, semana lunes-domingo
│   │   ├── nutrition.ts         # macros por gramos, agregados, distribución PCG
│   │   ├── workout.ts           # 1RM Epley, volumen, "última vez"
│   │   ├── gemini.ts            # fetch REST a Gemini, responseSchema, validación
│   │   ├── backup.ts            # export/import JSON completo
│   │   └── *.test.ts            # 26 tests Vitest (nutrition, workout, gemini)
│   ├── components/              # BottomNav, NumberStepper, Sheet, MacroBar, VoiceRecorder
│   └── pages/
│       ├── NutricionTab.tsx, GymTab.tsx, Ajustes.tsx
│       ├── nutricion/ (Hoy, AnadirComida, Resumen, Alimentos)
│       └── gym/ (GymHome, EntrenoActivo, Rutinas, Historial, Progreso)
└── .claude/launch.json          # config para levantar `npm run dev` desde el pane de Claude
```

## Modelo de datos (Dexie, `src/db.ts`)

7 tablas: `foods`, `entries`, `settings` (registro único id=1), `exercises`, `routines`, `workouts`, `sets`.

**Nota de tipado importante para quien toque `db.ts`**: las interfaces declaran `id: number` (NO opcional). Es intencional — con Dexie 4, si `id` fuera opcional, `EntityTable<T,'id'>` infiere que `.add()` puede devolver `undefined` y rompe el tipado en cascada. El propio `EntityTable` ya permite omitir `id` al insertar gracias a `InsertType`. No añadir `id?:` de vuelta.

## Estado por feature del plan original

| Feature | Estado |
|---|---|
| Scaffold Vite/React/TS/Tailwind/PWA/Dexie/Recharts/Vitest | ✅ |
| Nutrición: texto libre → Gemini → revisión → guardar | ✅ (probado con llamada real) |
| Nutrición: voz (MediaRecorder, mp4/aac/webm/ogg) | ✅ implementado, **no probado con micro real** (requiere HTTPS/dispositivo) |
| Añadido rápido sin IA (offline) | ✅ probado |
| Hoy (totales, barras, editar/borrar) | ✅ probado |
| Resumen semana/mes (gráficas Recharts) | ✅ probado |
| Alimentos (CRUD) | ✅ probado |
| Gym: entreno vacío / desde rutina, persistente | ✅ probado |
| Gym: entreno activo (+ejercicio, +serie, última vez) | ✅ probado |
| Gym: rutinas CRUD | ✅ probado |
| Gym: historial + detalle | ✅ probado |
| Gym: progreso (1RM, volumen, gráficas) | ✅ probado |
| Ajustes: API key, modelo, objetivos, backup, borrar todo | ✅ UI probada; export/import no ejercitado end-to-end |
| Tests Vitest (nutrition/workout/gemini) | ✅ 26/26 en verde |
| Build producción (`tsc -b && vite build`) | ✅ sin errores (aviso de bundle >500kB por Recharts, no bloqueante) |
| Despliegue Cloudflare Pages | ❌ pendiente — necesita cuenta de Víctor |
| Prueba en iPhone real (voz, home screen, offline, updates) | ❌ pendiente — necesita despliegue primero |

## Bugs reales encontrados y corregidos esta sesión

1. **`ReadOnlyError` de Dexie al arrancar**: `getSettings()` escribía (`put`) dentro de un `useLiveQuery`, prohibido por Dexie. Fix: `getSettings()` pasó a ser puramente de lectura; se añadió `ensureSettings()` llamada una vez en `main.tsx` fuera de cualquier liveQuery.
2. **Inputs de reps/kg invisibles en `EntrenoActivo`**: dos `NumberStepper` completos side-by-side no cabían en 375px. Fix: prop `compact` en `NumberStepper` (botones/inputs más pequeños), usada en las filas de series.
3. **Modelo Gemini retirado (`gemini-2.5-flash` → 404)**: Google dejó de dar acceso a `gemini-2.5-flash` a cuentas nuevas. Fix: `DEFAULT_MODELO` en `db.ts` → `gemini-3.8-flash`. Verificado con llamada real (con la API key de Víctor) tras el cambio: funciona de extremo a extremo (interpretación → revisión → guardado → totales correctos).

## Cómo retomar el trabajo

```bash
npm install       # si no se ha hecho tras un clone nuevo
npm run dev        # servidor local, http://localhost:5173
npm run test        # 26 tests, deberían pasar todos
npm run build        # build de producción a dist/
```

Para desplegar cuando haya cuenta de Cloudflare:
```bash
npx wrangler login
npm run build && npx wrangler pages deploy dist
```

## Pendiente / próximos pasos conocidos

1. Configurar cuenta de Cloudflare y desplegar.
2. Probar en el iPhone real: micrófono, "Añadir a pantalla de inicio", modo avión, actualización automática tras un nuevo deploy.
3. Ejercitar el flujo completo de exportar/importar backup con datos reales.
4. (Opcional, no urgente) el bundle de producción supera 500kB por Recharts; si algún día importa el tiempo de carga inicial, se podría cargar `Resumen`/`Progreso` con `import()` dinámico.
5. Vigilar que Google no vuelva a retirar el modelo de Gemini configurado (ver bug #3) — si vuelve a pasar, el fix es el mismo patrón: cambiar el nombre de modelo en Ajustes (o `DEFAULT_MODELO`).

## Git

`git init` ejecutado en la raíz del proyecto. **Sin commits todavía** — pendiente de que Víctor lo pida explícitamente.
