# Nutrición v2 — ideas de funcionalidades y reestructuración

> **Histórico, no normativo.** Lluvia de ideas del 2026-09-28. Lo que sigue pendiente o se descartó está en `../roadmap.md`. El estado actual está en los documentos listados en `CLAUDE.md` § Documentación.

Lluvia de ideas del 2026-09-28 para la siguiente iteración de la parte de nutrición. Parte de revisar el código actual (`src/pages/nutricion/*`, `src/lib/*`, `src/db.ts`) tal como quedó en la [sesión 01](../progreso/sesion-01/resumen-tecnico.md).

Restricciones que se mantienen de [`plan-original.md`](./plan-original.md): uso personal en iPhone como PWA, **0 €**, **sin backend** (todo en IndexedDB del móvil), Gemini en capa gratuita, UI en español, tests solo de lógica pura.

Leyenda: **Valor** (qué mejora el día a día) y **Esfuerzo**: S = una tarde, M = 1–2 sesiones, L = más de 2 sesiones.

---

## 1. Problemas detectados en el código actual

Conviene arreglarlos antes de añadir nada, porque algunas funcionalidades nuevas se apoyan en ellos.

| # | Problema | Dónde | Impacto |
|---|---|---|---|
| P1 | La **media diaria del mes** divide entre todos los días del mes, incluidos los futuros y los no registrados. A día 5 la media sale ~6 veces más baja de lo real. En la semana pasa lo mismo. | `Resumen.tsx` + `mediaDiaria` | Datos engañosos |
| P2 | El Resumen siempre muestra la semana/mes **actual**; no se puede ir a semanas o meses anteriores. | `Resumen.tsx` | Análisis limitado |
| P3 | Guardar varios alimentos no es atómico: un bucle de `await` sin transacción puede dejar el guardado a medias si algo falla. | `AnadirComida.guardar` | Datos incoherentes |
| P4 | `upsertFood` marca como `fuente: 'manual'` cualquier alimento ya existente al reutilizarlo, aunque no se haya tocado. Con el tiempo, todo acaba siendo "manual". | `AnadirComida.upsertFood` | Se pierde la procedencia |
| P5 | Al editar una entrada y cambiar sus valores por 100 g se modifica el alimento global, sin avisar. | `AnadirComida.guardar` | Efecto secundario inesperado |
| P6 | A Gemini se le envía la lista **completa** de alimentos conocidos en cada llamada. Crece sin límite: más tokens, más latencia y más riesgo de cuota. | `AnadirComida.interpretar*` | Escala mal |
| P7 | El "añadido rápido" muestra los 10 alimentos **editados más recientemente**, no los más usados, y no tiene buscador. | `AnadirComida` | Registro lento |
| P8 | Borrar una entrada en Hoy es inmediato, sin confirmación ni deshacer. | `Hoy.tsx` | Borrados accidentales |
| P9 | El backup exporta la **API key** en claro y es `version: 1` sin estrategia de migración. En cuanto cambie el esquema, los backups antiguos dejarán de importarse. | `backup.ts` | Privacidad / robustez |
| P10 | `503` puntuales de Gemini (ya vistos en la sesión 01) se muestran como error; no hay reintento. | `gemini.ts` | Fricción |

---

## 2. Reestructuración interna propuesta

El proyecto es pequeño (unos 50 archivos), así que la idea es **ordenar sin sobreingeniería**.

### 2.1 Organizar por funcionalidad (feature folders)

```
src/
  app/                    # App.tsx, BottomNav, arranque (main.tsx), ensureSettings
  shared/
    db/                   # db.ts (esquema + versiones/migraciones), tipos comunes
    components/           # Sheet, NumberStepper, SegmentedControl, MacroInputs, Toast, EmptyState
    lib/                  # dates.ts, format.ts (round1, números), backup.ts
    ai/                   # cliente Gemini genérico: fetch, errores, reintentos, schema
  features/
    nutricion/
      pages/              # Hoy, Resumen, Alimentos, AnadirComida (ya troceada)
      components/         # ItemRevisionCard, QuickAddGrid, MacroSummary...
      hooks/              # useEntriesDelDia, useResumen, useInterpretarComida
      data/               # foodsRepo.ts, entriesRepo.ts (únicos que tocan db.*)
      lib/                # nutrition.ts (lógica pura) + prompts de IA de nutrición
    gym/                  # misma forma; se migra cuando toque, sin prisa
```

### 2.2 Capa de datos (repositorios)

- Las pantallas **no llaman a `db.*` directamente**; usan funciones de `foodsRepo` / `entriesRepo` (`guardarComida(items, fecha, comida)`, `buscarAlimentos(q)`, `frecuentes(n)`...).
- Toda escritura que toque más de una fila va en `db.transaction(...)` (arregla P3).
- La lógica de "si el alimento existe, reutilízalo; si no, créalo" vive en un único sitio (arregla P4 y P5 de forma explícita).
- Se pueden testear con `fake-indexeddb` en Vitest sin montar componentes.

### 2.3 Trocear `AnadirComida.tsx` (376 líneas)

Hoy mezcla llamadas a IA, lógica de base de datos, formulario de revisión y añadido rápido.

- `useInterpretarComida()`: un único flujo para texto, audio (y en el futuro, foto). Hoy `interpretar` e `interpretarAudio` son casi idénticas.
- `ItemRevisionCard` + `MacroInputs`: el bloque de 4 inputs por 100 g está duplicado entre `AnadirComida` y `Alimentos`.
- `QuickAddGrid` con buscador y frecuentes reales.
- `SegmentedControl`: el patrón de botones-pestaña se repite en `NutricionTab`, `Resumen` y `AnadirComida`.

### 2.4 IA desacoplada

`shared/ai/gemini.ts` solo sabe hacer una llamada con schema, reintentos (503 con backoff) y errores en español. Cada tarea (interpretar comida, leer etiqueta, analizar foto, sugerir comida) define **su prompt y su schema** en `features/nutricion/lib/prompts/`. Añadir una tarea nueva no toca el cliente.

Para P6: enviar solo los **N alimentos más relevantes** (coincidencia de palabras con el texto + los más frecuentes), no la base de datos entera.

### 2.5 Migraciones y backup

- Cada cambio de esquema = nuevo `db.version(n)` con `upgrade()` documentado en un comentario.
- Backup `version: 2` con una función `migrarBackup(v1 → v2)` para que los JSON antiguos sigan importándose (arregla P9).
- Opción "incluir API key en el backup" desactivada por defecto.

### 2.6 Qué NO cambiar

- **Router**: seguir con el `useState` actual. Los enlaces profundos no sirven en iOS (ver descartes) y no hay botón atrás que gestionar.
- **Estado global** (Redux, Zustand...): innecesario; Dexie + `useLiveQuery` ya es el estado.
- **Gym**: migrarlo a `features/gym/` es opcional y puede esperar.

### 2.7 Pequeños extras técnicos

- Cargar `Resumen` y `Progreso` con `React.lazy` para que Recharts no infle la carga inicial (el aviso de bundle >500 kB de la sesión 01).
- Tests nuevos: repositorios (con `fake-indexeddb`), migración de backup, cálculo de medias y TDEE.

---

## 3. Funcionalidades nuevas

### A. Registrar más rápido (lo que más se nota en el día a día)

| ID | Idea | Valor | Esfuerzo | Notas |
|---|---|---|---|---|
| A1 | **Comidas guardadas / plantillas**: "mi desayuno de siempre" con varios alimentos y gramos, que se añade con un toque. | Alto | M | Tabla nueva `meals` (nombre + items). También "guardar esta comida como plantilla" desde Hoy. |
| A2 | **Copiar comida o día**: "repetir la cena de ayer" o copiar una comida a otro día. | Alto | S | Reutiliza `entriesRepo`. |
| A3 | **Frecuentes reales + buscador** en el añadido rápido, ordenados por uso y por franja horaria (qué sueles desayunar). | Alto | S | Contar `entries` por `foodId`. Arregla P7. |
| A4 | **Porciones con unidad** por alimento: "1 huevo = 60 g", "1 rebanada = 30 g". Se registra "2 huevos" sin pensar en gramos. | Alto | M | Campo `porciones[]` en `foods`; Gemini puede devolver la unidad. |
| A5 | **Kcal rápidas** sin alimento: "comida fuera, ~900 kcal, 40 g prot". | Medio | S | Entrada sin `foodId`. |
| A6 | **Cola sin conexión**: si no hay red, guardar el texto o audio como pendiente e interpretarlo al volver la conexión. | Medio | M | Tabla `pendientes`. |
| A7 | **Recetas caseras**: ingredientes + peso total cocinado, y se registran gramos de la receta (los macros se calculan por 100 g del total). | Alto | M–L | Muy útil con batch cooking. Puede ser la evolución de A1. |

### B. Entrada multimodal (más IA, más precisión)

| ID | Idea | Valor | Esfuerzo | Notas |
|---|---|---|---|---|
| B1 | **Foto de la etiqueta nutricional** → Gemini extrae los valores exactos por 100 g y crea el alimento con `fuente: 'etiqueta'`. | Alto | S–M | Mismo patrón que el audio (`inlineData` con imagen). Mucho más fiable que estimar. |
| B2 | **Foto del plato** → Gemini estima alimentos y gramos, y pasa a la pantalla de revisión ya existente. | Medio | S | Precisión limitada, pero con revisión editable es útil. |
| B3 | **Código de barras** → Open Food Facts (gratis, sin API key). | Alto | M | Comprobar si Safari iOS soporta `BarcodeDetector`; si no, librería tipo zxing. Solo se envía el código de barras. |

### C. Objetivos y cuerpo

| ID | Idea | Valor | Esfuerzo | Notas |
|---|---|---|---|---|
| C1 | **Registro de peso corporal** con gráfica y **media móvil de 7 días** (la tendencia importa más que el dato diario). | Alto | S–M | Tabla `bodyweight`. Base para C3 y D2. |
| C2 | **Calculadora de objetivos** (Mifflin-St Jeor + nivel de actividad + objetivo de déficit o superávit) que propone kcal y macros. | Medio | S | Lógica pura, fácil de testear. |
| C3 | **Objetivos de día de entreno y de descanso**: si ese día hay un `workout`, se usan los objetivos de entreno. | Medio | S | Primera integración real entre Gym y Nutrición. |
| C4 | **"Te quedan X kcal / Y g de proteína"** visible en Hoy, y botón "¿qué como?" que pide a Gemini opciones con **tus** alimentos para cuadrar los macros. | Medio | S–M | La sugerencia depende de la IA; el "te quedan" no. |
| C5 | **Agua** (vasos rápidos) y **fibra / azúcar / sal** opcionales. | Bajo–Medio | M | Gemini puede estimar `fibra100`, `azucar100` y `sal100`; requiere migrar `foods`. |

### D. Análisis (aprovechar los datos)

| ID | Idea | Valor | Esfuerzo | Notas |
|---|---|---|---|---|
| D1 | **Resumen mejorado**: navegar por semanas y meses anteriores, línea de objetivo en la gráfica, gráfica de kcal, media solo de días registrados. | Alto | S–M | Incluye los arreglos de P1 y P2. |
| D2 | **TDEE adaptativo**: con el peso (C1) y las kcal registradas, estimar el gasto real y ajustar objetivos (el enfoque de MacroFactor). | Alto | M | Lógica pura con tests; necesita unas 2–3 semanas de datos. |
| D3 | **Adherencia**: % de días dentro de ±10 % del objetivo, rachas de días registrados. | Medio | S | |
| D4 | **Top alimentos** por kcal y por proteína aportadas en el periodo. | Bajo–Medio | S | |
| D5 | **Exportar CSV** de entradas y peso para analizarlos fuera (pandas, Excel...). | Medio | S | |

### E. Calidad de datos

| ID | Idea | Valor | Esfuerzo | Notas |
|---|---|---|---|---|
| E1 | **Chequeo de coherencia**: avisar si `kcal100` se aleja más de un 15 % de `4·P + 4·C + 9·G`, tanto en la revisión como en Alimentos. | Medio | S | Detecta alucinaciones de la IA. Lógica pura. |
| E2 | **Alias y fusión de duplicados** ("pechuga de pollo" y "pollo, pechuga"): fusionar dos alimentos y reasignar sus entradas. | Medio | M | |
| E3 | **Procedencia** visible por alimento: IA / manual / etiqueta / Open Food Facts. | Bajo | S | Viene gratis con P4, B1 y B3. |

### F. Experiencia de uso

| ID | Idea | Valor | Esfuerzo |
|---|---|---|---|
| F1 | **Deshacer** tras borrar (toast de 5 s) en lugar de borrar a ciegas (P8). | Medio | S |
| F2 | **Anillo de kcal** en Hoy, en lugar de solo barras. | Bajo | S |
| F3 | **Recordatorio de backup** dentro de la app: "hace 14 días que no exportas". | Medio | S |
| F4 | **Probar conexión** con Gemini desde Ajustes (valida key y modelo). | Bajo | S |

---

## 4. Descartadas (y por qué)

- **Notificaciones push / recordatorios**: iOS solo las permite en PWAs instaladas y a través de un servidor push, lo que rompe "sin backend". Una PWA no puede programar notificaciones locales.
- **Atajos de iOS / enlaces profundos** (`?texto=...`): Atajos abre las URLs en Safari, y en iOS Safari tiene un almacenamiento **separado** de la app instalada, así que los datos no llegarían a tu IndexedDB.
- **Web Share Target** (compartir una foto a la app): no está soportado en iOS.
- **Sincronización entre dispositivos**: requiere backend. El backup JSON cubre el caso de cambiar de móvil.
- **Micronutrientes completos** (vitaminas, minerales): las estimaciones de la IA no son fiables a ese nivel y complican mucho la UI.

---

## 5. Propuesta de fases

Cada fase se puede usar por sí sola y deja la app desplegable.

| Fase | Contenido | Por qué en este orden |
|---|---|---|
| **0. Cimientos** | Reestructuración (2.1–2.5) sin cambiar el comportamiento, más los arreglos P1, P3, P4, P5, P8/F1 y P9. | Todo lo demás se apoya en los repositorios, las migraciones y el backup v2. |
| **1. Registro rápido** | A3, A2, A1, A5, D1 | Máximo impacto diario con poco riesgo. |
| **2. Cuerpo y objetivos** | C1, C2, C3, C4 ("te quedan"), E1 | Empieza a acumular datos de peso cuanto antes (los necesita D2). |
| **3. Multimodal** | B1, B3, B2, A4, P6, P10 | Más precisión y menos tecleo. |
| **4. Análisis** | D2, D3, D4, D5, E2 | Necesita semanas de datos de las fases anteriores. |
| Más adelante | A6, A7, C5, F2–F4 | Útiles pero no urgentes. |

---

## 6. Decisiones abiertas (para responder antes o durante la planificación)

1. ¿Te encaja el orden de las fases, o prefieres adelantar algo (por ejemplo, la foto de la etiqueta o el peso corporal)?
2. ¿La reestructuración se aplica también a Gym ahora, o solo a Nutrición?
3. ¿Registras comidas caseras con varios ingredientes a menudo? Si es así, A7 (recetas) debería subir a la fase 1.
4. ¿Quieres fibra, azúcar y sal (C5), o con kcal y macros es suficiente?
5. ¿El TDEE adaptativo (D2) te interesa como funcionalidad o también como ejercicio de análisis de datos (notebook aparte con el CSV de D5)?
