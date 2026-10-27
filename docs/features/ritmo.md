# Ritmo

`src/features/ritmo/`. Constancia semanal con el descanso dentro: estado de cada semana, hilo (racha de semanas con presencia), comodines, vueltas, hitos y pausas. Todo se deriva de los registros, del plan semanal y de las pausas declaradas. Decisión y salvaguardas: [ADR 029](../decisiones/029-gamificacion-atributos.md). La [experiencia](experiencia.md) toma de aquí la «semana cumplida»; los hitos son también logros de la [Vitrina](vitrina.md).

Desde B12 ([ADR 058](../decisiones/058-destino-progreso.md)) la página se ve como la pestaña Semana, debajo de lo de esta semana en Cumbres, Caminos y Vitrina de Progreso (`features/progreso/ProgresoTab`, en la rejilla de secciones), montada con `incrustada`; la tesela de Inicio abre esa pestaña con «‹ Inicio».

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Plan semanal y semana frente al plan | `lib/plan.ts`: `planDeSemana`, `cambiarPlan`, `normalizarPlan`, `evaluarSemana` (con pausa de entreno) | — (puro) |
| Estado, hilo, comodines, vueltas e hitos | `lib/ritmo.ts`: `calcularRitmo`, `estadoDeSemana`, `semanaRitmo` | — (puro) |
| Pausas | `lib/pausas.ts`: `pausaDeSemana`, `pausaActiva`, `anadirPausa`, `terminarPausa`, `quitarPausa`, `validarPausa`, `describirPausa` | — (puro) |
| Textos | `lib/textos.ts`: `cifrasSemana`, `textoHilo`, `faltaParaCumplir`, `textoEstado` | — (puro) |
| Calendario e hitos | `lib/calendario.ts`: `semanasDelAnio`, `mesesDelAnio`, `partesSemana`; `lib/hitos.ts`: `pistaHitos` | — (puro) |
| Escrituras de pausas | `data/pausasRepo.ts`: `pausar`, `reanudar`, `borrar`, `restaurar` (devuelven las pausas de antes, para «Deshacer») | `settings.pausas` (lectura y escritura en una transacción) |
| Lecturas | `experiencia/hooks/useExperiencia` (`leerExperiencia`): Ritmo se calcula dentro de `calcularExperiencia` (`resultado.ritmo`) | ver [experiencia.md](experiencia.md) |
| Página (Progreso › Semana) | `RitmoTab.tsx` (diferida; `debajoDeSemana` y `trasSemana` para lo que Progreso pone dentro), `components/SemanaCuadros` (también en la revisión semanal), `components/CalendarioSemanas`, `components/PausarSheet`; `DiasSemana` queda para Social | — |
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
- **Ritmo** (desde su tesela de Inicio; «‹ Inicio» vuelve con el foco en la tesela):
  - banda «En pausa» con «Reanudar hoy», si hay una pausa activa;
  - «Esta semana» (en Progreso, con «Cómo funciona» en su título): estado por ahora y el hilo, los siete días en dos filas de cuadros (`SemanaCuadros`: mancuerna los días con entreno, cubiertos los días con comidas, hoy en negrita y los futuros atenuados), lo que falta y las cifras; debajo, lo que pone Progreso (las casillas de Cumbres, Caminos y Vitrina) y, tras la sección, las metas;
  - «Hilo»: una ficha de 2 × 2 con cuatro `Metric` (hilo actual, mejor hilo, comodines «1 de 2» con cuánto falta para otro, semanas cumplidas y vueltas);
  - «Semanas» (punto 19, opción C4 tras varias vistas previas): el calendario del año (`CalendarioSemanas`): una barra por semana desde el mes de tus primeros registros hasta la actual, todas igual de altas y partidas en dos (`partesSemana`): arriba se llena en acento con los entrenos del plan y abajo en tinta con los días con comidas (sin nutrición, solo entrenos); en pausa, borde discontinuo; sin datos, solo el contorno; la actual, con anillo; los meses debajo. Encima, la leyenda de las dos mitades y cuántas semanas hay de cada estado; flechas de año y el desplegable con el estado de cada semana en texto. En el desplegable, cada semana cerrada con algún entreno o día con comidas (`lib/ritmo.tieneRevision`) es una fila entera con chevrón que abre su revisión semanal (`inicio/components/RevisionSemanal`, diferida, con «← Ritmo» y las flechas de semana), aunque en Inicio ya se cerrara; la actual, las futuras y las que no tienen nada son texto. Al cerrarla el foco vuelve a la fila. Las celdas del calendario siguen siendo decorativas (demasiado pequeñas para tocarlas);
  - «Hitos» (punto 20): una pista con un tramo por hito (`pistaHitos`), lleno hasta las semanas cumplidas, check en los logrados (con su fecha) y trofeo en el siguiente («Próximo: 4 semanas cumplidas · Llevas 3 semanas · faltan 1»); su «i» explica que cuentan las semanas cumplidas en total y que son los niveles del logro «Semanas cumplidas» de la Vitrina;
  - «Pausas», con «Pausar» y borrado inmediato con «Deshacer»;
  - la «i» de la cabecera abre «Cómo funciona Ritmo» (`components/ComoFuncionaRitmo`): cómo se juzga cada semana (estado con su regla), el hilo y los comodines, y las pausas.
- **Pausar** (Sheet): qué se pausa (todo o solo entreno), motivo (vacaciones, enfermedad, lesión, viaje u otro), desde y hasta (opcional). Los errores van en línea.
- **Revisión semanal**: al principio, la semana de un vistazo con el estado de Ritmo, el hilo y los mismos cuadros (`SemanaCuadros`).
- Ocultar la gamificación en Ajustes quita las teselas de Inicio y el sello.

Al ampliar texto, los cuadros de `SemanaCuadros` se limitan al ancho de cada día; el selector de año de `CalendarioSemanas` sitúa el año bajo las flechas cuando hay menos de 16 rem de lectura.
