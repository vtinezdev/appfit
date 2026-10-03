# Gym

`src/features/gym/`. Datos e invariantes: `../datos.md`. UI: `../DESIGN-SYSTEM.md`.

## Dónde está cada cosa

| Área | Pantalla / componentes | Lógica pura | Datos |
|---|---|---|---|
| Inicio de Gym | `pages/GymHome` (entreno vacío o desde rutina) | — | `workoutsRepo.empezar` |
| Entreno activo | `pages/EntrenoActivo` | `lib/workout.ts`: `formatUltimaVez`, `formatHora`, `volumenSets`; y, desde `setsRepo`, `valoresNuevaSerie` y `siguienteOrden` | `setsRepo`, `exercisesRepo`, `workoutsRepo` |
| Rutinas | `pages/Rutinas` | — | `routinesRepo`, `exercisesRepo.obtenerOCrear` |
| Historial | `pages/Historial` | `volumenSets`, `formatDuracion` | `workoutsRepo.terminados`, `setsRepo` |
| Progreso | `pages/Progreso` (diferida, Recharts) | `epley1RM`, `pesoMaximo`, `volumenSets` | `setsRepo.delEjercicio` |
| Tarjeta de Inicio | `components/TarjetaEntreno` (la usa `inicio/`) | `resumenUltimoEntreno` | `workoutsRepo.activo` / `ultimoTerminado`, `setsRepo.delWorkout` (solo lectura) |

## Presentación

ViewTabs organiza Inicio/Rutinas/Historial/Progreso. El inicio prioriza rutina si existe y entreno libre; sin rutinas no ofrece una acción inaplicable. Entreno activo: cabecera compacta, datos de inicio/series/volumen y un panel por ejercicio con referencia anterior. Cada serie tiene campos directos de reps/kg ≥44 px, texto 16 px y borrado; se conserva el redondeo a dos decimales del control anterior. CampoSerie mantiene un borrador durante el foco para que las respuestas de IndexedDB no interrumpan la escritura; guarda valores válidos conforme se escriben y resuelve un campo vacío al salir.

Rutinas: lista plana, editor con nombre visible y ejercicios numerados; guardar/error/confirmación en footer persistente. Historial: lista de fechas y detalle con métricas/tabla de series. Progreso muestra el último peso, 1RM estimado y volumen; solo dibuja tendencias con ≥2 sesiones. Peso/1RM comparten gráfica con leyenda y 1RM discontinuo, volumen se separa por unidad. Líneas rectas y datos completos desplegables para consulta sin depender del color/tooltip.

## Flujos y reglas

- **Entreno activo**: `GymTab` consulta `workoutsRepo.activo()` con `useLiveQuery`; si hay un entreno sin `fin`, la pestaña entera es `EntrenoActivo`. Así sobrevive a cerrar la app o recargar. «Terminar» pone `fin`.
- **Añadir ejercicio**: `setsRepo.agregarConEjercicio` crea el ejercicio si no existe y su primera serie en una sola transacción. La primera serie existe siempre porque un ejercicio sin series desaparecería de la pantalla (el entreno se reconstruye a partir de sus series).
- **Nueva serie**: `setsRepo.agregar` toma reps y peso de la última serie de ese ejercicio (índice `[exerciseId+createdAt]`; si no hay, 8 × 20 kg) y calcula `orden` dentro de la transacción.
- **Doble toque**: `empezar` devuelve el entreno activo si ya existe (nunca dos activos).
- **Borrar** (patrón de `DESIGN-SYSTEM.md` § Patrón de borrado): series con «Deshacer» (`setsRepo.borrar`/`restaurar`), rutinas con confirmación.
- **Errores**: toda escritura va con `try/catch`: Toast de error fuera de los Sheets y `ErrorState` dentro.
- **1RM**: fórmula de Epley. Volumen = Σ peso × reps.
