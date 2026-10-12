# ADR 038 — Insignias topográficas de ligas y logros

Fecha: 2026-10-13. Estado: aceptada.

## Contexto

Víctor quiere iconos diferentes para reconocer las ligas en Progreso y los logros en Vitrina. Tras ver alternativas de expedición, elige una familia topográfica, aprueba seis ligas con un hexágono común y pide que cada sección de logros tenga una forma distinta. Aprueba los ejemplos de los 18 logros y solicita integrarlos. Antes de publicar, master incorpora 55 logros, Caminos y las ligas Zafiro/Rubí sin divisiones; se adapta la familia a ese catálogo conservando las reglas y la rejilla con detalle.

## Decisión

Implementar arte SVG local con una base compartida de doble borde y curvas de nivel. Bosque, salvia, arcilla y marfil pertenecen solo al arte de las insignias, en tokens independientes e iguales en ambos temas. Cada rango tiene su símbolo; el texto conserva los nombres y las semanas del modelo actual sin divisiones. Los logros mantienen el mismo símbolo entre niveles y distinguen la sección mediante escudo/círculo/triángulo/placa horizontal/cuadrado redondeado/rombo. Caminos usa una placa de ruta horizontal, manteniendo el hexágono reservado a las ligas. Los ocultos sin conseguir muestran todos el mismo candado; el símbolo específico ni siquiera se monta en su SVG. Los pendientes son neutros y los conseguidos tienen color.

La base vive en `shared/components/InsigniaExpedicion`; los símbolos y su selección pertenecen a cada feature. El código SVG adapta los bocetos aprobados a tamaños de interfaz, sin recortar láminas con rótulos ni depender de imágenes generadas en ejecución. Nombre, nivel/división, estado y progreso siguen siendo texto accesible; el SVG es decorativo.

## Consecuencias

Se distinguen categoría y rango sin depender solo del color. El arte escala con el texto, funciona offline y no añade servicios ni dependencias. Los recortes SVG tienen ids únicos por instancia. Añadir un logro exige completar su identidad `IdLogro` y su símbolo; la familia puede evolucionar sin tocar registros, reglas de gamificación o backup. Los detalles topográficos se mantienen secundarios para que el pictograma se reconozca también a 40 px.
