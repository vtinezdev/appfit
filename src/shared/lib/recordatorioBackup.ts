/** Días sin copia a partir de los cuales se recuerda exportar, si la persona no lo cambia. */
export const UMBRAL_BACKUP_POR_DEFECTO = 14
/** Días que se pospone el aviso con «Más tarde». */
export const DIAS_POSPONER_BACKUP = 3

const DIA_MS = 86_400_000

/**
 * ¿Toca recordar la copia de seguridad? Solo si hay datos que perder y la última exportación (ms) es anterior
 * al umbral; «nunca exportada» con datos cuenta. `pospuestoHasta` (ms) silencia el aviso hasta esa marca.
 */
export function necesitaRecordatorioBackup(
  ultima: number | undefined,
  hayDatos: boolean,
  ahora: number,
  umbralDias: number = UMBRAL_BACKUP_POR_DEFECTO,
  pospuestoHasta?: number,
): boolean {
  if (!hayDatos) return false
  if (pospuestoHasta !== undefined && ahora < pospuestoHasta) return false
  if (ultima === undefined) return true
  return ahora - ultima >= umbralDias * DIA_MS
}

/** Marca hasta la que se pospone el aviso desde `ahora`. */
export function posponerHasta(ahora: number, dias: number = DIAS_POSPONER_BACKUP): number {
  return ahora + dias * DIA_MS
}
