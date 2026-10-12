# 037 — Actividades (caminar, correr, senderismo) y Caminos

Fecha: 2026-10-12. Estado: vigente. Implementa los «Caminos (futuro)» de `gaming.md` y añade a la gamificación de [ADR 029](029-gamificacion-atributos.md) y [ADR 034](034-cumbres-en-lugar-de-atributos.md) una fuente de XP nueva.

## Contexto

Víctor quería, como última funcionalidad antes de dar la app por terminada, registrar caminatas, carreras y rutas de senderismo y, con ellas, los Caminos: recorrer rutas reales por etapas (el Camino de Santiago y otras) con los km reales, una idea aparcada hasta que AppFit registrara actividad con distancia. También pidió rutas de ficción, como las apps que simulan el viaje de Frodo a Mordor.

Restricciones: una PWA en iPhone no recibe la ubicación con la pantalla bloqueada ni en segundo plano, y tampoco lo haría la TWA de Android prevista para Google Play ([despliegue.md](../despliegue.md)); solo una app nativa (con cuenta de Apple, compilación en Mac y revisión del App Store) podría grabar en segundo plano o leer Apple Salud. La app no tiene backend ni servicios externos nuevos sin preguntar, y la Tierra Media es propiedad de los herederos de Tolkien, que la explotan con licencias.

## Decisión

Decidido con Víctor:

- **Registro**: a mano, importando un GPX (Strava, Wikiloc, Garmin, el reloj) y con el GPS en vivo como extra para salidas cortas, con la pantalla encendida (Wake Lock). La app nativa queda en el roadmap.
- **Sin mapa**: el recorrido se dibuja como una línea sobre el fondo de la app, sin teselas de ningún servicio; la ubicación no sale del móvil.
- **Dónde**: dentro de Entreno, con dos secciones (Gimnasio y Actividades), y «Registrar actividad» en el «+». Caminos va en Más, junto a Cumbres, y se oculta con la gamificación.
- **Qué mueven los km**: los Caminos (en paralelo a Cumbres, solo con km reales) y la XP: 10 m por km del día, hasta 100 m al día y como mucho 3 días por semana, aparte del plan de entrenos. No cuentan para Ritmo ni para la semana cumplida.
- **Caminos** como Cumbres: arranca al elegir la primera ruta (no retroactivo), sin plazo, los km que sobran al llegar se pierden, se puede cambiar por una ruta más larga que lo recorrido y se pueden repetir. Un sello de credencial por día con actividad.
- **Rutas**: Caminos de Santiago y rutas del mundo con etapas y km de fuentes citadas; viajes de libro de dominio público (la Odisea, La vuelta al mundo en 80 días) con la distancia en línea recta entre sus lugares; y fantasías propias de AppFit. Sin la Tierra Media ni otros mundos con derechos, porque la app se publicará.

## Consecuencias

- Tabla nueva `actividades` (Dexie v10), en el backup v3 como opcional. La grabación con GPS se guarda en la tabla desde que empieza para no perderla si iOS cierra la PWA. El backup contiene ahora ubicaciones (los recorridos).
- `VERSION_REGLAS` pasa a 2: antes no había actividades, así que la XP ya ganada no cambia.
- La grabación en vivo no es fiable para rutas largas (pantalla encendida, batería, cortes que se unen en línea recta). La app lo dice antes de empezar y recomienda importar el GPX.
- Las rutas de Gronze y de las webs oficiales pueden cambiar con los años; las distancias quedan fijadas en `caminos/lib/rutas.ts` con su fuente y fecha. Las rutas nuevas se añaden al final para no cambiar la ruta de quien ya camina.
- No hay CSV de actividades ni importación de TCX/FIT; quedan como ideas.

## Ampliación: rutas propias (2026-10-12)

Víctor pidió crear rutas suyas (p. ej. de Tarragona a Valencia) con ubicaciones intermedias. Decidido con él: elegir salida y llegada de una **lista de pueblos de España incluida en la app**, con paradas propuestas y km aproximados que se pueden corregir, en lugar de escribirlo todo a mano o de usar un servicio de rutas (OpenStreetMap), que sería externo y sabría qué ruta se pide.

- Lugares de **GeoNames** (CC BY 4.0), un paquete estático del propio origen (`public/lugares/espana.json`) que se descarga al usarlo por primera vez. El Nomenclátor del IGN sería la fuente oficial, pero su Centro de Descargas no da un enlace directo para la tubería.
- Km = línea recta × 1,15 (aproximación de AppFit, se puede corregir); paradas propuestas cada 15, 25 o 40 km priorizando los pueblos grandes.
- Tabla nueva `rutasPropias` (Dexie v11), opcional en el backup. Una ruta que está en el viaje no se puede borrar, para no cambiar lo recorrido.
