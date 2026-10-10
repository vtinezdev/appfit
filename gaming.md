# Gaming: gamificación de AppFit

Plan de trabajo · 10 de octubre de 2026.

Estado: **Atributos, Ritmo y Vitrina implementados** (10 de octubre, PROCESO §100 y §101, [ADR 029](docs/decisiones/029-gamificacion-atributos.md); estado vigente en `docs/features/atributos.md`, `ritmo.md` y `vitrina.md`, que mandan sobre este plan). Liga, en otra sesión. Cumbres decidida (motor: etapas y víveres), por implementar; Caminos, más adelante. Base revisada: rama `feat/mapa-rojo`, commit `177d3ed`.

Origen: una exploración con investigación de 27 apps y videojuegos y 11 estudios, seis propuestas, maquetas con la interfaz de AppFit, un simulador de semana y una evaluación: https://claude.ai/artifact/4KYsAz8G3ss1WhV1E1no6a (privado de Víctor; una sesión de Claude Code puede leerlo con la herramienta Artifact). Este documento es autosuficiente: recoge lo decidido y lo necesario para empezar.

## Lo que ha decidido Víctor (10 de octubre)

- Le gustan **Atributos**, **Ritmo** y **Vitrina**: se implementan.
- **Liga fantasma** y **Cumbres** quiere implementarlas «de alguna manera», pero aún no sabe cómo:
  - **Liga, por ejercicio**: cuanto más haces un ejercicio, más subes de división. Como no es recomendable hacer siempre el mismo ejercicio, llegar a la división máxima significaría (sin ser una regla estricta) que conviene cambiarlo porque llevas mucho tiempo con él.
  - **Cumbres, a nivel global**: la quiere como sistema general de la app. Decidido después: Cumbres ahora y Caminos cuando haya actividad con distancia (ver su sección).
- **Rachas permitidas**: si alguna funcionalidad necesita rachas, se pueden implementar. Ver abajo.
- **Tablón** (encargos semanales): no lo mencionó. Queda aparcado; está descrito en el artifact.

| Sistema | Decisión | Qué falta |
|---|---|---|
| Ritmo | **Implementado** (sin la proteína opcional del plan) | Probarlo con datos reales |
| Atributos | **Implementado** con los parámetros de abajo | Probarlo con datos reales y ajustar si hace falta |
| Vitrina | **Implementada** con 27 piezas retroactivas | Revisar el catálogo con el uso |
| Liga fantasma | Sí, una liga por ejercicio | Qué mide, divisiones, cómo se baja y dónde se ve |
| Cumbres | **Decidida**: etapas y víveres, 800 m por semana de plan; Caminos, en el futuro | Implementarla (más adelante) y cerrar los detalles de su sección |
| Tablón | Aparcado | — |

### Rachas: autorizadas

Víctor autoriza rachas cuando una funcionalidad las necesite. Hoy lo impiden estos textos (el roadmap no dice nada en contra):

- `DESIGN.md`, Do's and Don'ts: «No inventar rachas, récords, planificación o referencias de salud».
- `PRODUCT.md`: «no inventar rachas, resultados, récords o recomendaciones de salud» y «sin estética gaming».
- ADR 021 (actualización del 9 de octubre): «Sigue sin haber saludo, rachas ni accesos que repitan destinos» en Inicio.

Hecho con Atributos: [ADR 029](docs/decisiones/029-gamificacion-atributos.md) recoge la autorización y los principios, y `DESIGN.md`, `PRODUCT.md` y ADR 021 ya lo reflejan. Sigue en pie no **inventar**: toda racha sale de registros reales. Recomendación de la exploración: para el entreno, rachas **semanales**, porque una racha diaria empuja a no descansar (Lally y col., 2010: saltarse un día no afecta a la formación del hábito). En Nutrición ya existe una racha diaria de registro (`nutricion/lib/adherencia.ts`, `calcularRachas`).

## Cómo encajan (propuesta inicial, sin decidir)

- **Ritmo** es el motor semanal: decide el estado de cada semana. Atributos, Vitrina y Cumbres lo usan.
- **Atributos** es la carrera permanente: nivel global y tres atributos que nunca bajan.
- **Vitrina** es la memoria: hitos, récords, colecciones y, si se quiere, las divisiones de la Liga y las cumbres conseguidas.
- **Liga por ejercicio** es un indicador propio de cada ejercicio, independiente de los demás.
- **Cumbres** es la meta global. Atributos y Cumbres son los dos globales: para no tener dos barras de progreso compitiendo, la tarjeta de Inicio sería una sola (ver su sección).

## Ritmo (decidido)

Constancia semanal con el descanso dentro. Parámetros iniciales, para probar y ajustar:

- **Plan semanal**: entrenos (2–6, por defecto 3), días de registro (3–7, por defecto 5) y proteína opcional (día con ≥ 90 % del objetivo de ese día).
- **Estado de cada semana** (lunes a domingo, como la revisión semanal):
  - **Cumplida**: entrenos ≥ plan y días registrados ≥ objetivo.
  - **Parcial**: solo uno de los dos.
  - **Presente**: al menos 1 entreno o 3 días con algo registrado.
  - **Vacía**: nada de lo anterior.
- **Hilo**: semanas seguidas con presencia (una racha semanal). El mejor hilo y las semanas cumplidas nunca se pierden.
- **Comodines**: 1 por cada 4 semanas cumplidas, máximo 2. Se gastan solos en una semana vacía (reservas de emergencia: Sharif y Shu).
- **Pausa** declarada (vacaciones, enfermedad, lesión): total o solo de entreno. Congela el hilo. En pausa de entreno, la semana se juzga solo con la nutrición.
- **Vuelta**: la primera semana con presencia tras una vacía se marca y se celebra. Premiar el regreso fue lo más eficaz del megaestudio de Milkman y col. (2021).
- **Cierre**: la semana se cierra el lunes al pulsar «Hecho» en la revisión semanal, o a los 7 días. Hasta entonces cuentan los registros atrasados.
- Entrenar por encima del plan no suma nada.
- **Hitos**: 4, 12, 26 y 52 semanas cumplidas.
- **Pantallas exploradas**: tarjeta «Tu semana» en Inicio (entreno y registro con los días marcados), sello del estado dentro de la revisión del lunes, página de constancia en Más (calendario de semanas del año, hilo, comodines, hitos) y hoja «Pausar».

## Atributos (decidido)

Nivel y experiencia (XP) de RPG. Parámetros iniciales:

| Acción | XP | Tope | Por qué |
|---|---|---|---|
| Entreno terminado (cuenta para el plan con ≥ 5 series efectivas) | 100 con ≥ 6 series; proporcional por debajo | 1 por día; hasta completar el plan por semana | Cuenta ir a entrenar; los kilos no puntúan. Sin multiplicador por descanso (descartado el 2026-10-10: manda el plan) |
| Día registrado (≥ 2 comidas) | 30 (10 con una sola comida) | 1 por día | El hábito que sostiene la nutrición |
| Proteína al 90 % del objetivo | 20 | 1 por día | Objetivo concreto que no premia comer menos |
| Semana cumplida (Ritmo) | 150 | 1 por semana | Constancia, no picos |
| Récord personal (`gym/lib/records`) | 25 | 3 por sesión | Celebrar sin perseguir récords en cada serie |

- **Curva**: el nivel n → n+1 cuesta `round(500 × 1,06^(n−1))` XP (500 el primero, 845 en el 10, 1.066 en el 14, 2.709 en el 30). Con una semana normal de unos 860 XP: nivel 10 en unas 7 semanas, 20 en 4–5 meses, 30 en unos 10 meses y 50 en unos 3 años.
- **Tres atributos** con nivel propio: Fuerza (entrenos y récords), Nutrición (registro y proteína) y Constancia (semanas cumplidas).
- **Títulos** cada 5 niveles (ejemplos: 5 «Novato», 10 «Habitual», 15 «Constante», 20 «Sólido», 30 «Veterano», 50 «Leyenda»).
- El nivel nunca baja. Una semana en pausa no suma ni resta.
- **Reglas con versión**: ajustar la curva no debe reescribir niveles ya alcanzados (congelar las semanas cerradas).
- **Pantallas exploradas**: tarjeta «Nivel» en Inicio con la barra de XP y el descanso acumulado; bloque bajo el póster de sesión al terminar, con el detalle de la XP y la subida de nivel; «Ficha» en Más con nivel, atributos y la XP de cada día explicada.
- **Variante opcional, «Maestría muscular»**: al estilo de RuneScape, un nivel por cada uno de los 12 grupos del mapa muscular, que sube con series efectivas (máximo 12 series por grupo y semana). La curva exponencial hace que los grupos rezagados suban antes. Un rango por defecto necesitaría fuente en Referencias (Schoenfeld, Ogborn y Krieger, 2017: ventaja con ≥ 10 series semanales por grupo; https://doi.org/10.1080/02640414.2016.1210197).

## Vitrina (decidida)

Museo personal: piezas que se quedan para siempre. Al activarla, el historial desbloquea lo ya conseguido con su fecha real (retroactiva, pendiente de confirmar). Pocas piezas y con significado, unas 40 y no 400.

- **Logros con niveles** (ejemplos):
  - Entrenos: 10, 50, 100 y 250 (niveles I a IV).
  - Semanas cumplidas: 4, 12, 26 y 52 (necesita Ritmo).
  - «Atlas completo»: los 12 grupos musculares en una misma semana; repetible (`gym/lib/resumenSemanal`).
  - Récord en 5 ejercicios distintos (`gym/lib/records`).
  - «Herbario 30»: 30 plantas distintas en una semana.
  - **Ocultos**, que se revelan al conseguirlos: «Madrugador» (5 entrenos empezados antes de las 8:00), «Vuelta al ruedo» (entrenar tras 14 o más días sin hacerlo) y «Descanso bien llevado» (semana cumplida con 3 o más días de descanso).
- **Récords**: muro por ejercicio reutilizando la detección actual (peso máximo, 1RM estimado, repeticiones, asistencia).
- **Colecciones**:
  - **Herbario**: plantas distintas por semana y desde siempre, a partir del nombre corto (`nutricion/lib/nombresCortos.ts`) y de las categorías vegetales (`nutricion/lib/catalogo/categorias.ts`: frutas, verduras, patatas y tubérculos, legumbres, frutos secos, cereales…). Es informativo y explica sus límites: recetas y platos preparados no se descomponen. Fuente de la cifra 30: McDonald y col., 2018, mSystems (American Gut Project; resumen en https://today.ucsd.edu/story/whats-in-your-gut).
  - **Atlas**: grupos trabajados y ejercicios «dominados» (3 o más sesiones).
- **Pantallas exploradas**: Vitrina en Más con ViewTabs Logros · Récords · Colecciones; un hito redondo puede ocupar el póster de sesión al terminar; Herbario en Nutrición › Resumen.

## Liga por ejercicio (idea de Víctor, por concretar)

Lo que quiere: una liga **para cada ejercicio**. Cuanto más haces un ejercicio, más subes de división. La división máxima no es un trofeo sin más: indica, sin obligar, que llevas mucho tiempo con ese ejercicio y quizá convenga cambiarlo.

Propuesta inicial para discutir (nada decidido):

- **Qué mide**: semanas con el ejercicio (semana con al menos una serie efectiva de ese ejercicio en un entreno terminado), no series ni kilos, para no premiar el volumen ni a quien lo entrena dos veces por semana.
- **Cómo se sube**: racha de semanas seguidas con el ejercicio, tolerando una semana sin él. Divisiones de ejemplo: Bronce (1–3 semanas), Plata (4–6), Oro (7–10), Platino (11–15) y Élite (16 o más). Son parámetros por probar; no hay un número de semanas demostrado para cambiar un ejercicio.
- **Cómo se baja**: dejar de hacerlo dos semanas o más corta la racha y, al volver, se empieza de nuevo. Rotar «refresca» el ejercicio.
- **El «fantasma»**: la racha anterior más larga con ese mismo ejercicio («tu racha anterior con press de banca fue de 14 semanas»).
- **En Élite**, aviso suave en el panel del ejercicio y en Progreso: «Llevas 16 semanas con press de banca. Si te apetece variar: …», con alternativas del catálogo local (`gym/lib/catalogoEjercicios.ts`: 204 definiciones con músculos y equipo) que compartan músculo principal. Un botón «Mantener» lo silencia para ese ejercicio, por ejemplo para los básicos que se quieren conservar años.
- **Con la progresión** (ADR 026, `gym/lib/progresion.ts`): si además no hay récords en las últimas sesiones, el aviso puede decirlo. Opcional.
- **En Vitrina**: insignias por divisiones o por rotar (p. ej., «Explorador»: 3 ejercicios nuevos en un bloque), sin empujar a cambiar por cambiar.

Preguntas abiertas:

1. ¿Semanas o sesiones?
2. ¿Cuántas divisiones, con qué umbrales y qué nombres?
3. ¿Reinicio al dejarlo o descenso gradual?
4. ¿Las variantes del mismo ejercicio cuentan como el mismo? Ejecución, agarre y modo de carga tienen su clave comparable en `gym/lib/ejecucion.ts` (`claveComparacion`).
5. ¿Se excluyen los básicos o se dejan con «Mantener»?
6. ¿Dónde se ve: panel del ejercicio, Progreso, selector de ejercicios, Vitrina?
7. ¿Da XP en Atributos?

## Cumbres (decidida; por implementar)

Decisión de Víctor (10 de octubre), tras comparar con maquetas Cumbres, Caminos, Constelaciones y Temporadas (https://claude.ai/artifact/7RYQxMtyxzXcNszPEynA9M, privado de Víctor):

- **Las dos, por partes.** Ahora, **Cumbres**: se sube una montaña real tras otra.
- **Caminos, más adelante**: rutas reales con etapas (el Camino de Santiago y otros). Queda a la espera de que AppFit registre caminatas, carreras u otra actividad con distancia; entonces avanzaría con los kilómetros reales y no con una conversión de XP. Ver «Caminos (futuro)».
- Cumbres se diseña para que añadir los Caminos no la obligue a cambiar: al acabar un capítulo se elegiría el siguiente (una cima o un camino) y la colección sería común. La sección podría pasar a llamarse «Expediciones».

### Propuesta para Cumbres (pendiente de confirmar)

- **Una montaña por capítulo, sin plazo**: dura lo que tarde y no se puede fallar. Al llegar a la cima, la cumbre pasa a «Mis cumbres» y empieza la siguiente; lo que sobra cuenta para ella.
- **Del mar a la cumbre**: la altitud que se ve es lo subido en ese capítulo. Solo hace falta la altitud de cada cima, con fuente (nada de bases ficticias ni datos de rutas).
- **Hitos** cada 1.000 m y la cumbre. Una pausa de Ritmo se ve como «en el refugio», sin regla propia.
- **Ruta sugerida**: el Techo de España (Aneto, Mulhacén, Teide) y después las Siete Cumbres. La siguiente montaña se puede cambiar por otra más alta que la altitud actual. Opcional: «tu montaña», con nombre y altitud propios.
- **Arranque**: cuando Víctor elige la primera montaña (no retroactiva). Lo anterior cuenta solo en un total.
- **Dónde se ve**: la tarjeta «Nivel» de Inicio pasa a ser la de la cumbre (nivel y título arriba; el perfil sustituye a la barra de XP, para no tener dos barras); una línea bajo «Experiencia» al terminar un entreno, y póster en grafito si hace cumbre; la revisión del lunes; página en Más (perfil con escala de altitud, la semana, «Mis cumbres» con el resumen de cada expedición); logros en la Vitrina («Cumbres», «Techo de España», «Siete Cumbres»). Si la cumbre llega sin entreno, la celebra Inicio al abrir la app.
- **Descartado de la exploración**: la aclimatación (es una regla de descanso y manda el plan), los víveres que bloquean una etapa (castigo, y desaparece con «Solo entreno»), la temporada de 6 semanas que se puede fallar (cuenta atrás) y una montaña por tramo de 5 niveles (con la curva, la última tardaría unos 10 meses).
- **Datos**: derivada, como Atributos. Solo un campo opcional de `Settings` con la fecha de inicio y las montañas elegidas.
- **Montañas de referencia** (altitudes a verificar con fuente): Aneto 3.404 m, Mulhacén 3.479 m, Teide 3.715 m, Mont Blanc 4.806 m, Kilimanjaro 5.895 m, Aconcagua 6.961 m, Everest 8.849 m.

### El motor: etapas y víveres (decidido el 10 de octubre)

El entreno hace subir y la comida abastece, sin que nada se pierda. No usa la XP: el nivel mide todo lo que se hace y la montaña, el plan con su nutrición.

- **Etapas**: cada entreno que cuenta (≥ 5 series efectivas, `SERIES_MINIMAS`), hasta los del plan de la semana, es una etapa. Un día cuenta una vez. Los entrenos por encima del plan no suben.
- **Tramo semanal: 800 m.** Una semana de plan sube 800 m, repartidos entre sus etapas: con 3 entrenos, unos 267 m cada una; con 5, 160 m. Así una montaña dura lo mismo con cualquier plan (el Teide, unas 5 semanas de plan).
- **Víveres**: cada día con comidas registradas mete un víver en la mochila; **con una sola comida, medio**. La mochila guarda 3, así que cuenta registrar con regularidad, no acumular.
- **Cada etapa gasta un víver.** Si no hay, la etapa **queda preparada** («1 etapa espera víveres») y se completa sola en cuanto entra uno, también con un registro atrasado. No hay plazo y no se pierde: solo se retrasa.
- **Solo entreno** (`gamificacionConNutricion: false`): sin víveres; cada etapa sube directa.
- **Pausa de Ritmo**: no sube ni gasta; se ve como «en el refugio».
- **En pantalla**: la mochila («Víveres 2 de 3») y, si las hay, las etapas que esperan, en la tarjeta de Inicio, al terminar el entreno y en la página.
- **Riesgo**: registrar solo para tener víveres. Lo acotan la mochila de 3 y que cuenta haber registrado, nunca las kcal; se mantiene el interruptor de nutrición.
- **Derivada**: se recalcula día a día desde el historial (entrenos que cuentan, días con comidas, plan y pausas de Ritmo), como el resto. Detalles para la implementación: el orden dentro de un mismo día (entreno y comidas) y cómo se reparte el tramo cuando el plan cambia a mitad de montaña.
- Encaja también con los Caminos del futuro: los kilómetros reales serían las etapas y la comida, los víveres.
- Diferencias con lo explorado: sin aclimatación ni temporadas, y la etapa sin víveres espera en vez de perderse.

Pendiente de decidir al implementar: si un día con la proteína al 90 % da un víver entero aunque tenga una sola comida, y confirmar la propuesta de arriba (sin plazo, del mar a la cumbre, una sola tarjeta en Inicio y arranque al elegir la primera montaña).

#### Alternativas consideradas

| Opción | Cómo sube | Por qué no |
|---|---|---|
| **XP** | 1 XP = 1 m (unos 800 m por semana) | Repetiría el número del nivel y dependería de cómo se ajuste la XP; con un plan más grande se subiría más rápido. Víctor no la descartó del todo |
| **Plan cumplido** | Tramo semanal fijo repartido entre entrenos y días registrados del plan | Era la recomendada; etapas y víveres es la misma idea con un recurso que gestionar, que Víctor prefirió |
| **Semanas de Ritmo** | Al cerrar la semana, según su estado | Solo se mueve una vez por semana |
| **Fuerza real** | Cada récord personal, un escalón | Premia el rendimiento y se estanca en mesetas y descargas |
| **Series efectivas por grupo** | Cada serie, con tope por grupo y semana | Solo entreno y roza premiar el volumen |

### Caminos (futuro)

- Rutas reales con etapas: Camino Francés (unos 770 km, 33 etapas), Portugués desde Oporto, Primitivo, del Norte, Inglés, Vía de la Plata… Cada pueblo final de etapa es un hito (unos 3 por semana en las maquetas) y al llegar hay póster y credencial (un sello por día con actividad).
- **Condición**: que AppFit registre actividad con distancia (caminar, correr u otras). Un PWA no puede leer Salud de iOS: haría falta registro manual, importar un archivo (p. ej., GPX) u otra vía, y cualquier servicio externo hay que preguntarlo antes.
- Avanzaría con los kilómetros reales. Datos que preparar: pueblos y kilómetros de cada etapa, con fuente (unas 140 filas).

## Salvaguardas (valen para todo)

- Nada se gana ni se pierde por kcal, peso o déficit. La banda de adherencia (±10 %) es simétrica, como la rueda de energía, que no usa rojo al pasarse.
- Techo en el plan: entrenar o registrar de más no suma.
- El descanso cuenta. Hay pausa por enfermedad, lesión o viaje.
- Sin castigos: ni vidas, ni rojo, ni cuentas atrás.
- Interruptores para ocultar el sistema entero y para excluir la nutrición. Riesgo documentado: en un estudio con 105 personas con trastornos alimentarios, el 73 % de las que usaban MyFitnessPal creían que había contribuido a su trastorno (Levinson y col., 2017).
- Todo explicable: cada punto con su porqué, consultable.
- Identidad intacta: tokens y primitives, póster en grafito, rampa roja, cifras inmediatas; sin confeti ni contadores animados.

## Encaje técnico (comprobado en el código el 10 de octubre)

- **Progreso derivado, no acumulado**: funciones puras sobre el historial, con tests al lado. Así no hay migraciones, va en el backup, respeta la edición retroactiva y borrar y volver a crear no da nada. Se guardan solo las decisiones del usuario.
- **Piezas reutilizables**:
  - `inicio/lib/revisionSemanal.ts`: semanas lunes-domingo, bloques de nutrición, entreno, récords y agua; `settings.revisionSemanalCerrada`.
  - `nutricion/lib/adherencia.ts`: `calcularAdherencia`, `calcularRachas`.
  - `gym/lib/records.ts`: `detectarRecords`, `recordsDeEntreno`.
  - `gym/lib/resumenSemanal.ts`: series efectivas por grupo.
  - `gym/lib/workout.ts`: `esEfectiva`.
  - `gym/lib/calendarioEntrenos.ts`, `gym/lib/catalogoEjercicios.ts` y `gym/lib/progresion.ts`.
  - Repos de solo lectura: `entriesRepo.fechasConRegistro` y `entreFechas`, `workoutsRepo.terminados`, `setsRepo.delWorkout` y `delEjercicio`, `objetivosDiaRepo.objetivosPorFecha`.
- **Datos nuevos**: hoy no existe un plan semanal ni pausas en el código. Plan, pausas, interruptores y la temporada actual caben como campos opcionales de `Settings`, sin versión de Dexie ni de backup, como `aguaObjetivoMl`. Una tabla nueva (por ejemplo, temporadas cerradas, logros vistos o «Mantener» de la Liga) sigue las reglas de `shared/db/db.ts` y `shared/lib/backup.ts`: versión 8, `TABLAS_USUARIO`, tabla opcional del backup y test de migración.
- **Feature nueva** en `src/features/` con `lib/` puro. Lee los repos de las otras features en solo lectura y compone en Inicio como ya hace la revisión semanal. Solo `data/*Repo.ts` toca `db` (lo vigila `shared/db/acceso.test.ts`).
- **Rendimiento**: Inicio calcula solo la semana en curso; el historial completo va en una página diferida.
- **Navegación**: destino nuevo en Más (como Perfil), sin URL. Evitar el nombre «Progreso», que ya es una vista de Entreno.
- **Sin notificaciones**: las push están descartadas en el roadmap. Nada puede depender de avisos; la ceremonia es la revisión del lunes.

## Orden sugerido (por confirmar)

1. **Fase 0, decidir**: responder las preguntas abiertas, escribir el ADR (rachas y principios) y actualizar `DESIGN.md` y `PRODUCT.md`.
2. **Ritmo**: motor de semanas, plan y pausas, tarjeta en Inicio, sello en la revisión y página de constancia.
3. **Vitrina mínima**: hitos y muro de récords, retroactivos.
4. **Atributos**: usa Ritmo (semana cumplida) y los récords.
5. **Liga por ejercicio**: es independiente de las demás y podría adelantarse.
6. **Cumbres**: decidida (etapas y víveres); se implementará más adelante. Caminos, cuando haya actividad con distancia.

Antes de cerrar cada fase: `npm run test` y `npm run build` en verde, prueba en `appfit-test.localhost` (nunca en `localhost:5173`) a 320/375/430 px en ambos temas, y documentos vivos y `docs/PROCESO.md` al día.

## Para empezar la próxima sesión

Preguntar a Víctor:

1. Plan semanal real: entrenos y días de registro.
2. Si la nutrición entra (registro y proteína) o solo el entreno.
3. Dónde vive: tarjeta en Inicio, sección en Más, revisión del lunes.
4. Logros retroactivos con su fecha o empezar de cero.
5. Liga por ejercicio: las preguntas de su sección.
6. Cumbres: lo pendiente de su sección (proteína y confirmar la propuesta) antes de implementarla.
7. Nombre visible de la sección en la app.
