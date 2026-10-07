# Gym

`src/features/gym/`. Datos e invariantes: `../datos.md`. UI: `../DESIGN-SYSTEM.md`.

## Dónde está cada cosa

| Área | Pantalla / componentes | Lógica pura | Datos |
|---|---|---|---|
| Inicio de Gym | `pages/GymHome` (entreno vacío o desde rutina) | — | `workoutsRepo.empezar` |
| Entreno activo | `pages/EntrenoActivo` (diferida), `components/WorkoutClock`, `components/WorkoutFinished` | `lib/workout.ts`: `formatUltimaVez`, `formatHora`, `volumenSets`; `lib/session.ts`: marcas, descanso y relojes; y, desde `setsRepo`, `valoresNuevaSerie` y `siguienteOrden` | `setsRepo`, `exercisesRepo`, `workoutsRepo`; sessionStorage solo para presentación |
| Rutinas | `pages/Rutinas`, `components/SelectorEjercicios` | `lib/catalogoEjercicios`, `lib/selectorEjercicios` | `routinesRepo`, `exercisesRepo.resolverSeleccion` |
| Historial | `pages/Historial`, `components/MapaMuscular` | `volumenSets`, `formatDuracion`, `lib/cargaMuscular` | `workoutsRepo.terminados`, `setsRepo` |
| Mapa muscular de sesión | `components/MapaMuscular`, `mapaMuscularGeometria` | `lib/musculos`, `lib/cargaMuscular`: carga → agregación → normalización | `workoutsRepo.terminar`: snapshot semántico junto a fin |
| Progreso | `pages/Progreso` (diferida, Recharts) | `epley1RM`, `pesoMaximo`, `volumenSets` | `setsRepo.delEjercicio` |
| Tarjeta de Inicio | `components/TarjetaEntreno` (la usa `inicio/`) | `resumenUltimoEntreno` | `workoutsRepo.activo` / `ultimoTerminado`, `setsRepo.delWorkout` (solo lectura) |

## Presentación

ViewTabs organiza Inicio/Rutinas/Historial/Progreso. El inicio prioriza rutina si existe y entreno libre; sin rutinas no ofrece una acción inaplicable. Inicio de Gym enfatiza «Tu próxima sesión» sin dar por programada una rutina. Entreno activo: cabecera compacta, métricas en cursiva condensada y un panel por ejercicio con nombre en título de 26 px y referencia anterior. Formularios y etiquetas van rectos a ancho normal. Cada serie tiene campos directos de reps/kg ≥44 px, cifras de 18 px/700 sobre grafito y borrado; se conserva el redondeo a dos decimales del control anterior. CampoSerie mantiene un borrador durante el foco para que las respuestas de IndexedDB no interrumpan la escritura; guarda valores válidos conforme se escriben y resuelve un campo vacío al salir.

Rutinas: lista plana, editor con nombre visible y ejercicios numerados; guardar/error/confirmación en footer persistente. Historial: lista de fechas y detalle con métricas/tabla de series. Progreso muestra el último peso, 1RM estimado y volumen; solo dibuja tendencias con ≥2 sesiones. Peso/1RM comparten gráfica con leyenda y 1RM discontinuo, volumen se separa por unidad. Líneas rectas y datos completos desplegables para consulta sin depender del color/tooltip.

## Flujos y reglas

- **Entreno activo**: `GymTab` consulta `workoutsRepo.activo()` con `useLiveQuery`; si hay un entreno sin `fin`, la pestaña entera es `EntrenoActivo`. Los registros sobreviven a cerrar la app o recargar. «Terminar» abre confirmación; guardar espera las escrituras pendientes, pone `fin` y muestra duración, ejercicios, series y volumen reales. Cancelar conserva la sesión; un fallo mantiene la confirmación con error y permite reintentar.
- **Marcar serie**: el número es un control reversible con check y anuncio; requiere reps >0 y espera la escritura de esa serie. Editar desmarca. Es una ayuda visual de ejecución, no un nuevo estado histórico: todas las series registradas se guardan al terminar, marcadas o no, y la confirmación lo explica.
- **Descanso**: apagado por defecto, configurable a 60/90/120 s en un Disclosure. Completar una serie inicia el temporizador si está habilitado. Puede finalizarse antes; el reloj usa un deadline absoluto, suspende ticks cuando la pestaña está oculta y recalcula al volver. No garantiza notificaciones o ejecución en background.
- **Estado visual**: marcas/duración/deadline viven por workout en sessionStorage; sobreviven a navegar y recargar la misma pestaña, pero no se exportan ni modifican IndexedDB. Si storage falla, funcionan en memoria. Terminar limpia ese estado. La identidad de tablas, cálculos y backup permanece intacta.
- **Añadir ejercicio**: `SelectorEjercicios` usa ModalPage tanto encima del editor de rutina como desde la sesión. Búsqueda inmediata (acentos/case, prefijos, palabras desordenadas, alias y una errata de una letra para palabras de ≥4), chips multiselección por músculo principal/equipamiento. OR dentro de una familia, AND entre familias y búsqueda. Resultados planos con miniatura de referencia a la izquierda (`MiniaturaEjercicio`, 48 px, token `thumb`); teclado solo al tocar el buscador. Muestra seis recientes deduplicados según `sets.createdAt` si no hay búsqueda/filtros; no crea una tabla de uso ni considera cancelar un editor como entrenamiento.
- **Catálogo**: 116 definiciones editoriales locales en `lib/catalogoEjercicios`, con `id` estable `appfit:*`, nombre, músculos principales/secundarios, equipo y alias opcionales. Independiente de IndexedDB, disponible offline y sin instalar 116 registros. Las lecturas combinan catálogo/locales sin escribir. No se regeneran ids al cambiar un título.
- **Personalizado**: acción al final de resultados → formulario en la misma tarea (nombre, músculo principal, equipamiento). Crear y añadir lo persiste en `exercises`, sin `catalogId`; cancelar antes de crear no escribe. Conserva el borrador/error si falla. Un nombre ya guardado no se sobrescribe: se pide seleccionar el existente o usar otro nombre. Una rutina sin guardar puede descartarse conservando el ejercicio que el usuario decidió crear, igual que antes.
- **Identidad histórica**: `Exercise.id` numérico sigue en rutinas/series/progreso. `catalogId`/músculos/equipo son opcionales; sin migración de filas/esquema/backup. `resolverSeleccion` reutiliza vínculo estable o nombre/alias exacto de un registro antiguo sin metadatos, sin renombrarlo ni alterar series/rutinas. Los parecidos no fusionan identidades. Personalizados con nombre de catálogo conservan su clasificación. Los registros no clasificados siguen accesibles sin filtros; referencias a definiciones retiradas pueden elegirse por id local.
- **Primera serie**: `setsRepo.agregarSeleccion` resuelve el ejercicio y añade su serie en una transacción. Un fallo revierte ambas operaciones; la pantalla permanece abierta y permite reintentar. `agregarConEjercicio` se conserva como API anterior. Defaults, valores históricos y orden de las series siguen siendo los mismos.

- **Imágenes de ejercicios**: miniatura de referencia en `public/ejercicios/<slug>.webp` (192 px, WebP). Origen por prioridad: ilustración propia generada con IA (render anatómico gris con los músculos principales en naranja; generada por lotes de cuatro, `ilustraciones.json`/`prompts.md`; hoy los 116) y, si faltara, foto de free-exercise-db (Unlicense, mapeo editorial en `mapeo.json`). Se generan offline con `scripts/ejercicios/` (ver su README), que también escribe `lib/ejerciciosConImagen.ts`; `lib/imagenEjercicio.ts` resuelve `catalogId → URL | null` sin peticiones. Personalizados, ejercicios sin equivalente fiel o una imagen que no carga (`onError`, p. ej. sin red y sin caché) muestran un hueco neutro con el icono de mancuerna del mismo tamaño, para que las filas queden alineadas. En oscuro la foto se atenúa con el token `--thumb-filter`. Las imágenes no se precachean: `CacheFirst` en la caché `ejercicios` (`arquitectura.md`). No se amplían al tocarlas: la fila entera es el botón de añadir y anidar otro botón rompería el control.

Las definiciones se pueden ampliar por id con instrucciones o variantes; favoritos y estadísticas pueden referenciar `Exercise.id`/`catalogId` sin sustituir el histórico. No se implementan estas funciones todavía.

- **Nueva serie**: `setsRepo.agregar` toma reps y peso de la última serie de ese ejercicio (índice `[exerciseId+createdAt]`; si no hay, 8 × 20 kg) y calcula `orden` dentro de la transacción.
- **Doble toque**: `empezar` devuelve el entreno activo si ya existe (nunca dos activos).
- **Borrar** (patrón de `DESIGN-SYSTEM.md` § Patrón de borrado): series con «Deshacer» (`setsRepo.borrar`/`restaurar`), rutinas con confirmación.
- **Errores**: toda escritura va con `try/catch`: Toast de error fuera de los Sheets y `ErrorState` dentro.
- **1RM**: fórmula de Epley. Volumen = Σ peso × reps.

## Mapa muscular

El resumen final y la Sheet del historial comparten `MapaMuscular`: siluetas frontal/trasera con once zonas y niveles relativos de rojo, lista de grupos ordenada por trabajo y detalle de ejercicios principales/secundarios. Los grupos no identificados y la metodología se consultan en Disclosure; la cobertura avisa cuando falta clasificación. El mapa es esquemático y bilateral; hombros es un grupo común, sin distinguir porciones anterior/posterior.

`calcularCargaEjercicio` considera series con reps positivas, limita el aporte a 30 reps por serie y compara peso solo dentro del mismo ejercicio. `agregarCargaMuscular` pondera principales 1,0 y secundarios 0,5; `normalizarCargaMuscular` compara cada grupo con el máximo de esa sesión. Tonelaje y reps quedan separados del estímulo. Fórmula, límites e interpretación: [ADR 015](../decisiones/015-mapa-muscular-de-sesion.md).

Terminar captura clasificación/nombre por ejercicio y las series existentes permanecen intactas. El snapshot opcional sobrevive al backup y evita que una edición posterior del catálogo cambie el reparto de una sesión nueva. Los entrenos anteriores sin snapshot usan la clasificación disponible y lo explican, sin escribir ni migrar al consultar. Personalizados con un músculo concreto participan; «Cuerpo completo» sin reparto no colorea todo por defecto. Los ocho ejercicios oficiales de esa categoría mantienen el filtro mediante `filterGroups` y aportan zonas reales.

Preparado para mejorar la estimación o agregar sesiones con otra normalización; no muestra esfuerzo medido, fatiga, recuperación, riesgo ni recomendaciones. No implementa mapas semanales/mensuales todavía.
