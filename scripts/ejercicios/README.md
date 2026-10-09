# Imágenes de ejercicios: tubería offline

Genera las miniaturas de referencia del selector «Añadir ejercicio» (`public/ejercicios/<slug>.webp`, 192 px) y la lista `src/features/gym/lib/ejerciciosConImagen.ts`. No forma parte del build ni de la app; se ejecuta a mano (Node 24, type stripping, `sharp` como dependencia de desarrollo).

```bash
npm run ejercicios:imagenes                       # convierte lo que haya, reescribe prompts.md y la lista, borra huérfanas
npm run ejercicios:imagenes -- --forzar           # vuelve a descargar todas las fotos
npm run ejercicios:imagenes -- --prompt <slug>    # imprime el prompt de un solo ejercicio
```

Dos orígenes, por prioridad: la **ilustración propia** del ejercicio si existe y, si no, la **foto** de free-exercise-db. Así se puede ir sustituyendo poco a poco.

## Ilustraciones propias (IA)

Estilo: render anatómico 3D gris con los músculos principales en naranja, fondo blanco. Se generan con ChatGPT (plan gratuito, unas pocas al día) en lotes de cuatro ejercicios por imagen.

- `ilustraciones.json`: los lotes fijos (51; del 30 al 51, los 88 ejercicios añadidos el 2026-10-09), cada uno con cuatro `[slug, postura en inglés, músculos a resaltar]`. Cada ejercicio del catálogo aparece una sola vez (el script falla si no). Los lotes no se reordenan: el número de lote identifica la imagen guardada.
- `prompts.md` y `prompts-2.md` (generados): un prompt listo para copiar por lote, con ☐/✔ según si ya está su imagen. `prompts.md` tiene la primera tanda (lotes 1–29) y `prompts-2.md` las ampliaciones (desde el 30); al final de `prompts-2.md` se copia tal cual `mapa-muscular.md`: prompts para explorar el diseño del mapa muscular (hombre y mujer), que no pasan por esta tubería.
- `ia/` (fuera de Git, son originales pesados): `lote-NN.png|jpg|webp` es la imagen 2×2 del lote NN. Cada cuarto se recorta (menos un 2 % por borde por si hay líneas divisorias), se quita el blanco sobrante, se centra en un cuadrado con margen y se guarda como WebP calidad 78 (unos 3 KB).

Flujo:
1. Copia en ChatGPT el prompt del primer lote ☐ de `prompts-2.md`. Lo mejor es usar siempre la misma conversación para que el estilo no varíe.
2. Revisa las cuatro figuras: postura, agarre, máquina y músculo resaltado. Si alguna está mal, pide en el mismo chat que la corrija.
3. Guarda la imagen como `scripts/ejercicios/ia/lote-NN.png` y ejecuta `npm run ejercicios:imagenes`.
4. Si un solo recuadro no hay forma de arreglarlo: genera ese ejercicio solo con `--prompt <slug>` y guárdalo como `ia/<slug>.png`, que tiene prioridad sobre su recuadro del lote.

Los originales no se suben al repositorio: si se pierden, las miniaturas ya convertidas en `public/ejercicios/` siguen valiendo, pero no se pueden volver a recortar.

## Fotos de free-exercise-db

[free-exercise-db](https://github.com/yuhonas/free-exercise-db) (yuhonas): fotografías bajo **The Unlicense** (dominio público; `LICENSE.md` del repositorio, comprobada el 2026-10-07). Se descargan de `raw.githubusercontent.com` solo aquí, nunca en tiempo de ejecución. Recorte cuadrado centrado, WebP calidad 70 (2–7 KB). No se vuelven a descargar si ya existen.

`mapeo.json`: `slug del catálogo → id de free-exercise-db`, una entrada por ejercicio (el script falla si falta o sobra alguna).

- Debe ser el **mismo movimiento y el mismo equipo**. Si no hay equivalente fiel, `null`: mejor sin imagen que una parecida.
- `"Id"` usa la imagen 0 (posición inicial); `"Id#1"`, la 1.
- Para corregir una: edita la entrada, borra su `.webp` (o usa `--forzar`) y ejecuta el script.

Los ejercicios personalizados no tienen imagen.

## Mapa muscular

`mapa-muscular.ts` (`npm run ejercicios:mapa`) genera `src/features/gym/components/mapaMuscularGeometria.ts`, los muñecos de hombre y de mujer del mapa muscular, a partir de `ia/mapa-muscular.png`: la imagen del estilo A de `mapa-muscular.md` (elegido el 2026-10-09), con las cuatro figuras en fila (hombre frontal, hombre trasera, mujer frontal, mujer trasera).

- Separa fondo, líneas (blancas y contorno gris oscuro) y rellenos gris/naranja; cada relleno conexo es una forma y los píxeles de las líneas pasan a la forma más cercana, así que las formas teselan el cuerpo y el hueco entre músculos lo dibuja el trazo en la app.
- Cada forma va a una zona de `lib/musculos.ts` si su centroide cae en uno de los rectángulos de `FIGURAS` (coordenadas de la imagen, lado izquierdo; el derecho es simétrico respecto al eje de la figura). Las que no, son detalle neutro (cabeza, cuello, manos, rodillas, pies). `cortes` añade líneas que la imagen no tenía (los tobillos de la mujer de frente).
- Contornos simplificados y suavizados en curvas cuadráticas, con coordenadas enteras relativas en un viewBox común (unos 45 kB).
- Los rectángulos valen solo para esta imagen. Al cambiarla, ejecuta `npm run ejercicios:mapa -- --depurar` y revisa `ia/mapa-muscular-depuracion.png`, con cada zona de un color.
