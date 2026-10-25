# Caminos

`src/features/caminos/`. Rutas reales y de ficción que se recorren con los km de las [actividades](actividades.md) (caminar, correr y senderismo) y de los [pasos](#pasos) apuntados, una tras otra, desde el día en que se elige la primera. Funciona en paralelo a [Cumbres](cumbres.md), que sube con la XP: el gimnasio no avanza los Caminos. Se deriva del historial como el resto de la gamificación; solo se guardan el inicio, las rutas elegidas, los pasos de cada día y la zancada propia. Se oculta con la gamificación (Ajustes). Decisión: [ADR 037](../decisiones/037-actividades-y-caminos.md).

Desde B12 ([ADR 058](../decisiones/058-destino-progreso.md)) la página se ve como la pestaña Caminos (sin Actividades no sale) de Progreso (`features/progreso/ProgresoTab`, en la media luna), montada con `incrustada`; la tesela de Inicio abre esa pestaña con «‹ Inicio».

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Rutas, colecciones y fuentes | `lib/rutas.ts`: `RUTAS` (en el orden de la ruta sugerida), `NOMBRE_COLECCION`, `NOTA_COLECCION`, `metrosRuta`, `rutaDe`, `FUENTE_RUTAS` | — (puro) |
| Motor y lecturas | `lib/caminos.ts`: `calcularCaminos`, `rutaDe`, `finalesDeEtapa`, `empezar`, `rutasParaCambiar`, `cambiarRuta`, `vecesTerminada`, `nombreExpedicion`, `etapaActual`, `metrosEntre`, `diasDeExpedicion`, `caminoDeActividad`, `llegadaReciente`, `progresoTexto` | — (puro; usa las actividades terminadas) |
| Escritura | `data/caminosRepo.ts`: `guardar` y `guardarZancada` (devuelven la anterior, para «Deshacer») | `settings.caminos`, `settings.zancadaCm` |
| Pasos | `lib/pasos.ts`: `zancadaEstimadaCm`, `zancadaDe`, `metrosDePasos`, `leerPasos`, `validarPasos`, `validarZancada`, `aportesDePasos`, `pasosTexto`; `data/pasosRepo.ts` (`todos`, `guardar`, `borrar`, `restaurar`); `components/PasosCaminos`, `HojaPasos`, `HojaZancada` | `pasos` |
| Rutas propias | `lib/rutasPropias.ts`: `aRuta`, `idDeRutaPropia`/`esRutaPropia`, `validarRutaPropia`, `nombrePorDefecto`, `etapasPropuestas`, `quitarParada`, `insertarParada`, `anadirVuelta`, `mismoSitio`, `kmTotales`, `puntosDe`, `posicionEnRutaPropia`; `lib/lugares.ts`: `leerPaqueteLugares`, `buscarLugares`, `kmTramo` (`FACTOR_CAMINO`), `proponerParadas`, `indiceParaInsertar`; `data/rutasPropiasRepo.ts` (`listar`, `obtener`, `crear`, `actualizar`, `enUso`, `borrar`); `data/lugares.ts` (`cargarLugares`, descarga del propio origen) | `rutasPropias`; `public/lugares/espana.json` |
| Editor de rutas | `components/EditorRuta` (ModalPage), `BuscadorLugar`, `MapaRuta` | — |
| Lecturas | `hooks/leerCaminos.ts`: `leerCaminos` (también para `leerVitrina`, que usa los pasos para sus logros); `hooks/useCaminos.ts`: `useCaminos`, su parte del lector compartido (`experiencia/hooks/useProgreso`) | `actividadesRepo.terminadas`, `rutasPropiasRepo.listar`, `pasosRepo.todos` y `settings` |
| Página (Inicio › Caminos) | `CaminosTab.tsx` (diferida), `components/TrazadoCamino`, `ListaRutas`, `CambiarRutaSheet` | — |
| Tesela de Inicio | `inicio/components/AccesoProgreso` | `useCaminos` |
| En el detalle de una actividad | `components/AvanceActividad` (lo compone `actividades/pages/DetalleActividad`) | `useCumbres`, `useCaminos` |
| Logros | `vitrina/lib/logros.ts`, grupo «Caminos» y tres ocultos (ver [vitrina.md](vitrina.md)) | resultado de `calcularCaminos` y las actividades |

## Reglas

- **Arranque**: al elegir la primera ruta (`Settings.caminos = { inicio: hoy, ruta: [id] }`). No es retroactivo (decisión de Víctor): cuentan las actividades con fecha igual o posterior a `inicio` (también las importadas o registradas después con esas fechas).
- **Motor**: recorre las actividades terminadas por hora de inicio y, detrás de las de su día, los metros de los pasos de ese día; cada metro avanza la ruta actual. Todas cuentan igual (caminar, correr o senderismo) y sin tope. En las marcas (etapas, llegadas, tramos), `actividadId: null` son los pasos.
- **Etapas**: cada etapa acaba en un lugar con sus km; al pasar el final se marca con la fecha y la actividad. La credencial guarda un **sello por día** con alguna actividad o pasos que avanzaron esa ruta.
- **Llegada**: al llegar al final de la ruta se marca la llegada. **Los km que sobran se pierden**, como en Cumbres: la siguiente empieza de cero con las actividades posteriores.
- **Ruta de capítulos** (`rutaDe`): las elegidas en orden y después la sugerida, que elige siempre la ruta hecha menos veces y, a igualdad, la primera de `RUTAS`. No se acaba: con todas hechas, vuelve a empezar.
- **Repetir**: cada capítulo sabe qué vez es («Camino Inglés · 2.ª vez»).
- **Cambiar de ruta**: por cualquier otra más larga que lo ya recorrido, también una hecha; lo recorrido se conserva.
- **Sin plazo** y sin poder fallar. Derivado: borrar o editar actividades recalcula etapas, sellos y llegadas.

## Pasos

Una web app no puede leer Apple Salud ni Health Connect, así que se apunta a mano el total del día que marca el móvil. Víctor eligió las tres reglas siguientes.

- **Un total por día** (tabla `pasos`, `&fecha`), de 1 a 100.000. Se escribe con o sin punto de millares (`leerPasos`). Apuntar un día que ya tenía pasos los sustituye (la hoja lo avisa).
- **A metros con la zancada** (`zancadaDe`): la propia (`Settings.zancadaCm`, 30–150 cm) o la estimada por el perfil, 0,415 × altura (0,413 en mujeres; sin sexo, la media; regla habitual de los podómetros, aproximación de AppFit); sin altura, 70 cm. Si se guarda la misma cifra que la estimada, no se guarda propia.
- **Sin contar dos veces** (`aportesDePasos`): el total del móvil ya incluye las caminatas y carreras registradas, así que cada día avanza `max(0, metros de los pasos − metros de las actividades terminadas de ese día)`. 9 km de pasos y una caminata de 5 km dan 9 km, no 14.
- Como las actividades, solo avanzan desde el inicio de Caminos y hasta hoy; los anteriores sí cuentan en los logros de pasos de la [Vitrina](vitrina.md) («Pasos», «Días de 10.000» y el oculto «Treinta mil»). No dan XP ni metros en Cumbres.

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

- **Inicio**, tesela «Caminos» bajo la energía (abre Caminos): los km de la ruta actual y su nombre; sin ruta, «—» y «Elige ruta».
- **Caminos** (desde su tesela de Inicio; «‹ Inicio» vuelve con el foco en la tesela):
  - sin empezar, una card con el trazado de la primera ruta a 0 km, la explicación e «Ir a Actividades»; «Tus rutas» (tocar una la empieza; el lápiz de al lado la edita) con «Crear ruta»; y las rutas por colección (con qué son sus km), la primera «Sugerida», con «Deshacer»;
  - empezada, una card con la ruta (nombre, zona y salida), el trazado (en una ruta propia, `MapaRuta` con la posición) (una línea con un punto al final de cada etapa a su distancia real y la marca donde se va), `Metric` con los km, «Etapa 2 de 5: Pontedeume → Betanzos · 2,3 de 19,7 km», los km de esta semana y los sellos de la credencial, y «Cambiar de ruta»;
  - «Próximas etapas» (las tres siguientes con lo que falta) y el desplegable «Todas las etapas» con la fecha de llegada de cada una;
  - «Tu viaje»: rutas terminadas (y cuántas distintas) y km recorridos desde el inicio;
  - «Siguientes»: las 5 próximas rutas;
  - «Mis caminos»: fecha de llegada, días y sellos de cada ruta terminada;
  - «Tus rutas»: tocar una la edita; «Crear ruta»;
  - la «i» de la cabecera abre «Cómo funciona Caminos» (`components/ComoSeAvanza`): qué avanza, la ruta, tus rutas y las fuentes en un desplegable.
- **Editor de rutas** (ModalPage «Nueva ruta» / «Editar ruta»): salida y llegada con un buscador de pueblos (resultados con su provincia; elegido, «Cambiar»), «Proponer una parada cada» 15 · 25 · 40 km, una Card con `MapaRuta` y el total, las etapas (nombre, «Parada 2 · Castellón» o «Llegada», km editables y la X para quitar), «Añadir parada» con su buscador, «Volver a …» si la ruta no vuelve a la salida, una línea que dice dónde se colocan las paradas y el nombre. En el pie, errores, «Guardar ruta» y, al editar, «Borrar ruta» con confirmación (o por qué no se puede).
- **Pasos** (empezada, tras la card de la ruta; sin empezar, al final): los 7 días más recientes con su fecha, los pasos y «≈ 8,75 km · +3,75 km sobre tus actividades», «ya contados en tus actividades» o «antes de empezar Caminos» (el resto en «Todos los días»); tocar uno lo corrige y deslizarlo lo borra con «Deshacer». «Apuntar los de hoy» (o «Cambiar los de hoy»), «Apuntar otro día» y «Zancada de 75 cm, por tu altura · Cambiar».
- **Hoja «Apuntar pasos»** (`HojaPasos`): día (no futuro; fijo al corregir) y pasos, con los km que dan; errores en línea; al guardar, Toast con «Deshacer». **Hoja «Tu zancada»** (`HojaZancada`): cm, de dónde sale la estimada y cómo medirla; «Usar la estimada» si hay propia.
- **Hoja «Cambiar de ruta»**: rutas elegibles (también las propias) con sus km y etapas; errores en línea; al elegir, se cierra con «Deshacer».
- **Detalle de una actividad**, «Cumbres y Caminos»: lo que avanzó en la ruta («+5,24 km», «Llegaste a Betanzos», «Llegada a…») o por qué no (antes de empezar Caminos, sin ruta elegida).

## Rendimiento

`calcularCaminos` es lineal en las actividades desde el inicio y no depende de la experiencia. Se lee dentro del lector compartido de la gamificación, una vez por día para la tesela de Inicio, la página, la Vitrina y `AvanceActividad` ([experiencia.md](experiencia.md) § Rendimiento).
