# 054 · Historial de máquinas por gimnasio

2026-10-21 · Aceptada. Víctor entrenó en otro gimnasio y los pesos de las máquinas no coincidían con los de su gimnasio habitual: mismo ejercicio, otra máquina. Elige separar el historial solo en máquinas y poleas, con gimnasios con nombre y, la primera vez, reps del habitual sin kg.

**Qué se separa.** Solo los ejercicios cuya carga depende de la máquina: los que tienen equipo `maquina`, `polea` o `smith` (`gym/lib/gimnasios.dependeDeMaquina`). Los ejercicios propios sin equipo indicado también, porque separar de más no mezcla cargas distintas y separar de menos sí. Barra, mancuernas, kettlebell, peso corporal, bandas y anillas pesan lo mismo en cualquier gimnasio y siguen compartiendo historial.

**Cómo se guarda.** El gimnasio habitual no tiene fila: es la ausencia de `gimnasioId`. Los demás viven en la tabla `gimnasios` (Dexie v13, `&nombreNorm`). `Workout.gimnasioId` dice dónde se entrenó; `SetEntry.gimnasioId` es un snapshot que solo llevan las series de máquinas fuera del habitual, igual que la serie ya guarda su agarre o su modo de carga. Así, `claveComparacion` separa cada máquina por gimnasio y todos los que comparan series (Anterior, récords, progresión, carga inusual, Progreso, Liga, Experiencia y Vitrina) lo respetan sin tocarlos uno por uno. La clave solo añade el gimnasio si la serie lo trae: la de las series del habitual no cambia ni un carácter, y las decisiones de progresión guardadas (que la contienen) siguen valiendo. Sin `upgrade()`: todo el histórico queda en el habitual.

**La primera vez.** Una serie nueva de una máquina en un gimnasio donde nunca se hizo copia reps, lados y ejecución de la última del habitual y deja los kg vacíos: el peso de otra máquina no sirve de propuesta. Una nota bajo el ejercicio dice qué buscar («busca RIR 1 en 10 repeticiones»), con el RIR de la última serie del habitual (2 si no se anotó) y su carga como referencia. El RIR se registra como siempre (ya se pedía al marcar la serie).

**Cambiar de gimnasio a mitad.** Las series realizadas conservan cifras y marca: se hicieron allí, solo se había elegido mal el gimnasio. Las pendientes de un entreno en curso se vuelven a precargar. Elegir gimnasio en Empezar parte siempre del habitual, para no dejar uno de fuera elegido al volver a casa.

**Privacidad.** Los nombres de gimnasio no salen del móvil: los récords dicen «Otro gimnasio», y así se publican en Amigos sin delatar dónde se entrena. La Vitrina y Progreso, que son locales, sí los nombran.

**Descartado por ahora.** Un factor de conversión estimado entre máquinas (la relación entre sus 1RM estimados): las curvas de resistencia difieren y la relación cambia con el rango de repeticiones. Elegir por ejercicio si depende de la máquina: el equipo del catálogo basta para el caso real y evita otro ajuste.
