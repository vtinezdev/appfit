# ADR 046 · Mapa muscular acumulado («calor con huella»)

Estado: sustituido por el [ADR 051](051-mapa-muscular-de-progreso.md) (mapa de progreso) el mismo día. Amplía el [ADR 015](015-mapa-muscular-de-sesion.md), que dejaba fuera los mapas en el tiempo.

Víctor pide un mapa del cuerpo que evolucione con los entrenos: neutro al principio, que se caliente con el trabajo y que motive a volver. Se le presenta una propuesta privada («Mapa de calor muscular»): diagnóstico del repositorio, referencias (Hevy, Fitbod, JEFIT, Alpha Progression, Get Strong, MuscleWiki y estudios sobre volumen), cinco modelos de cálculo, cuatro representaciones y cinco ubicaciones, con un prototipo sobre la geometría y los tokens reales. Elige el modelo recomendado, el bloque en Progreso del diseño A con la figura de una sola vista y selector Frontal/Trasera del diseño B, el detalle al tocar un músculo y el antes → después al terminar el entreno.

Decisiones:

- **Unidad: series efectivas fraccionales.** Principal 1, secundario 0,5 (como el resumen semanal y el mapa de sesión), sin calentamientos ni series pendientes. El peso no cuenta y las repeticiones no multiplican: más kilos no equivale a más estímulo y la serie es la unidad que la persona entiende.
- **Calor con vida media de 7 días.** `calor = Σ min(series del día, 10) × 0,5^(días/7)`, solo en las últimas 8 semanas. `ritmo = calor × ln 2` se lee como series por semana sostenidas. Niveles desde 0,5 · 2 · 5 · 9 · 14 (escala absoluta, igual todos los días). El tope diario hace que un entreno suelto no pase de «Moderado».
- **Huella.** Un músculo trabajado alguna vez y ahora sin calor se dibuja con contorno discontinuo: tras una pausa el cuerpo no vuelve a blanco.
- **Nada guardado.** Se deriva de `workouts`, `sets` y el `muscleSnapshot` de cada entreno (o la clasificación actual en los antiguos) en cada lectura. Sin tabla, sin versión de Dexie ni de backup; editar o borrar un entreno cambia el mapa al momento.
- **Ubicación.** Arriba de Entreno › Gimnasio › Progreso, sin destino nuevo en la media luna. Una sola vista grande con Frontal/Trasera, la escala, «Más calor» y «Poco o ningún calor». Tocar un músculo abre una hoja con su detalle (series de 7 y 28 días, última vez, semanas con trabajo, directas e indirectas, ritmo y lo que más aporta); «Ver detalle por músculo» abre la lista de los doce grupos, que es la alternativa accesible a tocar zonas pequeñas.
- **Antes → después al terminar.** Bajo el póster de la sesión, sobre grafito: el mapa sin y con ese entreno, que pasa solo una vez a «después» y se alterna con un botón. Es la única animación de color del mapa (`--dur-calor`, 600 ms; 80 ms con Reduce Motion).
- **Paleta:** la rampa roja de siempre (`--c-muscle-*`), sin tokens de color nuevos.

Se descartan: un modelo de recuperación o fatiga (promete lo que los datos no miden), la escala relativa al músculo más trabajado (exagera un entreno suelto y no muestra progreso), la semana natural (se vacía cada lunes), más detalle anatómico (exige reclasificar el catálogo) y meter las actividades en las piernas.

Pendiente de observar con datos reales: los secundarios a 0,5 calientan mucho core, hombros y antebrazo (en el ejemplo de la propuesta, core llega a «Alto» sin ejercicios de core). Si molesta, las opciones son bajarlos a 0,25 en este mapa o revisar en el catálogo los músculos que solo estabilizan.

Flujo: [Gym](../features/gym.md#mapa-muscular). UI: [DESIGN-SYSTEM](../DESIGN-SYSTEM.md).
