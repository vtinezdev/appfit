# Sesión 09 — Qué hicimos y por qué

Empezaste preguntando cómo cuenta un café con leche en el agua. Respuesta: no cuenta. El agua va aparte del registro de comida, así que las bebidas se apuntan a mano en la tarjeta de agua. Lo que la app descuenta del objetivo es solo el agua de lo que comes (fruta, sopa, yogur…), no la de lo que bebes. En lugar de cambiar eso, pediste que **cada alimento tenga una categoría**, y ahora la tiene.

## Qué notarás al usar la app

- **Al crear un alimento hay que elegir su categoría** (Carnes, Frutas, Bebidas…). Son las mismas 29 que ya usaba el catálogo. En una receta se propone «Platos preparados». Si al añadir comida escribes algo que no existe y la app va a crear un alimento nuevo, también te la pide.
- **Cada alimento lleva un icono** con su categoría: en Alimentos, en el Diario, al buscar y al revisar lo que vas a guardar. Si pulsas el icono, ves el nombre de la categoría.
- **Tus alimentos antiguos** aparecen con un icono de alerta. Arriba de la lista sale «N alimentos sin categoría» con un botón «Revisar»: abres cada uno, eliges la categoría y desaparece de la lista.
- **En Alimentos puedes filtrar por categoría.**
- **En el Resumen hay un apartado «Por categoría»**: cuántas calorías (y qué porcentaje) y cuánta proteína vienen de cada categoría en la semana o el mes.

## Por qué así

- Los iconos son dibujos propios y no emojis, porque los emojis se ven distintos en cada móvil y las reglas de diseño de la app no los permiten. Hay 15 iconos para las 29 categorías (por ejemplo, leche, yogur y queso comparten el del brik) para que se distingan bien en pequeño.
- La categoría no se queda congelada en cada comida registrada: cuando clasificas un alimento antiguo, todo su historial pasa a contar en esa categoría. Por eso el Resumen sirve desde el primer día.
- Los productos escaneados también se clasifican solos. Los que habías escaneado antes se clasificarán la próxima vez que los escanees con conexión.

## Pendiente

- Probarlo en el iPhone (y en el navegador del ordenador): en esta sesión no hubo forma de abrir la app automáticamente, solo pasaron los tests. Fíjate sobre todo en el Diario en pantalla pequeña, donde los iconos ocupan algo de ancho.
- Revisar en Cloudflare por qué falló el build de la rama (el de la versión publicada salió bien).
- Ideas para más adelante: filtrar por categoría también en el buscador de Añadir comida y poder cambiar la categoría de un alimento del catálogo.
