# Plan: parte social (octubre 2026)

Plan acordado con Víctor el 2026-10-15. Decisión y alternativas: [ADR 040](decisiones/040-parte-social.md). Es un plan, no la fuente de verdad: lo implementado se documenta en sus documentos vivos (`arquitectura.md`, `datos.md`, `docs/features/social.md`, `docs/features/cuenta.md`…) y aquí solo cambia el estado. Cuando esté hecho, este archivo pasa a `docs/historico/`.

## Lo acordado

| Tema | Decisión |
|---|---|
| Qué se publica | Entrenos de gimnasio, actividades sin recorrido, logros y ligas (los récords, cambios de liga y piezas nuevas de la Vitrina van dentro de la publicación del entreno). Nunca nutrición, peso, medidas ni perfil. |
| Quién lo ve | Solo seguidores aprobados |
| Interacción | Una reacción («Ánimo», nombre provisional) y comentarios |
| Cuándo se publica | Al terminar, con vista previa y confirmación. Si no se confirma, no sale nada. |
| Encontrar a alguien | Alias exacto o código de invitación |
| Cuenta | Independiente de la copia cifrada |
| Edad mínima | 16 años, pendiente de confirmar con legal |
| Infraestructura | Plan gratuito de Supabase, mismo proyecto. Solo texto y cifras. |
| Espacio | `datos_anterior` 7 días; cuentas sin actividad 12 meses, borradas |

Detalles que propuso Claude y Víctor puede cambiar:
- **Comentarios:** solo texto, 1–500 caracteres. Cada persona borra los suyos y quien publica borra cualquiera de su publicación. Se pueden denunciar.
- **Bloquear** a alguien quita el seguimiento en los dos sentidos, le impide volver a pedirlo y oculta sus reacciones y comentarios.
- **Avisos** dentro de la app (solicitudes, reacciones y comentarios nuevos), sin push.
- **Alias:** único sin distinguir mayúsculas, 3–20 caracteres (letras sin tildes, números, punto y guion bajo), sin empezar ni acabar en punto.
- **Código de invitación:** uno por persona; generar otro invalida el anterior.
- **Límites contra abusos** en las funciones: como mucho 50 solicitudes de seguimiento y 100 comentarios al día por persona.

**Navegación (decidido el 2026-10-15):** un destino «Amigos» en «Más»; el aviso en Inicio cuando haya algo nuevo llega con los avisos (fase 5). **Pendiente de decidir (Víctor):** el nombre definitivo de la reacción.

## Datos en Supabase

Migraciones nuevas en `supabase/migrations/`, que Víctor ejecuta a mano en el SQL Editor. Todo lo social va por funciones `security definer` con `auth.uid()`: las tablas tienen RLS activa y ningún permiso directo para `anon` ni `authenticated`.

| Tabla | Qué guarda |
|---|---|
| `actividad` | `user_id`, `dia`: último día con la app abierta y sesión. Sirve para borrar las cuentas abandonadas. |
| `perfiles` | `user_id`, `alias` (único por `lower(alias)`), `nombre` (≤ 40), `codigo` de invitación (único), `acepto` (fecha de aceptación de condiciones y edad), `avisos_vistos` (fecha), `suspendido` |
| `seguimientos` | `seguidor`, `seguido`, `estado` (`pendiente` · `aceptado`), `creado` |
| `bloqueos` | `quien`, `bloqueado` |
| `publicaciones` | `id` (uuid que genera la app), `autor`, `tipo` (`entreno` · `actividad`), `fecha` del registro, `creada`, `resumen` (jsonb, objeto de ≤ 8 KB, con su versión `v`) |
| `reacciones` | `publicacion`, `user_id`, `creada` |
| `comentarios` | `id`, `publicacion`, `autor`, `texto` (1–500), `creado` |
| `denuncias` | `id`, `denunciante`, `tipo` (`perfil` · `publicacion` · `comentario`), `objetivo`, `motivo`, `creada`, `revisada` |

Todo con `on delete cascade` desde `auth.users` y desde `publicaciones`.

**Funciones (RPC):**
- Perfil: `crear_perfil`, `editar_perfil`, `mi_perfil`, `nuevo_codigo`.
- Encontrar y seguir: `buscar_alias`, `buscar_codigo`, `pedir_seguir`, `responder_solicitud`, `dejar_de_seguir`, `quitar_seguidor`, `bloquear`, `desbloquear`, `seguidores`, `seguidos`, `solicitudes`.
- Publicar: `publicar`, `borrar_publicacion`.
- Leer: `feed(antes, limite)` y `publicaciones_de(alias, antes, limite)`, paginados por cursor de fecha, con alias, recuentos y si yo he reaccionado.
- Interactuar: `reaccionar`, `quitar_reaccion`, `comentar`, `borrar_comentario`, `comentarios(publicacion)`.
- Avisos y moderación: `avisos()` (lo nuevo desde `avisos_vistos`), `marcar_avisos_vistos`, `denunciar`.
- Cuenta: `marcar_actividad` (una vez al día como mucho) y `borrar_cuenta`, que ya existe y borra todo en cascada.

**Tareas programadas** (pg_cron, incluido en el plan gratuito; con el proyecto pausado no se ejecutan):
- Cada día: `datos_anterior = null` en las copias con más de 7 días.
- Cada semana: borrar los usuarios sin `actividad` en 12 meses (la cascada se lleva copia, perfil y todo lo social).

**Índices:** `publicaciones (autor, fecha desc)`, `seguimientos (seguido, estado)`, `comentarios (publicacion, creado)`, `reacciones (publicacion)`.

## Código

- **`src/features/cuenta/`:** la sesión se separa de la copia (fase 2). Con sesión y sin copia en este dispositivo, la cuenta está «en uso» y lo social funciona; la copia cifrada se activa o se abre desde Ajustes › Cuenta cuando la persona quiera.
- **`src/features/social/` nueva:**
  - `lib/`, puro y con tests: validar alias y comentarios, crear y leer los resúmenes publicables de un entreno o una actividad, textos y fechas relativas.
  - `data/social.ts`: interfaz `Social`. `data/socialSupabase.ts`: implementación con el mismo cliente de supabase-js (diferido) que la cuenta. `src/test/fixtures/socialFalso.ts`: la versión en memoria para los tests.
  - `components/` y `pages/`: crear perfil (alias, nombre, aceptación de 16+ y condiciones), buscar y código, solicitudes, seguidores y seguidos, feed, publicación con reacciones y comentarios, perfil de otra persona, bloquear y denunciar, «Publicar» con vista previa.
- **Al terminar** (`gym/components/WorkoutFinished` y el final de una actividad): «Publicar» con la vista previa del resumen.
- **En el registro local:** `Workout.publicacion?` y `Actividad.publicacion?` (uuid, campo opcional sin índice, sin versión de esquema nueva) para enseñar «Publicado» y poder borrarla desde el detalle.
- **Red:** solo `*.supabase.co`, como hasta ahora. Sin conexión, lo social enseña un estado vacío que lo explica.

## Fases

| Fase | Qué | Quién | Estado |
|---|---|---|---|
| 0 | Medir el tamaño de las copias (consulta en el SQL Editor) | Claude | hecha el 2026-10-15: 3 cuentas, copia media 7 kB, la mayor (Víctor) 20 kB; tabla `copias` 280 kB y base entera 11 MB |
| 1 | Espacio: `0002_espacio.sql` (`actividad`, `marcar_actividad`, tareas de limpieza) y la app marca la actividad al abrirse | Claude (Víctor ejecuta el SQL) | hecha; SQL ejecutado el 2026-10-15 |
| 2 | Cuenta sin copia: entrar con email y código basta; la copia se activa aparte | Claude | hecha (fase `sin-copia`; sin probar en el navegador: entrar exige un código real por correo) |
| 3 | Perfiles y seguir: `0003_social.sql` (perfiles, seguimientos, bloqueos, denuncias y sus funciones) y la UI de perfil, buscar, código, solicitudes, bloquear y denunciar | Claude (Víctor ejecuta el SQL) | hecha; `0003_social.sql` ejecutado el 2026-10-15 y `pruebas/social.sql` pasa (PRUEBAS_OK); probada por Víctor con dos cuentas reales en `appfit-test.localhost` |
| 4 | Publicar: `0004_publicaciones.sql`, resúmenes puros, vista previa al terminar y en el detalle, «Publicado» y borrar | Claude (Víctor ejecuta el SQL) | hecha; `0004_publicaciones.sql` ejecutado el 2026-10-15 y `pruebas/social.sql` pasa (PRUEBAS_OK) |
| 5 | Feed, reacciones, comentarios y avisos en la app | Claude | pendiente |
| 6 | Legal y publicación: condiciones de uso, política de privacidad, ficha de datos de Play, cómo revisa Víctor las denuncias | Víctor + Claude | pendiente |
| 7 | Prueba con dos cuentas en iPhone y Android | Víctor + Claude | pendiente |
| 8 | Documentación (ver abajo) | Claude | pendiente |

Una rama `feat/social`. Cada fase deja la app funcionando y con los tests en verde. Sin la configuración de Supabase, lo social no aparece, igual que la cuenta.

## Validación

- **Tests:** las funciones puras de `lib/`, la cuenta sin copia (copiaNube con nube falsa) y la feature social contra `socialFalso`: seguir, aprobar, bloquear, publicar, reaccionar, comentar y borrar.
- **SQL:** probar cada función en el SQL Editor con dos usuarios de prueba antes de usarla desde la app, sobre todo que nadie lee lo que no le toca (RLS y comprobaciones dentro de las funciones).
- **Navegador:** en `appfit-test.localhost:5173`, dos perfiles del navegador con dos cuentas de prueba, a 320/375/430 px y en ambos temas.
- `npm run test` y `npm run build` en verde.

## Documentación al cerrar

- `docs/features/social.md` nuevo y `docs/features/cuenta.md` (cuenta sin copia, actividad y borrado por inactividad).
- `CLAUDE.md`: primera línea, regla de red y mapa (`social/`).
- `arquitectura.md` (red, navegación, chunks diferidos), `datos.md` (campo `publicacion` y qué vive fuera del backup), `README.md` (privacidad y características), `despliegue.md` (política de privacidad, ficha de Play, mensaje de la app), `roadmap.md`.
- Entrada en `PROCESO.md`.

## Riesgos y puntos abiertos

- **Sin copias de seguridad en el plan gratuito:** si se pierde la base, se pierden perfiles, seguimientos y publicaciones (no los registros de nadie). Víctor puede exportarla de vez en cuando con `pg_dump`.
- **Pausa del proyecto:** con uso semanal no ocurre. Si ocurre, tampoco se ejecutan las tareas programadas hasta reanudarlo.
- **Borrado por inactividad sin correo previo:** avisar por email exigiría una función que envíe correos. De momento se explica en Ajustes y en la política de privacidad. Los datos del móvil nunca se borran.
- **Moderación con una sola persona:** si crece, las denuncias pueden desbordar a Víctor. Las funciones permiten suspender un perfil (`suspendido`).
- **Legal:** consentimiento, edad y política de privacidad, a revisar por alguien que sepa antes de abrirlo a desconocidos.
