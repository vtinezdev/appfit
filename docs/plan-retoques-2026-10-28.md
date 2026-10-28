# Plan: retoques de la revisión del 28 de octubre

Fecha: 2026-10-28. Estado: **en curso** (A, B y C fusionados en `master` con la #185; D hecho). Rama: `claude/optimistic-pascal-vvpdvx`, reiniciada desde `master` tras fusionar la #185. Víctor ha repasado la app después de muchas actualizaciones y anota lo que no le convence. El bloque G (repaso de frases sueltas en toda la app) va al final.

## Forma de trabajar (decisión de Víctor)

1. Se va **bloque a bloque**, en el orden de abajo.
2. Antes de implementar nada, se hace una **preview** del bloque (varias opciones cuando haya que elegir dirección) y Víctor decide: una opción, más opciones o retoques.
3. Solo entonces se implementa, con `npm run test` y `npm run build` en verde, y se pasa al siguiente bloque.

Criterio general que repite Víctor: **nada de frases sueltas** (subtítulos, explicaciones o textos de estado vacío que flotan sin pertenecer a nada). Si la explicación hace falta, va detrás de un botón de información (i) o dentro de la acción; si no, se quita.

## Bloque A — Inicio · **hecho** (opción 1, PROCESO §294)

1. **El día** (la cabecera o tarjeta del día): se ve suelto. Rehacerlo para que esté integrado.
2. **Actualizaciones / «App al día»**: se ve suelto. Integrarlo (o mostrarlo solo cuando haya algo que hacer).
   - Código: `features/inicio/InicioTab.tsx`, `shared/pwa/`, `app/ActualizacionesAjustes.tsx`.

## Bloque B — Perfil · **hecho** (ámbar, sin frases, R2; PROCESO §295)

1. Quitar la frase bajo el título de Perfil: «Tus datos para estimar tu energía diaria».
2. **Medidas corporales**: quitar el texto de debajo; esa explicación pasa a un botón (i) en la pantalla de registrar.
3. **Pantalla de registrar medidas**: no convence; rediseñarla. *Pendiente: qué es lo que no gusta (captura).*
4. **Tu energía diaria**: hoy reposo y actividad comparten color y el volumen va en otro. Que **actividad** tenga su propio color (tres colores: reposo, actividad, volumen). Cuidar contraste en ambos temas (`contrast.test.ts`).
   - Código: `features/perfil/PerfilTab.tsx`, `features/perfil/components/MedidasCorporales.tsx`, `features/referencias/components/EnergiaReferencias.tsx`.

## Bloque C — Nutrición · **hecho** (C1, O1, L2 con «Filtrar», C4; PROCESO §296)

1. **Macros iguales en todas partes**: en Buscar, bajo cada alimento, kcal · P · C · G se ven de una forma; usar esa misma forma en la pantalla principal de Nutrición y en cualquier otro sitio con macros (idealmente un único componente compartido).
2. **«Cómo queda tu día»** en la revisión al añadir escribiendo (debajo de «Total de la comida»): **no cambia el contenido**, solo cómo se ve. Hoy es un desplegable con línea arriba y abajo («CÓMO QUEDA TU DÍA / 712 de 3.010 kcal» y chevron), cuatro barras (Kcal, Proteína, Hidratos, Grasa: lo que llevas en gris + lo que añades en el color del macro) y una leyenda «Lo que llevas / Lo que añades» suelta al pie. Se ve suelto respecto a «Total de la comida» y al «Guardar como comida típica». Previews con varias opciones.
3. **Libro / Recetas**: de primeras hay muchas frases sueltas («Lo que aportan y cómo se preparan», «Aún no has creado ninguna. Una receta tuya guarda sus ingredientes, su peso cocinado y cómo se prepara»…) y la lista se ve monótona (todos los ítems iguales).
   - Punto de partida: lo de `feat/recetas-sin-textos-sueltos` (commit `3ef64ab`: pestañas Tuyas/AppFit, «+» en la cabecera, estado vacío con acciones, filas con raciones y tiempo), ya incluido en esta rama. La preview parte de ahí.

4. **«Proponer un alimento» también en Escribir** (anotado el 2026-10-28): hoy solo sale en Buscar cuando no aparece lo que buscas. Al escribir una comida y pulsar «Revisar alimentos», si una línea no encuentra alimento, que en la revisión aparezca también esa opción para esa línea (con el texto escrito como punto de partida).
   - Código: `nutricion/components/ProponerAlimentoSheet.tsx`, `DescribirComida.tsx`, `pages/AnadirComida.tsx` (revisión).

## Bloque D — Entreno · **hecho** (D2; PROCESO §298)

1. **Historial → calendario**: meterlo dentro de una tarjeta.

## Bloque E — Progreso

1. **Cumbres**: la lista de dónde salen los metros crece sin fin (cada récord añade una fila). Lo único fijo: **nada de una lista o desplegable infinito**. Se valoran varias opciones en preview.
   - Código: `features/cumbres/components/FilasMetros.tsx`, `ComoSeSube.tsx`.
2. **Caminos**: al terminar una ruta, si se elige «Crear nueva ruta», la ruta creada pasa a ser **la ruta actual** directamente.
   - Código: `features/caminos/components/EditorRuta.tsx`, `CambiarRutaSheet.tsx`, repo de caminos.
3. **Vitrina → Récords**: no convence la pestaña entera. Previews con varias direcciones y Víctor elige.
   - Código: `features/vitrina/components/RecordsVista.tsx`.

## Bloque F — Logros

1. En la ventanita de logros nuevos, poder **compartir el logro en Social** (además de lo que ya haga `CompartirLogro`). Publicación a propósito de la persona, dentro de lo permitido por `docs/features/social.md`; reutilizar lo que ya existe (`social/components/VitrinaPublicacion.tsx`).
   - Código: `features/vitrina/components/NuevosLogros.tsx`, `CompartirLogro.tsx`.

## Bloque G — Repaso final de frases sueltas

Al terminar A–F, recorrer todas las secciones y quitar o recolocar (botón (i), dentro de la acción o en el estado vacío con acción) cualquier texto suelto. Hacer primero un inventario con capturas para que Víctor lo apruebe.

## Preguntas abiertas para Víctor

Ninguna por ahora.

