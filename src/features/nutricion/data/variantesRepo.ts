// Acceso a la tabla `variantesReceta`: variantes guardadas de una receta propia o de un plato del catálogo.
// Las funciones de lectura no escriben nunca, así que se pueden usar dentro de un useLiveQuery.
import { db } from '../../../shared/db/db'
import type { MealItem, VarianteReceta } from '../../../shared/db/types'
import { NOMBRE_VARIANTE_MAX, type BaseVariante } from '../lib/variantes'

/** La variante no es válida (nombre o ingredientes). El mensaje se puede mostrar tal cual. */
export class VarianteInvalidaError extends Error {}

export interface VarianteInput {
  base: BaseVariante
  nombre: string
  /** Ingredientes del lote entero. */
  ingredientes: MealItem[]
  pesoCocinadoG: number
}

/** Variantes de una receta, de la más antigua a la más reciente. */
export async function deBase(base: BaseVariante): Promise<VarianteReceta[]> {
  const lista = 'recetaId' in base
    ? await db.variantesReceta.where('recetaId').equals(base.recetaId).toArray()
    : await db.variantesReceta.where('catalogId').equals(base.catalogId).toArray()
  return lista.sort((a, b) => a.createdAt - b.createdAt)
}

export async function crear(datos: VarianteInput): Promise<number> {
  const nombre = datos.nombre.trim()
  if (!nombre) throw new VarianteInvalidaError('Ponle un nombre a la variante.')
  if (nombre.length > NOMBRE_VARIANTE_MAX) throw new VarianteInvalidaError(`El nombre admite como mucho ${NOMBRE_VARIANTE_MAX} caracteres.`)
  if (datos.ingredientes.length === 0) throw new VarianteInvalidaError('La variante necesita al menos un ingrediente.')
  if (!(datos.pesoCocinadoG > 0)) throw new VarianteInvalidaError('El peso cocinado debe ser mayor que 0.')
  const ahora = Date.now()
  return db.variantesReceta.add({ ...datos.base, nombre, ingredientes: datos.ingredientes, pesoCocinadoG: datos.pesoCocinadoG, createdAt: ahora, updatedAt: ahora })
}

/** Borra la variante y la devuelve para poder deshacerlo con `restaurar`. */
export async function borrar(id: number): Promise<VarianteReceta | undefined> {
  return db.transaction('rw', db.variantesReceta, async () => {
    const v = await db.variantesReceta.get(id)
    if (v) await db.variantesReceta.delete(id)
    return v
  })
}

/** «Deshacer» tras `borrar`: vuelve a guardarla con su mismo id. */
export async function restaurar(v: VarianteReceta): Promise<void> {
  await db.variantesReceta.put(v)
}
