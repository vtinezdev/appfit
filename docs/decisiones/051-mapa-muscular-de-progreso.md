# ADR 051 · Mapa muscular de progreso (un año hasta el máximo)

Estado: aceptado, 2026-10-19. Sustituye al [ADR 046](046-mapa-muscular-acumulado.md) («calor con huella»).

Con el calor del ADR 046 (vida media de 7 días) un músculo llegaba a «Muy alto» en 2 o 3 semanas y se apagaba al parar. Víctor quiere que el mapa global mida el progreso: que cueste en torno a un año llegar al máximo, con una paleta más rica (Básico rojo, Intermedio verde, Avanzado morado) y, en el futuro, una versión extendida de unos cinco años para quien llegue arriba.

El modelo sale de una simulación con planes del creador de rutinas (2–6 días, 45–75 min, hipertrofia/fuerza/general, catálogo real), un año con 100/85/70 % de asistencia y 4 semanas de vacaciones, y paradas de 1 a 12 meses. Propuesta y paletas comparadas en una página privada (A, B y C, con simulación de deuteranopía, protanopía y grises).

Decisiones (`gym/lib/progresoMuscular.ts`, `PROGRESO_MUSCULAR`):

- **Semanas completas.** Una semana (lunes a domingo) se completa con 10 series en pecho, espalda, hombros, cuádriceps, isquiotibiales y glúteos, y con 6 en bíceps, tríceps, antebrazo, aductores, gemelos y core. Con menos cuenta la parte; con más no se adelanta. Así el año no depende del volumen: entrenar el doble no llega en seis meses.
- **Lo indirecto, a medias.** Principal 1 y secundario 0,5 por serie efectiva, como antes, pero lo indirecto completa como mucho media semana. Resuelve lo que dejaba pendiente el ADR 046: sin el tope, core, hombros y antebrazo llegaban al máximo sin entrenarlos directamente.
- **Escalera.** Nueve niveles, Básico/Intermedio/Avanzado I–III, desde 1 · 3 · 6 · 10 · 16 · 23 · 30 · 39 · 48 semanas completas. Yendo a todas las sesiones y con 4 semanas de vacaciones, el máximo llega en la semana 51; al 85 % de las sesiones, entre los meses 12 y 14.
- **Bajada gradual** (elegida por Víctor). Una semana con menos del 30 % de la dosis cuenta como semana sin trabajo; las 2 primeras seguidas no restan y desde la tercera cada una quita una semana completa. La semana en curso no resta y las semanas en pausa de Ritmo tampoco (`ritmo/lib/pausas.pausaDeSemana`, como la Liga).
- **Memoria muscular.** Por debajo del máximo alcanzado, cada semana cuenta doble. Tras 3 meses parado se vuelve en unas 6 semanas; tras 6 meses, en unas 14.
- **Huella.** Un grupo que llegó a un nivel y lo perdió todo se dibuja con contorno discontinuo («Nivel perdido»).
- **Nada guardado.** Se deriva de `workouts`, `sets`, el `muscleSnapshot` de cada entreno y las pausas de los ajustes. Sin tabla ni versión de Dexie o backup. Por eso la versión de cinco años será retroactiva: al añadir tramos, cuenta lo ya entrenado.
- **Paleta A** (`--c-progreso-1…9`, `--c-progreso-poster-1…9`): rojo, verde esmeralda (lejos del volt) y morado, con la luminosidad bajando de nivel en nivel en ambos temas, como pidió Víctor también para el oscuro. El orden se lee sin distinguir colores. Sobre grafito, en ambos temas, la rampa del oscuro. `contrast.test.ts` vigila el orden de luminosidad, la separación entre niveles y con el gris sin nivel, y la distancia del verde al volt.
- **Pantallas.** Progreso: «Mapa muscular · Progreso», leyenda de tramos, «Más avanzado» y «Por desarrollar»; el detalle de cada grupo lleva su nivel, la barra hasta el siguiente, qué está pasando (avanzando, en gracia, bajando, en pausa, recuperando) y lo de esta semana. Al terminar un entreno: «Tu progreso muscular» con lo que la sesión aporta a la semana de cada grupo; el antes → después y su botón solo aparecen si algún grupo sube de nivel.
- El mapa de cada sesión (rampa roja relativa del póster, ADR 015) no cambia.

Se descartan: perder el progreso de golpe o no perderlo nunca (Víctor prefiere la bajada gradual), una dosis distinta por persona, el ámbar para Básico (paleta B: evitaba el rojo del póster, pero Víctor prefiere el rojo) y tres rampas completas por tramo (paleta C: los primeros niveles de cada tramo se confunden).

Pendiente: la versión extendida (unos cinco años) cuando alguien llegue al máximo; observar con datos reales si la dosis de los grupos pequeños es justa.

Flujo: [Gym](../features/gym.md#mapa-de-progreso). UI: [DESIGN-SYSTEM](../DESIGN-SYSTEM.md).
