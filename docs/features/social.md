# Social y Amigos

`src/features/social/`. Social reúne publicaciones elegidas, ánimos, comentarios, avisos y comunidades; Amigos reúne seguimientos y solicitudes. Requiere cuenta y conexión, pero no activar la copia cifrada. Sin Supabase configurado no aparece. Decisiones: [ADR 040](../decisiones/040-parte-social.md), [041](../decisiones/041-publicaciones-y-comunidades.md) y [044](../decisiones/044-control-social-y-compatibilidad.md). Alcance y decisiones de las mejoras: [social-mejoras.md](../social-mejoras.md).

**Estado del servidor:** Víctor confirmó 0003–0005 el 2026-10-15 y 0006–0008 el 2026-10-16. El 2026-10-18 confirma la ejecución correcta de **0009–0013**, una por una en el SQL Editor del proyecto real, antes de publicar este cliente. `campos_opcionales` permanece desactivado. Las seis suites SQL se han probado en PostgreSQL aislado; las pruebas con cuentas reales y dispositivos físicos siguen pendientes.

## Código y datos

| Pieza | Dónde |
|---|---|
| Contrato y RPC | `data/social.ts`, `data/socialSupabase.ts`, `servicio.ts` |
| Validación y construcción de resúmenes v1 | `lib/publicacion.ts` |
| Selección explícita de lo compartido | `lib/seleccion.ts`, `components/SeleccionPublicacion` |
| Récords públicos, agrupación y formato | `lib/records.ts`, `components/RecordsPublicacion` |
| Lectores de páginas, comentarios y avisos | `lib/feed.ts`; textos de reacción en `lib/reaccion.ts` |
| Editor para los cuatro tipos y ambos destinos | `components/CrearPublicacion`, `NotaPublicacion`; `Publicar` abre el editor desde entrenos/actividades y gestiona su marca local |
| Tarjeta y acciones | `TarjetaPublicacion`, `PublicacionFeed`, `AnimosPublicacion`, `FormDenuncia` |
| Listas, comentarios y avisos | `ListaFeed`, `ComentariosSheet`, `AvisosSheet`, `AvisoAmigos`, `hooks/useConsulta` |
| Identidad y relaciones | `PublicacionesPersona` carga la persona y compone `PersonaSheet` como página; `PerfilDeportivo`, `EditarPerfilDeportivo`, `PerfilSheet` |
| Primeros pasos | `PrimerosPasosSocial`; preferencia existente `Settings.pistasVistas` |
| Comunidades | `Comunidades`, `GestionarComunidad`, `lib/comunidad.ts` |
| Borrado y marcas locales | `data/publicacionesRepo.ts`, `gym/data/workoutsRepo`, `actividades/data/actividadesRepo` |

Solo los repositorios tocan Dexie. Las tablas sociales están en Supabase, con RLS y sin acceso directo para clientes. Las operaciones pasan por RPC `security definer`, `search_path = ''`, `auth.uid()` y comprobaciones de perfil, bloqueo, suspensión y audiencia. Los ayudantes privados no tienen permiso de ejecución para clientes. Viajan alias y UUID de publicaciones, comentarios, comunidades y reacciones; **no UUID de usuarios**.

El diario, los recorridos GPS, la nutrición, el peso corporal y las medidas siguen en el dispositivo. La copia opcional de cuenta sigue cifrada. No hay imágenes subidas, analítica, sondeo continuo ni servicio externo añadido.

## Perfiles y relaciones

El alias es exacto, único, de 3–20 caracteres (`a-z`, números, punto y guion bajo), sin punto inicial/final; el nombre es opcional, hasta 40. Se confirma tener al menos 16 años al crear el perfil. El código revocable tiene ocho cifras hexadecimales y se acepta con/sin guion. No hay sugerencias abiertas de desconocidos.

Seguir requiere aprobación; cancelar, dejar de seguir y quitar seguidores siguen disponibles. Bloquear elimina ambos seguimientos, impide verse y no avisa al bloqueado. Silenciar solo retira a esa persona de Siguiendo: conserva seguimiento y acceso explícito, y se deshace en Tu perfil › Personas silenciadas. Las comunidades mantienen su audiencia independiente.

El perfil deportivo contiene solo biografía elegida (160 caracteres), hasta tres disciplinas y hasta tres logros propios ya publicados. El avatar es el monograma o la insignia de un logro propio publicado; no se suben imágenes. «Así te ven tus seguidores aprobados» previsualiza la selección. Las cifras se rotulan como publicaciones compartidas, no como historial total. Desde una comunidad, los logros/avatar privados de seguidores no se muestran aunque el visitante siga al autor. La denuncia de perfil conserva también biografía y disciplinas.

Borrar el perfil exige **transferir o cerrar primero sus comunidades**. Tu perfil permite cerrar las comunidades propias también estando suspendido, con inventario exclusivo y confirmación de cascada, sin recuperar acceso al feed. Después elimina relaciones, publicaciones y membresías, conservando cuenta y diario. La eliminación completa de cuenta y el mantenimiento administrativo conservan su cascada anterior, explicada en el flujo de Cuenta; esta implementación cambia la API explícita de borrar perfil.

<a id="publicaciones-libres-logros-y-comunidades"></a>

## Publicaciones

Cuatro tipos, siempre por decisión de la persona y con vista previa:

- Texto de hasta 2.000 caracteres, con párrafos y sin título genérico en la tarjeta.
- Entreno: título, series, duración y volumen, ejercicios efectivos en su orden (hasta 15), récords, ligas destacadas, piezas de Vitrina (hasta seis por lista) y mapa opcional de doce zonas con niveles enteros 0–5.
- Actividad: caminar, correr o senderismo; título, duración, distancia y desnivel, sin recorrido.
- Logro alcanzado de Vitrina: identidad, grupo, nivel y requisito del nivel conseguido. No se publica automáticamente ni se envía el siguiente objetivo.

Entrenos, actividades y logros admiten nota opcional de 280 caracteres, sin edición posterior. Cada copia tiene su propia nota. El compositor permite elegir audiencia, mapa, ejercicios, récords concretos, ligas y Vitrina. Los récords principales de cada ejercicio se seleccionan por defecto. La vista previa muestra todo el envío y recuerda que cambiar el diario no actualiza la publicación.

El UUID de envío se conserva al reintentar el mismo contenido/destino. Cambiar contenido o audiencia genera otro intento; el servidor nunca cambia una publicación previa reutilizando su UUID. Seguidores y comunidad son copias independientes. Solo la publicación para seguidores anota `Workout.publicacion`/`Actividad.publicacion`; copiar en una comunidad no pisa esa marca.

**Compatibilidad:** sigue `v: 1`. Nota, metadatos de récord y totales son opcionales. Los lectores antiguos ignoran esos campos adicionales. Omitir duración/volumen requiere una secuencia distinta porque los lectores antiguos los exigen: 0013 instala el lector nuevo y deja `social_configuracion.campos_opcionales = false`. El compositor no ofrece esos interruptores y el servidor rechaza la omisión hasta completar la actualización de los lectores. Solo entonces el administrador activa:

```sql
update public.social_configuracion set campos_opcionales = true where id;
```

El campo omitido se elimina del JSON, sin enviarlo oculto ni sustituirlo por cero. Cero real sigue siendo cero. No activar la opción durante el primer despliegue. El servidor valida claves permitidas, tipos, listas, mapa, nota y cifras; límite global de resumen 8 KB.

### Récords

Progreso conserva su cálculo y todos sus récords. Social excluye nuevos 1RM estimados y récords de repeticiones a pesos menores dentro de la misma variante/modo. Orden principal: peso/lastre, reps al mayor peso, menos asistencia, 1RM de publicaciones antiguas. Se guarda primero un récord de cada ejercicio y luego los secundarios, con total de récords/ejercicios antes del corte de seis.

Los campos estructurados son `tipo`, `modo`, `valor`, `anterior`, `peso?`, `variante?`; se conserva `{ejercicio,texto}` para lectores anteriores. Se formatea con coma decimal y mejora. Los registros antiguos se agrupan por nombre sin intentar extraer cifras de su texto. El compositor puede seleccionar los récords disponibles; al hacerlo, los totales describen la selección publicada.

## Feed, interacción y avisos

El feed ordena por publicación (`creada`), no por fecha de sesión. La cabecera lleva `<time>` con fecha completa accesible y texto relativo; la fecha del entreno/actividad aparece si fue otro día. El logro conserva su día real de obtención.

La tarjeta muestra rótulo, título, nota, métricas y récord principal. Ejercicios, mapa, detalle de récords, ligas y Vitrina están bajo «Ver detalle»; el mapa no se monta hasta abrirlo. Texto y notas largos tienen «Más». La vista previa queda desplegada.

Páginas de veinte con cursor compuesto `(creada,id)` sobre la última fila **cruda**, aun si el lector descarta su resumen. Una página completamente desconocida avanza automáticamente; los descartes muestran un aviso de actualización. Se conservan las firmas SQL anteriores. «Actualizar» comprueba novedades y las incorpora al tocar la banda; conserva la posición de la publicación anterior. Al recuperar visibilidad se comprueba como mucho una vez por minuto, sin intervalos de sondeo. Los avisos también se releen al volver.

«Ánimo · N» / «Animado · N» mantienen icono, estado pulsado y reversión si falla la red. Solo el autor puede consultar identidades, mediante RPC paginada de reacciones. Los demás ven solo el recuento. «Más acciones» abre un Sheet: borrar lo propio, denunciar o silenciar lo ajeno; el moderador de comunidad puede retirar contenido. Los borrados de publicación **siempre** piden confirmación, también desde el detalle. El reintento tolera una respuesta perdida y limpia exclusivamente la marca local de ese UUID; nunca borra series ni el diario.

Comentarios de hasta 500 caracteres, cuota de 100 al día. Se cargan los últimos veinte y «Ver comentarios anteriores», ordenados cronológicamente en pantalla, con cursor `(creado,id)`. El total procede del servidor, no del tamaño cargado. Las respuestas se dirigen a un comentario raíz, con un solo nivel. Salir de una comunidad, bloquear o suspender revoca los mismos accesos que en publicaciones. Borrar un comentario propio ofrece Deshacer (nuevo comentario con la hora actual); borrar uno ajeno en una publicación propia o moderada requiere confirmación.

Avisos: ánimo/comentario en lo propio, respuesta directa, solicitud aceptada y nueva publicación del creador en una comunidad de anuncios. Se agrupan por tipo/publicación y personas; las solicitudes se muestran arriba. El contador de nuevos considera todos los eventos visibles, aunque la lista muestre treinta grupos. Tocar una aceptación abre la persona; el resto abre los comentarios con la autoría adecuada. Error, desconexión y vacío son estados distintos, con reintento; Inicio tampoco oculta silenciosamente un fallo de lectura. No hay suscripción automática a todo un hilo.

Cuotas existentes: 50 solicitudes, 30 publicaciones, 100 comentarios, 20 denuncias y cinco comunidades creadas por persona/día. Publicaciones a seguidores y comunidades comparten cuota.

<a id="comunidades-donde-solo-publica-su-creador"></a>
<a id="editar-la-descripción-de-una-comunidad"></a>

## Pantallas y comunidades

Social permite crear el perfil en el mismo contexto. Cabecera: Amigos, Tu perfil, Crear publicación y una entrada de Avisos con solicitudes. Los primeros pasos abren Añadir para compartir código, Descubrir comunidades y el último entreno real (o Entreno si falta). Se marcan según seguidores, membresía y publicación local. Se pueden cerrar; se guarda `social-primeros-pasos` en `pistasVistas`, sin esquema nuevo ni escritura de entrenamiento.

Amigos usa «Sigues / Te siguen / Añadir». Nombre de persona en Amigos, feed y comunidades abre una página común con identidad y acciones de relación. La vuelta dice el origen y conserva la pantalla subyacente. En contexto de comunidad la lista de publicaciones se consulta con una RPC específica, limitada a ese grupo.

Comunidades sigue separado de Siguiendo. Nombre único (3–60), descripción hasta 300 editable por su creador, reglas hasta 1.000 y bienvenida hasta 500 fijadas en el detalle, también antes de unirse. Listado con «N nuevas» desde última visita, filtrado por bloqueos y suspensiones. Unirse permite leer sin seguir a sus miembros; salir revoca lectura e interacción. Bloquear al creador sigue ocultando su comunidad, como antes.

La política «Todos los miembros» / «Solo creador» se fija al crear; los miembros siempre pueden comentar y dar ánimo. El creador puede nombrar/revocar moderadores, transferir a un miembro activo o cerrar la comunidad. Los moderadores retiran publicaciones/comentarios y expulsan miembros; no transfieren ni cambian reglas. La expulsión quita la membresía actual; no constituye una prohibición permanente de volver a unirse. Un moderador no expulsa a otro moderador. El creador no puede salir sin transferir o cerrar.

Denuncias continúan con revisión manual, sin ocultación por umbral ni aviso al denunciado. Gestión administrativa: consultar `denuncias where revisada is null`; suspender perfil/comunidad; marcar `revisada`. Antes de abrir a desconocidos siguen pendientes las condiciones, privacidad y revisión legal de las fases originales.

## SQL y verificación

| Migración | Cambio |
|---|---|
| 0009 | Cursores compuestos, comentarios paginados/total, validación cerrada y publicaciones de persona en comunidad |
| 0010 | Respuestas, avisos ampliados, identidades de ánimo privadas, silencios y novedades de comunidades |
| 0011 | Moderadores, transferencia, reglas/bienvenida y requisito previo al borrado de perfil |
| 0012 | Perfil deportivo elegido y snapshot de denuncia |
| 0013 | Lector de cifras opcionales y activación posterior de su escritura |

`node scripts/sql/validar-social.mjs` crea PostgreSQL 17 efímero en Docker, carga las trece migraciones y las seis suites, y elimina el contenedor. Sustituye solo `auth.users`/`auth.uid()` y omite la programación pg_cron de 0002: no valida correo ni tareas de mantenimiento. Las suites nuevas `mejoras_social.sql` y `social_conversacion_control.sql` también se pueden ejecutar en SQL Editor y revierten sus usuarios sintéticos con `PRUEBAS_OK`.

Tests puros y de contrato en `social/lib` y `data/socialSupabase.test.ts`. `scripts/ui/validar-social.cjs` usa únicamente `appfit-test.localhost:5174` y Supabase falso en 54329; prueba 320/375/430 px, ambos temas y texto al 200 %, composición, notas por copia, mapa plegado, borrado/cancelación/reintento, borrador con Escape/Cerrar/fondo/Atrás, errores de avisos, refresco y paginación de 250 comentarios/páginas desconocidas.

Siguen pendientes las tareas con 6–8 personas, dos cuentas reales e iPhone/Android físicos; recorrido y condiciones de despliegue en [validación](../pruebas/social-mejoras.md). Las apuestas de fase 3, filtros por tipo sin datos de volumen, ocultación automática y push no se activan con esta entrega.
