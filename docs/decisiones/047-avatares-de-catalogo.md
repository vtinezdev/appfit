# ADR 047 · Avatares de catálogo en Social

Estado: aceptado, 2026-10-19. Amplía el ADR 045 (el avatar deja de ser solo monograma o logro publicado) sin cambiar su contrato de privacidad: siguen sin subirse imágenes.

Con el monograma en grafito, dos personas con las mismas iniciales tienen la misma cara, y en una fila de ánimos no se sabe quién es quién. Víctor descarta las fotos de perfil (moderación de imágenes, datos biométricos, almacenamiento y revisión legal pendiente antes de abrir la app a desconocidos) y elige, entre cinco estilos maquetados (disciplinas, tramas, paisajes, mascotas y color con iniciales) y tres maneras de juntar los dos que le gustan, la siguiente:

- **Tres colecciones en un catálogo.** Disciplinas (diez pictogramas de línea sobre un fondo que elige la persona entre seis tonos de la paleta de la Vitrina, con sus curvas de nivel), paisajes (ocho escenas planas con la misma paleta) y logros de la Vitrina (su insignia). Todo comparte paleta y tinta, así que se ve como una sola familia junto a las insignias.
- **Se desbloquean.** Las disciplinas y sus colores están disponibles desde el principio. Cada paisaje se gana con el primer nivel de un logro concreto de la Vitrina (la Cumbre con la primera cumbre, la Pista con 10 km corriendo…). Los logros, cuando se consiguen, publicados o no. La hoja enseña también lo bloqueado y qué pide.
- **Solo un identificador.** El servidor guarda `disciplina.<id>.<tono>`, `paisaje.<id>` o `logro.<grupo>.<id>` (0015), con formato validado y sin lista cerrada: un identificador que una versión no conozca se pinta como el monograma. Como el desbloqueo vive en el dispositivo, el servidor no lo comprueba, igual que no comprueba el contenido de un logro publicado.
- **Se ve como el nombre.** El avatar de catálogo se lee donde se lea el alias (sin bloqueo ni suspensión), también en comunidades, porque no revela más que lo que la persona elige enseñar. El logro publicado que se eligiera antes (0012/0014) se sigue viendo, con la visibilidad de su publicación, hasta que se elige uno del catálogo.
- **Se elige en una hoja.** En Editar perfil, la cara actual y «Cambiar avatar» abren la hoja «Avatar» con las pestañas Paisajes · Disciplinas · Logros. Se guarda con «Guardar perfil», como el resto del perfil.

El color lo elige cada persona; sigue sin haber un color asignado automáticamente a cada una. Las comunidades conservan su monograma en un cuadrado invertido.

Implementación y flujos: [Social](../features/social.md#avatar); piezas visuales: [DESIGN-SYSTEM](../DESIGN-SYSTEM.md).
