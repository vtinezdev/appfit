# ADR 049 · Administración de Social desde la app

Estado: aceptado, 2026-10-19. Amplía la moderación manual del ADR 040/044: sigue habiendo revisión humana y no hay ocultación automática, pero ya no hace falta el SQL Editor para actuar.

Víctor, como creador de la app, quiere un perfil con más permisos que el resto: borrar comentarios y publicaciones de cualquiera, suspender perfiles y meter y sacar a gente de las comunidades, con esas opciones visibles solo para él.

- **Un rol en el servidor, no en el cliente.** `public.administradores` (0017) guarda quién lo es; se nombra a mano en el SQL Editor, nunca desde la app. Cada RPC comprueba el rol con `auth.uid()`; el cliente solo pregunta `soy_admin()` para decidir qué enseñar. Para quien no lo es, las funciones de administración responden `no_encontrado`, como cualquier cosa que no puede ver.
- **Lo que ve más lo denunciado, sin leer lo privado.** El administrador no tiene un feed global: actúa sobre lo que ya ve (feed, comunidades, comentarios, perfiles) y sobre lo denunciado en el panel «Moderación», que muestra lo que se guardó al denunciar y, si sigue existiendo, su estado actual. Así se mantiene la promesa de que una publicación solo la ven sus seguidores o su comunidad. El servidor sí le deja borrar cualquier publicación o comentario por su id.
- **Moderador de todas las comunidades.** Puede gestionarlas sin ser miembro, retirar contenido y expulsar (también a moderadores, como el creador), pero no cambia reglas, ni nombra moderadores, ni transfiere: eso sigue siendo del creador.
- **Añadir sin pedir permiso, con aviso.** Meter a alguien en una comunidad le hace miembro al momento y le llega el aviso «X te añadió a la comunidad Y» (`miembros_comunidad.anadido_por`); puede salir cuando quiera. No se añade a quien tiene bloqueado al creador o al administrador.
- **Suspender es duradero.** Se reutiliza `perfiles.suspendido` (todo lo de esa persona deja de verse) y se anota en `vetados`, que sobrevive a borrar el perfil: con esa cuenta no se puede crear otro. Readmitir quita ambas marcas. No se puede suspender a un administrador ni a uno mismo.
- **Sin UUID de personas.** Las acciones viajan con alias e ids de denuncia; el panel agrupa las denuncias por objetivo y resolver una resuelve todas las de lo mismo.

Descartado por ahora: feed global y avisar a la persona suspendida.

**Actualización (2026-10-23, A22, migración 0026):** Víctor aprueba suspender o cerrar desde el panel una comunidad denunciada (suspender se deshace desde Suspendidos) y avisar a quien denunció, sin detalles («Revisamos tu denuncia y hemos actuado»), cuando se actúa; descartar no avisa.

Implementación y flujos: [Social](../features/social.md#administración).
