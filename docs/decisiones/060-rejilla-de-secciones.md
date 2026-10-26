# 060 — Rejilla de secciones

Fecha: 2026-10-26. Estado: vigente. Cambia [ADR 043](043-media-luna-de-secciones.md) en un punto: las secciones que abre el botón ya no van en media luna sino en una rejilla. El botón, la capa, el orden, la sección marcada y el teclado siguen igual.

## Contexto

Con Progreso ([ADR 058](058-destino-progreso.md)) la media luna pasó a siete secciones. A 375 px y más se veía bien una vez repartidas a distancias iguales sobre la curva, pero a 320 px siete círculos con su nombre no caben en un arco bajo: la órbita tenía que subir a 210 px y quedaba una herradura alta y estrecha. Víctor comparó tres alternativas a 320 px (rejilla 4 + 3, dos arcos concéntricos y un arco en zigzag) y eligió la rejilla para todas las pantallas, con la fila corta centrada.

## Decisión

- **Rejilla** (`app/RejillaSecciones`) justo encima del botón, en filas de izquierda a derecha en el orden de `EN_SECCIONES`: Inicio · Perfil · Nutrición · Entreno · Progreso · Social · Ajustes.
- **Columnas** (`app/rejilla.columnasRejilla`, con test): una fila hasta cuatro secciones; con más, dos filas con la de arriba igual o más larga y como mucho cuatro columnas, que caben a 320 px. Siete quedan en 4 + 3; si se añade una octava, 4 + 4; sin Social, 3 + 3. La fila corta va centrada.
- Cada sección sigue siendo un círculo de 48 px con el nombre debajo, y la actual lleva el borde en `accent-strong`. Las secciones entran subiendo desde el botón, escalonadas; con Reduce Motion, solo opacidad. Con poco alto la rejilla se desplaza y el ✕ sigue a la vista.

## Consecuencias

- Desaparecen la geometría de la órbita (`app/arco.ts`, `posicionesArco`) y los tokens `--arco-rx`, `--arco-ry` y `--arco-nodo`. Los sustituyen `--secciones-celda` (ancho máximo de cada celda) y `--secciones-circulo`. Las clases `.arco-*` pasan a `.secciones-*`, y `EN_ARCO` a `EN_SECCIONES`.
- Añadir una sección ya no exige revisar solapes a 320 px: basta con que `columnasRejilla` dé el reparto que se quiera.
