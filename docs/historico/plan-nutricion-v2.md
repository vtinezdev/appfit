# Plan Nutrición v2 — Fase 0 (Cimientos) y Fase 1 (Registro rápido)

> **Histórico, no normativo.** Plan de Nutrición v2 (Fases 0 y 1), ejecutado en las sesiones 02 y 03 (`PROCESO.md` §14–§29). El estado actual está en los documentos listados en `CLAUDE.md` § Documentación.

> Plan aprobado el 2026-09-28. Cada paso numerado es **un commit propuesto**; no se hace ningún commit ni despliegue sin pedirlo expresamente.

## Contexto

La sesión 01 dejó la app funcional, pero la parte de Nutrición mezcla UI, acceso a Dexie e IA en los componentes (`AnadirComida.tsx` tiene 376 líneas). Además tiene fallos que afectan a los datos: medias engañosas, guardados no atómicos, procedencia de los alimentos que se pierde y un backup sin versionado que incluye la API key. La Fase 0 ordena el código por funcionalidades, crea una capa de repositorios y un backup v2, y arregla esos fallos. La Fase 1 añade lo que más se nota al registrar cada día: frecuentes con buscador, copiar comidas, plantillas, kcal rápidas y un Resumen navegable.

Decisiones ya tomadas contigo:
- Las recetas (A7) se dejan para más adelante. `meals` se diseña para que A7 llegue después con un campo opcional y sin migrar datos.
- P5: al editar una entrada, los cambios solo afectan a **esa entrada**. Una casilla «Aplicar también a «X» en Alimentos», desmarcada por defecto, permite corregir el alimento a propósito.
- Se adelantan a la Fase 0 el reintento ante 503 de Gemini (P10) y la carga diferida de las gráficas (`React.lazy`).
- Gym no se reestructura. Solo cambian sus imports y la línea de `Progreso` en `GymTab` para la carga diferida.

---

## 1. Comprobación de los problemas contra el código

| # | ¿Se confirma? | Detalle real |
|---|---|---|
| P1 | ✅ | `Resumen.tsx:25-26`: `mediaDiaria(macrosDeRango(entries, fechas))` divide entre **todos** los días del periodo, futuros incluidos. Pasa igual en la semana y en el mes. |
| P2 | ✅ | `Resumen.tsx:13` usa siempre `todayISO()`. |
| P3 | ✅ | `AnadirComida.tsx:175-188`: bucle `upsertFood` + `entries.add` sin transacción. `confirmarRapido` también hace dos escrituras sueltas. |
| P4 | ✅ | `AnadirComida.tsx:43`: todo alimento existente pasa a `'manual'`. Además, `construirRevision` sustituye los valores de Gemini por los locales, así que reutilizar un alimento sin tocarlo ya lo marca como manual. |
| P5 | ✅ **y peor** | Al guardar una edición se sobrescribe el alimento global con valores **reconstruidos desde el snapshot de la entrada** (redondeados, y quizá obsoletos) aunque no se toque nada. |
| P6 | ✅ | `AnadirComida.tsx:93,113`: `db.foods.toArray()` completo en cada llamada. |
| P7 | ⚠️ parcial | El orden es por `updatedAt`, que se actualiza al editar, al guardar con IA **y en cada añadido rápido**. Es decir, son «los últimos tocados», no «los editados». Lo de que no hay buscador ni frecuencia de uso sí se confirma. |
| P8 | ✅ | `Hoy.tsx:26-28`: borrado inmediato. |
| P9 | ✅ con matiz | La API key sale en claro y no hay despacho por versión. Pero los backups antiguos no «dejan de importarse» solos, porque eso solo pasaría si se exigiera `version: 2` o campos nuevos obligatorios. Los riesgos reales son otros: (a) `importarBackup` solo vacía las 7 tablas que conoce, así que una tabla nueva conservaría datos viejos tras importar; (b) los registros importados se saltan los `upgrade()` de Dexie; (c) importar sobrescribe la key del dispositivo. |
| P10 | ✅ | Un 503 acaba en el mensaje genérico `Error de Gemini (503)` con el body crudo. |
| **P11** (nuevo) | ✅ | `upsertFood` cambia `nombre` **sin recalcular `nombreNorm`**: renombrar en la revisión deja la clave única desfasada, y las búsquedas posteriores fallan o generan duplicados. |
| **P12** (nuevo) | ✅ | En Alimentos, guardar un nombre ya existente lanza un `ConstraintError` que nadie captura: el sheet no se cierra y no sale ningún mensaje. El buscador tampoco ignora las tildes («platano» no encuentra «Plátano»). |

Detectado pero fuera de alcance: `updateSettings` hace lectura y escritura en cada pulsación en Ajustes, con posibles carreras. Se arreglará en la Fase 2, que es cuando se tocan los objetivos.

---

## 2. Estructura final de carpetas

```
src/
├── main.tsx                      # se queda aquí (index.html apunta a /src/main.tsx)
├── index.css, vite-env.d.ts
├── app/
│   ├── App.tsx
│   ├── BottomNav.tsx
│   └── Ajustes.tsx               # pantalla transversal: key IA, objetivos, backup
├── shared/
│   ├── db/
│   │   ├── db.ts                 # clase AppFitDB(nombre='appfit'), versiones + upgrade(), export db
│   │   ├── types.ts              # Food, Entry, Meal, Settings, Exercise, Routine, Workout, SetEntry
│   │   ├── settings.ts           # DEFAULT_*, getSettings (solo lectura), ensureSettings, updateSettings
│   │   └── db.test.ts            # F1: migración v1→v2
│   ├── lib/
│   │   ├── dates.ts (+test)      # + periodos semana/mes (D1)
│   │   ├── format.ts             # round1 (hoy está duplicado)
│   │   ├── text.ts               # normalizeName, tokens de búsqueda
│   │   └── backup.ts (+test)     # export/import v2, migrarBackup
│   ├── ai/
│   │   └── gemini.ts (+test)     # generarJson: fetch, schema, errores en español, reintentos
│   └── components/
│       ├── Sheet.tsx, NumberStepper.tsx, VoiceRecorder.tsx
│       ├── SegmentedControl.tsx  # nuevo
│       └── Toast.tsx             # nuevo (deshacer)
├── features/nutricion/
│   ├── NutricionTab.tsx
│   ├── pages/        Hoy.tsx, Resumen.tsx, Alimentos.tsx, AnadirComida.tsx
│   ├── components/   MacroBar, MacroInputs, ItemRevisionCard, QuickAddGrid,
│   │                 KcalRapidasSheet, AccionesComidaSheet, PlantillasLista (F1)
│   ├── hooks/        useInterpretarComida.ts
│   ├── data/         foodsRepo.ts, entriesRepo.ts, mealsRepo.ts (F1)  (+ *.test.ts)
│   └── lib/
│       ├── nutrition.ts (+test)  # macros, agregados, resumenPeriodo
│       ├── alimentos.ts (+test)  # decidirGuardado, filtrarAlimentos, rankFrecuentes…
│       ├── plantillas.ts (+test) # F1: planCopia, itemsDesdeEntradas, entradasDesdePlantilla
│       └── prompts/interpretarComida.ts (+test)
├── pages/            GymTab.tsx, gym/*   # Gym sin cambios salvo imports
├── lib/              workout.ts (+test)  # Gym, se queda
└── test/
    ├── setup-db.ts               # import 'fake-indexeddb/auto'
    └── fixtures/backup-v1.json   # generado con el código actual (paso 0.0)
```

Los imports siguen siendo relativos, sin alias: así no hay que tocar la configuración de Vite ni de TS. Tampoco habrá barrels.

### Tabla de movimientos (se hacen con `git mv` para conservar el historial)

| Actual | Nuevo |
|---|---|
| `src/App.tsx` | `src/app/App.tsx` |
| `src/components/BottomNav.tsx` | `src/app/BottomNav.tsx` |
| `src/pages/Ajustes.tsx` | `src/app/Ajustes.tsx` |
| `src/db.ts` | `src/shared/db/db.ts` → se parte en 0.3 en `db.ts` + `types.ts` + `settings.ts`, y `normalizeName` pasa a `shared/lib/text.ts` |
| `src/lib/dates.ts` | `src/shared/lib/dates.ts` |
| `src/lib/backup.ts` | `src/shared/lib/backup.ts` |
| `src/lib/gemini.ts` (+test) | `src/shared/ai/gemini.ts` → se parte en 0.4: cliente aquí; prompt, schema y validación en `features/nutricion/lib/prompts/interpretarComida.ts` |
| `src/lib/nutrition.ts` (+test) | `src/features/nutricion/lib/nutrition.ts` (+test) |
| `src/components/Sheet.tsx`, `NumberStepper.tsx`, `VoiceRecorder.tsx` | `src/shared/components/` |
| `src/components/MacroBar.tsx` | `src/features/nutricion/components/MacroBar.tsx` (solo lo usa Hoy) |
| `src/pages/NutricionTab.tsx` | `src/features/nutricion/NutricionTab.tsx` |
| `src/pages/nutricion/{Hoy,Resumen,Alimentos,AnadirComida}.tsx` | `src/features/nutricion/pages/` |
| `src/pages/GymTab.tsx`, `src/pages/gym/*`, `src/lib/workout.ts` (+test) | sin mover (solo cambian los imports) |

---

## 3. Esquema Dexie y backup

**Fase 0: sin cambio de versión de Dexie.** Todo lo nuevo son campos opcionales sin índice o cambios de lógica.
- `Food.fuente` amplía su tipo a `'gemini' | 'manual'` (se añadirán `'etiqueta' | 'off'` en la F3; solo cambia el tipo TS).
- `getSettings()` pasa a fusionar los valores por defecto (`{...DEFAULTS, ...s, objetivos: {...DEFAULT_OBJETIVOS, ...s.objetivos}}`), así los campos nuevos de `settings` de fases posteriores no necesitarán `upgrade()`. Sigue siendo de solo lectura, sin `put` dentro de un liveQuery.
- `AppFitDB` se exporta y acepta `nombre` en el constructor (valor por defecto `'appfit'`) para poder testear migraciones con otra base de datos.
- Las interfaces mantienen `id: number` no opcional.

**Fase 1: `db.version(2)`**

```ts
// v1 (sesión 01): esquema inicial. No se toca.
this.version(1).stores({ /* igual que ahora */ })
// v2 (Nutrición v2, F1): tabla `meals` (plantillas, A1).
// Sin upgrade(): es una tabla nueva y vacía. `entries.rapida` (A5) es un campo opcional sin índice.
// Las tablas no mencionadas se heredan de v1.
this.version(2).stores({ meals: '++id, usadoAt' })
```

```ts
interface MealItem { foodId?: number; nombre: string; gramos: number
  kcal: number; prot: number; carb: number; grasa: number; rapida?: true }   // snapshot de respaldo
interface Meal { id: number; nombre: string; comida?: Comida; items: MealItem[]
  usos: number; usadoAt: number; createdAt: number }                          // A7 añadirá pesoCocinadoG?
interface Entry { /* …igual… */ rapida?: true }   // A5: gramos = 0, sin foodId
```

**Regla para futuras versiones** (se documenta en `db.ts` y en PROCESO): todo `upgrade()` que **transforme registros** tiene que tener su paso equivalente en `migrarBackup`, porque `bulkAdd` al importar se salta los upgrades. Añadir una tabla o un campo opcional no requiere ni upgrade ni una versión nueva del backup.

**Backup v2** (paso 0.11), en `shared/lib/backup.ts`:

```ts
interface BackupV2 { version: 2; exportedAt: string; dbVersion: number; incluyeApiKey: boolean
  foods; entries; settings; exercises; routines; workouts; sets    // obligatorias
  meals?: Meal[] }                                                  // opcionales: si faltan = []
export function migrarBackup(raw: unknown): BackupV2          // puro: v1→v2, valida, rechaza version > 2
export async function exportarBackup(opts?: { incluirApiKey?: boolean }): Promise<BackupV2>  // por defecto apiKey = ''
export async function importarBackup(json: string): Promise<void>
```
- **v1 → v2**: se validan los 7 arrays; `dbVersion: 1`, `incluyeApiKey: !!settings[0]?.apiKey`, `meals: []`. Los registros no cambian.
- **Importar**: es una transacción `rw` sobre `db.tables` (**todas** las tablas, no solo las que conoce hoy): lee la key actual, vacía todas las tablas y hace `bulkAdd` de las del backup. Para `settings` se usa la del backup, **salvo la apiKey**: si el dispositivo tiene una, se conserva; si no, se toma la del backup.
- Un backup con `version > 2` da el error «Este backup es de una versión más nueva de AppFit». `borrarTodosLosDatos` también pasa a usar `db.tables`.
- Ajustes: casilla «Incluir API key en el backup», desmarcada y sin persistir.

---

## 4. API de repositorios (los únicos que tocan `db.*` en Nutrición)

Tipos auxiliares (en `features/nutricion/lib/alimentos.ts`):
```ts
type Por100 = Pick<Food, 'kcal100' | 'prot100' | 'carb100' | 'grasa100'>
interface ItemGuardado extends Por100 { nombre: string; gramos: number; fuenteSiNuevo: Food['fuente'] }
```
**Identidad de un alimento = su `nombreNorm`.** La revisión ya no reutiliza por `foodId`: si renombras un ítem, pasa a ser otro alimento (se reutiliza si ese nombre ya existe o se crea si no). Esto arregla P11 sin renombrar alimentos globales por accidente. `buscarPorNombre` es el único punto de búsqueda, y ahí se añadirán los alias de E2.

**foodsRepo**
| Función | Notas |
|---|---|
| `listar(): Promise<Food[]>` | por `nombre` |
| `obtener(id)`, `buscarPorNombre(nombre)`, `buscarPorNombres(nombres): Map<nombreNorm, Food>` | la revisión se construye con una sola lectura (`anyOf`) |
| `crear(datos): Promise<number>` | `ConstraintError` → `NombreDuplicadoError` |
| `actualizar(id, patch)` | **tx rw foods**: recalcula `nombreNorm`, comprueba colisión y pone `fuente: 'manual'` y `updatedAt` |
| `borrar(id)` | las entradas conservan su snapshot; el `foodId` queda colgando (se tolera) |
| `recientes(n)` | solo F0: mantiene el orden actual por `updatedAt`; lo sustituyen A3 y los frecuentes |
| `resolverParaGuardar(item): Promise<number>` | **interno**: se llama siempre dentro de la transacción de quien lo invoca. Aplica `decidirGuardado`: *crear* con `fuenteSiNuevo` / *reutilizar* sin tocar nada (en F0 solo actualiza `updatedAt` para no alterar la rejilla de recientes; desde A3 ya no) / *actualizar* valores + `'manual'` |
| F1: `buscar(q, limite=20)` | en memoria con `filtrarAlimentos` |
| F1: `frecuentes({ comida, hoy, dias=60, limite=10 })` | lee `entries` por el índice `fecha` en esa ventana, ordena con `rankFrecuentes` y hace `bulkGet` de foods, descartando los borrados. Es de solo lectura, así que se puede usar en un liveQuery |

**entriesRepo**
| Función | Transacción |
|---|---|
| `delDia(fecha)`, `entreFechas(desde, hasta)` (`between`, sustituye a `anyOf`) | lectura |
| `guardarComida({ fecha, comida, items, textoOriginal? }): Promise<number[]>` | **rw foods+entries** (P3) |
| `editar(id, { comida, item, aplicarAlAlimento })` | **rw foods+entries**. Sin la casilla solo cambia la entrada (el `foodId` se mantiene); con ella, además `foodsRepo.actualizar(entry.foodId, …)` |
| `anadirDesdeAlimento({ fecha, comida, foodId, gramos })` | F0: **rw foods+entries** (conserva el `updatedAt` como hoy); F1: una sola escritura |
| `borrar(id): Promise<Entry \| undefined>` | **rw entries** (get + delete); devuelve la entrada para poder deshacer |
| `restaurar(entries: Entry[])` | `bulkPut`, que conserva los ids |
| F1: `anadirRapida({ fecha, comida, nombre, kcal, prot?, carb?, grasa? })`, `editarRapida(id, patch)` | una escritura |
| F1: `copiar({ origen: { fecha, comida? }, destino: { fecha, comida? } }): Promise<number[]>` | **rw entries** (lee el origen y hace `bulkAdd`) |
| F1: `borrarVarias(ids): Promise<Entry[]>` | **rw entries** (deshacer copias y plantillas) |

**mealsRepo** (F1)
| Función | Transacción |
|---|---|
| `listar()` (por `usadoAt` descendente), `borrar(id)`, `actualizar(id, { nombre?, items? })` | simple |
| `crearDesdeEntradas({ nombre, comida, entries })` | una escritura (items vía `itemsDesdeEntradas`) |
| `aplicar(id, { fecha, comida }): Promise<number[]>` | **rw meals+foods+entries**: recalcula con los valores **actuales** del alimento y usa el snapshot si se borró o es `rapida`; incrementa `usos` y actualiza `usadoAt` |

Regla Dexie: dentro de una transacción no puede haber un `await` que no sea de Dexie (nada de `fetch`). La IA siempre se llama antes, en la revisión.

---

## 5. Pasos — Fase 0 (Cimientos)

Al final de cada paso: `npm run build` y `npm run test` en verde.

**0.0 Preparación (sin tocar código)**
- Copiar el plan a `docs/roadmap/PLAN-nutricion-v2.md`.
- Arrancar `appfit-dev` y trabajar en un **origen limpio**, `http://appfit-test.localhost:5173`, que tiene su propia IndexedDB. Así no se tocan los datos ni la key real que hay en `localhost:5173`. Si Vite o el navegador no aceptan ese host, se usa `127.0.0.1` y, si hace falta, `--host`.
- Con la UI actual, crear datos sintéticos: 4 alimentos en Alimentos (uno con tilde, «Plátano»), entradas repartidas en 3 días y varias comidas (añadido rápido), una rutina y un entreno terminado con series.
- Exportar con `javascript_tool` (`(await import('/src/lib/backup.ts')).exportarBackup()`) y guardar el resultado en `src/test/fixtures/backup-v1.json` (la apiKey vacía). Esa base de datos se queda en v1 para probar el upgrade real en la F1.

**0.1 Infraestructura de tests**: `npm i -D fake-indexeddb` (solo dev y 0 bytes en el bundle; es el estándar para testear Dexie en Node). `src/test/setup-db.ts` y `setupFiles` en `vite.config.ts`. Tests de caracterización: `backup.test.ts` (importar el fixture v1 con el código **actual** → recuento por tabla) y `dates.test.ts` para las funciones que ya existen (`startOfWeek` en domingo, `monthDates` en febrero bisiesto, `addDays` al cambiar de mes).

**0.2 Mover archivos** según la tabla (`git mv` + imports, sin tocar el contenido). También los imports de Gym.

**0.3 Partir `db.ts`** en `db.ts`, `types.ts`, `settings.ts` + `text.ts` (`normalizeName`) + `format.ts` (`round1`, la versión con guarda de no finitos, que se usa en ambos sitios). `getSettings` fusiona los valores por defecto y la clase se exporta con `nombre`. Test: `getSettings` con un registro sin `objetivos.grasa` devuelve el valor por defecto.

**0.4 IA desacoplada**
- `shared/ai/gemini.ts`: `generarJson({ apiKey, modelo, parts, schema }): Promise<unknown>` y `GeminiError`, con los mismos mensajes que hoy.
- `features/nutricion/lib/prompts/interpretarComida.ts`: `buildPrompt`, `RESPONSE_SCHEMA`, `validarResultado` e `interpretarComida(input)`, que llama a `generarJson`.
- Los tests se reparten entre los dos archivos sin perder ninguno.

**0.5 Repositorios con el comportamiento actual**: `foodsRepo`/`entriesRepo`. Hoy, Resumen, Alimentos y AnadirComida dejan de importar `db`. Los `useLiveQuery` llaman solo a funciones de lectura. Tests de las lecturas y escrituras simples. Los de `guardarComida` y `editar` llegan con sus arreglos.

**0.6 Trocear la UI sin cambios visibles**
- `SegmentedControl` en NutricionTab, Resumen y AnadirComida. En GymTab no, porque Gym no se toca.
- `MacroInputs`: los 4 inputs por 100 g, compartidos por la revisión y Alimentos. La clase de la etiqueta se pasa por prop para que se vea igual que ahora.
- `ItemRevisionCard`, `QuickAddGrid` (mismos datos: `recientes(10)`) y `useInterpretarComida()`, un único flujo para texto y audio que reemplaza a `interpretar`/`interpretarAudio`.
- `AnadirComida` queda en menos de 150 líneas.

**0.7 P3 — guardado atómico**: `guardarComida` en una transacción. Test: con un espía sobre `db.entries.add` que falla en el 2.º ítem → el recuento de `foods` y `entries` no cambia.

**0.8 P4 + P5 + P11 + P12**
- Lógica pura en `alimentos.ts`: `mismosValores(a, b)` (tolerancia de 0,05), `por100DesdeEntrada(e)` (si gramos = 0 → ceros) y `decidirGuardado(existente, item)`.
- La revisión guarda en cada ítem su `original` (fuente y valores por 100 g). `fuenteSiNuevo` = la fuente original si los valores no han cambiado; si han cambiado, `'manual'`. Si un ítem de un alimento guardado tiene valores distintos a los guardados, aparece un aviso «Actualizará el alimento guardado».
- Modo edición: la casilla «Aplicar también a «X» en Alimentos» (desmarcada, solo si el alimento todavía existe).
- Alimentos: captura `NombreDuplicadoError` y muestra «Ya existe un alimento con ese nombre»; el buscador usa `normalizeName`.
- Tests: la tabla de decisión completa; reutilizar sin cambios mantiene `'gemini'`; editar una entrada sin la casilla no cambia el alimento, y con ella sí; renombrar crea un alimento nuevo o reutiliza el que ya tiene ese nombre; renombrar en Alimentos recalcula `nombreNorm`; un nombre duplicado lanza el error.

**0.9 P1 — medias reales**: `resumenPeriodo(entries, fechas, hoy)` → `{ porDia, total, media, diasRegistrados, distribucion }`. La media solo cuenta días con al menos una entrada y fecha ≤ hoy. El Resumen muestra «Media de N días registrados», o «Sin registros en este periodo» si no hay ninguno. Tests: un mes con 5 días registrados divide entre 5; los días futuros se ignoran; con 0 días registrados → ceros.

**0.10 P8/F1 — deshacer**: `Toast` (5 s, botón «Deshacer», `fixed bottom-24 left-4 right-24` para no tapar el FAB). Hoy: `borrar` → toast «Borrada «X»» → `restaurar`. Test de repositorio: borrar y restaurar conserva el id y los datos.

**0.11 P9 — backup v2**, tal como se describe en la §3. Tests: el fixture v1 se importa entero; la ida y vuelta v2 no pierde datos; el export por defecto no incluye la key; importar sin key conserva la del dispositivo; importar en un dispositivo sin key toma la del backup; `version: 3` se rechaza; si falta un array obligatorio, se rechaza; importar vacía también las tablas que no vienen en el backup.

**0.12 P10 — reintentos**: `generarJson` reintenta 500/502/503/504 hasta 2 veces (esperas de 1 s y 3 s; `esperar` se inyecta para los tests). El 429 no se reintenta. Mensaje final: «Gemini está saturado ahora mismo. Prueba en unos segundos.». Tests con `vi.stubGlobal('fetch')`: 503 → 200 hace 2 llamadas; tres 503 dan un error claro; un 429 hace 1 sola llamada.

**0.13 Carga diferida**: `lazy()` + `Suspense` para `Resumen` (NutricionTab) y `Progreso` (en GymTab solo cambian ese import y el wrapper). Se comprueba en el build que Recharts sale en un chunk aparte y que `dist/sw.js` lo precachea (sigue funcionando sin conexión).

**0.14 Verificación E2E F0 (§7) y documentación**: PROCESO.md desde la **§14** (reestructuración, repositorios, identidad por nombre, backup v2 y su regla de migración, P11/P12), `docs/progreso/sesion-02/` y la entrada en el README.

---

## 6. Pasos — Fase 1 (Registro rápido)

**1.1 Esquema v2**: `meals` + tipos `Meal`/`MealItem` + `Entry.rapida`. En el backup, `meals` es una tabla opcional. `shared/db/db.test.ts`: se crea `appfit-mig` con un Dexie **solo v1**, se llena, se cierra, se abre con `new AppFitDB('appfit-mig')` y se comprueba que `verno === 2`, que los datos siguen intactos y que `meals` existe vacía. Test de backup: el fixture v1 importado da `meals` vacía.

**1.2 A3 — frecuentes y buscador**
- Lógica pura: `rankFrecuentes(entries, { comida, hoy })`. Puntuación = 3 × usos en esa comida + usos en otras comidas, con la ventana de 60 días. Se excluyen las entradas sin `foodId` o `rapida`; en caso de empate gana el uso más reciente. `filtrarAlimentos(foods, q)` exige que todos los tokens normalizados estén en el nombre y pone primero los nombres que empiezan por la consulta.
- `QuickAddGrid`: buscador de 16 px arriba. Sin texto muestra «Frecuentes en {comida}» (y recurre a `recientes` si no hay historial); con texto, los resultados de todos los alimentos. `anadirDesdeAlimento` deja de actualizar `updatedAt`.
- Tests: la puntuación por comida, la ventana, las tildes, varios tokens y el orden por prefijo.
- Aceptación: tras registrar un alimento 3 veces en la cena, aparece el primero en la rejilla al elegir Cena; «platano» encuentra «Plátano»; un añadido rápido no cambia `updatedAt`.

**1.3 A5 — kcal rápidas**
- Botón «Kcal rápidas» en AnadirComida, que abre `KcalRapidasSheet`: nombre (placeholder «Comida fuera»), kcal obligatorias, P/C/G opcionales, todo con `inputMode="decimal"`. Se guarda con gramos = 0, sin `foodId` y con `rapida`.
- Hoy la muestra como «≈ 900 kcal · P40» con la etiqueta «rápida», sin «0 g». Al tocarla se abre el mismo sheet en modo edición (desde NutricionTab), no la revisión, y así se evita dividir entre 0.
- Lógica pura: `validarKcalRapidas`. Tests de validación y del repositorio.
- Aceptación: la entrada suma a los totales y al Resumen y no aparece en los frecuentes.

**1.4 A2 — copiar comida o día**
- Cada cabecera de comida en Hoy tiene un botón «⋯» → `AccionesComidaSheet` con «Copiar a otro día…»: fecha (`<input type="date" max={hoy}>`) y comida de destino (`SegmentedControl`). La cabecera de fecha tiene «⋯» → «Copiar el día a…», que conserva las comidas.
- En una sección vacía aparece el enlace «Repetir del día anterior (N)» si ese día tiene entradas en esa comida.
- Se copia el **snapshot** (lo que comiste es lo mismo), con `createdAt` nuevo.
- Después sale un toast «N entradas copiadas · Deshacer» → `borrarVarias`.
- Lógica pura: `planCopia(entries, destino, ahora)`. Tests: se cambia la comida o se conserva, no se copian los ids y se mantiene `rapida`; la copia es atómica.

**1.5 A1 — plantillas**
- `mealsRepo` y lógica pura `itemsDesdeEntradas` y `entradasDesdePlantilla(meal, foodsById, destino, ahora)`, que también calcula el total para la vista previa.
- Crear: «⋯» de la comida → «Guardar como plantilla…» (nombre).
- Usar: sección «Plantillas» en AnadirComida, encima del añadido rápido, ordenada por `usadoAt`. Al tocar una, un sheet muestra los alimentos y el total en kcal → «Añadir a {comida}».
- Gestionar: en Alimentos, un `SegmentedControl` «Alimentos | Plantillas» para renombrar, cambiar gramos, quitar alimentos o borrar la plantilla.
- Tests: aplicar usa los valores actuales del alimento; si el alimento se borró, usa el snapshot; se incrementan `usos` y `usadoAt`; es atómico.
- Aceptación: al cambiar las kcal de un alimento, la plantilla aplicada después usa el valor nuevo.

**1.6 D1 — Resumen mejorado (P2)**
- En `dates.ts`: `fechasPeriodo`, `desplazarPeriodo`, `etiquetaPeriodo` («22–28 sep», «29 sep – 5 oct», «septiembre 2026») y `esPeriodoActual`.
- Resumen: fila «‹ etiqueta ›» (› deshabilitado en el periodo actual), gráfica de **kcal por día con `ReferenceLine`** en el objetivo, la gráfica de macros que ya existe y la tarjeta de media con «valor / objetivo».
- Tests: cambio de mes desde el día 31, de diciembre a enero, semana que cruza de mes y de año, y no se puede avanzar al futuro.

**1.7 Verificación E2E F1 (§7) y documentación**: PROCESO (secciones siguientes), la siguiente carpeta `sesion-NN` y el README.

---

## 7. Verificación end-to-end (panel del navegador, preset `mobile` 375×812, origen de prueba)

La key: en el origen de prueba se escribe en Ajustes una clave **ficticia** y se sustituye `fetch` con `javascript_tool` solo para `generativelanguage.googleapis.com`: primero devuelve un 503 y luego una respuesta válida que incluye «Plátano», que ya existe. Así se prueba IA → revisión → guardado → reintento sin red real ni cuota. Una prueba con Gemini real solo se hará si me lo pides.

**Tras la F0**
1. Consola sin errores. Los datos del fixture se ven en Hoy en sus fechas.
2. Interpretación con el stub: se ve el reintento, se revisa, se guarda y los totales cuadran.
3. P4: en Alimentos, «Plátano» sigue con 🤖/su fuente. Si se edita un valor en la revisión → ✍️ y el aviso «Actualizará…».
4. P5: se edita una entrada cambiando las kcal/100 g **sin** la casilla → el alimento no cambia y la entrada sí; **con** la casilla → cambia también el alimento.
5. P11/P12: renombrar en la revisión crea un alimento nuevo; renombrar en Alimentos a un nombre existente muestra el mensaje; «platano» encuentra «Plátano».
6. P1: el Resumen muestra «Media de 3 días registrados» con los valores calculados a mano desde el fixture.
7. P8: borrar → toast → Deshacer → la entrada vuelve; si se deja pasar 5 s, la entrada sigue borrada.
8. P9: exportar sin la casilla → el JSON es `version: 2` con `apiKey: ''`. Importar **`backup-v1.json`** a través del input real (con `DataTransfer` + evento `change`) → mensaje correcto, datos restaurados y clave ficticia conservada.
9. Diseño: `scrollWidth ≤ 375` en todas las pantallas, los inputs con `font-size` ≥ 16 px (estilos calculados) y el toast sin tapar el FAB ni la barra inferior.
10. `npm run build`: Recharts en un chunk aparte y precacheado en `dist/sw.js`.

**Tras la F1**
1. **Upgrade real**: con la base de datos v1 del paso 0.0 abierta con el código nuevo → `db.verno === 2`, mismos recuentos que antes y `meals` vacía. Importar `backup-v1.json` en v2 también funciona.
2. A3: frecuentes por comida y buscador sin tildes.
3. A5: kcal rápidas en Hoy, en los totales y en el Resumen, y su edición.
4. A2: «Repetir del día anterior» y «Copiar a…», más Deshacer.
5. A1: guardar una cena como plantilla, aplicarla, cambiar un alimento y volver a aplicarla con el valor nuevo, y borrar un alimento y aplicarla con el snapshot.
6. D1: navegar semanas y meses atrás con la etiqueta correcta, › deshabilitado en el actual y la línea de objetivo visible.
7. Exportar un v2 con `meals`, importarlo y comprobar que no se pierde nada.

**En el iPhone (lo haces tú tras desplegar)**: si la app ya está instalada con datos, **exporta un backup antes** de desplegar la F1. Después: la app actualiza sola, los datos siguen ahí (upgrade v1→v2) y exportar/importar funciona en la PWA instalada.

---

## 8. Fases 2–4 (esquema de alto nivel)

| Fase | Esquema | Depende de | Riesgos |
|---|---|---|---|
| **2** C1 C2 C3 C4 E1 | **v3**: `bodyweight: '++id, &fecha'` `{fecha, kg, createdAt}`. `settings.perfil?` y `settings.objetivosDescanso?` sin upgrade (gracias a la fusión de valores por defecto de 0.3). C3 lee `workouts` por el rango de `inicio` (el índice ya existe). Backup: `bodyweight` opcional. | 0.3, 0.11, repos | La carrera de `updateSettings` (se arregla con estado local y guardado al salir del campo). Las fórmulas de C2 y la media móvil, con tests. |
| **3** B1 B3 B2 A4 P6 | **v4**: `foods` con el índice `&codigoBarras` (disperso), `porciones?: {nombre, gramos}[]` y `fuente` + `'etiqueta' \| 'off'`. `entries.cantidad?`/`unidad?` para mostrarlo. Prompts nuevos en `prompts/`, reutilizando `generarJson` con `inlineData` de imagen. P6: `alimentosRelevantes` = `filtrarAlimentos` + `rankFrecuentes` (de la F1). | 0.4, 1.2 | Safari iOS no tiene `BarcodeDetector`: haría falta una librería (zxing) cargada bajo demanda y justificada por tamaño. Open Food Facts está pendiente de tu aprobación. Las fotos hay que comprimirlas con canvas antes de enviarlas. |
| **4** D2 D3 D4 D5 E2 | E2: `foodsRepo.fusionar(origen, destino)` en **tx foods+entries+meals** + **v5** con `foods.aliasNorm` (índice multiEntry `*aliasNorm`), buscado desde `buscarPorNombre`. D2 a D5 son lógica pura sobre `entries`/`bodyweight`, y el CSV reutiliza la descarga del backup. | C1 (datos de peso), punto único de búsqueda | D2 necesita 2–3 semanas de datos. |
| Más adelante | A6 `pendientes` (Blob de audio en IDB); A7 `meals.pesoCocinadoG?` → alimento derivado; C5 `fibra100?` y demás, opcionales. | — | — |

---

## 9. Riesgos y decisiones abiertas (no bloquean)

- **Datos en el iPhone**: la F0 no cambia la versión de Dexie; la F1 solo añade una tabla, así que el riesgo es bajo. Aun así, conviene hacer un backup antes de desplegar la F1.
- **Las pruebas E2E se hacen en Chromium con fake-indexeddb, no en WebKit**: el comportamiento en Safari solo se confirma en el iPhone.
- **La exportación en la PWA de iOS** (`<a download>` con un blob) sigue sin probarse en el dispositivo. Descartaste la hoja de Compartir; si falla en el iPhone, se retoma.
- **Identidad por nombre**: las variantes de Gemini («pollo, pechuga») seguirán creando duplicados hasta E2.
- **Pendiente de tu respuesta más adelante** (sin bloquear F0/F1): el orden de las fases 2–4, C5 (fibra/azúcar/sal), si D2 va como funcionalidad o como notebook, y la aprobación de Open Food Facts.
- **Git**: estás en `master`. Si pides commits, propondré hacerlos en una rama `nutricion-v2`.
