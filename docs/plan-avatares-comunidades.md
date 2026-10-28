# Imagen de cada comunidad (punto 23)

Estado: implementación integrada sobre `origin/master` `1944461` (PR #183), 2026-10-28. Sustituye el handoff anterior; las preferencias visuales y los 36 lugares se aprobaron en la conversación con Víctor.

El catálogo usa los ID estables `lugar.<slug>` preparados con las imágenes. Se conserva el primitive `Avatar`; `ImagenComunidad` mantiene el recorte cuadrado sin afectar a los avatares de personas. Se elige al crear y desde «Más acciones» por el creador; todas las opciones están disponibles, con iniciales como alternativa.

Fuentes de verdad: [Social](features/social.md#imagen-de-la-comunidad), [ADR 062](decisiones/062-imagen-de-comunidad.md) y [recursos](../scripts/comunidades/README.md). La migración es [0028](../supabase/migrations/0028_comunidades_imagen.sql), después de 0027, que ya estaba confirmada en el servidor. **0028 confirmada por Víctor en Supabase real el 2026-10-28, con seis comprobaciones en `true`.** El cliente conserva la compatibilidad con servidores sin la migración.

Pruebas: `npm run test`, `npm run build`, `node scripts/sql/validar-social.mjs` y `node scripts/ui/validar-imagenes-comunidades.cjs`. El último recorrido usa únicamente `appfit-test.localhost` y Supabase falso y captura lista, portada, selector y creación. La migración real la ejecutó Víctor; el cliente se publica mediante PR a `master` y el build de Cloudflare.
