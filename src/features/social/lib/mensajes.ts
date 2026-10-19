/**
 * Los errores de las funciones sociales llegan como claves cortas (`raise exception 'alias_ocupado'` en
 * `supabase/migrations/`); aquí está lo que se le dice a la persona.
 */

export const MENSAJES_SOCIAL: Record<string, string> = {
  sin_sesion: 'Tu sesión ha caducado. Vuelve a entrar en tu cuenta.',
  sin_perfil: 'Primero crea tu perfil.',
  suspendido: 'Tu perfil está suspendido y no puedes usar Amigos.',
  sin_aceptar: 'Para crear el perfil tienes que confirmar que tienes 16 años o más.',
  ya_hay_perfil: 'Ya tienes un perfil.',
  alias_no_valido: 'El alias tiene que tener de 3 a 20 caracteres: letras sin tildes, números, punto o guion bajo, sin empezar ni acabar en punto.',
  alias_reservado: 'Ese alias está reservado. Elige otro.',
  alias_ocupado: 'Ese alias ya lo usa otra persona. Prueba con otro.',
  nombre_largo: 'El nombre puede tener como mucho 40 caracteres.',
  no_encontrado: 'Ya no está disponible.',
  comentario_no_valido: 'El comentario tiene que tener de 1 a 500 caracteres.',
  limite: 'Has llegado al límite de hoy. Vuelve a intentarlo mañana.',
  publicacion_no_valida: 'No se ha podido publicar. Inténtalo de nuevo.',
  comunidad_no_valida: 'Revisa el nombre y la descripción de la comunidad.',
  comunidad_ocupada: 'Ya hay una comunidad con ese nombre. Elige otro.',
  no_miembro: 'Únete a la comunidad para ver y compartir publicaciones.',
  perfil_deportivo_no_valido: 'Revisa la biografía, las disciplinas y los logros destacados de tu perfil.',
  avatar_no_valido: 'Ese avatar no está en el catálogo. Elige otro.',
  comunidades_pendientes: 'Antes de borrar tu perfil, transfiere o cierra las comunidades que has creado desde Social › Comunidades.',
  creador_no_puede_salir: 'Has creado esta comunidad. Puedes borrarla desde sus opciones.',
  solo_creador_publica: 'En esta comunidad solo puede publicar quien la creó. Puedes comentar las publicaciones.',
  denuncia_no_valida: 'No se ha podido enviar la denuncia. Revisa el motivo e inténtalo de nuevo.',
}

/** Mensaje de una clave del servidor, o `null` si no es una de las suyas. */
export function mensajeSocial(clave: string | undefined): string | null {
  return clave !== undefined && Object.hasOwn(MENSAJES_SOCIAL, clave) ? MENSAJES_SOCIAL[clave] : null
}
