import Dexie, { type EntityTable } from 'dexie'

/**
 * Estado de la cuenta en este dispositivo, en una base IndexedDB aparte de la de AppFit: no entra en el backup ni se
 * borra con «Borrar todos los datos». Tiene que quedar fuera de la copia porque restaurarla no debe traer el estado de
 * otro dispositivo. La sesión de Supabase vive en localStorage (la gestiona supabase-js).
 */
export interface VinculoDispositivo {
  id: 1
  userId: string
  email: string
  /** Clave de los datos, no exportable. Con ella no hay que escribir la contraseña cada vez. */
  dek: CryptoKey
  /** Revisión y huella de la última copia subida o traída. */
  revision: number
  huella: string | null
  /** ms de la última vez que la copia de la nube quedó igual que este móvil. */
  ultimaCopia?: number
  /** La nube tiene otra copia y aquí hay cambios: no se sube nada hasta que la persona elija. */
  conflicto?: boolean
}

class DispositivoDB extends Dexie {
  vinculo!: EntityTable<VinculoDispositivo, 'id'>
  constructor(nombre = 'appfit-dispositivo') {
    super(nombre)
    this.version(1).stores({ vinculo: 'id' })
  }
}

export const NOMBRE_BD_DISPOSITIVO = 'appfit-dispositivo'
const bd = new DispositivoDB(NOMBRE_BD_DISPOSITIVO)

export function leer(): Promise<VinculoDispositivo | undefined> {
  return bd.vinculo.get(1)
}

export async function guardar(vinculo: Omit<VinculoDispositivo, 'id'>): Promise<void> {
  await bd.vinculo.put({ ...vinculo, id: 1 })
}

export async function actualizar(cambios: Partial<Omit<VinculoDispositivo, 'id'>>): Promise<void> {
  await bd.vinculo.update(1, cambios)
}

export async function borrar(): Promise<void> {
  await bd.vinculo.clear()
}
