# Liga por ejercicio

`src/features/liga/`. Una liga para cada ejercicio: cuanto más tiempo seguido se hace, más sube. La cima, Élite, sugiere sin obligar que quizá convenga cambiarlo; llegar a ella completa un ciclo. Se deriva de los entrenos terminados y de las pausas de [Ritmo](ritmo.md); solo se guarda qué ejercicios decide mantener el usuario (`Settings.ligaMantener`). Decisión: [ADR 030](../decisiones/030-liga-por-ejercicio.md).

Estado: completa (fases 1 a 5 de `gaming.md`). Descartado «Explorador» (logro por probar ejercicios nuevos): empujaría a cambiar por cambiar.

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Semanas con cada ejercicio, evolución, divisiones, fantasma, ascensos de un entreno y ciclos | `lib/liga.ts`: `semanasPorEjercicio`, `evolucionLiga`, `calcularLigas`, `divisionDe`, `ascensosDeEntreno`, `ciclosCompletados` | — (puro; usa `gym/lib/workout.esEfectiva`, `gym/lib/ejecucion.tieneReps` y `ritmo/lib/pausas.pausaDeSemana`) |
| Básicos y aviso de Élite | `lib/basicos.ts`: `BASICOS`, `esBasico`, `avisarElite` | — (puro; `gym/lib/selectorEjercicios.catalogoDeLocal`) |
| Grupos de la lista | `lib/liga.ts`: `agruparPorLiga` | — (puro) |
| Alternativas en Élite | `lib/alternativas.ts`: `alternativas`, `MAX_ALTERNATIVAS` | — (puro; `gym/lib/selectorEjercicios.opcionesEjercicios`, `gym/lib/presentacionEjercicio`) |
| «Mantener» | `data/ligaRepo.ts`: `mantener`, `volverAAvisar` | `settings.ligaMantener` (lectura y escritura en una transacción) |
| Sesiones sin récord | `lib/estancamiento.ts`: `sesionesSinRecord`, `SESIONES_SIN_RECORD` (4) | — (puro; `gym/lib/records`) |
| Ciclos para la Vitrina | `lib/liga.ts`: `ciclosCompletados`, `primerosCiclos` (los usa `vitrina/lib/vitrina`) | — (puro) |
| Alternativas, «Usar» y «Mantener» en pantalla | `components/VariarElite` (en `BloqueLiga` y `LigaSheet`) | `ligaRepo`; `gym/data/routinesRepo.sustituirEjercicio` y `restaurar` |
| Textos | `lib/textos.ts`: `textoSemanas`, `fechaCorta`, `resumenLiga`, `textoProgreso`, `textoSiguiente`, `textoPico`, `textoAvisoElite`, `textoAscenso`, `ascensoDestacado` | — (puro) |
| Lecturas | `hooks/useLigas.ts`: `leerLigas`, `useLigas` | `workoutsRepo.terminados`, `setsRepo.todas`, `settings` (pausas e interruptor) |
| Lista y bloque en Progreso | `components/LigasLista`, `BloqueLiga` (con `DetalleLiga`), `ComoFuncionaLiga` (los compone `gym/pages/Progreso`) | `useLigas` |
| Entreno activo | `hooks/useLigasSesion` (con lo que ya lee `EntrenoActivo`; solo recalcula si cambian los entrenos terminados, sus series o las pausas), `components/AvisoElite` y `LigaSheet` (los compone `gym/components/PanelEjercicio`) | — |
| Fin de sesión | `components/AscensosLiga` (lo compone `gym/components/WorkoutFinished`) | `useLigas` |

## Reglas

- **Semana con el ejercicio** (lunes a domingo): al menos una serie efectiva con repeticiones de ese ejercicio en un entreno terminado hasta hoy. Varias sesiones en la semana cuentan una vez. Las variantes (ejecución, agarre, técnica, modo de carga) son el mismo ejercicio (`Exercise.id`).
- **Escalera** (`LIGAS`, `PASO_ELITE`): Bronce, Plata, Oro, Platino y Diamante, cada una con III, II y I, y Élite. Una división por semana con el ejercicio: Élite a las 16 semanas, y ahí se queda.
- **Bajada gradual**: la primera semana sin el ejercicio no cuenta (`SEMANAS_DE_GRACIA`); desde la segunda seguida, baja una división por semana hasta «Sin liga».
- **Pausa de Ritmo** (total o de entreno) en una semana sin el ejercicio: se congela; no cuenta como semana sin él. Hacerlo durante una pausa sí sube.
- **Semana en curso**: sube con la primera sesión; no baja hasta que acaba.
- **Racha** (`semanasSeguidas`): semanas con el ejercicio desde que empezó la actual; la rompen dos semanas seguidas sin él.
- **Fantasma** (`pico`): el paso más alto de las rachas anteriores a la actual, con el último día en que se alcanzó.
- **Ascenso de un entreno**: lo da la primera sesión de la semana con cada ejercicio (por hora de inicio, aunque se registre después).
- **Ciclo**: cada llegada a Élite desde Diamante I.
- **Básicos** (`BASICOS`): sentadilla, press banca, peso muerto, press militar, dominadas y remo con barra, por id del catálogo o por el nombre exacto de un registro antiguo. En Élite no avisan; tampoco los que el usuario decida mantener (`ligaMantener`). El texto de los básicos es descriptivo («es habitual mantenerlo mucho tiempo»): decir que es recomendable necesitaría fuente en Referencias.
- Orden de `calcularLigas`: de la división más alta a la más baja y, a igualdad, el último día con el ejercicio más reciente.

## Pantallas

- **Entreno › Progreso, sin ejercicio elegido**: en lugar de «Elige un ejercicio», «Ligas»: una línea de qué es, cuántos ejercicios están en Élite («quizá te apetezca variar alguno»), los grupos de Élite a Bronce con cada ejercicio (nombre, racha o «Sin hacerlo desde el 7 sep», y la división), «Sin liga ahora» en un desplegable y «Cómo funciona la liga». Tocar uno lo elige y devuelve el foco al selector de ejercicio, arriba.
- **Con un ejercicio elegido**, entre la cabecera y la gráfica, la card «Liga»: división, barra hacia Élite («8 de 16 semanas hacia Élite»), qué pasa ahora (`textoSiguiente`: si ya cuenta esta semana, a qué sube si se hace, que baja una por semana o que empieza en Bronce III), racha, pico anterior, las veces que llegó a Élite y «Ver todas las ligas».
- **Élite**: «Llevas mucho tiempo con este ejercicio. Si te apetece variar, puede ser buen momento; si no, puedes seguir con él.» En los básicos: «Es un ejercicio básico: es habitual mantenerlo mucho tiempo.»
- **Entreno activo** (la liga de antes de esta sesión: el entreno cuenta al terminarlo):
  - en Élite, si el ejercicio no es básico, una fila bajo los botones de ajuste, como la sugerencia de progresión: «Élite: llevas 17 semanas seguidas con este ejercicio», que abre su hoja;
  - en el menú «…» del ejercicio, la fila «Liga» con la división, si el ejercicio tiene historial;
  - la hoja «Liga · ejercicio»: lo mismo que la card de Progreso, «Este entreno cuenta al terminarlo» y «Cómo funciona la liga».
- **Fin de sesión**, entre «Experiencia» y «Nuevo en la Vitrina», «Ligas» con los ascensos de ese entreno (solo la primera sesión de la semana con cada ejercicio): los cambios de liga a la vista («Entra en la liga: Bronce III», «Sube de Bronce I a Plata III», «Llega a Élite: ciclo completado») y el resto («Sube de Platino III a Platino II») en el desplegable «N ejercicios más suben una división» (o en la lista, si no hay cambios de liga). Nada si no sube ninguno.
- **Élite, en la card de Progreso y en la hoja del entreno** (`VariarElite`):
  - el texto añade «y no hay récords en sus últimas N sesiones» si lleva 4 o más sesiones seguidas sin récord (no en los básicos ni en los mantenidos);
  - «Si te apetece variar»: hasta 5 alternativas con el mismo músculo principal (miniatura, nombre, «Bíceps · barra · Nunca lo has hecho»), sin el propio ni los que están en Élite; primero la división más baja y, a igualdad, los ya hechos, los del mismo material y el orden del catálogo;
  - si el ejercicio está en una rutina (en el entreno, la de la sesión; en Progreso, las que lo incluyen, con un selector si son varias), cada alternativa lleva «Usar»: la pone en su lugar con el mismo objetivo (`routinesRepo.sustituirEjercicio`, en una transacción, creando el ejercicio del catálogo si hace falta). El entreno en curso no cambia. Una línea dice qué cambió, con «Deshacer» en línea (también dentro de la hoja);
  - «Mantener este ejercicio» (secundario): deja de avisar durante el entreno; el texto pasa a «Lo mantienes en Élite: no te avisa durante el entreno» y el botón a «Volver a avisar», que lo deshace. Errores en línea;
  - en los básicos, sin «Mantener» (no avisan) y con las alternativas en el desplegable «Si aun así quieres variar».
- **Vitrina**: el logro «Ciclos completados» (Entreno), con niveles 1 · 5 · 10 ejercicios distintos que llegan a Élite, con la fecha y el entreno de la primera llegada de cada uno; sale en «Nuevo en la Vitrina» al terminar el entreno que lo consigue.
- Con la gamificación oculta en Ajustes no aparece nada de esto y Progreso queda como antes.

## Rendimiento

Unos 20 ms en escritorio con 500 entrenos, 12.500 series y 60 ejercicios a lo largo de tres años.
