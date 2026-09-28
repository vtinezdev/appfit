# Prompt para planificar Nutrición v2

Cómo usarlo: abre una sesión nueva de Claude Code en la carpeta `appfit`, activa el **modo plan** y pega el bloque de abajo. Antes, repasa la sección 6 de [`nutricion-ideas.md`](./nutricion-ideas.md) ("Decisiones abiertas") y ajusta en el prompt la parte marcada con `[AJUSTAR]`.

---

```text
Quiero planificar la siguiente iteración de la parte de Nutrición de AppFit (PWA personal de nutrición y gym para iPhone).

## Contexto que debes leer primero
1. docs/roadmap/nutricion-ideas.md: la lluvia de ideas, los problemas detectados, la reestructuración propuesta y las fases. Es la fuente principal de este trabajo.
2. docs/PLAN.md y docs/progreso/sesion-01/resumen-tecnico.md: plan original, stack real instalado y decisiones previas.
3. docs/PROCESO.md: bitácora de decisiones y bugs ya resueltos (no los reintroduzcas: ReadOnlyError de Dexie por escribir dentro de useLiveQuery, `id: number` no opcional en las interfaces de Dexie, etc.).
4. El código real de src/ (sobre todo src/db.ts, src/lib/*, src/pages/nutricion/*). Comprueba contra el código cada problema que cite el documento de ideas antes de planificar su arreglo; si alguno no se confirma, dilo.

## Restricciones que no se negocian
- Uso personal, un solo usuario, iPhone, PWA instalada desde Safari.
- Coste 0 € y sin backend: todo en IndexedDB (Dexie). Las únicas llamadas externas permitidas son Gemini (con la key del usuario) y, si se aprueba, Open Food Facts.
- UI en español, mobile-first (375 px de ancho), inputs de al menos 16 px y `inputMode="decimal"` en números.
- Los datos ya existentes en el móvil del usuario deben sobrevivir: cualquier cambio de esquema se hace con un nuevo `db.version(n)` y su `upgrade()`, y los backups JSON antiguos (version 1) deben seguir importándose.
- Sin librerías nuevas salvo que estén justificadas (tamaño, mantenimiento, alternativa sin librería).
- Tests con Vitest solo de lógica pura y de la capa de datos (se puede añadir `fake-indexeddb` como devDependency).

## Alcance del plan
[AJUSTAR] Planifica en detalle la Fase 0 (Cimientos) y la Fase 1 (Registro rápido) del documento de ideas. Para las Fases 2–4 basta un esquema de alto nivel (qué tablas o campos nuevos necesitarán, dependencias y riesgos), para que las decisiones de la Fase 0 no las bloqueen.
[AJUSTAR] La reestructuración por features se aplica a Nutrición y a lo compartido (shared/); Gym se queda como está salvo los imports que haya que mover.

## Qué necesito en el plan
1. **Estructura de carpetas final** (árbol) y una tabla archivo actual → archivo nuevo, para que los movimientos se puedan revisar.
2. **Cambios de esquema Dexie** por versión: tablas o campos nuevos, índices, código de `upgrade()` y cómo se migra el backup v1 → v2.
3. **API de los repositorios** (`foodsRepo`, `entriesRepo` y los que hagan falta): firmas de las funciones y qué operaciones van en transacción.
4. **Pasos ordenados** en commits pequeños. Cada paso deja la app compilando (`npm run build`) y los tests en verde (`npm run test`). La reestructuración va separada de los cambios de comportamiento: primero mover y extraer sin cambiar nada visible, después arreglar y añadir.
5. **Por cada funcionalidad**: pantallas o componentes afectados, lógica pura nueva, tests nuevos y criterio de aceptación verificable.
6. **Verificación end-to-end** en el navegador en vista móvil (`.claude/launch.json` ya tiene el dev server): flujos concretos a probar, incluido importar un backup v1 generado antes de los cambios.
7. **Riesgos y decisiones abiertas** que necesiten mi respuesta. Pregúntamelas antes de cerrar el plan si bloquean algo.

## Entregables al terminar el plan
- Guarda el plan aprobado en docs/roadmap/PLAN-nutricion-v2.md.
- Durante la implementación, sigue la convención de documentación del proyecto: decisiones en docs/PROCESO.md (secciones nuevas numeradas a continuación de las existentes) y, al cerrar cada sesión, docs/progreso/sesion-NN/ con resumen-tecnico.md y resumen-humano.md, más la entrada en docs/progreso/README.md.
- No hagas commits ni despliegues sin que te lo pida.
```
