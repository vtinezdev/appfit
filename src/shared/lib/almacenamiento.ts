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

/** iOS expone `navigator.standalone`; otros navegadores usan el modo del manifest. No cambia dónde se guarda la BD. */
export function entornoDeApp() {
  const instalada = matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  return { instalada, esIOS }
}
