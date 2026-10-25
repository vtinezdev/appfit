# Sesión 10 — Qué hicimos y por qué

Empezaste preguntando qué haría falta para una parte social tipo Strava y si se podía hacer gratis. Sí: con el mismo Supabase que ya usas para la copia, en el plan gratuito. Medimos tus copias cifradas (la más grande ocupa 20 kB), así que caben miles de personas antes de tener que pagar.

## Qué notarás al usar la app

- **En la barra de abajo hay una pestaña nueva, «Social»**: lo que publican las personas que sigues y lo tuyo («Siguiendo» y «Tú»). Puedes dar «ánimo» (la llama) y comentar. «Avisos» te dice quién ha comentado o te ha dado ánimo.
- **En «Más» está «Amigos»**: tu perfil (alias y nombre), tu código de invitación, las solicitudes, a quién sigues, quién te sigue y buscar a alguien por su alias o su código. Para que alguien vea lo que publicas, tienes que aceptarle.
- **Al terminar un entreno** (y en el detalle de un entreno o de una actividad) aparece «Compartir»: ves exactamente lo que se va a publicar y lo publicas si quieres. Nunca se comparten tu nutrición, tu peso, tus medidas ni el recorrido GPS.
- **En Inicio** sale una banda cuando tienes solicitudes o comentarios nuevos.
- **La cuenta ya no obliga a crear la copia cifrada**: puedes entrar solo para lo social y activar la copia cuando quieras.
- Para no llenar el espacio gratuito, la copia anterior de cada cuenta se borra a los 7 días y las cuentas sin usar en 12 meses se borran solas (los datos del móvil no se tocan).

## Por qué así

- Todo lo social pasa por funciones del servidor que comprueban quién eres: nadie puede leer lo que no le toca, aunque intente saltarse la app. Lo comprobamos con un script de pruebas que ejecutaste en Supabase.
- La reacción se llama «Ánimo» de forma provisional para no copiar los «kudos» de Strava; cambiarle el nombre es tocar una sola línea.

## Pendiente

- Antes de abrirlo a desconocidos: condiciones de uso, política de privacidad (consentimiento, 16 años) y la ficha de datos de Google Play, revisadas por alguien que sepa de protección de datos. Y probarlo en el iPhone y en Android.
- Lo siguiente que quieres: mejorar el perfil, compartir logros sueltos, crear publicaciones a mano y comunidades donde la gente pueda hablar sin seguirse.
