# Actividades

`src/features/actividades/`. Caminatas, carreras y rutas de senderismo. En la interfaz viven en **Entreno › Actividades** (la otra sección de Entreno es Gimnasio). Sus km suben metros en [Cumbres](cumbres.md) (con la [experiencia](experiencia.md)) y avanzan la ruta de [Caminos](caminos.md). Datos e invariantes: [datos.md](../datos.md#actividades). Decisión: [ADR 037](../decisiones/037-actividades-y-caminos.md).

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Nombres, cifras, validación y resúmenes | `lib/actividad.ts`: `TIPOS_ACTIVIDAD`, `NOMBRE_TIPO`, `tituloActividad`, `formatKm`/`kmTexto`, `formatReloj`, `ritmoSegPorKm`/`formatRitmo`, `formatVelocidad`, `duracionTexto`, `validarActividad`, `resumenEntre`/`resumenSemana`, `porMes`, `nombreMes`, `cifrasActividad` | — (puro) |
| Tus mejores marcas (A24) | `lib/marcas.ts`: `mejoresMarcas` (la más larga, la de más desnivel y el mejor ritmo en salidas de `MIN_METROS_RITMO` = 5 km o más; todas juntas, en empate la más antigua), `marcasDe` (las de una actividad, si hay otra que optaba), `marcasBatidas` y `mensajeConMarcas` (aviso al guardar) | — (puro) |
| Geometría | `lib/geo.ts`: `distanciaM` (semiverseno), `distanciaRecorrido`, `desnivelPositivo` (con histéresis), `simplificarRecorrido` (Ramer-Douglas-Peucker hasta `MAX_PUNTOS`), `proyectarRecorrido`, `perfilAltitud` | — (puro) |
| GPX | `lib/gpx.ts`: `parsearGpx` (sin DOM ni librerías: tracks, rutas, prefijos de espacio de nombres), `resumirGpx`, `sugerirTipo` | — (puro) |
| FIT | `lib/fit.ts`: `esFit`, `resumirFit` (lector binario propio); `lib/importar.ts`: `leerArchivoActividad`, que elige FIT, GPX o TCX | — (puro) |
| TCX | `lib/tcx.ts`: `resumirTcx` (con las herramientas de `gpx.ts`: vueltas, pistas y puntos) y `resumirArchivoActividad`, que elige GPX o TCX por el contenido | — (puro) |
| Grabación con GPS | `lib/grabacion.ts`: `empezarGrabacion`, `anadirLectura` (descarta lecturas imprecisas, el temblor estando quieto y los saltos), `pausar`, `reanudar`, `segundosEnMarcha` | — (puro) |
| Formulario | `lib/formulario.ts`: `valoresIniciales`, `leerValores` | — (puro) |
| Escritura y lecturas | `data/actividadesRepo.ts` | `actividades` |
| GPS y pantalla encendida | `hooks/useGrabacionGps.ts`: `useGps` (`watchPosition` de alta precisión), `usePantallaEncendida` (Wake Lock, que se vuelve a pedir al volver a la app) | navegador |
| Entreno › Actividades | `pages/ActividadesHome`, `components/MejoresMarcas` | `actividadesRepo.terminadas` |
| Grabación en curso | `pages/GrabacionActiva` (diferida) | `actividadesRepo` |
| Detalle | `pages/DetalleActividad` (diferida), `components/TrazadoRecorrido`, `PerfilAltitud`; lo que dio en Cumbres y Caminos: `caminos/components/AvanceActividad` | `actividadesRepo`, `useCumbres`, `useCaminos` |
| Hojas | `components/HojaActividad` (a mano, revisión de un archivo importado y edición), `HojaGrabar` | — |

## Flujos

- **Registrar a mano**: tipo (Caminar · Correr · Senderismo), fecha, hora de inicio, duración (h y min), distancia (km, coma o punto), desnivel positivo opcional y nombre opcional. Los errores van en línea en la hoja.
- **Importar GPX** (Strava, Wikiloc, Garmin, el reloj…): el archivo se lee en el móvil y abre la misma hoja con lo leído (nombre del track, hora del primer punto, duración del primer al último punto de cada tramo, distancia, desnivel y el tipo propuesto: el `<type>` del archivo o, si no lo trae, la velocidad media —7,5 km/h o más, carrera— o el desnivel —30 m por km o más, senderismo—) y el recorrido dibujado. Se revisa y se guarda. Sin horas en el archivo, la duración queda en 0 y hay que ponerla. Archivos de más de 25 MB, que no son GPX ni TCX o sin puntos dan un error en línea.
- **Importar TCX** (Garmin Connect, Polar, Coros, cintas…): el mismo botón («Importar GPX, TCX o FIT») y la misma hoja, titulada «Importar TCX». Se reconoce por el contenido (`<TrainingCenterDatabase>`), no por la extensión. Distancia y tiempo son los de las vueltas del dispositivo (`DistanceMeters` y `TotalTimeSeconds`, lo que muestra el reloj); si no los trae, los de sus puntos. El inicio es el `<Id>` de la actividad, el nombre sus `<Notes>`, el tipo propuesto sale de `Sport` como el `<type>` del GPX, y recorrido y desnivel de los puntos con posición. Sin posiciones (cinta, interior) se importa sin recorrido. Se guarda con `origen: 'gpx'` (importada); el detalle dice «Importada de un archivo (GPX, TCX o FIT)». Solo se lee la primera actividad del archivo.
- **Importar FIT** (A17; el formato binario de Garmin, Coros, Wahoo, Suunto…): mismo botón y hoja «Importar FIT». `lib/importar.leerArchivoActividad` lee los bytes del archivo y reconoce FIT por la cabecera («.FIT» en los bytes 8–11); si no, GPX o TCX por el contenido. `lib/fit.ts` es un lector propio sin dependencias (decisión de Víctor): cabecera de 12 o 14 bytes, mensajes de definición (ambas arquitecturas y campos de desarrollador, que se saltan) y de datos, con cabeceras de hora comprimida; los valores «no válidos» de cada tipo se ignoran y el CRC no se comprueba. Solo usa `session` (inicio, tiempo en marcha, distancia, desnivel y deporte: 1 correr, 11 caminar, 17 senderismo), `lap` (si no hay sesión), `sport` y `record` (posición en semicírculos, altitud con escala 5 y desfase 500, hora y distancia). Prioridad: sesión, vueltas y puntos. El recorrido se parte en las pausas de más de dos minutos. Un archivo cortado o sin tiempo ni distancia da un error en línea. Tests con FIT sintéticos escritos en el propio test.
- **Grabar con el GPS**: la hoja explica la limitación y se elige el tipo; «Empezar» crea la grabación al cerrarse la hoja. La pestaña Entreno pasa a ser la grabación (antes que un entreno activo): tiempo en marcha (reloj aparte, cada segundo), ritmo medio, distancia, estado de la señal, el recorrido mientras se dibuja, «Pausar/Reanudar» y «Terminar». Terminar abre una hoja con el resumen, el tipo y el nombre: «Guardar actividad» (y se abre su detalle) o «Descartar grabación» con confirmación. La grabación se guarda cada 10 s, al pausar y al salir de la app; recargar o volver a abrir la PWA la recupera tal cual.
- **Tus mejores marcas** (A24): con dos salidas o más, arriba de la semana, la más larga, la de más desnivel y el mejor ritmo (solo salidas de 5 km o más, para que un paseo corto o un sprint no lo gane), todas las actividades juntas, con el tipo y el día; tocar una abre su detalle. Sin ranking ni comparación con nadie. Al guardar a mano o importar una que bate una marca anterior, el aviso lo dice («Actividad guardada · Tu salida más larga»); un empate no bate. El detalle de la actividad que tiene una marca lleva su insignia («Tu salida con más desnivel»), también al terminar una grabación, que abre su detalle. Se deriva al leer: sin datos nuevos.
- **Lista**: la semana (distancia, tiempo y salidas de lunes a domingo) y las actividades por meses, con su trazado en miniatura (o el icono si no hay recorrido), fecha y hora y «5,24 km · 42 min · 8:01 /km · +120 m». Deslizar una fila la borra al momento con «Deshacer».
- **Detalle**: título (el nombre o el tipo), tipo y fecha; las marcas que tiene; card con el trazado, distancia, duración, ritmo (y velocidad media), desnivel, el perfil de altitud si el recorrido trae altitudes y de dónde salió (a mano, un archivo o GPS); «Cumbres y Caminos» con los metros de su día y lo que avanzó en la ruta (etapas a las que llegó, llegada); «Compartir» en Social sin el recorrido (`components/PublicarActividad`, ver [social](social.md)); notas (se guardan al salir del campo); «Editar» (la misma hoja) y «Borrar actividad» (inmediato, con «Deshacer» en Entreno).

## El GPS en una web app

En iPhone (y en Android con la TWA de Play), una web app no recibe la ubicación con la pantalla bloqueada ni en segundo plano. Por eso:

- Mientras se graba se pide la pantalla encendida (Wake Lock). Si el navegador no lo permite, se avisa de que hay que tocar la pantalla de vez en cuando.
- Si la señal se corta y vuelve, el hueco se une en línea recta (la distancia se queda algo corta) y el tiempo sigue contando; con «Pausar», lo de la pausa no cuenta ni se une.
- Para rutas largas, lo recomendado es grabar con el reloj u otra app e importar el GPX. Leer Apple Salud o grabar en segundo plano exigiría una app nativa (ver [roadmap](../roadmap.md)).
- Lecturas aceptadas: precisión de 35 m o mejor, movimiento de al menos 4 m (o un tercio de la precisión) y velocidad de 15 m/s como mucho entre puntos. La altitud del GPS es ruidosa: el desnivel de una grabación usa un umbral de 10 m (5 m en un GPX).

## Reglas

- Validación (`validarActividad`): distancia y duración positivas, hasta 300 km y 48 h, inicio no futuro, desnivel de 0 a 10.000 m y media de 25 km/h como mucho (más rápido casi seguro es una errata o era en bici). Una grabación que no la pasa no se guarda y sigue en curso.
- El recorrido se guarda simplificado (como mucho 800 puntos); distancia y desnivel se calculan antes, con todos los puntos. Editar la distancia no cambia el recorrido.
- Qué dan: XP por km en [experiencia](experiencia.md) (10 m por km del día, hasta 100 m, 3 días por semana, aparte del plan de entrenos; no cuentan para Ritmo ni para la semana cumplida) y km en [Caminos](caminos.md). No cambian los objetivos de nutrición.


Desde el bloque de compartir también se puede enviar el resumen a una comunidad a la que se pertenezca, con vista previa. Sigue sin incluir recorrido GPS, y esa copia no sustituye la marca local de publicación para seguidores. Ver [Social](social.md#publicaciones-libres-logros-y-comunidades).

La publicación también se puede borrar desde el feed de Social con confirmación, solo por su autor. Se conserva el registro local y se libera la marca de publicación en este dispositivo para compartirlo otra vez; las copias de comunidad no quitan la marca de seguidores.
