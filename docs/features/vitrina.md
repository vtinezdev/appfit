# Vitrina

`src/features/vitrina/` (y el Herbario en `src/features/nutricion/lib/herbario.ts`). Museo personal: logros con niveles, repetibles u ocultos, el muro de récords y las colecciones Herbario y Atlas. Se deriva del historial con la fecha real de cada pieza (retroactiva) y no guarda nada: borrar un registro puede retirar una pieza. Decisión: [ADR 029](../decisiones/029-gamificacion-atributos.md); logros de repetir montaña y nuevas colecciones de Cumbres: [ADR 034](../decisiones/034-cumbres-en-lugar-de-atributos.md).

Desde B12 ([ADR 058](../decisiones/058-destino-progreso.md)) la página se ve como la pestaña Vitrina de Progreso (`features/progreso/ProgresoTab`, en la rejilla de secciones), montada con `incrustada`; la tesela de Inicio abre esa pestaña con «‹ Inicio».

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Logros | `lib/logros.ts`: `calcularLogros`, `nivelDe`, `conseguido`, `ultimaVez`, `siguienteUmbral`, `recuentoPiezas`, `proximosLogros`, `logrosDeEntreno`, `porRareza` (los ocultos y los niveles altos primero; la imagen del entreno enseña los cuatro primeros) | — (puro; usa el resultado de la [experiencia](experiencia.md), su Ritmo, Cumbres, las actividades, Caminos, la Liga, el Herbario y el volumen de cada entreno, que prepara `lib/vitrina.ts`) |
| Muro de récords | `lib/muro.ts`: `muroRecords`, `describirMarca` | — (puro; reutiliza `gym/lib/records.acumularComparables`) |
| Atlas | `lib/atlas.ts`: `gruposDeEntreno`, `calcularAtlas` (cada dominado, con el entreno de su tercera sesión) | — (puro; snapshot muscular de cada entreno o la clasificación actual) |
| Herbario | `nutricion/lib/herbario.ts`: `plantaDeEntrada`, `plantasDistintas`, `herbarioPorSemana` (día en que se llega a 30 y a 50) | — (puro; categoría con `repartoCategorias.categoriaDeEntrada`) |
| Todo junto | `lib/vitrina.ts`: `calcularVitrina` | — |
| Lecturas | `hooks/leerVitrina.ts`: `cumbres/hooks/leerCumbres` (experiencia, Cumbres y las actividades), `caminos/hooks/leerCaminos` (Caminos y los pasos) y `foodsRepo.categoriasDeEntradas`; es la lectura del lector compartido (`experiencia/hooks/useProgreso`), del que `hooks/useVitrina.ts` toma el resultado entero | ver [experiencia.md](experiencia.md) |
| Página (Inicio › Vitrina, desde su tesela; «‹ Inicio» vuelve con el foco en ella) | `VitrinaTab.tsx` (diferida): `components/LogrosVista` (bajo el recuento, «Próximos logros»; después, medallas en rejilla de tres, con el anillo de lo que se lleva hacia el siguiente nivel; cada una abre su detalle en una hoja), `RecordsVista` y `ColeccionesVista`; la «i» de la cabecera abre «Cómo funciona Vitrina» (`ComoFuncionaVitrina`: logros, récords y colecciones) | — |
| Al terminar un entreno | `components/NuevosLogros` (en `gym/components/WorkoutFinished`) | `useVitrina` |
| Iconos de los 58 logros | `components/IconoLogro`, sobre `shared/components/InsigniaExpedicion` | estado derivado del logro; sin persistencia |
| Herbario en Nutrición › Resumen | `nutricion/components/HerbarioResumen` | `foodsRepo.categoriasDeEntradas`, `settings` |

## Logros (152 piezas)

| Logro | Grupo | Niveles o tipo | Fuente |
|---|---|---|---|
| Entrenos | Entreno | 10 · 50 · 100 · 250 · 500 | entrenos de 5 series efectivas o más (también los que no subieron metros por el tope) |
| Series efectivas | Entreno | 250 · 1.000 · 2.500 · 5.000 · 10.000 | series efectivas de esos entrenos, con el entreno que pasa cada umbral |
| Toneladas | Entreno | 10 · 100 · 500 · 1.000 t | kg × repeticiones de las series efectivas de todos los entrenos terminados (`gym/lib/workout.volumenSets`: carga externa y lastre) |
| Coleccionista de récords | Entreno | 5 · 15 · 30 · 50 ejercicios distintos | récords de todos los entrenos terminados |
| Récords batidos | Entreno | 10 · 50 · 100 · 250 | todos los récords (cada tipo de marca cuenta) |
| Ejercicios dominados | Entreno | 5 · 10 · 20 ejercicios | ejercicios con 3 sesiones o más del Atlas, con el entreno de la tercera |
| Subir de liga | Entreno | Bronce · Plata · Oro · Zafiro · Rubí | primera vez que algún ejercicio entra en cada liga de la [Liga](liga.md) (primera sesión de esa semana) |
| Ciclos completados | Entreno | 1 · 5 · 10 ejercicios distintos | primera llegada a Élite de la Liga de cada ejercicio (`liga/lib/liga.primerosCiclos`, con las pausas de Ritmo) |
| Atlas completo | Entreno | repetible | los 12 grupos como músculo principal en una misma semana |
| Semanas cumplidas | Constancia | 4 · 12 · 26 · 52 | hitos de Ritmo |
| En racha | Constancia | 4 · 8 · 16 · 26 semanas cumplidas seguidas | semanas de Ritmo; las que están en pausa y la actual sin cumplir no cortan |
| Hilo | Constancia | 4 · 12 · 26 · 52 · 104 semanas seguidas | día de presencia de la semana que alcanza el hilo |
| Meta cumplida | Constancia | repetible | cada meta personal cumplida (B13, `lib/metas.metasCumplidas`) |
| Días registrados | Nutrición | 30 · 100 · 200 · 365 · 500 | días con alguna comida |
| Semanas enteras | Nutrición | 4 · 12 · 26 · 52 | semanas con comidas los siete días (fecha del séptimo) |
| Proteína | Nutrición | 30 · 100 · 200 · 365 | días con la proteína al 90 % del objetivo |
| Herbario 30 | Nutrición | repetible | 30 plantas distintas en una semana |
| Botánica | Nutrición | 50 · 100 · 150 · 200 plantas | plantas distintas desde siempre del Herbario, por el día en que apareció cada una |
| Cumbres | Cumbres | 1 · 3 · 6 · 11 · 22 cumbres | cumbres de [Cumbres](cumbres.md) (repetir una montaña también cuenta), con su fecha y su entreno |
| Montañas distintas | Cumbres | 5 · 11 · 22 montañas | primera cumbre de cada montaña |
| Otra vez arriba | Cumbres | 2 · 3 · 5 · 10 veces la misma montaña | la primera vez que una montaña llega a ese número de cumbres |
| Metros subidos | Cumbres | 10.000 · 25.000 · 50.000 · 100.000 · 250.000 m | metros subidos en Cumbres (los que sobran al hacer cumbre no cuentan) |
| Techo de España | Cumbres | 3 montañas (una pieza) | Aneto, Mulhacén y Teide; fecha de la tercera distinta (en las colecciones, repetir no suma) |
| Siete Cumbres | Cumbres | 7 montañas (una pieza) | la más alta de cada continente (lista de Messner) |
| Alpes | Cumbres | 4 montañas (una pieza) | Mont Blanc, Jungfrau, Cervino y Monte Rosa |
| Volcanes | Cumbres | 7 montañas (una pieza) | Teide, Elbrus, Kilimanjaro, Fuji, Cotopaxi, Chimborazo y Ojos del Salado |
| Los cinco más altos | Cumbres | 5 montañas (una pieza) | Everest, K2, Kangchenjunga, Lhotse y Makalu |
| Kilómetros | Caminos | 50 · 250 · 1.000 · 2.500 · 5.000 km | km de todas las [actividades](actividades.md) (retroactivo, desde siempre), con la fecha en que se pasa cada umbral |
| Kilómetros corriendo | Caminos | 10 · 50 · 100 · 250 · 500 km | km de las carreras |
| Desnivel positivo | Caminos | 1.000 · 5.000 · 10.000 · 25.000 m | desnivel de las actividades que lo tienen (GPS o GPX) |
| Horas en marcha | Caminos | 10 · 50 · 100 · 250 h | tiempo en marcha de las actividades (sin pausas) |
| Larga distancia | Caminos | 5 · 10 · 20 · 30 km | la primera actividad de esa distancia o más |
| Salidas | Caminos | 10 · 50 · 100 · 250 · 500 | actividades terminadas |
| Rutas terminadas | Caminos | 1 · 3 · 6 · 12 | llegadas en [Caminos](caminos.md) (repetir una ruta también cuenta) |
| Compostela | Caminos | una pieza | llegar a Santiago por uno de sus Caminos |
| Todos los caminos | Caminos | 6 caminos (una pieza) | Inglés, Portugués, Primitivo, Francés, del Norte y Vía de la Plata (repetir no suma) |
| Rutas del mundo · Viajes de libro · Fantasía | Caminos | 4 · 2 · 2 rutas (una pieza cada una) | las rutas de esa colección de `caminos/lib/rutas` (repetir no suma) |
| Pasos | Caminos | 100.000 · 500.000 · 1.000.000 · 2.500.000 · 5.000.000 | pasos apuntados en [Caminos](caminos.md#pasos) desde siempre (no solo desde el inicio de Caminos), con el día en que se pasa cada umbral |
| Días de 10.000 | Caminos | 10 · 30 · 100 · 250 · 365 días | días con 10.000 pasos apuntados o más |
| Madrugador | Oculto | 5 entrenos empezados antes de las 8:00 | |
| Noctámbulo | Oculto | 5 entrenos empezados a las 22:00 o más tarde | |
| Vuelta al ruedo | Oculto | repetible | entrenar tras 14 días o más sin hacerlo |
| Descanso bien llevado | Oculto | repetible | semana cerrada cumplida con 3 días de descanso o más |
| Red de seguridad | Oculto | una pieza | la primera semana salvada con un comodín (fecha: su domingo) |
| Día de récords | Oculto | repetible | récord en 3 ejercicios distintos en un mismo entreno |
| Día redondo | Oculto | repetible | entreno y actividad el mismo día (y comidas registradas, si la nutrición cuenta) |
| Año nuevo | Oculto | repetible | entreno o actividad el 1 de enero |
| Un año después | Oculto | una pieza | el primer día con algo (entreno, comidas o actividad) un año o más después del primero |
| Techo del mundo | Oculto | una pieza | cumbre en el Everest |
| La montaña salvaje | Oculto | una pieza | cumbre en el K2 |
| Más rápido que la otra vez | Oculto | repetible | repetir una cumbre en menos días que la vez anterior en esa montaña |
| Paso firme | Oculto | repetible | cumbre sin ninguna semana cerrada vacía durante la expedición (las congeladas por pausa no cuentan) |
| El fin del mundo | Oculto | una pieza | terminar el Camino de Fisterra y Muxía |
| Más allá de la maratón | Oculto | repetible | una actividad de 42,2 km o más |
| Kilómetro vertical | Oculto | repetible | una actividad con 1.000 m de desnivel positivo o más |
| Treinta mil | Oculto | repetible | un día con 30.000 pasos apuntados o más |
| Jardín botánico | Oculto | repetible | 50 plantas distintas en una semana (solo con la nutrición) |

- Cada nivel es una pieza y un repetible cuenta como una sola. Sin nutrición, los logros de Nutrición y el Jardín botánico no aparecen: quedan 132 piezas. Los de Cumbres y Caminos aparecen aunque no se haya elegido la primera montaña o ruta (sin conseguir).
- Nada se gana por kcal, peso corporal o déficit (salvaguarda del [ADR 029](../decisiones/029-gamificacion-atributos.md)).
- Los ocultos se ven como «Logro oculto · Se revela al conseguirlo».
- **Próximos logros**, antes del catálogo: hasta 3 logros con progreso hacia su siguiente umbral (`proximosLogros`: los de mayor fracción del umbral y, a igualdad, los que menos tienen pendiente). Cada fila lleva la insignia, nombre con el nivel que se persigue («Días registrados · nivel I»), «18 de 30 días» y la barra; toda la fila abre la hoja de detalle de siempre. Solo umbrales existentes; quedan fuera los repetibles, los completos, los que van a cero y cualquier oculto sin conseguir (Madrugador no aparece aunque esté al 80 %). Sin nada que mostrar, el bloque no se pinta. El catálogo completo sigue debajo.
- Los logros conseguidos con un entreno (`workoutId`) aparecen al terminarlo en «Nuevo en la Vitrina».

La rejilla de medallas y la hoja de detalle conservan su navegación y anillo de progreso. Cada uno de los 58 logros tiene un pictograma topográfico propio, tanto en la lista como en «Nuevo en la Vitrina». Sus niveles comparten símbolo y mantienen el numeral en texto. La sección fija la silueta: Entreno escudo, Constancia círculo, Cumbres triángulo, Caminos placa horizontal, Nutrición cuadrado redondeado y Ocultos rombo. Los pendientes van en neutro y los conseguidos en la paleta de expedición. Todos los ocultos sin conseguir montan el mismo candado, sin símbolos ni identificadores específicos dentro del SVG; tras conseguirlos se revela su pictograma. La insignia es decorativa para el lector de pantalla, que conserva nombre, nivel, progreso y fecha. Dirección visual y tokens: [sistema visual](../DESIGN-SYSTEM.md), [ADR 038](../decisiones/038-insignias-topograficas.md).

## Metas personales (B13)

En Progreso › Semana (`components/MetasVista`, sobre Ritmo): «Metas» con «Nueva meta» y, por cada una, su título («Sentadilla 100 kg», «80 km en noviembre», «12 semanas cumplidas»), «77,5 de 90 kg», el plazo y la barra. Tres tipos, como decidió Víctor: el récord de un ejercicio (la mejor carga de sus series efectivas con repeticiones en entrenos terminados; tiene que superar lo ya levantado), los km de un mes (este o uno de los dos siguientes; el plazo es su último día) y las semanas cumplidas de Ritmo desde la semana en que se crea. Nunca de peso corporal (ADR 029). El plazo es opcional; si pasa sin cumplirla queda «Sin cumplir» con «¿Cambiar fecha?», en gris y sin cuenta atrás. Al cumplirla: «Cumplida el 12 oct» y la pieza repetible «Meta cumplida» (decisión de Víctor). Borrar es inmediato, con «Deshacer». Solo se guarda la meta (`Settings.metas`, `data/metasRepo`: crear, editar, borrar y restaurar en transacción); el estado se deriva en `leerVitrina` (`lib/metas.estadoMetas`), que lo devuelve en `EstadoVitrina.metas`. `metaDeEjercicio` da la meta de récord vigente de un ejercicio a la gráfica de Entreno › Progreso (cruce A-X2).

## Tu mes y tu año (B15)

El resumen del mes que acaba de cerrar (en enero, del año): entrenos, toneladas, récords, metros subidos en Cumbres (si hay montaña), km, días registrados, plantas distintas y lo más trabajado (el grupo con más series). Sale en Inicio del 1 al 7 (`lib/tuPeriodo.periodoAResumir`) y se abre en una página en grafito con «Guardar imagen» y «Compartir…», que reutilizan la utilidad del póster (A10, `gym/lib/exportarImagen`) con un SVG propio de 1080 × 1350 (`lib/imagenTuPeriodo`). Todo es local; la imagen solo sale del móvil si se comparte (decisión de Víctor: con imagen). Lógica pura en `lib/tuPeriodo` (`resumirPeriodo`, `cifrasPeriodo`, `lineaTarjeta`), con tests; lecturas en `hooks/useTuPeriodo` y los metros, del lector compartido (`useVitrina`). Respeta los módulos de B9: sin Gimnasio, Actividades o Nutrición, sus cifras no salen.

## Muro de récords

La mejor marca vigente de cada ejercicio y variante (ejecución, agarre, técnica y modo de carga, como los récords de Gym), con el día en que se logró por primera vez:

- peso máximo (kg externos o lastre);
- 1RM estimado (Epley, solo bilateral con carga externa y sin tempo);
- repeticiones con el peso corporal;
- menor asistencia.

Se ordena por la marca más reciente; muestra 15 y «Ver más ejercicios».

## Colecciones

- **Herbario**:
  - Qué cuenta: plantas distintas de las categorías Frutas, Verduras y hortalizas, Patatas y tubérculos, Legumbres, Frutos secos y semillas, y Cereales, arroz y pasta. Se identifican por el nombre corto (`sugerirNombreCorto`) en singular aproximado, así que «Tomates cherry» y «tomate» son la misma.
  - Qué no cuenta: el pan, la bollería, los platos preparados y las recetas, que no se descomponen.
  - Qué muestra: la semana en curso frente a 30, con la lista; la mejor semana; y todas las plantas desde siempre.
  - Fuente de la cifra: McDonald y col., 2018, mSystems (American Gut Project). Es orientativa, no una recomendación.
  - En Nutrición › Resumen, la sección «Plantas distintas» del periodo, si la gamificación y su nutrición están activas.
- **Atlas**: grupos trabajados como principal esta semana (12, con check o guion) y desde siempre, y los ejercicios «dominados» (3 sesiones o más con series efectivas).

## Rendimiento

Experiencia, Ritmo, Cumbres, Caminos y Vitrina juntos tardan ~1,3 s con tres años densos y la CPU ralentizada 4× (cifras y lector compartido: [experiencia.md](experiencia.md) § Rendimiento); se calculan una sola vez por día para todas las pantallas que los usan. La Vitrina se calcula en su página, al terminar un entreno, en las teselas de Progreso de Inicio (`AccesoProgreso`, que toma también Caminos de su resultado) y en Social al editar el perfil deportivo (`EditarPerfilDeportivo`, que pasa el resultado a la elección de destacados y avatar).

## Compartir logros

Con cuenta y perfil social activo, el detalle de una pieza conseguida ofrece «Compartir logro», también en «Nuevo en la Vitrina» al terminar un entreno. Se seleccionan seguidores o una comunidad propia y se confirma la vista previa. El resumen lleva símbolo, nombre, día real y el requisito del nivel alcanzado (no el siguiente); nunca un oculto pendiente. `CompartirLogro` compone el editor social y `social/lib/publicacion.resumenLogro` valida la pieza. No se guarda ni marca el logro en Dexie. Reglas, audiencia y migración remota: [Social](social.md#publicaciones-libres-logros-y-comunidades).
