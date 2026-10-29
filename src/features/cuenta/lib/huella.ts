import type { BackupV3 } from '../../../shared/lib/backup'
import { contenidoBackup } from '../../../shared/lib/contenidoBackup'

/**
 * Huella (SHA-256 en hex) del contenido de una copia, sin `exportedAt`: dos exportaciones de los mismos datos dan la
 * misma huella. Así se sabe si hay cambios sin subir sin guardar ninguna marca en cada escritura.
 */
export async function huellaBackup(backup: BackupV3): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(contenidoBackup(backup)))
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}
