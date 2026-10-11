# Cumbres

`src/features/cumbres/`. Se sube una montaña real tras otra con la XP de [Atributos](atributos.md): 1 XP = 1 m, desde el día en que se elige la primera montaña. Se deriva del historial como el resto de la gamificación; solo se guardan el inicio y las montañas elegidas. Es una **prueba**: Víctor la usará un tiempo y decidirá qué se queda de `gaming.md`. Los víveres del plan (etapas y víveres) están aparcados.

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Montañas, colecciones y fuentes de las altitudes | `lib/montanas.ts`: `MONTANAS` (también es la ruta sugerida), `COLECCIONES`, `montanaDe`, `FUENTE_ALTITUDES` | — (puro) |
| Motor y lecturas | `lib/cumbres.ts`: `calcularCumbres`, `rutaDe`, `empezar`, `montanasParaCambiar`, `cambiarMontana`, `metrosEntre`, `hitosDe`, `diasDeExpedicion`, `cumbreDeSesion`, `cumbreReciente`, `cuandoFue`, `progresoTexto` | — (puro; usa los `eventos` de `calcularAtributos`) |
| Geometría del perfil | `lib/perfil.ts`: `trazadoSilueta`, `puntoEnLadera`, `yDeFraccion` | — (puro) |
| Escritura | `data/cumbresRepo.ts`: `guardar` (devuelve la anterior, para «Deshacer») | `settings.cumbres` |
| Lecturas | `hooks/useCumbres.ts`: `leerCumbres` (Atributos + Cumbres; también para `useVitrina`) y `useCumbres` | `leerAtributos` y `settings` |
| Página (Más › Cumbres) | `CumbresTab.tsx` (diferida), `components/ListaMontanas`, `CambiarMontanaSheet`, `PerfilMontana` | — |
| Tarjeta de Inicio | `inicio/components/AccesoNivel` (nivel y montaña en una sola tarjeta) | `useCumbres` en `InicioTab` |
| Al terminar un entreno | `components/CumbreSesion`, dentro de `atributos/components/XpSesion` (lo compone `gym/components/WorkoutFinished`) | `useCumbres` |
| Logros | `vitrina/lib/logros.ts`, grupo «Cumbres» y dos ocultos (ver [vitrina.md](vitrina.md)) | resultado de `calcularCumbres` |

## Reglas

- **Arranque**: al elegir la primera montaña (`Settings.cumbres = { inicio: hoy, ruta: [id] }`). No es retroactiva: cuenta la XP con fecha igual o posterior a `inicio`.
- **Motor**: recorre la XP en orden cronológico (dentro de un día, el orden de `calcularAtributos`: entreno, récords, registro, proteína y semana). Cada XP sube un metro de la montaña actual. Con Solo entreno no hay XP de nutrición y se sube más despacio. Entrenar o registrar de más no suma, como en Atributos.
- **Del mar a la cumbre**: la altitud que se ve es lo subido en ese capítulo. Hay un hito cada 1.000 m por debajo de la cima, con su fecha y su entreno si lo hubo.
- **Cumbre**: al llegar a la altitud se hace cumbre ese día. **Los metros que sobran se pierden** (decisión de Víctor): la siguiente empieza desde 0 con la XP posterior, aunque sea del mismo día.
- **Ruta**: `ruta` guarda las montañas elegidas para los primeros capítulos y el resto sigue `MONTANAS` en orden. «Cambiar montaña» sustituye la actual por otra sin coronar y más alta que lo ya subido (lo subido se conserva). Así, la ruta guardada pasa a ser las coronadas más la elegida. Ids desconocidos o repetidos se ignoran.
- **Sin plazo** y sin poder fallar. Con todas coronadas, no hay montaña actual («Todas las cumbres coronadas»); la XP posterior no sube nada.
- **Pausa de Ritmo**: se ve «en el refugio» en la tarjeta y en la página. No cambia el cálculo: la XP que llegue sigue subiendo, como en Atributos.
- **Derivada**: borrar o añadir registros atrasados recalcula metros, hitos y cumbres (pueden moverse o desaparecer).

## Montañas

De menor a mayor altitud, que es también la ruta sugerida: Techo de España (Aneto 3.404, Mulhacén 3.479, Teide 3.715), Mont Blanc 4.806 y las Siete Cumbres de la lista de Messner (Puncak Jaya 4.884, Vinson 4.892, Elbrus 5.642, Kilimanjaro 5.895, Denali 6.190, Aconcagua 6.961, Everest 8.849). En total, 58.717 m: unos 16 meses con una semana normal de unos 860 XP.

Fuentes (comprobadas el 11 de octubre de 2026): Instituto Geográfico Nacional para Aneto (vértice 18057, 3.403,35 m; los mapas lo redondean a 3.404), Mulhacén (vértice Mulhacén I, 3.478,69 m) y Teide; la medición de septiembre de 2023 del Mont Blanc (4.805,59 m, cambia con el hielo); y las altitudes oficiales de las Siete Cumbres (Everest, medición de China y Nepal de 2020).

## Pantallas

- **Inicio**: sin Cumbres empezada, la tarjeta «Nivel» de siempre (abre Atributos). Empezada, «Nivel y cumbre» (abre Cumbres): nivel y título; la montaña con «2.340 de 3.715 m»; el perfil en lugar de la barra de XP (decorativo, dentro del botón); «Cumbre del Teide hoy / ayer / hace 2 días» durante tres días, llegue o no con un entreno; «En el refugio» si hay pausa; la XP para el siguiente nivel en texto y lo que valdría entrenar hoy.
- **Cumbres** (Más):
  - sin empezar, la explicación y la lista de montañas para elegir la primera (el Aneto, «Sugerida»), con «Deshacer»;
  - empezada, una card con la montaña actual (nombre, zona, perfil accesible con las líneas de cada 1.000 m, `Metric` con los metros, lo que falta y lo subido esta semana, «Cambiar montaña»);
  - «Hitos» (fecha o lo que falta), «Tu expedición» (cumbres y metros subidos desde el inicio), «Siguientes», «Mis cumbres» (fecha y días de cada expedición) y el Disclosure «Cómo funciona» con las fuentes.
- **Hoja «Cambiar montaña»**: montañas elegibles con altitud; errores en línea; al elegir, se cierra con «Deshacer».
- **Fin de sesión**: dentro de «Experiencia», tras la card del nivel. Si el entreno hace cumbre, una card «Cumbre del Mulhacén» con la altitud, los días que duró y la siguiente montaña. Después, «Montaña · Aneto» con los metros que subió el entreno («+79 m», incluidos los de la cumbre), cómo va y el hito que pasa. Sin animación.
- **Ajustes**: el mismo «Mostrar/Ocultar» de Atributos, Cumbres, Ritmo y Vitrina oculta la tarjeta, el bloque del fin de sesión, sus logros y el destino de Más.

## Rendimiento

`calcularCumbres` es lineal en la XP desde el inicio y va encima de `calcularAtributos` (unos 70 ms en escritorio con 500 entrenos). Inicio lo lee una vez; el fin de sesión, como `XpSesion` y `NuevosLogros`, hace su propia lectura.
