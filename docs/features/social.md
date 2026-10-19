# Social y Amigos

`src/features/social/`. Social reúne publicaciones elegidas, ánimos, comentarios, avisos y comunidades; Amigos reúne seguimientos y solicitudes. Requiere cuenta y conexión, pero no activar la copia cifrada. Sin Supabase configurado no aparece. Decisiones: [ADR 040](../decisiones/040-parte-social.md), [041](../decisiones/041-publicaciones-y-comunidades.md), [044](../decisiones/044-control-social-y-compatibilidad.md) y [045](../decisiones/045-rediseno-visual-de-social.md) (rediseño visual). Alcance y decisiones de las mejoras: [social-mejoras.md](../social-mejoras.md).

**Estado del servidor:** Víctor confirmó 0003–0005 el 2026-10-15 y 0006–0008 el 2026-10-16. El 2026-10-18 confirma la ejecución correcta de **0009–0013**, una por una en el SQL Editor del proyecto real, antes de publicar este cliente. El mismo día confirma también **0014** (rediseño: avatares y vista previa del último comentario) con «Success. No rows returned». Es aditiva: un cliente sin ella sigue funcionando con monograma y sin vista previa. `campos_opcionales` permanece desactivado. Las siete suites SQL se han probado en PostgreSQL aislado (la de 0014, en PGlite); las pruebas con cuentas reales y dispositivos físicos siguen pendientes.

## Código y datos

| Pieza | Dónde |
|---|---|
| Contrato y RPC | `data/social.ts`, `data/socialSupabase.ts`, `servicio.ts` |
| Validación y construcción de resúmenes v1 | `lib/publicacion.ts` |
| Selección explícita de lo compartido | `lib/seleccion.ts`, `components/SeleccionPublicacion` |
| Récords públicos, agrupación y formato | `lib/records.ts`, `components/RecordsPublicacion` |
| Lectores de páginas, comentarios, avisos, avatares y vistas previas | `lib/feed.ts`; textos de reacción en `lib/reaccion.ts` |
| Presentación: etiqueta («Entreno · hace 2 h»), lo más trabajado, avisos por día, hilos de comentarios y qué sugerir compartir | `lib/presentacion.ts` |
| Editor para los cuatro tipos y ambos destinos | `components/CrearPublicacion`, `NotaPublicacion`; `Publicar` abre el editor desde entrenos/actividades y `Compositor`, arriba del feed, con el último entreno o actividad sin compartir (`gym/hooks/useResumenEntreno`, compartido con `PublicarEntreno`); ambos gestionan la marca local |
| Tarjeta y acciones | `TarjetaPublicacion`, `PublicacionFeed`, `RecordsPublicacion`, `AnimosPublicacion`, `FormDenuncia` |
| Avatares | `AvatarPersona` (sobre el primitive `Avatar`) y `hooks/useAvatares` (una lectura por lista, recordada mientras la app está abierta) |
| Listas, comentarios y avisos | `ListaFeed`, `ComentariosSheet`, `AvisosSheet`, `AvisoAmigos`, `hooks/useConsulta` |
| Identidad y relaciones | `PublicacionesPersona` carga la persona y abre `PaginaPersona`; tu perfil en `MiPerfilPagina`; `PerfilDeportivo` (`CabeceraPerfil`, `MedallaPublicada`), `EditarPerfilDeportivo`, `ElegirDestacados`, `PerfilSheet` |
| Primeros pasos | `PrimerosPasosSocial`; preferencia existente `Settings.pistasVistas` |
| Comunidades | `Comunidades`, `GestionarComunidad`, `lib/comunidad.ts` |
| Borrado y marcas locales | `data/publicacionesRepo.ts`, `gym/data/workoutsRepo`, `actividades/data/actividadesRepo` |

Solo los repositorios tocan Dexie. Las tablas sociales están en Supabase, con RLS y sin acceso directo para clientes. Las operaciones pasan por RPC `security definer`, `search_path = ''`, `auth.uid()` y comprobaciones de perfil, bloqueo, suspensión y audiencia. Los ayudantes privados no tienen permiso de ejecución para clientes. Viajan alias y UUID de publicaciones, comentarios, comunidades y reacciones; **no UUID de usuarios**.

El diario, los recorridos GPS, la nutrición, el peso corporal y las medidas siguen en el dispositivo. La copia opcional de cuenta sigue cifrada. No hay imágenes subidas, analítica, sondeo continuo ni servicio externo añadido.

## Perfiles y relaciones

El alias es exacto, único, de 3–20 caracteres (`a-z`, números, punto y guion bajo), sin punto inicial/final; el nombre es opcional, hasta 40. Se confirma tener al menos 16 años al crear el perfil. El código revocable tiene ocho cifras hexadecimales y se acepta con/sin guion. No hay sugerencias abiertas de desconocidos.

Seguir requiere aprobación; cancelar, dejar de seguir y quitar seguidores siguen disponibles. Bloquear elimina ambos seguimientos, impide verse y no avisa al bloqueado. Silenciar solo retira a esa persona de Siguiendo: conserva seguimiento y acceso explícito, y se deshace en Tu perfil › Personas silenciadas. Las comunidades mantienen su audiencia independiente.

El perfil deportivo contiene solo biografía elegida (160 caracteres), hasta tres disciplinas y hasta tres logros propios ya publicados. En el editor, los logros destacados se ven como tres huecos con su medalla (o «Libre») y «Elegir/Cambiar logros destacados» abre una hoja con todos los logros publicados en rejilla de medallas (`components/ElegirDestacados`; marcar/desmarcar con `lib/destacados.alternarDestacado`, elegibles con `logrosElegibles`), con «Buscar en publicaciones anteriores» y su error dentro de la hoja; la elección se guarda con «Guardar perfil deportivo». El selector «Solo compartidos / Todos mis logros» añade, solo para ver, los de Vitrina conseguidos sin compartir y los que faltan por conseguir (`logrosNoElegibles`; un logro cuenta como compartido si hay alguna publicación suya cargada, de cualquier nivel). Con Vitrina oculta en Ajustes, lo explica. El avatar es el monograma o la insignia de un logro propio publicado; no se suben imágenes. «Así te ven tus seguidores aprobados» previsualiza la selección. Las cifras se rotulan como publicaciones compartidas, no como historial total. Desde una comunidad, los logros/avatar privados de seguidores no se muestran aunque el visitante siga al autor. La denuncia de perfil conserva también biografía y disciplinas.

Borrar el perfil exige **transferir o cerrar primero sus comunidades**. Tu perfil permite cerrar las comunidades propias también estando suspendido, con inventario exclusivo y confirmación de cascada, sin recuperar acceso al feed. Después elimina relaciones, publicaciones y membresías, conservando cuenta y diario. La eliminación completa de cuenta y el mantenimiento administrativo conservan su cascada anterior, explicada en el flujo de Cuenta; esta implementación cambia la API explícita de borrar perfil.

<a id="publicaciones-libres-logros-y-comunidades"></a>

## Publicaciones

Cuatro tipos, siempre por decisión de la persona y con vista previa:

- Texto de hasta 2.000 caracteres, con párrafos y sin título genérico en la tarjeta.
- Entreno: título, series, duración y volumen, ejercicios efectivos en su orden (hasta 15), récords, ligas destacadas, piezas de Vitrina (hasta seis por lista) y mapa opcional de doce zonas con niveles enteros 0–5.
- Actividad: caminar, correr o senderismo; título, duración, distancia y desnivel, sin recorrido.
- Logro alcanzado de Vitrina: identidad, grupo, nivel y requisito del nivel conseguido. No se publica automáticamente ni se envía el siguiente objetivo.

Entrenos, actividades y logros admiten nota opcional de 280 caracteres, sin edición posterior. Cada copia tiene su propia nota. El compositor permite elegir audiencia, mapa, ejercicios, récords concretos, ligas y Vitrina. Los récords principales de cada ejercicio se seleccionan por defecto. La vista previa muestra todo el envío y recuerda que cambiar el diario no actualiza la publicación.

El UUID de envío se conserva al reintentar el mismo contenido/destino. Cambiar contenido o audiencia genera otro intento; el servidor nunca cambia una publicación previa reutilizando su UUID. Seguidores y comunidad son copias independientes. Solo la publicación para seguidores anota `Workout.publicacion`/`Actividad.publicacion`; copiar en una comunidad no pisa esa marca, tampoco cuando se elige una comunidad en «Publicar para» del editor de un entreno o actividad.

**Compatibilidad:** sigue `v: 1`. Nota, metadatos de récord y totales son opcionales. Los lectores antiguos ignoran esos campos adicionales. Omitir duración/volumen requiere una secuencia distinta porque los lectores antiguos los exigen: 0013 instala el lector nuevo y deja `social_configuracion.campos_opcionales = false`. El compositor no ofrece esos interruptores y el servidor rechaza la omisión hasta completar la actualización de los lectores. Solo entonces el administrador activa:

```sql
update public.social_configuracion set campos_opcionales = true where id;
```

El campo omitido se elimina del JSON, sin enviarlo oculto ni sustituirlo por cero. Cero real sigue siendo cero. No activar la opción durante el primer despliegue. El servidor valida claves permitidas, tipos, listas, mapa, nota y cifras; límite global de resumen 8 KB.

### Récords

Progreso conserva su cálculo y todos sus récords. Social excluye nuevos 1RM estimados y récords de repeticiones a pesos menores dentro de la misma variante/modo. Orden principal: peso/lastre, reps al mayor peso, menos asistencia, 1RM de publicaciones antiguas. Se guarda primero un récord de cada ejercicio y luego los secundarios, con total de récords/ejercicios antes del corte de seis.

Los campos estructurados son `tipo`, `modo`, `valor`, `anterior`, `peso?`, `variante?`; se conserva `{ejercicio,texto}` para lectores anteriores. Se formatea con coma decimal y mejora. Los registros antiguos se agrupan por nombre sin intentar extraer cifras de su texto. El compositor puede seleccionar los récords disponibles; al hacerlo, los totales describen la selección publicada.

## Feed, interacción y avisos

El feed ordena por publicación (`creada`), no por fecha de sesión. La cabecera de la tarjeta es una línea de identidad: avatar, nombre (o «Tú») y debajo qué es y cuándo («Entreno · hace 2 h», «Correr · …», «Logro · …»), con `<time>` de fecha completa accesible; si la sesión fue otro día, «Entreno del martes, 14 de octubre · …». El logro conserva su día real de obtención.

La tarjeta muestra título, nota, cifras en una fila con filetes (tiempo, series y volumen; distancia, tiempo y ritmo, con el desnivel en una línea), el mapa muscular en miniatura con «Más trabajado» si el autor compartió el mapa (diferido como en Inicio), los récords en una franja (recuento y el principal de hasta dos ejercicios) y el logro como medalla: insignia grande sobre las curvas de nivel, grupo, nivel, requisito y día. Ejercicios, mapa completo con niveles en texto, detalle de récords, ligas y Vitrina se abren con «Detalle» en el pie; el mapa completo no se monta hasta abrirlo. Texto y notas largos tienen «Más». La vista previa queda desplegada.

Páginas de veinte con cursor compuesto `(creada,id)` sobre la última fila **cruda**, aun si el lector descarta su resumen. Una página completamente desconocida avanza automáticamente; los descartes muestran un aviso de actualización. Se conservan las firmas SQL anteriores. No hay botón «Actualizar»: al recuperar visibilidad se comprueba como mucho una vez por minuto y volver a tocar la pestaña «Siguiendo» comprueba a demanda, sin intervalos de sondeo. Si hay publicaciones nuevas aparece la píldora fija «N publicaciones nuevas», que las incorpora al tocarla conservando la posición de la publicación anterior; sin nuevas, solo se refrescan los recuentos. La primera carga es un esqueleto con la forma de la tarjeta. Los avisos también se releen al volver y al abrir su hoja.

El pie lleva la llama y el número de ánimos (rellena en `accent-strong` y con un pulso breve al darlo, nunca con Reduce Motion) y el comentario con su número; el texto completo («Dar ánimo. 3 ánimos») va en la etiqueta accesible y el estado en `aria-pressed`, con reversión si falla la red. Debajo, con 0014, el último comentario visible y «Ver los N comentarios». Solo el autor puede consultar identidades, mediante RPC paginada de reacciones: en lo propio se ven las caras de hasta tres personas y «Ánimo de Laura y 2 personas más», que abre la lista completa. Los demás ven solo el recuento. «Más acciones» abre un Sheet: borrar lo propio, denunciar o silenciar lo ajeno; el moderador de comunidad puede retirar contenido. Los borrados de publicación **siempre** piden confirmación, también desde el detalle. El reintento tolera una respuesta perdida y limpia exclusivamente la marca local de ese UUID; nunca borra series ni el diario.

Comentarios de hasta 500 caracteres, cuota de 100 al día. Se cargan los últimos veinte y «Ver comentarios anteriores», ordenados cronológicamente en pantalla, con cursor `(creado,id)`. Cada comentario lleva avatar, nombre y hora en una línea y sus acciones en texto (Responder, Borrar, Denunciar, de 44 px de alto); las respuestas se agrupan bajo su comentario con una línea guía, y una respuesta cuyo original no está cargado queda suelta con «Respuesta a @…». El campo y el botón de enviar viven en el pie de la hoja; «Responder» lleva el foco al campo. El total procede del servidor, no del tamaño cargado. Las respuestas se dirigen a un comentario raíz, con un solo nivel. Salir de una comunidad, bloquear o suspender revoca los mismos accesos que en publicaciones. Borrar un comentario propio ofrece Deshacer (nuevo comentario con la hora actual); borrar uno ajeno en una publicación propia o moderada requiere confirmación.

Avisos: ánimo/comentario en lo propio, respuesta directa, solicitud aceptada y nueva publicación del creador en una comunidad de anuncios. Se agrupan por tipo/publicación y personas; las solicitudes se muestran arriba, con Aceptar y Rechazar en su fila, y el resto por día (Hoy, Esta semana desde el lunes, Antes) con la cara de la persona, el tipo en una burbuja (llama, comentario, check, comunidad) y un punto en los nuevos. El contador de nuevos considera todos los eventos visibles, aunque la lista muestre treinta grupos. Tocar una aceptación abre la persona; el resto abre los comentarios con la autoría adecuada. Error, desconexión y vacío son estados distintos, con reintento; Inicio tampoco oculta silenciosamente un fallo de lectura. No hay suscripción automática a todo un hilo.

Cuotas existentes: 50 solicitudes, 30 publicaciones, 100 comentarios, 20 denuncias y cinco comunidades creadas por persona/día. Publicaciones a seguidores y comunidades comparten cuota.

<a id="comunidades-donde-solo-publica-su-creador"></a>
<a id="editar-la-descripción-de-una-comunidad"></a>

## Pantallas y comunidades

Social permite crear el perfil en el mismo contexto. Cabecera de iconos: Avisos (campana con el contador de novedades más solicitudes en una pastilla neutra), Amigos y tu avatar, que abre **tu perfil** (`MiPerfilPagina`): la misma cabecera que ven los demás, «Editar perfil» (los ajustes de `PerfilSheet`) y tus publicaciones, que antes eran la pestaña «Tú». Pestañas: Siguiendo · Comunidades. Arriba de Siguiendo, el compositor: «Comparte algo con tus seguidores» abre el editor de texto y, si lo último registrado (entreno terminado o actividad, el más reciente de los dos) no está publicado y es de los últimos siete días, aparece con sus cifras y «Publicar», que abre el editor con ese resumen. Los primeros pasos abren Añadir para compartir código, Descubrir comunidades y el último entreno real (o Entreno si falta). Se marcan según seguidores, membresía y publicación local. Se pueden cerrar; se guarda `social-primeros-pasos` en `pistasVistas`, sin esquema nuevo ni escritura de entrenamiento.

Amigos usa «Sigues · N / Te siguen · N / Añadir», con las dos listas leídas a la vez para dar el recuento. Cada fila lleva avatar, nombre y relación; quien te sigue y no sigues tiene «Seguir» en su fila (pide seguir al momento), el resto abre la persona. En Añadir, tu código en cifra grande con Copiar y Compartir (hoja del sistema, si existe). Nombre de persona en Amigos, feed y comunidades abre una página común (`PaginaPersona`): avatar grande, nombre, alias y relación, biografía, disciplinas como chips, dos cifras (publicaciones compartidas y logros destacados), la acción que toca (pedir seguir, cancelar la solicitud o aceptar/rechazar la suya), los logros destacados como medallas y sus publicaciones. Dejar de seguir, quitar de seguidores, denunciar y bloquear van en «Más acciones». La vuelta dice el origen y conserva la pantalla subyacente. En contexto de comunidad la lista de publicaciones se consulta con una RPC específica, limitada a ese grupo.

Comunidades sigue separado de Siguiendo. Nombre único (3–60), descripción hasta 300 editable por su creador, reglas hasta 1.000 y bienvenida hasta 500, en el plegable «Antes de publicar» del detalle (o «Bienvenida y reglas» antes de unirse). Cada comunidad lleva su monograma en un cuadrado invertido. Listado con «N nuevas» desde última visita como chip, filtrado por bloqueos y suspensiones; en Descubrir, «Unirme» en la propia fila. El detalle deja a la vista «Miembro» (o «Creada por ti») y «Publicar»; editar la descripción, gestionar, salir, denunciar y borrar van en «Más acciones», y cada tarea elegida se abre cuando esa hoja termina de cerrarse. Unirse permite leer sin seguir a sus miembros; salir revoca lectura e interacción. Bloquear al creador sigue ocultando su comunidad, como antes.

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
| 0014 | Lecturas del rediseño: `avatares_social(alias[], comunidad)` (logro elegido, con la visibilidad de `perfil_deportivo`; desde una comunidad, solo lo publicado en ella) y `ultimos_comentarios(ids[])` (último comentario visible de cada publicación, recortado a 140). Si no existen (`PGRST202`), el cliente devuelve `{}` en silencio |

`node scripts/sql/validar-social.mjs` crea PostgreSQL 17 efímero en Docker, carga las catorce migraciones y las siete suites (`social_rediseno.sql` prueba 0014), y elimina el contenedor. Sustituye solo `auth.users`/`auth.uid()` y omite la programación pg_cron de 0002: no valida correo ni tareas de mantenimiento. Las suites nuevas `mejoras_social.sql` y `social_conversacion_control.sql` también se pueden ejecutar en SQL Editor y revierten sus usuarios sintéticos con `PRUEBAS_OK`.

Tests puros y de contrato en `social/lib` y `data/socialSupabase.test.ts`. `scripts/ui/validar-social.cjs` usa únicamente `appfit-test.localhost:5174` y Supabase falso en 54329; prueba 320/375/430 px, ambos temas y texto al 200 %, composición desde el compositor, notas por copia, mapa completo plegado, tu perfil con insignia elegida, «Más acciones» de comunidades, borrado/cancelación/reintento, borrador con Escape/Cerrar/fondo/Atrás, errores de avisos al abrir la hoja, comprobación al volver a tocar Siguiendo, píldora de novedades y paginación de 250 comentarios/páginas desconocidas. El Supabase falso imita también 0014 (Jon tiene una insignia como avatar).

Siguen pendientes las tareas con 6–8 personas, dos cuentas reales e iPhone/Android físicos; recorrido y condiciones de despliegue en [validación](../pruebas/social-mejoras.md). Las apuestas de fase 3, filtros por tipo sin datos de volumen, ocultación automática y push no se activan con esta entrega.
