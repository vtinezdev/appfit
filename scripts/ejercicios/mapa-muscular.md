## Mapa muscular: propuestas de diseño (hombre y mujer)

Prompts con los que se generó la imagen de referencia del mapa muscular (`gym/components/mapaMuscularGeometria.ts`). Cada uno da una dirección de estilo con las cuatro figuras: hombre frontal, hombre trasera, mujer frontal y mujer trasera. Elegido el **A** (2026-10-09): su imagen es `ia/mapa-muscular.png` y `npm run ejercicios:mapa` la convierte en SVG (ver `README.md`); la imagen no se usa tal cual.

Las zonas son las 13 de `lib/musculos.ts`. Hombros, antebrazo, aductores y gemelos aparecen en las dos vistas; el resto solo en una. Los colores de calor son los tokens `--c-muscle-1…5` del tema claro.

Qué mirar al elegir: que cada zona se distinga a 160 px de ancho, que hombre y mujer compartan pose y tamaño (se cambia de uno a otro sin que salte la tarjeta), y que las formas sean cerradas y separadas (se pueden trazar). El estilo C se parece a las ilustraciones de ejercicios, pero es el más difícil de pasar a SVG.

### A · Vector plano segmentado

```text
Create one wide image (3:2) for a fitness app UI: a workout muscle heat map. Four body figures side by side in one row, same height and same neutral standing pose (arms slightly away from the body, palms facing the thighs, feet hip-width): 1) male front view, 2) male back view, 3) female front view, 4) female back view. Pure white background, no text, labels, numbers, logos or watermark.

Style: clean flat vector illustration, like a modern fitness tracker app. Each body is a light warm-grey silhouette (#EDECE8) with a thin mid-grey outline (#807E7A). The muscles are drawn as smooth, rounded, simplified closed shapes with a thin white gap between neighbouring muscles, perfectly left-right symmetric, no shading, no gradients, no textures, no skin details. Athletic but natural proportions; the female figure has a female body shape and is not sexualised (no nipples, no anatomical detail, just the silhouette and muscle shapes). Short simple hair silhouette in the same grey as the body.

Muscle regions, each one clearly separate. Front view: chest, front shoulders, biceps, forearms, abdominals with obliques, quadriceps, inner thighs (adductors), lower legs. Back view: upper back (trapezius and lats as one region), rear shoulders, triceps, forearms, glutes, hamstrings, inner thighs (adductors), calves.

Show an example heat map on all four figures using five steps of orange: #FDE8D8 (very low), #FAC4A0, #F09258, #D6621E, #A04006 (very high). Chest, quadriceps and glutes at the highest step, shoulders and triceps medium, abdominals and hamstrings low; every other muscle stays neutral grey (#EDECE8 with outline), i.e. not worked.
```

### B · Geométrico minimalista

```text
Create one wide image (3:2) for a fitness app UI: a workout muscle heat map. Four body figures side by side in one row, same height and same neutral standing pose (arms slightly away from the body, palms facing the thighs, feet hip-width): 1) male front view, 2) male back view, 3) female front view, 4) female back view. Pure white background, no text, labels, numbers, logos or watermark.

Style: minimalist geometric vector, made of a small number of crisp faceted shapes with straight edges and slightly rounded corners, like a low-poly icon. Each body is a light warm-grey silhouette (#EDECE8) with a thin mid-grey outline (#807E7A); muscles are flat polygonal panels separated by thin white gaps, perfectly left-right symmetric, no shading, no gradients, no textures. Athletic but natural proportions; the female figure has a female body shape and is not sexualised (no anatomical detail, just silhouette and panels). Simple head without facial features.

Muscle regions, each one clearly separate. Front view: chest, front shoulders, biceps, forearms, abdominals with obliques, quadriceps, inner thighs (adductors), lower legs. Back view: upper back (trapezius and lats as one region), rear shoulders, triceps, forearms, glutes, hamstrings, inner thighs (adductors), calves.

Show an example heat map on all four figures using five steps of orange: #FDE8D8 (very low), #FAC4A0, #F09258, #D6621E, #A04006 (very high). Chest, quadriceps and glutes at the highest step, shoulders and triceps medium, abdominals and hamstrings low; every other muscle stays neutral grey (#EDECE8 with outline), i.e. not worked.
```

### C · Anatómico suave (como las ilustraciones de ejercicios)

```text
Create one wide image (3:2) for a fitness app UI: a workout muscle heat map. Four body figures side by side in one row, same height and same neutral standing pose (arms slightly away from the body, palms facing the thighs, feet hip-width): 1) male front view, 2) male back view, 3) female front view, 4) female back view. Pure white background, no text, labels, numbers, logos or watermark.

Style: clean anatomical model with matte light-grey clay-like surface and clearly defined muscle anatomy, very soft studio lighting with minimal shading, seen straight from the front and straight from the back (orthographic, no perspective). Perfectly left-right symmetric. Athletic but natural proportions; the female figure has a female body shape and is not sexualised (no nipples, no anatomical detail of the chest or groin), short neutral hair or a simple bun in the same grey.

Muscle regions, each one clearly separate with a visible edge. Front view: chest, front shoulders, biceps, forearms, abdominals with obliques, quadriceps, inner thighs (adductors), lower legs. Back view: upper back (trapezius and lats as one region), rear shoulders, triceps, forearms, glutes, hamstrings, inner thighs (adductors), calves.

Show an example heat map on all four figures with five steps of orange, from very low to very high: #FDE8D8, #FAC4A0, #F09258, #D6621E, #A04006. Chest, quadriceps and glutes at the highest step, shoulders and triceps medium, abdominals and hamstrings low; every other muscle stays plain light grey, i.e. not worked.
```

### D · Contorno de línea

```text
Create one wide image (3:2) for a fitness app UI: a workout muscle heat map. Four body figures side by side in one row, same height and same neutral standing pose (arms slightly away from the body, palms facing the thighs, feet hip-width): 1) male front view, 2) male back view, 3) female front view, 4) female back view. Pure white background, no text, labels, numbers, logos or watermark.

Style: elegant line-art vector. The body outline and every muscle contour are drawn with one consistent thin dark-grey stroke (#4C4E52) of the same width, rounded line caps, on a white body fill; muscles are closed contours that read like a refined anatomy diagram, simplified, perfectly left-right symmetric, no shading, no hatching, no textures. Athletic but natural proportions; the female figure has a female body shape and is not sexualised (no anatomical detail, only the silhouette and muscle contours). Simple head without facial features.

Muscle regions, each one a separate closed contour. Front view: chest, front shoulders, biceps, forearms, abdominals with obliques, quadriceps, inner thighs (adductors), lower legs. Back view: upper back (trapezius and lats as one region), rear shoulders, triceps, forearms, glutes, hamstrings, inner thighs (adductors), calves.

Show an example heat map on all four figures by filling some muscle contours with five steps of orange: #FDE8D8 (very low), #FAC4A0, #F09258, #D6621E, #A04006 (very high). Chest, quadriceps and glutes at the highest step, shoulders and triceps medium, abdominals and hamstrings low; every other muscle stays white (not worked).
```
