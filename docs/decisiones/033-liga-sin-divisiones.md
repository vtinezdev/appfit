# 033 — Liga sin divisiones, al estilo Duolingo

Fecha: 2026-10-12. Estado: vigente. Modifica la escalera y la presentación de [ADR 030](030-liga-por-ejercicio.md); su mecánica sigue igual.

## Contexto

A Víctor le gustaba la liga por ejercicio, pero tal como se presentaba le recordaba al sistema de ligas de los videojuegos competitivos (League of Legends): Platino y Diamante, tres divisiones con números romanos («Sube de Platino III a Platino II»), «ascensos» y «fantasma». Quería algo que también encaje con gente que no juega a videojuegos, y señaló como referencia Duolingo, que también tiene ligas pero las presenta sin parecer un juego competitivo: un nombre por liga, una insignia y frases cortas. Prefirió conservar Élite como cima (antes que Diamante) y no copiar las ligas de Duolingo tal cual.

## Decisión

- **Misma mecánica**: una semana con el ejercicio = un paso; 16 pasos hasta Élite; la de gracia, la bajada de un paso por semana, las pausas de Ritmo, los ciclos, los básicos y «Mantener» no cambian.
- **Cinco ligas de tres semanas, sin divisiones**: Bronce, Plata, Oro, Zafiro y Rubí (metales y gemas que cualquiera ordena), y Élite. La semana dentro de la liga se ve como «Semana 2 de 3» y tres puntos, no como un número romano.
- **Insignia por liga**: un escudo con el color de la liga y una marca (medalla en los metales, gema en las piedras, estrella en Élite), siempre con el nombre en texto. Colores atenuados de datos (`--c-liga-*`), con contraste de relleno ≥ 3:1 y distintos entre sí y del rojo de borrar (`contrast.test.ts`). Élite va en grafito, como el resto de cifras neutras.
- **Lenguaje cotidiano**: «Empieza en Bronce», «Sube a Plata», «Semana 2 de 3 en Zafiro», «N ejercicios más suman una semana», «Mejor marca anterior» (antes «Pico anterior»/fantasma) y «Hace tiempo que no los haces» (antes «Sin liga ahora»).
- Sin animaciones ni celebraciones nuevas: las métricas siguen siendo inmediatas ([DESIGN.md](../../DESIGN.md)).

## Consecuencias

- Como la Liga es derivada, el cambio recalcula todo sin migración: un ejercicio que estaba en Platino II (paso 11) aparece en Zafiro, semana 2 de 3.
- Primera paleta de colores fuera de macros y músculos: queda limitada a las insignias de la Liga.
- Reglas vigentes: [features/liga.md](../features/liga.md).
