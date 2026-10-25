## verdict

Las 136 capturas obligatorias fueron renovadas y siguen siendo válidas: presentes, decodificables, con dimensiones y contenido correspondientes. Se revisó su validez en sheets y se abrieron los originales de los seis estados críticos, además de mobile/desktop. Este pase puntúa exclusivamente los cinco fixes anteriores.

1. **resolved — FIRST VIEWPORT / THESIS.** En `320-light-activo.png` y `320-dark-activo.png`, con descanso activo, la fila completa de Press banca —check, reps, kg y borrado— se ve aproximadamente entre y417–465, por encima de la navegación que comienza en y496. El source conserva check de 48 px e inputs de al menos 44 px; compacta el resumen y sustituye la configuración por el reloj durante el descanso. La mejora devuelve el espacio a la tarea, sin comprimir sus controles.
2. **resolved — Selección compacta.** `375-text-200-menu.png` y `812-landscape-menu.png` muestran el check dentro de Ajustes, el único destino seleccionado; Nutrición ya no recibe esa marca. `.fan-target { position: relative }` conserva el anchor también cuando el item se vuelve estático.
3. **resolved — Copy responsive.** `320-light-anadir.png` y `320-dark-anadir.png` muestran “Desayuno” completo en una línea, con cuatro opciones legibles y el indicador ajustado a Comida. `SegmentedControl.tsx` distribuye el ancho según contenido y mide ancho/posición del seleccionado; mantiene la tipografía y el target existentes.
4. **resolved — FLOOR / eyebrow.** Las nuevas capturas activo muestran primero el título Full body y después “En curso · hora”. El source invierte expresamente ese orden, conservando el dato de estado sin eyebrow sobre el h1.
5. **resolved — Persistence.** `DESIGN.md`, leído completo, describe ahora tinta/mineral/naranja, Manrope, abanico anclado, entreno compacto, controles medidos, PWA, CSS/Web Animations sin motor spring, límites de haptic y estado de series/descanso en sessionStorage separado de DB/backups. El sidecar se parsea como schema 2 y registra 54 metadatos de color; las decisiones documentadas corresponden a lo construido y desaparece el mundo anterior de papel/grafito.

## remaining

clear. No se observaron regresiones introducidas por el lote dentro de los cinco puntos puntuados.

Este ship cubre los cinco fixes puntuados, no una nueva revisión global de toda la superficie. Se mantienen los límites de cobertura: no se inspeccionaron las capturas suplementarias de la matriz de 514 estados ni el código ajeno a las correcciones; el sidecar se verificó mediante parseo y metadatos, no se repitió su validación ShadowDOM. Los perfiles Chromium no acreditan Safari/iOS ni Android físicos. No se ejecutó navegador ni detector.

disposition: ship
