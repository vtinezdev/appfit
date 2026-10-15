# Amigos (parte social)

`src/features/social/`. Perfil social, seguir con aprobación, bloquear y denunciar. Decisión: [ADR 040](../decisiones/040-parte-social.md); plan y fases pendientes (publicar, feed, reacciones y comentarios): [`../social.md`](../social.md). Necesita cuenta (no la copia cifrada) y conexión; sin el proyecto de Supabase configurado, el destino no aparece.

## Dónde está cada cosa

| Pieza | Archivo | Datos |
|---|---|---|
| Alias, nombre y búsqueda | `lib/alias.ts`: `normalizarAlias`, `validarAlias`, `limpiarNombre`, `validarNombre`, `esCodigo`, `textoBusqueda` | — (puro; mismas reglas que el SQL) |
| Relación | `lib/relacion.ts`: `Persona`, `nombreVisible`, `textoRelacion`, `accionSeguir`, `TEXTO_ACCION` | — (puro) |
| Errores del servidor | `lib/mensajes.ts`: `MENSAJES_SOCIAL`, `mensajeSocial` (un test comprueba que cada `raise exception` del SQL tiene mensaje) | — (puro) |
| Servidor | `data/social.ts` (interfaz `Social`, `MiPerfil`, `MOTIVOS_DENUNCIA`) y `data/socialSupabase.ts` (RPC, `traducirSocial`) | Supabase |
| Carga | `servicio.ts`: `socialDisponible` y `cargarSocial` (import diferido; comparte cliente y sesión con la cuenta a través de `cuenta/data/clienteSupabase`) | — |
| Lecturas | `hooks/useConsulta`: lee del servidor y vuelve a leer cuando cambia una clave (un contador que sube tras cada cambio) | — |
| Pantalla | `AmigosTab` (sin sesión, sin perfil, suspendido o con perfil), `components/CrearPerfil`, `Solicitudes`, `ListaPersonas`, `Anadir`, `PersonaSheet`, `PerfilSheet`, `NombrePersona` | — |
| SQL | `supabase/migrations/0003_social.sql` (tablas `perfiles`, `seguimientos`, `bloqueos`, `denuncias` y sus funciones; ejecutado el 2026-10-15); pruebas en `supabase/pruebas/social.sql` | Postgres |

## Reglas

- **Todo por funciones** `security definer` con `auth.uid()`: las tablas tienen RLS y ningún permiso para `anon` ni `authenticated`, y los ayudantes (`social_*`) no se pueden llamar desde la app. A las personas se las identifica por su alias; nunca viajan ids.
- **Alias**: 3–20 caracteres, minúsculas sin tildes, números, punto y guion bajo, sin empezar ni acabar en punto; único. Se guarda en minúsculas y la «@» de delante se ignora. Algunos están reservados (`appfit`, `admin`, `soporte`…). **Nombre** opcional, como mucho 40 caracteres.
- **Perfil**: crearlo exige marcar «Tengo 16 años o más» (`acepto` guarda la fecha). Borrarlo borra seguimientos y bloqueos; la cuenta, la copia y los registros se quedan. Borrar la cuenta lo borra todo en cascada.
- **Código de invitación**: 8 cifras hexadecimales («1A2B-3C4D»), se busca con o sin guion y sin distinguir mayúsculas. «Crear código nuevo» invalida el anterior.
- **Buscar**: alias exacto o código. Nunca devuelve a uno mismo, perfiles suspendidos ni personas con un bloqueo de por medio (en cualquier sentido).
- **Seguir**: la solicitud queda pendiente hasta que la otra persona acepta; se puede cancelar. Como mucho 50 solicitudes al día. Rechazar la borra; «Quitar de tus seguidores» también se puede hacer después.
- **Bloquear** quita el seguimiento en los dos sentidos y deja de mostraros el uno al otro; no se avisa. Se deshace en «Tu perfil › Personas bloqueadas».
- **Denunciar** un perfil: motivo (acoso, inapropiado, suplantación, spam, otro) y detalle opcional (500). Se guarda el alias y el nombre de ese momento. Como mucho 20 al día.
- **Moderación** (Víctor, en el SQL Editor): `select * from public.denuncias where revisada is null`; suspender con `update public.perfiles set suspendido = true where alias = '…'` (no aparece ni puede hacer nada, pero ve que está suspendido y puede borrar su perfil); marcar revisada con `update public.denuncias set revisada = now() where id = …`.
- **Errores**: claves cortas del SQL (`alias_ocupado`, `no_encontrado`, `limite`…) traducidas por `mensajeSocial`; red y sesión como la cuenta. Si el SQL aún no está en el servidor (PGRST202), «Amigos aún no está disponible». Fuera de las hojas van en un Toast o en línea; dentro, con `ErrorState`.

## Pantallas

- **Más › Amigos** (icono `users`), detrás de Perfil.
- **Sin sesión**: estado vacío «Entra con tu cuenta» con «Ir a Cuenta» (Ajustes › Cuenta).
- **Sin perfil**: qué se comparte y qué no (nutrición, peso y medidas nunca), alias, nombre opcional, «Tengo 16 años o más» y «Crear mi perfil».
- **Con perfil**: cabecera «Amigos» con `@alias · N solicitudes` debajo (fuera de `overline`, que pondría en mayúscula el alias) y «Tu perfil» (icono de ajustes). Si hay solicitudes, «Solicitudes» con Rechazar y Aceptar en cada fila (con poco ancho, los botones bajan bajo el nombre). Después, ViewTabs Siguiendo · Seguidores · Añadir:
  - **Siguiendo** (con «Solicitud enviada») y **Seguidores**: filas que abren la persona.
  - **Añadir**: card «Tu código» con Copiar y Compartir (si el navegador puede), y «Alias o código» con Buscar; el resultado lleva «Pedir seguir».
- **Hoja de una persona** (título: nombre o alias): alias y relación, responder su solicitud, Pedir seguir / Cancelar solicitud / Dejar de seguir, Quitar de tus seguidores, Denunciar (motivo y detalle; al terminar ofrece bloquear) y Bloquear (`ConfirmacionDestructiva`; cierra la hoja y avisa con un Toast).
- **Tu perfil** (hoja): alias y nombre con Guardar, código y «Crear código nuevo», «Personas bloqueadas» (Disclosure con Desbloquear) y «Borrar el perfil» (`ConfirmacionDestructiva`).
- **Perfil suspendido**: estado vacío con «Tu perfil» para poder borrarlo.

## Pruebas

Tests puros en `lib/` y `data/socialSupabase.test.ts`. El SQL se prueba con `supabase/pruebas/social.sql` en el SQL Editor (crea tres usuarios de prueba y lo deshace todo al acabar). En el navegador, sin el proyecto real: `scripts/ui/supabase-falso.mjs` (ver [desarrollo](../desarrollo.md) § Pruebas en navegador).
