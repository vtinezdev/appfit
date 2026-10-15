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
  denuncia_no_valida: 'No se ha podido enviar la denuncia. Revisa el motivo e inténtalo de nuevo.',
}

/** Mensaje de una clave del servidor, o `null` si no es una de las suyas. */
export function mensajeSocial(clave: string | undefined): string | null {
  return clave !== undefined && Object.hasOwn(MENSAJES_SOCIAL, clave) ? MENSAJES_SOCIAL[clave] : null
}
