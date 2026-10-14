/**
 * Pistas de primera vez: explicaciones de uso que salen una vez en su pantalla y desaparecen con «Entendido».
 * Las vistas se guardan en `Settings.pistasVistas`; «Volver a ver las pistas» (Ajustes › Primeros pasos) las borra.
 */
export const PISTAS = {
  'entreno-series': 'Marca cada serie con el botón de su derecha al terminarla. Toca su número para hacerla de calentamiento, dropset o negativas.',
  'detalle-confirmar': 'Marca una serie con el botón de su derecha para confirmar que se hizo; las antiguas siguen sin confirmar hasta que lo indiques. Si cambias reps, kg o técnica, vuelve a confirmarla.',
} as const

export type PistaId = keyof typeof PISTAS

/** Si la pista aún no se ha cerrado. Un id desconocido guardado (de una versión futura o antigua) no molesta. */
export function pistaPendiente(vistas: readonly string[] | undefined, id: PistaId): boolean {
  return !vistas?.includes(id)
}

/** Lista de vistas con `id` añadido, ordenada y sin repetir. */
export function marcarPistaVista(vistas: readonly string[] | undefined, id: PistaId): string[] {
  return [...new Set([...(vistas ?? []), id])].sort()
}
