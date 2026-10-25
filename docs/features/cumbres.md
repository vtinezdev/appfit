# Cumbres

`src/features/cumbres/`. El progreso general de la gamificación: se sube una montaña real tras otra con la [experiencia](experiencia.md) (1 XP = 1 m, aunque la interfaz solo habla de metros), desde el día en que se elige la primera montaña. Sustituye al nivel, los títulos y los atributos ([ADR 034](../decisiones/034-cumbres-en-lugar-de-atributos.md)). Se deriva del historial como el resto de la gamificación; solo se guardan el inicio y las montañas elegidas. Los víveres del plan (etapas y víveres) están aparcados.

Desde B12 ([ADR 058](../decisiones/058-destino-progreso.md)) la página se ve como la pestaña Cumbres de Progreso (`features/progreso/ProgresoTab`, en la media luna), montada con `incrustada`; la tesela de Inicio abre esa pestaña con «‹ Inicio».

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Montañas, colecciones y fuentes de las altitudes | `lib/montanas.ts`: `MONTANAS` (en el orden de la ruta sugerida), `COLECCIONES`, `montanaDe`, `FUENTE_ALTITUDES` | — (puro) |
| Motor y lecturas | `lib/cumbres.ts`: `calcularCumbres`, `rutaDe`, `SIGUIENTES`, `empezar`, `montanasParaCambiar`, `cambiarMontana`, `vecesCoronada`, `nombreExpedicion`, `metrosEntre`, `hitosDe`, `diasDeExpedicion`, `cumbreDeSesion`, `cumbreReciente`, `cuandoFue`, `progresoTexto` | — (puro; usa los `eventos` de `calcularExperiencia`) |
| Geometría del perfil | `lib/perfil.ts`: `trazadoSilueta`, `puntoEnLadera`, `yDeFraccion` | — (puro) |
| Escritura | `data/cumbresRepo.ts`: `guardar` (devuelve la anterior, para «Deshacer») | `settings.cumbres` |
| Lecturas | `hooks/leerCumbres.ts`: `leerCumbres` (experiencia + Cumbres; también para `leerVitrina`); `hooks/useCumbres.ts`: `useCumbres`, su parte del lector compartido (`experiencia/hooks/useProgreso`) | `leerExperiencia` y `settings` |
| Página (Inicio › Cumbres) | `CumbresTab.tsx` (diferida), `components/ListaMontanas`, `CambiarMontanaSheet`, `PerfilMontana`, `FilasMetros` | — |
| Tesela de Inicio | `inicio/components/AccesoProgreso` | `useVitrina` (incluye Cumbres) |
| Al terminar un entreno | `components/CumbreSesion` (lo compone `gym/components/WorkoutFinished`), con `FilasMetros` | `useCumbres`; `experiencia/lib/experiencia.xpDeSesion` |
| Logros | `vitrina/lib/logros.ts`, grupo «Cumbres» y tres ocultos (ver [vitrina.md](vitrina.md)) | resultado de `calcularCumbres` |

## Reglas

- **Arranque**: al elegir la primera montaña (`Settings.cumbres = { inicio: hoy, ruta: [id] }`). No es retroactiva (decisión de Víctor): cuenta la XP con fecha igual o posterior a `inicio`.
- **Motor**: recorre la XP en orden cronológico (dentro de un día, el orden de `calcularExperiencia`: entreno, récords, actividades, registro, proteína y semana). Las caminatas, carreras y rutas suben 10 m por km (ver [experiencia](experiencia.md)); sus km avanzan además los [Caminos](caminos.md), que van aparte. Cada XP sube un metro de la montaña actual. Qué sube y cuánto: [experiencia.md](experiencia.md#reglas-versión-1-version_reglas). Con Solo entreno no hay metros de nutrición y se sube más despacio. Entrenar o registrar de más no sube.
- **Del mar a la cumbre**: la altitud que se ve es lo subido en ese capítulo. Hay un hito cada 1.000 m por debajo de la cima, con su fecha y su entreno si lo hubo.
- **Cumbre**: al llegar a la altitud se hace cumbre ese día. **Los metros que sobran se pierden** (decisión de Víctor): la siguiente empieza desde 0 con la XP posterior, aunque sea del mismo día.
- **Ruta** (`rutaDe`): `ruta` guarda las montañas elegidas para los primeros capítulos, en orden y con repeticiones. Después sigue la sugerida: siempre la montaña coronada menos veces y, a igualdad, la primera de `MONTANAS`. Así primero van las que faltan y, con todas coronadas, empieza otra vuelta: **la ruta no se acaba** y siempre hay montaña actual. Ids desconocidos se ignoran.
- **Repetir**: cada capítulo sabe qué vez es en su montaña (`Expedicion.vez`); desde la segunda se muestra «Aneto · 2.ª vez».
- **Cambiar montaña**: sustituye la actual por cualquier otra más alta que lo ya subido, también una coronada (lo subido se conserva). La ruta guardada pasa a ser las coronadas más la elegida.
- **Sin plazo** y sin poder fallar.
- **Pausa de Ritmo**: se ve «en el refugio» en la tarjeta y en la página. No cambia el cálculo: la XP que llegue sigue subiendo.
- **Derivada**: borrar o añadir registros atrasados recalcula metros, hitos y cumbres (pueden moverse o desaparecer).

## Montañas

`MONTANAS` va en el orden de la ruta sugerida, en dos etapas de menor a mayor altitud. Las de la segunda van detrás del Everest para no cambiar la montaña de quien ya sube por la primera.

1. Techo de España (Aneto 3.404, Mulhacén 3.479, Teide 3.715), Mont Blanc 4.806 y las Siete Cumbres de la lista de Messner (Puncak Jaya 4.884, Vinson 4.892, Elbrus 5.642, Kilimanjaro 5.895, Denali 6.190, Aconcagua 6.961, Everest 8.849): 58.717 m, unos 16 meses con una semana normal de unos 860 m.
2. Fuji 3.776, Jungfrau 4.158, Cervino 4.478, Monte Rosa 4.634, Cotopaxi 5.897, Chimborazo 6.263, Ojos del Salado 6.893, Makalu 8.485, Lhotse 8.516, Kangchenjunga 8.586 y K2 8.611: 70.297 m más, unos 19 meses.

Colecciones (`COLECCIONES`; una montaña puede estar en varias): Techo de España, Siete Cumbres, Alpes (Mont Blanc, Jungfrau, Cervino y Monte Rosa), Volcanes (Teide, Elbrus, Kilimanjaro, Fuji, Cotopaxi, Chimborazo y Ojos del Salado) y Los cinco más altos (Everest, K2, Kangchenjunga, Lhotse y Makalu).

Fuentes (comprobadas el 11 y el 12 de octubre de 2026): Instituto Geográfico Nacional para Aneto (vértice 18057, 3.403,35 m; los mapas lo redondean a 3.404), Mulhacén (vértice Mulhacén I, 3.478,69 m) y Teide; la medición de septiembre de 2023 del Mont Blanc (4.805,59 m, cambia con el hielo); las altitudes oficiales de las Siete Cumbres (Everest, medición de China y Nepal de 2020); swisstopo para Jungfrau, Cervino y Monte Rosa (Punta Dufour); la Autoridad de Información Geoespacial de Japón para el Fuji (vértice de 3.775,63 m); la medición de 2016 del Instituto Geográfico Militar de Ecuador para el Chimborazo (6.263,47 m); la del Instituto Geográfico Militar de Chile para Ojos del Salado (otras dan 6.891 m); y las aceptadas habitualmente para el Cotopaxi, el K2, el Kangchenjunga, el Lhotse y el Makalu.

## Pantallas

- **Inicio**, tesela «Cumbres» bajo la energía (abre Cumbres): los metros de la montaña actual y su nombre; sin montaña elegida, «—» y «Elige montaña».
- **Cumbres** (desde su tesela de Inicio; «‹ Inicio» vuelve con el foco en la tesela):
  - sin empezar, una card con el perfil de la primera de la ruta a 0 m y la explicación, y la lista de montañas para elegir la primera (el Aneto, «Sugerida»; cada una con una barra fina de su altitud frente al Everest), con «Deshacer»;
  - empezada, una card con la montaña actual (nombre, zona, perfil accesible con las líneas de cada 1.000 m, `Metric` con los metros, lo que falta y lo subido esta semana, lo que valdría entrenar hoy y «Cambiar montaña»);
  - «Hitos» (fecha o lo que falta);
  - «Esta semana»: entrenos y días registrados frente al plan, días con actividad que suman (de 3), metros subidos y lo que falta para cumplirla (+150 m);
  - «Tu expedición»: cumbres (las repetidas cuentan) con «N de 22 montañas», y metros subidos desde el inicio;
  - «Cada día»: los metros de cada día desde el inicio con su porqué (`FilasMetros`, también los entrenos y las actividades que no suben y el motivo), 14 días y «Ver más días»;
  - «Siguientes»: las 5 próximas de la ruta, con «coronada N veces» si ya se subió;
  - «Mis cumbres»: fecha y días de cada expedición, también las repetidas;
  - la «i» de la cabecera abre «Cómo funciona Cumbres» (`components/ComoSeSube` en `ComoFunciona`): qué sube metros como lista de reglas con su valor, qué no cuenta, límites, la ruta y las fuentes en un desplegable.
- **Hoja «Cambiar montaña»**: montañas elegibles con altitud y, si ya se coronaron, cuántas veces; errores en línea; al elegir, se cierra con «Deshacer».
- **Fin de sesión**, bajo los récords, la sección «Cumbres» con los metros que sube el entreno en el título («+150 m»): sus filas (entreno y récords, con su porqué) o por qué no sube; si hace cumbre, cuántos metros se quedan en la cima y una card «Cumbre del Mulhacén» con la altitud, los días que duró y la siguiente montaña; y una card con la montaña actual, su progreso y el hito que pasa. Sin montaña elegida, una línea que invita a elegirla. Sin animación.
- **Ajustes › Cumbres, Ritmo y Vitrina**: Mostrar/Ocultar (oculta las tarjetas de Inicio, los bloques del fin de sesión, el sello de la revisión, el Herbario del Resumen y las teselas de Inicio), Con nutrición/Solo entreno y el plan semanal (`ritmo/components/GamificacionAjustes`).

## Rendimiento

`calcularCumbres` es lineal en la XP desde el inicio y va encima de `calcularExperiencia` (unos 70 ms en escritorio con 500 entrenos). La tesela de Inicio, la página, el fin de sesión (`CumbreSesion`, `NuevosLogros`) y `AvanceActividad` comparten un solo cálculo a través del lector compartido ([experiencia.md](experiencia.md) § Rendimiento).
