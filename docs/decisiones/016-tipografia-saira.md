# 016 — Tipografía Saira en tres voces

Fecha: 2026-10-06. Estado: vigente. Sustituye la parte tipográfica de [012](012-identidad-enfocada-energica.md).

## Contexto

Víctor quiere rediseñar la tipografía. Se compararon en un muestrario estático (mismo contenido, tokens y temas) la pareja vigente Barlow Condensed + Manrope y catorce direcciones: Archivo, Space Grotesk + JetBrains Mono, Bricolage Grotesque, Big Shoulders, Unbounded, Saira, Tektur + Doto, Fraunces, Anybody y combinaciones. Le convencieron las cifras de Saira en cursiva negra condensada y, con ellas, la variante «Saira recta».

## Decisión

Una sola familia local, Saira variable (anchura 50–125 %, peso 100–900), recta y cursiva, con tres voces:

- **Títulos** (`display`, `heading`, títulos de capas y ejercicios): 900 al 62,5 %, rectos; display en mayúsculas.
- **Cifras** (`font-numeric`, `Metric`, reloj, macros): cursiva 800 al 70 %; hero 900 al 62,5 %. La cursiva queda reservada a las métricas, así que destaca sin competir con los títulos.
- **Lectura y edición**: ancho normal, recta. Etiquetas 700 al 85 %. Los campos de reps/kg y los totales en filas siguen rectos.

Como Saira condensada es algo más pequeña a igual cuerpo, hero/display/metric/heading suben ~8 % (56/41/34/26 px). Peso, anchura y estilo viven en tokens (`--fw-*`, `--fst-*`, `--font-style-numeric`), no en componentes.

## Consecuencias

- Las fuentes pasan de ~47 KB (Barlow 700 + Manrope) a ~215 KB (dos variables completas), precargadas y precacheadas. Se aceptó a cambio de tener todos los pesos y anchuras sin servicio externo; si pesara en el primer arranque, se puede instanciar con fontTools a los rangos usados.
- Sin dependencias ni orígenes de red nuevos; licencia OFL en `public/fonts/Saira-LICENSE.txt`.
- Implementación: [DESIGN-SYSTEM](../DESIGN-SYSTEM.md) § fuentes. Intención: [DESIGN.md](../../DESIGN.md) § Typography.
