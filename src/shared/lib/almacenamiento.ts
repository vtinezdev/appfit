/** La protección frente al borrado automático depende del navegador; no sustituye a una copia exportada. */
export type Persistencia = 'concedida' | 'no-concedida' | 'no-disponible' | 'error'

interface Almacenamiento {
  persisted?: () => Promise<boolean>
  persist?: () => Promise<boolean>
}

const almacenamientoDelNavegador = () => typeof navigator === 'undefined' ? undefined : navigator.storage

export async function consultarPersistencia(storage: Almacenamiento | undefined = almacenamientoDelNavegador()): Promise<Persistencia> {
  if (!storage?.persisted) return 'no-disponible'
  try {
    return await storage.persisted() ? 'concedida' : 'no-concedida'
  } catch {
    return 'error'
  }
}

/** Conserva el permiso existente y devuelve el resultado real: una petición puede ser rechazada sin lanzar error. */
export async function solicitarPersistencia(storage: Almacenamiento | undefined = almacenamientoDelNavegador()): Promise<Persistencia> {
  try {
    if (storage?.persisted && await storage.persisted()) return 'concedida'
    if (!storage?.persist) return 'no-disponible'
    return await storage.persist() ? 'concedida' : 'no-concedida'
  } catch {
    return 'error'
  }
}
