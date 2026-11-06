import type { FaseCuenta } from '../../cuenta/copiaNube'

/**
 * Qué hacer con el desbloqueo recordado según la cuenta (ADR 068): con sesión, preguntar a la nube; al cerrar la sesión,
 * olvidarlo (el desbloqueo es de la cuenta, no del móvil); mientras carga, nada.
 */
export function accionDesbloqueo(fase: FaseCuenta): 'preguntar' | 'olvidar' | 'nada' {
  if (fase === 'cargando') return 'nada'
  if (fase === 'sin-sesion') return 'olvidar'
  return 'preguntar'
}
