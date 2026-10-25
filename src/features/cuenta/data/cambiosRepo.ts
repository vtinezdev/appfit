import Dexie from 'dexie'
import { db, TABLAS_USUARIO } from '../../../shared/db/db'
import { afectaALaCopia } from '../lib/disparo'

/** Avisa de cada escritura en las tablas que van en la copia (de esta pestaña o de otra). Devuelve cómo dejar de oír. */
export function alCambiarDatos(fn: () => void): () => void {
  const oyente = (partes: Record<string, unknown>) => {
    if (afectaALaCopia(Object.keys(partes), db.name, TABLAS_USUARIO)) fn()
  }
  Dexie.on('storagemutated', oyente)
  return () => Dexie.on('storagemutated').unsubscribe(oyente)
}
