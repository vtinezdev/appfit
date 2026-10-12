# Caminos

`src/features/caminos/`. Rutas reales y de ficción que se recorren con los km de las [actividades](actividades.md) (caminar, correr y senderismo), una tras otra, desde el día en que se elige la primera. Funciona en paralelo a [Cumbres](cumbres.md), que sube con la XP: el gimnasio no avanza los Caminos. Se deriva del historial como el resto de la gamificación; solo se guardan el inicio y las rutas elegidas. Se oculta con la gamificación (Ajustes). Decisión: [ADR 037](../decisiones/037-actividades-y-caminos.md).

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Rutas, colecciones y fuentes | `lib/rutas.ts`: `RUTAS` (en el orden de la ruta sugerida), `NOMBRE_COLECCION`, `NOTA_COLECCION`, `metrosRuta`, `rutaDe`, `FUENTE_RUTAS` | — (puro) |
| Motor y lecturas | `lib/caminos.ts`: `calcularCaminos`, `rutaDe`, `finalesDeEtapa`, `empezar`, `rutasParaCambiar`, `cambiarRuta`, `vecesTerminada`, `nombreExpedicion`, `etapaActual`, `metrosEntre`, `diasDeExpedicion`, `caminoDeActividad`, `llegadaReciente`, `progresoTexto` | — (puro; usa las actividades terminadas) |
| Escritura | `data/caminosRepo.ts`: `guardar` (devuelve la anterior, para «Deshacer») | `settings.caminos` |
| Rutas propias | `lib/rutasPropias.ts`: `aRuta`, `idDeRutaPropia`/`esRutaPropia`, `validarRutaPropia`, `nombrePorDefecto`, `etapasPropuestas`, `quitarParada`, `insertarParada`, `anadirVuelta`, `mismoSitio`, `kmTotales`, `puntosDe`, `posicionEnRutaPropia`; `lib/lugares.ts`: `leerPaqueteLugares`, `buscarLugares`, `kmTramo` (`FACTOR_CAMINO`), `proponerParadas`, `indiceParaInsertar`; `data/rutasPropiasRepo.ts` (`listar`, `obtener`, `crear`, `actualizar`, `enUso`, `borrar`); `data/lugares.ts` (`cargarLugares`, descarga del propio origen) | `rutasPropias`; `public/lugares/espana.json` |
| Editor de rutas | `components/EditorRuta` (ModalPage), `BuscadorLugar`, `MapaRuta` | — |
| Lecturas | `hooks/useCaminos.ts`: `leerCaminos` (también para `useVitrina`) y `useCaminos` | `actividadesRepo.terminadas`, `rutasPropiasRepo.listar` y `settings` |
| Página (Más › Caminos) | `CaminosTab.tsx` (diferida), `components/TrazadoCamino`, `ListaRutas`, `CambiarRutaSheet` | — |
| Tarjeta de Inicio | `inicio/components/AccesoCamino` | `useCaminos` en `InicioTab` |
| Tesela de Más | `app/MasAccesos` | `useCaminos` |
| En el detalle de una actividad | `components/AvanceActividad` (lo compone `actividades/pages/DetalleActividad`) | `useCumbres`, `useCaminos` |
| Logros | `vitrina/lib/logros.ts`, grupo «Caminos» y dos ocultos (ver [vitrina.md](vitrina.md)) | resultado de `calcularCaminos` y las actividades |

## Reglas

- **Arranque**: al elegir la primera ruta (`Settings.caminos = { inicio: hoy, ruta: [id] }`). No es retroactivo (decisión de Víctor): cuentan las actividades con fecha igual o posterior a `inicio` (también las importadas o registradas después con esas fechas).
- **Motor**: recorre las actividades terminadas por hora de inicio; cada metro avanza la ruta actual. Todas cuentan igual (caminar, correr o senderismo) y sin tope.
- **Etapas**: cada etapa acaba en un lugar con sus km; al pasar el final se marca con la fecha y la actividad. La credencial guarda un **sello por día** con alguna actividad que avanzó esa ruta.
- **Llegada**: al llegar al final de la ruta se marca la llegada. **Los km que sobran se pierden**, como en Cumbres: la siguiente empieza de cero con las actividades posteriores.
- **Ruta de capítulos** (`rutaDe`): las elegidas en orden y después la sugerida, que elige siempre la ruta hecha menos veces y, a igualdad, la primera de `RUTAS`. No se acaba: con todas hechas, vuelve a empezar.
- **Repetir**: cada capítulo sabe qué vez es («Camino Inglés · 2.ª vez»).
- **Cambiar de ruta**: por cualquier otra más larga que lo ya recorrido, también una hecha; lo recorrido se conserva.
- **Sin plazo** y sin poder fallar. Derivado: borrar o editar actividades recalcula etapas, sellos y llegadas.

## Rutas

`RUTAS` va en el orden de la ruta sugerida, en dos bloques de más corta a más larga: primero las de días o pocas semanas, después los grandes caminos.

| Colección | Rutas |
|---|---|
| Caminos de Santiago (etapas reales) | Inglés desde Ferrol (111,5 km, 5 etapas), Fisterra y Muxía desde Santiago (113,8 km, 5), Portugués desde Oporto (241,4 km, 10), Primitivo desde Oviedo (306,4 km, 14), Francés desde Saint-Jean-Pied-de-Port (763,7 km, 33), del Norte desde Irún (820,9 km, 36) y Vía de la Plata desde Sevilla por el Sanabrés (970,4 km, 37) |
| Rutas del mundo (etapas reales) | Camino Inca (45 km, 4), Milford Track (53,5 km, 4), Kumano Kodo Nakahechi (65 km, 4) y West Highland Way (154 km, 8) |
| Viajes de libro (dominio público) | La Odisea (4.362 km, 14: los lugares del poema con sus identificaciones tradicionales) y La vuelta al mundo en 80 días (37.466 km, 20: el itinerario de Verne) |
| Fantasía de AppFit | La senda del dragón dormido (344 km, 16) y La piedra de fuego (1.670 km, 18) |

- **Fuentes** (consultadas el 12 de octubre de 2026): Caminos de Santiago, etapas de Gronze (Francés por Napoleón, Primitivo por Hospitales, Norte por Tol y Miraz, Vía de la Plata por el Sanabrés y Laza; desde Melide y Arzúa siguen por el Francés; Melide–Arzúa, 14,5 km, de alberguescaminosantiago.com). West Highland Way: su web oficial. Milford Track: Department of Conservation de Nueva Zelanda. Kumano Kodo: Visit Wakayama (38 km de Takijiri-oji a Hongu y 27 de Hongu a Nachi; el reparto en dos jornadas de cada tramo es aproximado). Camino Inca: las cuatro jornadas habituales (las fuentes varían entre 40 y 45 km).
- **Ficción**: la Odisea y la vuelta al mundo son de dominio público; sus km son la distancia en línea recta entre los lugares del libro, calculada por AppFit. Las fantasías son propias (lugares y km inventados). No se usan mundos con derechos (p. ej. la Tierra Media) porque la app se publicará ([despliegue.md](../despliegue.md)).
- **Rutas propias** («Tus rutas»): ver la sección siguiente.
- **Añadir rutas**: al final de `RUTAS` para no cambiar la ruta de quien ya camina, con su fuente en la cabecera de `rutas.ts` y en `FUENTE_RUTAS`.

## Rutas propias

Rutas entre dos lugares de España creadas por Víctor (p. ej. Tarragona – Valencia). Se guardan en la tabla `rutasPropias` (salida y etapas con nombre, provincia, coordenadas y km) y entran en el motor como `Ruta` de la colección `propia` con id `propia:<id>` (`aRuta`).

- **Lugares**: `public/lugares/espana.json`, 7.834 núcleos con habitantes de GeoNames (CC BY 4.0; tubería en `scripts/lugares/README.md`). Se descarga del propio origen al abrir el editor por primera vez y el service worker lo guarda (`StaleWhileRevalidate`, caché `lugares`); sin conexión la primera vez, el editor lo dice y ofrece reintentar.
- **Buscar** (`buscarLugares`): sin acentos ni mayúsculas, primero los nombres que empiezan por lo escrito y, a igualdad, los más poblados; también por otra palabra del nombre.
- **Km** (`kmTramo`): la línea recta entre dos lugares × `FACTOR_CAMINO` (1,15) con un decimal: una aproximación de AppFit a lo que añaden las curvas del camino (Tarragona–Valencia: 228 km en línea recta, unos 260 por carretera). Cada tramo se puede corregir a mano.
- **Paradas propuestas** (`proponerParadas`, cada 15, 25 o 40 km): para cada punto de la recta se elige, a menos de la mitad de esa distancia, el pueblo que mejor combina cercanía y habitantes (`log10(habitantes) − 2 × distancia / radio`; los grandes atraen, y así la propuesta no se va al mar cuando la recta pasa por la costa); si no hay, el más cercano a menos de tres cuartos. Se pueden quitar (el tramo pasa a ir de la anterior a la siguiente) y añadir (en su sitio de la recta, recalculando sus dos tramos).
- **Ida y vuelta**: la llegada puede ser la salida (Tarragona – Reus – Tarragona). Sin recta no se proponen paradas ni se ofrece «Proponer una parada cada», y las que se añaden van antes de la llegada en el orden en que se eligen. En una ruta que no vuelve, «Volver a Tarragona» (`anadirVuelta`) convierte la llegada en parada y pone la salida como nueva llegada. `mismoSitio` (menos de 500 m) decide si una ruta vuelve. El nombre por defecto de una de ida y vuelta lleva sus paradas («Tarragona – Reus – Valls – Tarragona»; con más de dos, «… –»).
- **Validación** (`validarRutaPropia`): salida, al menos la llegada, nombre de cada parada, km de cada tramo (hasta 2.000) y nombre de la ruta (por defecto «Salida – Llegada»).
- **En el motor**: solo entran si se eligen (la ruta sugerida sigue siendo la de `RUTAS`) y se pueden elegir al empezar y en «Cambiar de ruta». Editar una ruta en uso recalcula lo recorrido con sus etapas nuevas; **no se puede borrar una ruta que está en el viaje** (elegida, en curso o terminada: `rutasPropiasRepo.borrar` lanza `RutaEnUso`). Cuentan en los logros como cualquier ruta (Rutas terminadas).
- **Dibujo** (`MapaRuta`): la línea entre las paradas, sin mapa, con un punto en cada una, la llegada con un aro y, en la página, lo recorrido y la marca de la posición interpolada dentro de la etapa en curso (`posicionEnRutaPropia`).

## Pantallas

- **Inicio**, tarjeta ancha tras la de Cumbres (abre Caminos): sin ruta, «Elige tu primer Camino»; empezada, «Camino»: la ruta («· 2.ª vez» si se repite) con «5,42 de 111,5 km», el trazado (decorativo), «Llegada a Santiago de Compostela hoy / ayer / hace 2 días» durante tres días y «Hacia Pontedeume: faltan 22,3 km».
- **Más**: tesela «Caminos» con los km de la ruta actual y su nombre (sin ruta, «Elige ruta»).
- **Caminos** (Más):
  - sin empezar, una card con el trazado de la primera ruta a 0 km, la explicación e «Ir a Actividades»; «Tus rutas» (tocar una la empieza; el lápiz de al lado la edita) con «Crear ruta»; y las rutas por colección (con qué son sus km), la primera «Sugerida», con «Deshacer»;
  - empezada, una card con la ruta (nombre, zona y salida), el trazado (en una ruta propia, `MapaRuta` con la posición) (una línea con un punto al final de cada etapa a su distancia real y la marca donde se va), `Metric` con los km, «Etapa 2 de 5: Pontedeume → Betanzos · 2,3 de 19,7 km», los km de esta semana y los sellos de la credencial, y «Cambiar de ruta»;
  - «Próximas etapas» (las tres siguientes con lo que falta) y el desplegable «Todas las etapas» con la fecha de llegada de cada una;
  - «Tu viaje»: rutas terminadas (y cuántas distintas) y km recorridos desde el inicio;
  - «Siguientes»: las 5 próximas rutas;
  - «Mis caminos»: fecha de llegada, días y sellos de cada ruta terminada;
  - «Tus rutas»: tocar una la edita; «Crear ruta»;
  - el desplegable «Cómo se avanza», con las reglas y las fuentes.
- **Editor de rutas** (ModalPage «Nueva ruta» / «Editar ruta»): salida y llegada con un buscador de pueblos (resultados con su provincia; elegido, «Cambiar»), «Proponer una parada cada» 15 · 25 · 40 km, una Card con `MapaRuta` y el total, las etapas (nombre, «Parada 2 · Castellón» o «Llegada», km editables y la X para quitar), «Añadir parada» con su buscador, «Volver a …» si la ruta no vuelve a la salida, una línea que dice dónde se colocan las paradas y el nombre. En el pie, errores, «Guardar ruta» y, al editar, «Borrar ruta» con confirmación (o por qué no se puede).
- **Hoja «Cambiar de ruta»**: rutas elegibles (también las propias) con sus km y etapas; errores en línea; al elegir, se cierra con «Deshacer».
- **Detalle de una actividad**, «Cumbres y Caminos»: lo que avanzó en la ruta («+5,24 km», «Llegaste a Betanzos», «Llegada a…») o por qué no (antes de empezar Caminos, sin ruta elegida).

## Rendimiento

`calcularCaminos` es lineal en las actividades desde el inicio y no depende de la experiencia. Inicio lo lee una vez; la hoja «Más» y la Vitrina hacen su propia lectura.
