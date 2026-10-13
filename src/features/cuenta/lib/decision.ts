/**
 * Decisiones de la copia en la nube, como funciones puras. Lo que no decide nunca: subir desde un dispositivo que no
 * está vinculado (un móvil vacío recién entrado no puede pisar la copia de la nube).
 */

/** Al entrar en la cuenta en este dispositivo. */
export type Vinculo =
  /** La cuenta no tiene copia: se crea la contraseña y se sube lo de este móvil (aunque esté vacío). */
  | 'crear'
  /** Hay copia y este móvil no tiene datos: se trae sin preguntar. */
  | 'traer'
  /** Hay copia y también datos aquí: la persona elige cuál se queda. */
  | 'elegir'

export function decidirVinculo(hayCopiaRemota: boolean, hayDatosLocales: boolean): Vinculo {
  if (!hayCopiaRemota) return 'crear'
  return hayDatosLocales ? 'elegir' : 'traer'
}

export interface EstadoCopia {
  /** Revisión de la última copia que este dispositivo subió o trajo. */
  revisionLocal: number
  /** Huella de esa copia y la de los datos de ahora. */
  huellaGuardada: string | null
  huellaActual: string
  /** Revisión de la nube: `null` si no hay copia, `undefined` si no se ha consultado (p. ej. al subir tras un cambio). */
  revisionRemota: number | null | undefined
}

export type AccionCopia =
  | 'nada'
  | 'subir'
  /** Otro dispositivo subió una copia y aquí no hay nada sin subir: se trae sola. */
  | 'traer'
  /** Hay cambios aquí y otra copia más nueva en la nube: la persona elige. */
  | 'conflicto'
  /** La copia de la nube ya no existe (se empezó de cero desde otro dispositivo): hay que volver a entrar. */
  | 'perdida'

export function decidirCopia({ revisionLocal, huellaGuardada, huellaActual, revisionRemota }: EstadoCopia): AccionCopia {
  if (revisionRemota === null) return 'perdida'
  const cambiosLocales = huellaActual !== huellaGuardada
  const remotaNueva = revisionRemota !== undefined && revisionRemota !== revisionLocal
  if (cambiosLocales && remotaNueva) return 'conflicto'
  if (remotaNueva) return 'traer'
  return cambiosLocales ? 'subir' : 'nada'
}
