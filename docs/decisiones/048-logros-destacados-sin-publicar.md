# ADR 048 · Logros destacados sin publicar y «Editar perfil» aparte de los ajustes

Estado: aceptado, 2026-10-19. Cambia el ADR 044 en un punto (los logros destacados ya no tienen que estar publicados) y sigue el camino del ADR 047 (el avatar de logro ya no lo exigía).

Para destacar un logro en el perfil había que publicarlo antes en el feed, y la hoja de elegir separaba compartidos, conseguidos sin compartir y sin conseguir. Víctor pide que baste con haberlo conseguido, y que «Editar perfil» lleve directamente a lo que ven los demás, con el resto de ajustes aparte:

- **Una medalla en el perfil, no una publicación.** El perfil guarda, de cada logro elegido (hasta tres, distintos), el mismo resumen que una publicación de logro sin nota: identidad, grupo, nivel y requisito de ese nivel (`perfiles.logros_destacados`, 0016). Se calcula en el dispositivo desde la Vitrina, en el nivel más alto alcanzado, y se pone al día al volver a guardar. El servidor valida la forma, como con un logro publicado, pero no comprueba que se haya conseguido.
- **Se ve como la biografía.** Los destacados forman parte del perfil deportivo elegido: los ven quienes pueden ver ese perfil, también desde una comunidad compartida. Antes, en una comunidad solo salían los publicados en ella. La denuncia de un perfil conserva también sus nombres.
- **Desbloqueados y por desbloquear.** La hoja ofrece los logros conseguidos de la Vitrina y enseña, solo para ver, los que faltan. Con la Vitrina oculta en Ajustes solo quedan los ya destacados, para poder quitarlos.
- **«Editar perfil» y «…».** En tu perfil, «Editar perfil» (la acción principal) abre avatar, biografía, disciplinas y logros destacados con «Así te ven» y se cierra al guardar. El «…» de la misma página (y el engranaje de Amigos) abre «Ajustes del perfil»: alias y nombre, código de invitación, personas bloqueadas y silenciadas, comunidades creadas y borrar el perfil.

Lo destacado antes (publicaciones) pasa a la columna nueva al ejecutar 0016. Los clientes anteriores siguen leyendo la lista de publicaciones hasta que la persona guarda su perfil con el cliente nuevo.

Implementación y flujos: [Social](../features/social.md#perfiles-y-relaciones).
