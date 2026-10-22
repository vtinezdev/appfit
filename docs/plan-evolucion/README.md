# Plan de evolución (octubre 2026)

Plan vivo para implementar, poco a poco, las 33 mejoras que Víctor eligió el 2026-10-22 en el dashboard de evolución (dos loops de investigación: <https://claude.ai/artifact/Qjai8aiNUC5aARFgA6nLtM>, privado de Víctor). Cada mejora conserva su ID del dashboard (`NUT-03`, `ENT-01`…); allí está la investigación completa de cada una (situación comprobada, referencias externas, impacto y esfuerzo).

El trabajo se reparte en **dos carriles** para que dos sesiones de Claude Code, en dos cuentas distintas que no se ven entre sí, trabajen a la vez sin pisarse:

| Carril | Archivo de estado | Tema | Pasos |
|---|---|---|---|
| **A** | [`carril-a.md`](carril-a.md) | Entreno, Social y actividades | 15 + 2 cruces |
| **B** | [`carril-b.md`](carril-b.md) | Inicio, Nutrición, navegación y progreso | 17 |

Base: `master` en `550ab77` (tras el historial por gimnasio, §185–§188, y la auditoría del 22 de octubre, `docs/plan-auditoria-2026-10-22.md`, ya cerrada). Las dos sesiones solo se comunican a través de `master`: lo que una fusiona, la otra lo ve al actualizar su rama. Víctor es quien fusiona las PR y quien resuelve las decisiones marcadas como **Decidir**.

## Cómo empezar una sesión

Mensaje para abrir cada sesión (cambiar la letra del carril):

> Trabajas en el **carril A** del plan de evolución de AppFit. Lee `CLAUDE.md`, `docs/plan-evolucion/README.md` y `docs/plan-evolucion/carril-a.md`. Actualiza `master`, coge el primer paso sin marcar cuyas dependencias estén cumplidas, resúmeme en pocas líneas cómo lo vas a hacer y qué tengo que decidir, y cuando te lo confirme, impleméntalo.

Cada sesión, al terminar un paso:

1. `npm run test` y `npm run build` en verde (si algo falla o no se pudo probar, se dice).
2. Prueba en navegador **solo** en `http://appfit-test.localhost:5173` (`docs/desarrollo.md` § Pruebas en navegador) a 320/375/430 px, en ambos temas.
3. Documentos vivos de las features tocadas (tabla de `CLAUDE.md`) y una entrada en `docs/PROCESO.md` (ver «Archivos compartidos»).
4. Marcar el paso en el archivo de **su** carril (`- [x]`, con la fecha y la PR).
5. Commit, push y PR a `master` solo cuando Víctor lo pida (`CLAUDE.md` § Forma de trabajar).

## Reglas de Git para trabajar en paralelo

- Cada paso, en su rama nueva desde `master` actualizado: `git fetch origin master && git checkout -B feat/a-<tema> origin/master` (en el carril B, `feat/b-<tema>`). Una rama por paso, nunca dos pasos en la misma rama.
- PR pequeña a `master`. Commits en inglés, estilo convencional (`feat(gym): …`).
- Si la otra sesión ha fusionado algo mientras tanto y la PR tiene conflictos: `git fetch origin master && git rebase origin/master`, resolver, repetir test y build, y `git push --force-with-lease`.
- No empezar un paso que dependa de otro que aún no está en `master` (columna «Depende de»).
- Nunca editar el archivo de estado del otro carril.

## Qué es de cada carril

Cada carril es **dueño** de unas carpetas: solo él las modifica. Del otro carril se puede **leer e importar** todo (respetando las capas de `docs/arquitectura.md`), pero no editarlo. Si un paso necesita cambiar algo del otro carril, es un **cruce** y está planificado (tabla de abajo).

| Ruta | Dueño |
|---|---|
| `src/features/gym/`, `liga/`, `actividades/`, `social/` | A |
| `supabase/` (migraciones y pruebas SQL) | A |
| `src/features/inicio/`, `nutricion/`, `perfil/`, `ritmo/`, `cumbres/`, `caminos/`, `vitrina/`, `experiencia/`, `referencias/`, `cuenta/` | B |
| `src/app/` (App, navegación, media luna, Ajustes) | B |
| `src/shared/` (db, lib, design, components, hooks) | B |
| `scripts/ejercicios/`, `public/ejercicios/` | A |
| `docs/features/gym.md`, `liga.md`, `actividades.md`, `social.md`, `docs/social-mejoras.md` | A |
| El resto de `docs/features/`, `DESIGN.md`, `PRODUCT.md`, `docs/DESIGN-SYSTEM.md`, `docs/arquitectura.md`, `docs/datos.md`, `docs/decisiones/` | B (A puede añadir párrafos sobre sus features; ver abajo) |

Consecuencias:

- **El carril A no toca `src/shared/` ni `src/app/`.** Si necesita una pieza nueva, la crea dentro de su feature (por ejemplo, un componente en `gym/components/`). En los pasos de A no hace falta ningún campo nuevo en `Settings` ni ninguna versión de esquema. Única excepción: el cruce A-X1 cambia la línea de `src/app/App.tsx` que monta `AmigosTab`.
- **Solo B crea versiones de Dexie** (`shared/db/db.ts`) y toca `shared/lib/backup.ts`. Hoy la última es la 13 (`gimnasios`, PROCESO §185).
- **Solo A crea migraciones de Supabase.** Hoy la última es `0021`. Se ejecutan a mano en el SQL Editor, como siempre (`docs/features/social.md`).
- Ninguno añade dependencias a `package.json` sin preguntar a Víctor.

## Archivos compartidos

Los dos carriles escriben en estos archivos. Reglas para que los conflictos sean triviales:

| Archivo | Regla |
|---|---|
| `docs/PROCESO.md` | Entradas añadidas **al final**. El número (`## 185.`, `## 186.`…) es el siguiente al último que haya en `master` **en el momento del rebase**; si al rebasar choca, se renumera la propia. Hoy la última es la 190 (la de este plan). |
| `docs/roadmap.md` | Solo se quitan o se cambian las líneas de lo que el propio paso termina. |
| `docs/arquitectura.md`, `docs/datos.md`, `docs/DESIGN-SYSTEM.md` | A solo edita los párrafos de sus features (Entreno, Social, Actividades). En conflicto, se conservan las dos versiones. |

## Cruces planificados

Pasos que necesitan algo del otro carril. Se hacen **después** de que la parte del otro esté en `master`.

| Cruce | Lo hace | Necesita en `master` | Qué toca |
|---|---|---|---|
| X1 · «Volver» en Amigos | A (paso A-X1) | B4 (prop `volver` de `PageHeader`) | `social/AmigosTab.tsx` y la línea de `App.tsx` que lo monta |
| X2 · Línea de la meta en la gráfica del ejercicio | A (paso A-X2) | B13 (metas en `Settings` y su lógica) | `gym/pages/Progreso.tsx` |
| X3 · Imagen compartible de cumbres, logros y «Tu año» | B (dentro de B15) | A10 (`gym/lib/exportarImagen.ts`) | componentes de B que importan esa utilidad |
| X4 · Fin de sesión con el cálculo compartido | A (dentro de A9, opcional) | B8 (lector compartido `useProgreso`) | `gym/components/WorkoutFinished.tsx` |
| X5 · Abrir el detalle de un entreno desde el calendario único | A (a demanda) | B14 | prop nueva en `gym/GymTab.tsx`; solo si Víctor lo pide |

Si un cruce no está listo cuando toca, el paso sigue sin él y lo deja anotado en su archivo de estado.

## Decisiones pendientes de Víctor

Cada una aparece también, como **Decidir**, en el paso que la necesita. Se resuelven al llegar al paso, no antes.

| # | Paso | Decisión |
|---|---|---|
| D1 | B6 · NUT-03 | Volver a tener un acceso para registrar en Inicio, que ADR 021 («sin accesos que repitan destinos») y ADR 043 dejaron fuera. Si se aprueba, ADR nuevo o actualización del 043. Umbral de «lo de siempre» (propuesto: la misma combinación en esa comida ≥ 3 de los últimos 7 días). |
| D2 | B9 · GLO-02 | Qué módulos se pueden desactivar y qué pasa con la gamificación al quitar Nutrición (propuesto: pasa a «Solo entreno»). |
| D3 | B12 · GAM-02 | Un destino «Progreso» con pestañas en lugar de cuatro destinos sueltos: cambia el ADR 043. |
| D4 | B13 · GAM-04 | Qué tipos de meta (propuesto: récord de un ejercicio, km de un mes, semanas cumplidas; nunca peso corporal) y si da un logro en la Vitrina. |
| D5 | B11 · PRO-01 | Dónde viven las lecturas cruzadas (revisión semanal o Progreso) y su redacción («coinciden», nunca «porque»). |
| D6 | B10 · NUT-05 | Si encaja ordenar tus alimentos por lo que te falta (riesgo de empujar a comer de más). |
| D7 | A7 · ENT-05 | Porcentajes de la rampa de calentamiento, como criterio de AppFit declarado en Referencias. |
| D8 | A3 · ENT-14 | Preguntar el descanso una vez en general o una vez por ejercicio. |
| D9 | A9 · ENT-10 | Qué hitos van en la franja «Hoy» del póster y en qué orden. |
| D10 | A12 · ENT-09 | Quién revisa los textos de técnica y con qué fuentes; por qué ejercicios se empieza. |
| D11 | A13–A15 · SOC | ADR para lo que sale del móvil, migraciones, y si van antes o después de la fase 6 legal de Social. |
| D12 | B16 · NUT-04 | Comidas planificadas en días futuros: cómo cuentan en medias, rachas, XP y objetivos congelados. |
| D13 | B17 · PRO-04 | Fotos dentro o fuera del backup y de la copia cifrada; límite de tamaño. |

## Fuera de los carriles

- **REN-03 · App nativa ligera (Apple Salud, Health Connect, GPS en segundo plano).** Cambia el plan de publicación (`docs/despliegue.md`), exige cuenta de Apple y compilar en Mac o en la nube. Se decide cuando los dos carriles avancen; no se empieza sin hablarlo.
- **No elegidas en el dashboard** (siguen allí por si se recuperan): GLO-01 primer uso guiado, GLO-03 tarjeta «Lo siguiente», ENT-02 superseries, ENT-03 pantalla encendida, ENT-06, ENT-07, ENT-16 nota fija, NUT-01, NUT-02 revisión con propuesta de objetivo, NUT-10, NAV-01, SOC-04. Varias son baratas y de mucho impacto (ENT-03 es una línea; GLO-01 es la condición para publicar): conviene repasarlas.

## Al terminar

Cuando los dos carriles estén completos, este directorio pasa a `docs/historico/` y `docs/roadmap.md` deja de enlazarlo.
