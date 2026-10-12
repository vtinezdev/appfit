# Vitrina

`src/features/vitrina/` (y el Herbario en `src/features/nutricion/lib/herbario.ts`). Museo personal: logros con niveles, repetibles u ocultos, el muro de récords y las colecciones Herbario y Atlas. Se deriva del historial con la fecha real de cada pieza (retroactiva) y no guarda nada: borrar un registro puede retirar una pieza. Decisión: [ADR 029](../decisiones/029-gamificacion-atributos.md); logros de repetir montaña y nuevas colecciones de Cumbres: [ADR 034](../decisiones/034-cumbres-en-lugar-de-atributos.md).

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Logros | `lib/logros.ts`: `calcularLogros`, `nivelDe`, `conseguido`, `ultimaVez`, `siguienteUmbral`, `recuentoPiezas`, `logrosDeEntreno` | — (puro; usa el resultado de la [experiencia](experiencia.md), su Ritmo y Cumbres) |
| Muro de récords | `lib/muro.ts`: `muroRecords`, `describirMarca` | — (puro; reutiliza `gym/lib/records.acumularComparables`) |
| Atlas | `lib/atlas.ts`: `gruposDeEntreno`, `calcularAtlas` | — (puro; snapshot muscular de cada entreno o la clasificación actual) |
| Herbario | `nutricion/lib/herbario.ts`: `plantaDeEntrada`, `plantasDistintas`, `herbarioPorSemana` | — (puro; categoría con `repartoCategorias.categoriaDeEntrada`) |
| Todo junto | `lib/vitrina.ts`: `calcularVitrina` | — |
| Lecturas | `hooks/useVitrina.ts`: `cumbres/hooks/useCumbres.leerCumbres` (experiencia y Cumbres) y `foodsRepo.categoriasDeEntradas` | ver [experiencia.md](experiencia.md) |
| Página (Más › Vitrina) | `VitrinaTab.tsx` (diferida): `components/LogrosVista` (medallas en rejilla de tres, con el anillo de lo que se lleva hacia el siguiente nivel; cada una abre su detalle en una hoja), `RecordsVista` y `ColeccionesVista` | — |
| Al terminar un entreno | `components/NuevosLogros` (en `gym/components/WorkoutFinished`) | `useVitrina` |
| Herbario en Nutrición › Resumen | `nutricion/components/HerbarioResumen` | `foodsRepo.categoriasDeEntradas`, `settings` |

## Logros (50 piezas)

| Logro | Grupo | Niveles o tipo | Fuente |
|---|---|---|---|
| Entrenos | Entreno | 10 · 50 · 100 · 250 | entrenos de 5 series efectivas o más (también los que no subieron metros por el tope) |
| Coleccionista de récords | Entreno | 5 · 15 · 30 ejercicios distintos | récords de todos los entrenos terminados |
| Ciclos completados | Entreno | 1 · 5 · 10 ejercicios distintos | primera llegada a Élite de la [Liga](liga.md) de cada ejercicio (`liga/lib/liga.primerosCiclos`, con las pausas de Ritmo) |
| Atlas completo | Entreno | repetible | los 12 grupos como músculo principal en una misma semana |
| Semanas cumplidas | Constancia | 4 · 12 · 26 · 52 | hitos de Ritmo |
| Hilo | Constancia | 4 · 12 · 26 · 52 semanas seguidas | día de presencia de la semana que alcanza el hilo |
| Días registrados | Nutrición | 30 · 100 · 200 · 365 | días con alguna comida |
| Proteína | Nutrición | 30 · 100 · 200 | días con la proteína al 90 % del objetivo |
| Cumbres | Cumbres | 1 · 3 · 6 · 11 · 22 cumbres | cumbres de [Cumbres](cumbres.md) (repetir una montaña también cuenta), con su fecha y su entreno |
| Metros subidos | Cumbres | 10.000 · 25.000 · 50.000 · 100.000 m | metros subidos en Cumbres (los que sobran al hacer cumbre no cuentan) |
| Techo de España | Cumbres | 3 montañas (una pieza) | Aneto, Mulhacén y Teide; fecha de la tercera distinta (en las colecciones, repetir no suma) |
| Siete Cumbres | Cumbres | 7 montañas (una pieza) | la más alta de cada continente (lista de Messner) |
| Alpes | Cumbres | 4 montañas (una pieza) | Mont Blanc, Jungfrau, Cervino y Monte Rosa |
| Volcanes | Cumbres | 7 montañas (una pieza) | Teide, Elbrus, Kilimanjaro, Fuji, Cotopaxi, Chimborazo y Ojos del Salado |
| Los cinco más altos | Cumbres | 5 montañas (una pieza) | Everest, K2, Kangchenjunga, Lhotse y Makalu |
| Otra vez arriba | Cumbres | 2 · 3 · 5 veces la misma montaña | la primera vez que una montaña llega a ese número de cumbres |
| Herbario 30 | Nutrición | repetible | 30 plantas distintas en una semana |
| Madrugador | Oculto | 5 entrenos empezados antes de las 8:00 | |
| Vuelta al ruedo | Oculto | repetible | entrenar tras 14 días o más sin hacerlo |
| Descanso bien llevado | Oculto | repetible | semana cerrada cumplida con 3 días de descanso o más |
| Techo del mundo | Oculto | una pieza | cumbre en el Everest |
| Más rápido que la otra vez | Oculto | repetible | repetir una cumbre en menos días que la vez anterior en esa montaña |
| Paso firme | Oculto | repetible | cumbre sin ninguna semana cerrada vacía durante la expedición (las congeladas por pausa no cuentan) |

- Cada nivel es una pieza y un repetible cuenta como una sola. Sin nutrición, los logros de Nutrición no aparecen: quedan 42 piezas. Los de Cumbres aparecen aunque no se haya elegido la primera montaña (sin conseguir).
- Los ocultos se ven como «Logro oculto · Se revela al conseguirlo».
- Los logros conseguidos con un entreno (`workoutId`) aparecen al terminarlo en «Nuevo en la Vitrina».

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

Experiencia, Ritmo, Cumbres y Vitrina juntos tardan unos 150 ms en escritorio con tres años densos (500 entrenos, 12.500 series y 8.000 entradas). La Vitrina solo se calcula en su página y al terminar un entreno.
