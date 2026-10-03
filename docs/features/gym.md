# Gym

`src/features/gym/`. Datos e invariantes: `../datos.md`. UI: `../DESIGN-SYSTEM.md`.

## Dónde está cada cosa

| Área | Pantalla / componentes | Lógica pura | Datos |
|---|---|---|---|
| Inicio de Gym | `pages/GymHome` (entreno vacío o desde rutina) | — | `workoutsRepo.empezar` |
| Entreno activo | `pages/EntrenoActivo` (diferida), `components/WorkoutClock`, `components/WorkoutFinished` | `lib/workout.ts`: `formatUltimaVez`, `formatHora`, `volumenSets`; `lib/session.ts`: marcas, descanso y relojes; y, desde `setsRepo`, `valoresNuevaSerie` y `siguienteOrden` | `setsRepo`, `exercisesRepo`, `workoutsRepo`; sessionStorage solo para presentación |
| Rutinas | `pages/Rutinas` | — | `routinesRepo`, `exercisesRepo.obtenerOCrear` |
| Historial | `pages/Historial` | `volumenSets`, `formatDuracion` | `workoutsRepo.terminados`, `setsRepo` |
| Progreso | `pages/Progreso` (diferida, Recharts) | `epley1RM`, `pesoMaximo`, `volumenSets` | `setsRepo.delEjercicio` |
| Tarjeta de Inicio | `components/TarjetaEntreno` (la usa `inicio/`) | `resumenUltimoEntreno` | `workoutsRepo.activo` / `ultimoTerminado`, `setsRepo.delWorkout` (solo lectura) |

## Presentación

ViewTabs organiza Inicio/Rutinas/Historial/Progreso. El inicio prioriza rutina si existe y entreno libre; sin rutinas no ofrece una acción inaplicable. Entreno activo: cabecera compacta, datos de inicio/series/volumen y un panel por ejercicio con referencia anterior. Cada serie tiene campos directos de reps/kg ≥44 px, texto 16 px y borrado; se conserva el redondeo a dos decimales del control anterior. CampoSerie mantiene un borrador durante el foco para que las respuestas de IndexedDB no interrumpan la escritura; guarda valores válidos conforme se escriben y resuelve un campo vacío al salir.

Rutinas: lista plana, editor con nombre visible y ejercicios numerados; guardar/error/confirmación en footer persistente. Historial: lista de fechas y detalle con métricas/tabla de series. Progreso muestra el último peso, 1RM estimado y volumen; solo dibuja tendencias con ≥2 sesiones. Peso/1RM comparten gráfica con leyenda y 1RM discontinuo, volumen se separa por unidad. Líneas rectas y datos completos desplegables para consulta sin depender del color/tooltip.

## Flujos y reglas

- **Entreno activo**: `GymTab` consulta `workoutsRepo.activo()` con `useLiveQuery`; si hay un entreno sin `fin`, la pestaña entera es `EntrenoActivo`. Los registros sobreviven a cerrar la app o recargar. «Terminar» abre confirmación; guardar espera las escrituras pendientes, pone `fin` y muestra duración, ejercicios, series y volumen reales. Cancelar conserva la sesión; un fallo mantiene la confirmación con error y permite reintentar.
- **Marcar serie**: el número es un control reversible con check y anuncio; requiere reps >0 y espera la escritura de esa serie. Editar desmarca. Es una ayuda visual de ejecución, no un nuevo estado histórico: todas las series registradas se guardan al terminar, marcadas o no, y la confirmación lo explica.
- **Descanso**: apagado por defecto, configurable a 60/90/120 s en un Disclosure. Completar una serie inicia el temporizador si está habilitado. Puede finalizarse antes; el reloj usa un deadline absoluto, suspende ticks cuando la pestaña está oculta y recalcula al volver. No garantiza notificaciones o ejecución en background.
- **Estado visual**: marcas/duración/deadline viven por workout en sessionStorage; sobreviven a navegar y recargar la misma pestaña, pero no se exportan ni modifican IndexedDB. Si storage falla, funcionan en memoria. Terminar limpia ese estado. La identidad de tablas, cálculos y backup permanece intacta.
- **Añadir ejercicio**: `setsRepo.agregarConEjercicio` crea el ejercicio si no existe y su primera serie en una sola transacción. La primera serie existe siempre porque un ejercicio sin series desaparecería de la pantalla (el entreno se reconstruye a partir de sus series).
- **Nueva serie**: `setsRepo.agregar` toma reps y peso de la última serie de ese ejercicio (índice `[exerciseId+createdAt]`; si no hay, 8 × 20 kg) y calcula `orden` dentro de la transacción.
- **Doble toque**: `empezar` devuelve el entreno activo si ya existe (nunca dos activos).
- **Borrar** (patrón de `DESIGN-SYSTEM.md` § Patrón de borrado): series con «Deshacer» (`setsRepo.borrar`/`restaurar`), rutinas con confirmación.
- **Errores**: toda escritura va con `try/catch`: Toast de error fuera de los Sheets y `ErrorState` dentro.
- **1RM**: fórmula de Epley. Volumen = Σ peso × reps.
