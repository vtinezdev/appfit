import type { BackupV3 } from './backup'

/** Contenido persistido, con la misma representación que usa la huella y sin la hora de exportación. */
export function contenidoBackup(backup: BackupV3): string {
  const { exportedAt: _, ...contenido } = backup
  return JSON.stringify(contenido)
}

/** La copia remota ya no puede sustituir automáticamente los datos que se acaban de editar. */
export class BackupCambiadoError extends Error {
  constructor() { super('Los datos de este dispositivo han cambiado mientras se descargaba la copia.') }
}
