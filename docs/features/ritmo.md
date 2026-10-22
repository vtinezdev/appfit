# Ritmo

`src/features/ritmo/`. Constancia semanal con el descanso dentro: estado de cada semana, hilo (racha de semanas con presencia), comodines, vueltas, hitos y pausas. Todo se deriva de los registros, del plan semanal y de las pausas declaradas. Decisión y salvaguardas: [ADR 029](../decisiones/029-gamificacion-atributos.md). La [experiencia](experiencia.md) toma de aquí la «semana cumplida»; los hitos son también logros de la [Vitrina](vitrina.md).

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Plan semanal y semana frente al plan | `lib/plan.ts`: `planDeSemana`, `cambiarPlan`, `normalizarPlan`, `evaluarSemana` (con pausa de entreno) | — (puro) |
| Estado, hilo, comodines, vueltas e hitos | `lib/ritmo.ts`: `calcularRitmo`, `estadoDeSemana`, `semanaRitmo` | — (puro) |
| Pausas | `lib/pausas.ts`: `pausaDeSemana`, `pausaActiva`, `anadirPausa`, `terminarPausa`, `quitarPausa`, `validarPausa`, `describirPausa` | — (puro) |
| Textos | `lib/textos.ts`: `cifrasSemana`, `textoHilo`, `faltaParaCumplir`, `textoEstado` | — (puro) |
| Escrituras de pausas | `data/pausasRepo.ts`: `pausar`, `reanudar`, `borrar`, `restaurar` (devuelven las pausas de antes, para «Deshacer») | `settings.pausas` (lectura y escritura en una transacción) |
| Lecturas | `experiencia/hooks/useExperiencia` (`leerExperiencia`): Ritmo se calcula dentro de `calcularExperiencia` (`resultado.ritmo`) | ver [experiencia.md](experiencia.md) |
| Página (Inicio › Ritmo) | `RitmoTab.tsx` (diferida), `components/DiasSemana`, `components/CalendarioSemanas`, `components/PausarSheet` | — |
| Tesela de Inicio | `inicio/components/AccesoProgreso` | `useVitrina` (incluye Ritmo) |
| Sello en la revisión semanal | `inicio/components/RevisionSemanal` | `useExperiencia` + `semanaRitmo` |

## Reglas

- **Plan** (`Settings.planSemanal`, en Ajustes): entrenos 2–6 (por defecto 3) y días con comidas registradas 3–7 (por defecto 5). Va por tramos con su lunes: el primero vale para todo el historial y cada cambio, desde la semana en curso.
- **Entreno** = entreno terminado con al menos 5 series efectivas (`SERIES_MINIMAS` de la experiencia). Un día con varios cuenta una vez.
- **Estado de cada semana** (lunes a domingo):
  - **cumplida**: entrenos ≥ plan y días registrados ≥ plan;
  - **parcial**: solo una de las dos partes (no existe sin nutrición);
  - **presente**: al menos un entreno o 3 días registrados;
  - **vacía**: nada de lo anterior.

  Solo cuentan los días hasta hoy, y los registros atrasados siempre cuentan, porque todo se recalcula.
- **Hilo**: semanas seguidas con presencia (cumplida, parcial o presente). La semana en curso suma si ya tiene presencia, y no lo rompe hasta que acaba. El mejor hilo y las semanas cumplidas nunca se pierden.
- **Comodines**: uno por cada 4 semanas cumplidas, como mucho 2. Se gastan solos en una semana vacía ya cerrada, y el hilo sigue sin sumar.
- **Pausa** (`Settings.pausas`: `{ id, desde, hasta?, tipo: 'total' | 'entreno', motivo }`):
  - Rige una semana si cubre al menos 4 de sus días; a igualdad de días manda la total.
  - Una semana vacía en pausa se congela: ni rompe el hilo ni gasta comodín.
  - En una pausa de entreno, la semana se juzga solo con el registro de comidas (cumplida con los días del plan; presente con 3 días).
  - Una pausa nueva recorta las que se solapan.
  - «Reanudar hoy» la cierra ayer, o la quita si empezó hoy.
- **Vuelta**: la primera semana con presencia después de una vacía (también si la vacía estaba en pausa o la salvó un comodín). Se marca en el calendario y en la revisión.
- **Hitos**: 4, 12, 26 y 52 semanas cumplidas, con el día en que se cumplió la semana que los alcanza.
- Entrenar o registrar por encima del plan no suma.

## Pantallas

- **Inicio**, tesela «Ritmo» bajo la energía: las semanas de hilo («Hilo actual»). Abre Ritmo.
- **Ritmo** (desde su tesela de Inicio):
  - banda «En pausa» con «Reanudar hoy», si hay una pausa activa;
  - «Esta semana»: estado por ahora, días, cifras y lo que falta;
  - «Hilo»: cuatro `Metric` (hilo actual, mejor hilo, comodines «1 de 2» con cuánto falta para otro, semanas cumplidas y vueltas);
  - «Semanas»: el calendario del año (`CalendarioSemanas`), en filas de 13 semanas, como un mapa de calor en grafito (de vacía, gris de superficie, a cumplida, grafito sólido), con leyenda, flechas de año y el desplegable con el estado de cada semana en texto;
  - «Hitos»;
  - «Pausas», con «Pausar» y borrado inmediato con «Deshacer»;
  - la «i» de la cabecera abre «Cómo funciona Ritmo» (`components/ComoFuncionaRitmo`): cómo se juzga cada semana (estado con su regla), el hilo y los comodines, y las pausas.
- **Pausar** (Sheet): qué se pausa (todo o solo entreno), motivo (vacaciones, enfermedad, lesión, viaje u otro), desde y hasta (opcional). Los errores van en línea.
- **Revisión semanal**: al principio, una card «Ritmo» con el estado de la semana revisada, sus cifras y el hilo.
- Ocultar la gamificación en Ajustes quita las teselas de Inicio y el sello.

Al ampliar texto, los cuadros y puntos de `DiasSemana` se limitan al ancho de cada día; el selector de año de `CalendarioSemanas` sitúa el año bajo las flechas cuando hay menos de 16 rem de lectura.
