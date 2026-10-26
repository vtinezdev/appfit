# 043 — Botón de secciones con media luna

Fecha: 2026-10-17. Estado: vigente, cambiado por [ADR 058](058-destino-progreso.md) (Progreso en la media luna, con siete secciones; Cumbres, Caminos, Ritmo y Vitrina como pestañas) y por [ADR 060](060-rejilla-de-secciones.md) (las secciones pasan de la media luna a una rejilla; el botón y el resto siguen igual). Sustituye [ADR 028](028-barra-de-pestanas-y-registrar.md) (barra de pestañas con «+») y la cápsula flotante con el «+» aparte de [ADR 035](035-acento-volt-y-pulido-visual.md); el resto de ADR 035 sigue vigente.

## Contexto

A Víctor no le acababan de convencer la cápsula de pestañas ni el «+» grande aparte. Dibujó un boceto (`images/Sin título.png`, local y fuera del repo): un botón abajo al centro y, al pulsarlo, una media luna con las secciones alrededor. Al verla funcionar pidió cambiar «Más» por Perfil y repartir lo que quedaba en esa hoja.

La app ya tuvo navegación bajo demanda ([ADR 008](008-menu-radial.md), [ADR 018](018-menu-de-seis-destinos.md)) y se cambió a barra porque escondía las secciones diarias tras un toque más. Ahora es una decisión de Víctor tras usar la barra.

## Decisión

- **Un solo botón flotante** abajo al centro (`--nav-boton`, 60 px, volt con icono casi negro como el antiguo «+» —Víctor lo pidió así tras verlo neutro—, icono de cuatro cuadros `secciones`). No es «Inicio»: abre las secciones; Inicio es una de ellas.
- **Media luna** (`app/ArcoSecciones`): capa propia con fondo de la app al 90 % (los nombres se leen en ambos temas), seis destinos de izquierda a derecha de 168° a 12°, cada uno un círculo de 48 px con el nombre debajo; la actual con borde en `accent-strong` (el volt relleno es del botón). Social solo con cuenta configurada (quedan cinco). Geometría pura en `app/arco.ts`; su test garantiza que a 320 px nada se pisa ni sale de pantalla. El botón queda en su sitio como ✕ para cerrar; también cierran tocar fuera, Escape y Atrás. Teclado: flechas, Inicio y Fin.
- **Seis secciones**: Inicio · Perfil · Nutrición · Entreno · Social · Ajustes (`EN_ARCO`; Víctor pidió después Perfil junto a Inicio y Social junto a Ajustes). Desaparece la hoja «Más»; cada destino que vivía en ella se abre desde una sección, que queda marcada en la media luna mientras se está dentro (`navegacion.seccionDe`): Amigos desde Social (icono de la cabecera), Referencias desde Ajustes (fila «Saber más › Referencias») y Cumbres, Caminos, Ritmo y Vitrina desde Inicio.
- **Progreso en Inicio**: bajo la energía, cuatro teselas en 2 × 2 (`inicio/components/AccesoProgreso`) con el dato de cada una (metros, km, semanas de hilo, piezas); cada tesela abre su sección. Sustituyen a las tarjetas anchas «Tu semana», «Cumbre» y «Camino». Víctor comparó antes las teselas en Perfil (arriba o tras la energía) y prefirió Inicio.
- **Sin «+»**: desaparece «Registrar» (`AccionesRapidas`, `RegistroRapido`). Se registra en cada sección: Añadir comida en Nutrición, Empezar y Actividades en Entreno, peso y agua en sus tarjetas de Inicio. Las acciones de pantalla siguen en neutro y el volt queda para el botón de secciones y el primario de las capas.

## Consecuencias

- Registrar comida desde otra sección pasa de dos toques a tres (botón → Nutrición → «+» de la comida). Si se echa de menos, se puede recuperar como acceso en Inicio sin volver a la barra. Se recupera el 2026-10-23 (plan de evolución, paso B6, decisión D1): al pie de la tarjeta de energía, «+ Añadir desayuno» (la comida según la hora) abre Añadir comida en esa comida; es un botón neutro, hermano del de la tarjeta. Víctor descarta «Lo de siempre» (añadir en un toque la combinación que más se repite).
- Inicio pierde el detalle de las tarjetas anchas (los días de la semana con sus anillos, el perfil de la montaña, el trazado de la ruta, la cumbre o llegada de los últimos tres días y lo que vale entrenar hoy); sigue en cada sección. `cumbreReciente` y `llegadaReciente` se retiran con ellas.
- Amigos, Referencias y las cuatro secciones de progreso no tenían «Volver»: se regresaba con la media luna. Desde el 2026-10-22 (plan de evolución, paso B4) Cumbres, Caminos, Ritmo y Vitrina tienen «‹ Inicio» y Referencias vuelve a donde se abrió («‹ Ajustes», «‹ Nutrición» o «‹ Perfil»), con `PageHeader.volver`; al volver, el foco regresa a la tesela o a la fila de origen. Amigos lo recibe en el cruce A-X1 del carril A.
- `data-nav-trigger` es el botón de secciones: el foco vuelve a él al cerrar capas cuyo disparador desapareció.
- `--tab-capsule-height`, `.tab-bar`, `.tab-item` y `.tab-plus` desaparecen; `scripts/ui/navegar.cjs` recorre la media luna. Los recorridos antiguos que medían `.tab-item`/`.tab-plus` (`validar-referencias`, `validar-motion`, `validar-rediseno`) quedan desfasados hasta que se toquen.
- Añadir un destino nuevo: a `DESTINOS` y, si no va en la media luna, a `DENTRO_DE` con su sección (lo exige `navegacion.test.ts`); un séptimo destino en la media luna exige revisar `arco.test.ts` a 320 px.
