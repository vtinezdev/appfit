# ADR 050 · Seguimiento mutuo al aceptar una solicitud

Estado: aceptado, 2026-10-19. Cambia el ADR 040 en un punto: aceptar una solicitud ya no crea solo el seguimiento de quien la pidió.

Hasta ahora, para seguirse los dos, cada persona tenía que pedir seguir a la otra y esperar a que la aceptara. Víctor quiere que baste con una solicitud: cuando una persona pide seguir a otra y esta acepta, quedan como seguidores mutuos.

- **Pedir seguir es también aceptar que te sigan.** Al aceptar, el servidor (`responder_solicitud`, 0018) crea el sentido contrario ya aceptado, sin solicitud. Quien pide lo sabe antes de hacerlo («Cuando te acepte, os seguiréis los dos»), y quien acepta, antes de aceptar. Se mantiene que nadie ve las publicaciones de otra persona sin que esta lo haya decidido: con la solicitud o con la aceptación.
- **Solicitudes cruzadas.** Si las dos personas se habían pedido seguir, aceptar una acepta también la otra. Quien acepta no recibe el aviso «aceptó tu solicitud», porque la decisión es suya.
- **Después, cada sentido es independiente.** Dejar de seguir y quitar de seguidores rompen solo el suyo, como antes; no hay un modelo de «amistad» simétrica. Así nadie pierde a quien quiere seguir viendo por una decisión de la otra persona.
- **Solo desde ahora.** Las relaciones de un solo sentido que ya existían no se completan: nadie empieza a ver publicaciones de alguien sin haberlo decidido.

Descartado: romper la relación en los dos sentidos al dejar de seguir y convertir en mutuas las relaciones existentes.

Implementación y flujos: [Social](../features/social.md).
