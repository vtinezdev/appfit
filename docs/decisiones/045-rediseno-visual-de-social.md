# ADR 045 · Rediseño visual de Social

Estado: aceptado, 2026-10-18. Amplía ADR 040, 041 y 044 sin cambiar su contrato de privacidad.

Víctor pide mejorar el diseño de Social y hacerlo más fácil de usar. Se le presenta una propuesta con maquetas sobre los tokens reales (antes/después, siete pantallas y dieciséis propuestas inspiradas en Strava, Hevy, Instagram/Threads, Gentler Streak y guías de centros de avisos) y elige quince: todas salvo convertir los primeros pasos en lista. Decide también la propuesta que dependía de él: la pestaña «Tú» pasa a la página de tu perfil.

Decisiones:

- **Cabecera de iconos.** Avisos (campana con un contador neutro de novedades + solicitudes), Amigos y tu avatar (Tu perfil) como botones de 44 px en la cabecera. Desaparecen la fila «Tu perfil» y los botones de texto «Crear publicación» y «Avisos».
- **Siguiendo · Comunidades.** Tus publicaciones se ven en tu perfil, la misma página que ven los demás, con «Editar perfil» para los ajustes de siempre.
- **Avatar sin archivos ni colores por persona.** Monograma en grafito o la insignia del logro elegido (ADR 044). Ampliado por el [ADR 047](047-avatares-de-catalogo.md): catálogo de disciplinas, paisajes y logros, con el color que elige cada persona. Las comunidades llevan su monograma en un cuadrado invertido para no confundirlas con personas. No se crea una paleta.
- **Compositor con sugerencia.** Arriba del feed, escribir algo y, si lo último registrado (entreno o actividad de los últimos siete días) no está compartido, compartirlo con sus cifras. Abre el mismo editor con vista previa y solo la copia para seguidores marca el registro.
- **Tarjeta compacta.** Una línea de identidad («Entreno · hace 2 h»), cifras con filetes, el mapa muscular en miniatura a la vista cuando el autor lo comparte (el «mapa» del gimnasio), récords en una franja, el logro como medalla sobre curvas de nivel, ánimo y comentarios como icono con cifra y la vista previa del último comentario.
- **Sin botón «Actualizar».** La comprobación al volver a la app se mantiene, volver a tocar «Siguiendo» comprueba a demanda y las novedades aparecen en una píldora fija que no mueve la lectura. Sigue sin haber sondeo.
- **Avisos por día.** Solicitudes arriba con Aceptar/Rechazar en su fila; después Hoy, Esta semana y Antes, con la cara y el tipo de aviso.
- **Menos botones sueltos.** Persona y comunidad dejan a la vista solo la acción principal; lo demás (dejar de seguir, quitar, denunciar, bloquear, editar, gestionar, salir, borrar) va en «Más acciones».

Para la insignia en el feed y la vista previa del comentario se añaden dos lecturas en 0014 (`avatares_social`, `ultimos_comentarios`), con la misma visibilidad que `perfil_deportivo` y `comentarios_pagina`. Son aditivas: el cliente funciona sin ellas (monograma y sin vista previa), así que la migración puede ejecutarse antes o después de publicar el cliente. Las caras de quién te animó salen de la lectura que ya existía, solo para el autor.

Se descartan, por chocar con decisiones previas: clasificaciones entre amigos, fotos subidas, doble toque como única forma de animar, contadores animados o confeti, sugerencias de desconocidos y un color por persona.

Implementación y flujos: [Social](../features/social.md); piezas visuales: [DESIGN-SYSTEM](../DESIGN-SYSTEM.md#publicaciones-sociales-y-comunidades).
