# Vitrina

`src/features/vitrina/` (y el Herbario en `src/features/nutricion/lib/herbario.ts`). Museo personal: logros con niveles, repetibles u ocultos, el muro de récords y las colecciones Herbario y Atlas. Se deriva del historial con la fecha real de cada pieza (retroactiva) y no guarda nada: borrar un registro puede retirar una pieza. Decisión: [ADR 029](../decisiones/029-gamificacion-atributos.md).

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Logros | `lib/logros.ts`: `calcularLogros`, `nivelDe`, `conseguido`, `ultimaVez`, `siguienteUmbral`, `recuentoPiezas`, `logrosDeEntreno` | — (puro; usa el resultado de Atributos y su Ritmo) |
| Muro de récords | `lib/muro.ts`: `muroRecords`, `describirMarca` | — (puro; reutiliza `gym/lib/records.acumularComparables`) |
| Atlas | `lib/atlas.ts`: `gruposDeEntreno`, `calcularAtlas` | — (puro; snapshot muscular de cada entreno o la clasificación actual) |
| Herbario | `nutricion/lib/herbario.ts`: `plantaDeEntrada`, `plantasDistintas`, `herbarioPorSemana` | — (puro; categoría con `repartoCategorias.categoriaDeEntrada`) |
| Todo junto | `lib/vitrina.ts`: `calcularVitrina` | — |
| Lecturas | `hooks/useVitrina.ts`: `leerAtributos` y `foodsRepo.categoriasDeEntradas` | ver [atributos.md](atributos.md) |
| Página (Más › Vitrina) | `VitrinaTab.tsx` (diferida): `components/LogrosVista`, `RecordsVista` y `ColeccionesVista` | — |
| Al terminar un entreno | `components/NuevosLogros` (en `gym/components/WorkoutFinished`) | `useVitrina` |
| Herbario en Nutrición › Resumen | `nutricion/components/HerbarioResumen` | `foodsRepo.categoriasDeEntradas`, `settings` |

## Logros (27 piezas)

| Logro | Grupo | Niveles o tipo | Fuente |
|---|---|---|---|
| Entrenos | Entreno | 10 · 50 · 100 · 250 | entrenos de 5 series efectivas o más (también los que no sumaron XP por el tope) |
| Coleccionista de récords | Entreno | 5 · 15 · 30 ejercicios distintos | récords de todos los entrenos terminados |
| Atlas completo | Entreno | repetible | los 12 grupos como músculo principal en una misma semana |
| Semanas cumplidas | Constancia | 4 · 12 · 26 · 52 | hitos de Ritmo |
| Hilo | Constancia | 4 · 12 · 26 · 52 semanas seguidas | día de presencia de la semana que alcanza el hilo |
| Días registrados | Nutrición | 30 · 100 · 200 · 365 | días con alguna comida |
| Proteína | Nutrición | 30 · 100 · 200 | días con la proteína al 90 % del objetivo |
| Herbario 30 | Nutrición | repetible | 30 plantas distintas en una semana |
| Madrugador | Oculto | 5 entrenos empezados antes de las 8:00 | |
| Vuelta al ruedo | Oculto | repetible | entrenar tras 14 días o más sin hacerlo |
| Descanso bien llevado | Oculto | repetible | semana cerrada cumplida con 3 días de descanso o más |

- Cada nivel es una pieza y un repetible cuenta como una sola. Sin nutrición, los logros de Nutrición no aparecen: quedan 19 piezas.
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

Atributos, Ritmo y Vitrina juntos tardan unos 150 ms en escritorio con tres años densos (500 entrenos, 12.500 series y 8.000 entradas). La Vitrina solo se calcula en su página y al terminar un entreno.
