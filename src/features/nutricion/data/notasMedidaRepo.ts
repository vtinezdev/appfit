// Acceso a la tabla `notasMedida`: notas sobre medidas que el intérprete todavía no entiende, para añadirlas después.
import { db } from '../../../shared/db/db'
import type { NotaMedida } from '../../../shared/db/types'

/** Las más recientes primero. */
export function listar(): Promise<NotaMedida[]> {
  return db.notasMedida.orderBy('createdAt').reverse().toArray()
}

/** Guarda una nota (sin espacios de más). Una nota vacía no se guarda: devuelve `undefined`. */
export async function crear(texto: string): Promise<number | undefined> {
  const limpio = texto.trim()
  if (!limpio) return undefined
  return db.notasMedida.add({ texto: limpio, createdAt: Date.now() })
}

/** Borra la nota y la devuelve, para poder deshacer con `restaurar`. */
export function borrar(id: number): Promise<NotaMedida | undefined> {
  return db.transaction('rw', db.notasMedida, async () => {
    const nota = await db.notasMedida.get(id)
    if (nota) await db.notasMedida.delete(id)
    return nota
  })
}

export async function restaurar(nota: NotaMedida): Promise<void> {
  await db.notasMedida.put(nota)
}
