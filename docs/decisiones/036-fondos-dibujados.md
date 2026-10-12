# 036 — Fondos dibujados: curvas de nivel y rejilla de puntos

Fecha: 2026-10-12. Estado: vigente. Amplía el fondo «con foto o liso» de [ADR 035](035-acento-volt-y-pulido-visual.md) y cambia el fondo por defecto: de la foto a las curvas.

## Contexto

Con el acento volt, la foto de cada sección casi no se veía en oscuro (el velo que necesita el texto la tapa) y las luces laterales pizarra, cobalto y arena eran de la paleta anterior. Víctor pidió opciones solo para el fondo. Se le presentaron nueve sobre capturas reales de Inicio, Nutrición y Entreno en ambos temas: la foto actual, liso, halo volt, foto en duotono, curvas de nivel, grano, aurora, rejilla de puntos y anillos. La que más le gustó fue curvas de nivel; también le gustó la rejilla de puntos, y pidió las dos como opciones en Ajustes, con las curvas como fondo por defecto.

## Decisión

- **Ajustes › Apariencia › Fondo**: Curvas / Puntos / Foto / Liso. **Curvas es el fondo por defecto**: sin nada guardado (o con un valor desconocido) se ven las curvas, y quien quiera la foto la elige. Sigue siendo una preferencia de pantalla en localStorage (`appfit-fondo`), aplicada como `data-fondo` en html (sin atributo con la foto).
- **Curvas**: las curvas de nivel de un macizo visto desde arriba, en trazo fino de `accent-strong`, que se desvanecen hacia abajo. El dibujo es un SVG local usado como máscara (el color lo ponen los tokens). Lo genera `scripts/fondos/curvas.cjs` de forma determinista, sin fuentes externas.
- **Puntos**: retícula de puntos en el color del texto, desvanecida desde la esquina superior derecha.
- Los dos llevan un **halo volt** arriba a la derecha y prescinden de la foto, de las luces de sección y de la franja de lectura.

## Consecuencias

- Son tenues por diseño. Sin franja de lectura, `contrast.test.ts` exige ≥ 4,5:1 para todo el texto sobre el píxel más cargado (halo + trazo), lo que limita su presencia sobre todo en oscuro.
- Las mismas reglas que la foto: quietos mientras el contenido se desplaza, sin animación, atenuados en Referencias y Ajustes y ocultos con Forced Colors.
- Quien no había tocado el ajuste pasa de la foto a las curvas al actualizar; quien eligió «Liso» lo conserva. Las fotos siguen en la app y en el precache para quien las elija.
- `curvas.svg` (≈47 KB, 14 KB comprimido) entra en el precache de la PWA y funciona sin conexión. Si se cambia el relieve, se regenera con el script.
- El resto de opciones de la propuesta (halo solo, duotono, grano, aurora, anillos) quedan descartadas por ahora.
