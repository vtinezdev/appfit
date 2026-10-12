# Plan de mejoras (octubre 2026)

Plan de trabajo para las mejoras acordadas con Víctor el 2026-10-12. Cada punto recoge lo decidido, el alcance, dónde se toca y cómo se valida. Es un plan, no la fuente de verdad: al terminar cada punto, lo implementado se documenta en su documento vivo (`docs/features/…`, `datos.md`, `DESIGN-SYSTEM.md`) y aquí solo se cambia el estado. Cuando estén todos hechos, este archivo pasa a `docs/historico/`.

## Resumen y orden

Se va de lo rápido y sin riesgo a lo que cambia el esquema. Cada punto va en su rama `feat/…` desde `master` y con su PR. Los puntos 2 y 1 añaden tablas: van uno detrás de otro, nunca en paralelo, para no pisarse la versión de Dexie.

| Orden | Punto | Rama propuesta | Esquema | Estado |
|---|---|---|---|---|
| 1 | [4 · Serie hecha: solo el ✓ en verde](#4--serie-hecha-solo-el--en-verde) | `feat/serie-hecha-check` | no | implementada |
| 2 | [5 · Pista del menú de la serie](#5--pista-del-menú-de-la-serie) | `feat/pista-menu-serie` | no | implementada |
| 3 | [3 · Filtro «Abductores»](#3--filtro-abductores) | `feat/filtro-abductores` | no | implementada |
| 4 | [2 · Creatina](#2--creatina) | `feat/creatina` | sí (v8) | implementada |
| 5 | [1 · Cheat day](#1--cheat-day) | `feat/cheat-day` | sí (v9) | implementada |
| 6 | [7 · Creador de rutinas](#7--creador-de-rutinas) | `feat/creador-rutinas` | no | implementada |
| — | [6 · Uso por otras personas](#6--uso-por-otras-personas-por-afinar) | — | — | por afinar |

Para todos: `npm run test` y `npm run build` en verde, pruebas en `http://appfit-test.localhost:5173` (nunca en `localhost:5173`) a 320/375/430 px y en ambos temas, entrada en `docs/PROCESO.md` y actualización de los documentos vivos indicados.

---

## 4 · Serie hecha: solo el ✓ en verde

**Problema.** Al completar una serie, además del ✓, un fondo verde recorre toda la fila (número, reps, kg y RIR) y sus hijas.

**Decisión.** Solo el ✓ se pone en verde, relleno y con su animación de confirmación. La fila no cambia: sin fondo, sin barrido y sin atenuar las cifras.

**Dónde.**
- `src/index.css`: quitar `.series-set::after`, su regla `[data-done='true']` y la línea de Reduce Motion que la afecta. Revisar si `isolation`, `padding` y el margen negativo de `.series-set` siguen haciendo falta sin el tinte.
- `.series-complete[aria-pressed='true']` se mantiene tal cual.
- `data-done` en `PanelEjercicio.tsx`: quitarlo si nadie más lo usa (buscar en tests y CSS).

**Documentos.** `docs/DESIGN-SYSTEM.md` (§ Gym activo, el párrafo «Serie hecha») y `docs/roadmap.md` (quitar «recorrido del tinte de la serie hecha» de §97).

**Validación.** Marcar y desmarcar series normales, de calentamiento, con bajadas (dropset) y por lados. Ambos temas y Reduce Motion.

---

## 5 · Pista del menú de la serie

**Problema.** Alguien que no conoce la app no sabe que tocar el número de serie abre el menú (calentamiento, dropset, negativas…).

**Decisión.** Solo un chevron ▾ pequeño, siempre visible, junto al número o la letra de la serie (también con «C», «D»…). Sin avisos ni recorridos.

**Dónde.**
- `src/features/gym/components/PanelEjercicio.tsx`: botón `.celda-tipo .series-type`. Añadir `aria-haspopup="dialog"`; el `aria-label` («Opciones de…») ya describe la acción.
- `src/shared/components/Icon.tsx`: hoy solo hay `chevron-left`/`chevron-right`; añadir `chevron-down` (o rotar uno existente siguiendo el patrón del design system).
- `src/index.css`: tamaño y tono del chevron con tokens (`fg-muted`), sin romper el ancho de la columna a 320 px.

**Documentos.** `docs/DESIGN-SYSTEM.md` (§ Gym activo) y `docs/features/gym.md` si describe el botón.

**Validación.** A 320 px la columna «Serie» cabe con letra y chevron sin empujar Reps/Kg/RIR/✓. Texto ampliado. Lector de pantalla.

---

## 3 · Filtro «Abductores»

**Contexto.** Los ejercicios de abducción ya existen y tienen imagen (`abduccion-maquina`, `abduccion-polea`, `abduccion-bandas`, `almejas`), clasificados en Glúteos, que es anatómicamente correcto (glúteo medio). Lo que falta es poder **filtrarlos**: existe el chip «Aductores», pero no «Abductores».

**Decisión.**
- Chip **«Abductores»** en los filtros de «Músculo principal» del selector de ejercicios, justo después de «Aductores». Muestra esos cuatro ejercicios.
- Buscar «abductor» o «abductores» también los encuentra.
- **No** es una zona muscular nueva: en el mapa muscular, el reparto de series, el resumen semanal y el Atlas siguen contando como glúteos.
- El selector de músculo de los ejercicios personalizados no cambia (solo músculos reales).
- **Sin ejercicios nuevos** por ahora, así que no hacen falta imágenes ni prompts.

**Dónde.**
- `src/features/gym/lib/selectorEjercicios.ts` (`filtrarEjercicios`): las opciones de filtro pasan a ser `MUSCULOS` + el filtro `abductores`, que se resuelve por lista de `catalogId` en lugar de por músculo. Lógica pura y con test.
- `src/features/gym/components/SelectorEjercicios.tsx`: `FilterChips` con las opciones nuevas.
- `src/features/gym/lib/catalogoEjercicios.ts`: sinónimo de búsqueda «abductores» en esas cuatro entradas, o resolverlo en la búsqueda.

**Documentos.** `docs/features/gym.md` (selector y filtros).

**Validación.** Tests de `filtrarEjercicios` (chip solo, combinado con otro músculo o equipo, «Limpiar»). La fila de chips a 320 px.

---

## 2 · Creatina

**Decisión.**
- Función **opcional**: interruptor en Ajustes, **desactivada por defecto**.
- **Dosis de mantenimiento**: **0,05 g/kg** con el último pesaje, **mínimo 3 g**, redondeada a 0,5 g. Sin pesaje: 3 g. En Ajustes se puede sustituir por una **dosis manual en gramos** (p. ej. la del bote).
- **Fase de carga opcional**: botón «Empezar fase de carga». Dura **5 días** desde ese día, a **0,3 g/kg/día** con el último pesaje (unos 24 g con 80 kg), y se recomienda repartirla en 4 tomas. Al terminar pasa sola a mantenimiento. Se puede cancelar.
- **Check**: **uno al día**, «Tomada hoy», también durante la carga. Se deshace con el mismo control.
- **Dónde se ve**: tarjeta en **Inicio**, como la del agua, con la dosis del día y el check. Su hoja muestra los últimos 7 días.
- **No cuenta** para XP, rachas, Ritmo ni Vitrina.
- **Solo creatina** en pantalla, pero los datos se guardan de forma que más adelante se puedan añadir otros suplementos sin migrar.
- **Descartado**: recordatorios con notificación (en iOS necesitan servidor de push y la app no tiene backend). Anotarlo en `roadmap.md` › Descartadas.

**Datos** (seguir la cabecera de `shared/db/db.ts` y `shared/lib/backup.ts`).
- Tabla nueva, propuesta `suplementos`: una fila por toma marcada (`fecha`, `tipo: 'creatina'`), con índice por `[tipo+fecha]`. Va en `TABLAS_USUARIO`, versión de Dexie **v8** sin tocar las anteriores, test de migración en `db.test.ts`, backup (y `migrarBackup` si cambia la forma).
- `Settings`: activación, dosis manual opcional e inicio de la fase de carga (la fecha basta; el fin se deriva).
- Repositorio en la feature que corresponda (`data/…Repo.ts`), con escrituras en transacción y lecturas sin escribir.

**Lógica pura (con tests).** Dosis del día (mantenimiento, mínimo, redondeo, manual, sin pesaje), estado de la fase de carga (en curso, día N de 5, terminada) y texto de la tarjeta.

**Decidir al implementar.** Feature dueña: `inicio/` (junto al agua) o una pequeña `suplementos/`.

**Documentos.** `docs/datos.md` (tabla, ajustes, backup), `docs/features/inicio.md` (tarjeta), `docs/arquitectura.md` si se crea una feature, `docs/roadmap.md` (descartada) y `README.md` (característica visible).

**Validación.** Activar y desactivar; sin pesaje; peso bajo (que salga el mínimo de 3 g); dosis manual; carga completa de 5 días y cancelada; restaurar un backup antiguo (sin tabla) y uno nuevo.

---

## 1 · Cheat day

**Decisión.**
- Se marca **el día entero**, no una comida, desde el **menú del día del Diario**. Hoy ese botón «más» abre directamente «Copiar el día» (`pages/Hoy.tsx`); pasa a ser un menú de acciones del día: «Copiar el día» y «Marcar como cheat day» / «Quitar cheat day».
- Nombre visible: **«Cheat day»**.
- **Registro opcional**: se puede marcar un día vacío. Si se apunta comida, se ve en el Diario y en la rueda de Inicio con sus kcal reales.
- **Fuera de las medias**: medias de kcal y macros del Resumen, revisión semanal, adherencia ±10 % y media de objetivos. Nota visible: «N cheat days fuera de la media».
- **No rompe la racha** de días registrados.
- Ese día **no da XP de proteína** (la XP nunca resta).
- Marca visible en la cabecera del día y en la franja de la semana (`SemanaKcal`).
- **Aviso suave al marcar el 2.º de la misma semana** («Es tu 2.º cheat day esta semana»), sin bloquear.
- Sin límite duro.

**Datos.**
- Tabla nueva, propuesta `cheatDays` (`&fecha`), en `TABLAS_USUARIO`, **v9** (o v8 si se implementa antes que la creatina), con test de migración y backup. Alternativa a valorar: una lista en `Settings`, como `pausas`; la tabla escala mejor y va con el resto de registros por fecha.
- Quitar la marca: borrado inmediato con «Deshacer» (`useAviso`).

**Lógica pura (con tests).** Filtrar las fechas de cheat day antes de calcular `resumenPeriodo`, `calcularAdherencia` y `bloqueNutricion` (revisión semanal); `calcularRachas` las sigue contando como registradas; contador semanal para el aviso; Atributos sin XP de proteína ese día.

**Dónde.** `nutricion/pages/Hoy.tsx` (menú del día), `nutricion/lib/nutrition.ts`, `adherencia.ts`, `semanaKcal.ts`, `pages/Resumen`, `inicio/lib/revisionSemanal.ts` y `atributos/` (XP de proteína). Comprobar también Vitrina (logro «Proteína») y Cumbres, que derivan de la misma XP.

**Documentos.** `docs/features/nutricion.md` (flujo y Resumen), `docs/features/inicio.md` (revisión semanal), `docs/features/atributos.md` (XP), `docs/datos.md` (tabla y backup) y `README.md`.

**Validación.** Semana con 0, 1 y 2 cheat days (el aviso al 2.º); cheat day vacío y con comida; las medias y la nota cuadran a mano; la racha no se rompe; desmarcar con «Deshacer»; backup de ida y vuelta.

---

## 7 · Creador de rutinas

**Contexto.** Hoy las rutinas se crean a mano en Gym › Rutinas: nombre, ejercicios y objetivo por ejercicio (`Routine.objetivos`: series, rango de reps y descanso). No hay nada que proponga una rutina. Se puede reutilizar lo que ya existe: el selector de ejercicios (cambio manual), las alternativas de la Liga y su «Usar» (`liga/lib/alternativas.ts`, `routinesRepo.sustituirEjercicio`) y los entrenos por semana de Ritmo (`settings.planSemanal`).

**Decisión.**
- **Por reglas, sin IA ni red**: las respuestas eligen un reparto, cada día pide patrones de movimiento y se rellenan con ejercicios del catálogo que encajen con el material.
- **Entrada**: en Gym › Rutinas, «Crear rutina» ofrece «En blanco» (el editor de siempre) o «Con el asistente».
- **Preguntas**, en una sola pantalla con `SegmentedControl` y chips:
  - días por semana, 2–6 (por defecto, los de Ritmo);
  - tiempo por sesión: 45 / 60 / 75 min (decide el número de ejercicios);
  - material: gimnasio completo · mancuernas y banco · casa (peso corporal y bandas);
  - objetivo: hipertrofia · fuerza · general;
  - músculos a priorizar (opcional).
- **Genera un plan de varias rutinas**, una por día distinto, según los días:

  | Días | Reparto | Rutinas |
  |---|---|---|
  | 2 | Cuerpo completo | A · B |
  | 3 | Cuerpo completo | A · B · C |
  | 4 | Torso / pierna | Torso A · Pierna A · Torso B · Pierna B |
  | 5 | Torso / pierna + empuje / tirón / pierna | Torso · Pierna · Empuje · Tirón · Pierna B |
  | 6 | Empuje / tirón / pierna × 2 | Empuje A/B · Tirón A/B · Pierna A/B |

- **Vista previa antes de guardar**: cada ejercicio lleva «Cambiar», que abre las sugerencias (mismo patrón y material; primero los que ya has hecho) o «Elegir otro» (el selector manual, que también permite personalizados). También hay «Otra sugerencia» con un toque y «Regenerar todo». No se escribe nada hasta «Guardar».
- **Objetivos rellenos según el objetivo**. Propuesta inicial, a ajustar al implementar:

  | Objetivo | Compuestos | Aislamiento |
  |---|---|---|
  | Hipertrofia | 3 × 6–10, 120 s | 3 × 10–15, 90 s |
  | Fuerza | 4 × 3–6, 180 s | 3 × 8–12, 90 s |
  | General | 3 × 8–12, 90 s | 2 × 12–15, 60 s |

- Al guardar quedan como **rutinas normales**, editables luego en el editor de siempre.
- **Sin cambio de esquema**: se usan `Routine` y `ObjetivoEjercicio` tal como están.

**Catálogo: información nueva** (trabajo editorial, una sola vez, en `gym/lib/catalogoEjercicios.ts`).
- `tipo`: `compuesto` | `aislamiento`, para ordenar la sesión (compuestos primero) y elegir el objetivo.
- `patron`: empuje horizontal, empuje vertical, tirón horizontal, tirón vertical, sentadilla, bisagra de cadera, zancada / unilateral y aislamientos por grupo (bíceps, tríceps, elevaciones laterales, gemelos, core…). La lista exacta se cierra al implementar.
- Test de catálogo: los 204 ejercicios tienen `tipo` y `patron`, y cada patrón que pide un reparto tiene al menos un ejercicio para cada opción de material.

**Lógica pura (con tests)**, propuesta `gym/lib/creadorRutinas.ts`:
- reparto por días y plantilla de patrones por día;
- número de ejercicios según el tiempo;
- filtro de material y prioridad de músculos;
- elección determinista con semilla, para que «Otra sugerencia» y «Regenerar» sean reproducibles en los tests;
- sin ejercicios repetidos dentro de un mismo día y con poca repetición entre días;
- sugerencias de cambio por patrón y material (valorar que las alternativas de la Liga reutilicen esta función).

**Datos.** Guardar el plan en una sola transacción en `routinesRepo`. Los ejercicios del catálogo que aún no existan en `exercises` se resuelven **antes** de la transacción o con escrituras solo de Dexie dentro de ella (`exercisesRepo.resolverSeleccion`). Si ya hay una rutina con el mismo nombre, decidir al implementar (sufijo o aviso).

**Dónde.** `gym/pages/Rutinas.tsx` (entrada), una página modal nueva para el asistente y la vista previa (capas compartidas, sin wrappers nuevos), `SelectorEjercicios` para «Elegir otro» y `routinesRepo`.

**Documentos.** `docs/features/gym.md` (flujo y catálogo), `docs/features/liga.md` si las alternativas pasan a reutilizar la función nueva, `docs/DESIGN-SYSTEM.md` si aparece un patrón nuevo, `README.md` y un ADR en `docs/decisiones/` (creador por reglas, sin IA).

**Validación.** De 2 a 6 días × los tres materiales × los tres objetivos generan planes completos sin huecos. Cambiar, otra sugerencia y regenerar. Guardar y empezar un entreno desde una rutina generada (series objetivo correctas). A 320 px con nombres largos.

---

## 6 · Uso por otras personas (por afinar)

Víctor confirma que la app la usarán **otras personas**, no solo él. Antes de tocar nada hay que afinar el alcance:
- `CLAUDE.md` y `README.md` dicen «único usuario» o están escritos para Víctor: hay que actualizarlos.
- Revisar valores por defecto pensados para él (perfil, objetivos, rutinas…).
- Valorar más adelante un recorrido inicial o ayudas contextuales. De momento, en el punto 5 se eligió solo el chevron.
- Cada persona tiene sus propios datos en su móvil (no hay backend), así que no cambia la privacidad.
