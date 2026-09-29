# AppFit — instrucciones para Claude Code

PWA personal de nutrición y gimnasio para iPhone. Sin backend: todo vive en IndexedDB (Dexie) del dispositivo. Un solo usuario (Víctor). Documentación y UI en español.

Stack: Vite 8 + React 19 + TypeScript + Tailwind 3 (solo tokens) + Dexie 4 + Recharts + vite-plugin-pwa + Vitest (fake-indexeddb). IA: API REST de Gemini, llamada directa desde el cliente.

```bash
npm run dev      # http://localhost:5173  (¡datos reales de Víctor!)
npm run test     # vitest run
npm run build    # tsc -b && vite build
```

## Mapa del código (estado real)

```
src/app/                 App (router casero con useState), BottomNav, Ajustes
src/shared/db/           db.ts (esquema Dexie + versiones), types.ts, settings.ts
src/shared/lib/          dates, format, text, backup
src/shared/ai/           gemini.ts (cliente genérico generarJson)
src/shared/design/       tokens.css (única fuente de valores), theme, macros, chart, guard
src/shared/components/   primitives (Button, Card, Sheet, Toast, NumberStepper, ConfirmacionDestructiva…)
src/shared/hooks/        useAviso (Toast con «Deshacer» y errores)
src/features/nutricion/  NutricionTab + pages/ components/ hooks/ data/ (repos) lib/ (lógica pura, prompts/)
src/features/gym/        GymTab + pages/ data/ (repos) lib/workout.ts (lógica pura)
```

## Reglas del proyecto (no romperlas)

- En las features (Nutrición y Gym), solo `features/*/data/*Repo.ts` toca `db.*` (lo vigila `shared/db/acceso.test.ts`). Las lecturas nunca escriben (se usan en `useLiveQuery`).
- Escrituras de varias filas → `db.transaction(...)`; dentro, ningún `await` que no sea de Dexie (nada de `fetch`).
- Cambiar esquema o forma de registros → revisar `migrarBackup` en `shared/lib/backup.ts` (reglas escritas en `db.ts`/`backup.ts`).
- Borrados: rutinas y plantillas → confirmación previa (`ConfirmacionDestructiva`); filas sueltas (series, entradas, alimentos) → borrado inmediato con aviso «Deshacer» (`useAviso`). Dentro de un Sheet el Toast queda debajo: errores en línea con `ErrorState`.
- Lógica de negocio en funciones puras con tests; componentes solo componen.
- Diseño: nada de colores/tamaños sueltos; tokens + primitives. Ver `docs/DESIGN-SYSTEM.md` y `shared/design/guard.test.ts`.
- Inputs a 16 px mínimo (Safari iOS hace zoom). Vista de referencia: 375×812, sin scroll horizontal.
- Imports relativos, sin alias.
- Pruebas en navegador en un origen aparte (`http://appfit-test.localhost:5173`), nunca en `localhost:5173` (datos y API key reales). Gemini se simula interceptando `fetch`.
- No hacer commits ni push si Víctor no lo pide.

Contexto histórico y decisiones: `docs/PROCESO.md` (bitácora numerada). Estado por sesión: `docs/progreso/`. Leer solo la sección que haga falta, no el archivo entero.

---

# Protocolo MAIN (orquestador)

La sesión principal es **MAIN**: recibe las peticiones, decide, implementa y cierra. Hay 3 subagentes especialistas en `.claude/agents/`. Guía completa: `docs/AGENTES.md`.

| Agente | Modelo | Cuándo |
|---|---|---|
| `architecture-auditor` | sonnet | Impacto en estructura, datos, esquema, repos, IA, build, rendimiento |
| `product-ux-auditor` | sonnet | Impacto en flujos, pantallas, estados, accesibilidad, diseño |
| `documentation-agent` | sonnet | **Solo al cerrar**, si el cambio final afecta a la documentación |

## Regla nº 1: el mínimo de agentes necesario

MAIN **no delega por defecto**. Delegar cuesta contexto: úsalo solo cuando una segunda revisión especializada aporte más de lo que cuesta.

| Tipo de tarea | Flujo |
|---|---|
| Trivial (texto, typo, estilo puntual, pregunta) | MAIN directo. Sin agentes. |
| Pequeña (bug acotado, ajuste en 1–3 archivos) | MAIN implementa → `npm run test` (y `build` si toca tipos) |
| Feature nueva | Auditor(es) **solo** de las áreas con impacto → MAIN implementa → validación → review si hace falta → documentation |
| Cambio arquitectónico | architecture-auditor → implementación → review (architecture, sobre el diff) → documentation |
| Cambio grande de UX | product-ux-auditor → implementación → review (product-ux, sobre el diff) → documentation si cambia comportamiento |
| Auditoría general | MAIN decide qué auditores; ellos reportan; solo se aplican cambios justificados |

Si dos auditores son necesarios e independientes, lanzarlos en paralelo en un solo mensaje.

## Cómo delegar (brief mínimo)

Nunca pasar todo el contexto de MAIN. Cada encargo lleva solo:

```
Objetivo: <una frase>
Alcance: <archivos/carpetas o "git diff">  — no salir de aquí salvo necesidad demostrada
Ya sabido: <conclusiones previas relevantes, para no re-analizar>
Pregunta concreta: <qué debe responder o revisar>
Permiso de edición: <no | solo arreglos seguros dentro del alcance>
```

Para revisiones posteriores a implementar: pasar `git diff` (o la lista de archivos cambiados), no el proyecto.

## Clasificar decisiones

- **Mecánica y segura** → MAIN la hace.
- **Técnica** con evidencia en el repo → MAIN decide (o architecture-auditor si es dudosa).
- **Arquitectónica** → architecture-auditor informa, MAIN decide.
- **Producto/UX** con criterio claro en docs → MAIN decide; si no, product-ux-auditor.
- **Ambigua, sin evidencia en el repo** (qué quiere Víctor, prioridades, datos reales) → **preguntar a Víctor**. No inventar.

## Límites anti-bucle

- Máximo **2 ciclos de revisión** por tarea.
- Máximo **2 intentos de corrección** por problema.
- No repetir una auditoría si el contexto (código o pregunta) no ha cambiado.
- Si tras los límites persiste un desacuerdo o un fallo → parar y pedir decisión a Víctor con las opciones y su evidencia.

## Validación antes de cerrar

- `npm run test` siempre que se toque `src/`; `npm run build` si cambian tipos, imports o configuración.
- UI: comprobar en el navegador (375×812, origen de pruebas) cuando el cambio sea visible.
- No dar por hecho nada que no se haya ejecutado; si algo no se pudo verificar, decirlo.

## Cierre

1. Validaciones en verde y sin problemas abiertos.
2. ¿El cambio final afecta a algo documentado (estructura, datos, flujos, comandos, decisiones, design system)? → lanzar `documentation-agent` con el resumen de lo hecho y la lista de archivos cambiados. Si no, omitirlo.
3. Comprobación final de MAIN y resumen breve a Víctor.
