import { claveRef, refDe, type FoodRef } from '../../../shared/db/foodRef'
import { db } from '../../../shared/db/db'
import type { Entry } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'
import type { ItemRevision } from '../lib/alimentos'

function nombreValido(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0
}

async function nombresDeRefs(refs: Array<FoodRef | undefined>): Promise<Map<string, string>> {
  const claves = [...new Set(refs.filter((ref): ref is FoodRef => ref !== undefined).map(claveRef))]
  const registros = await db.nombresAlimentos.bulkGet(claves)
  return new Map(registros.flatMap((registro) => (registro && nombreValido(registro.nombre) ? [[registro.id, registro.nombre.trim()] as const] : [])))
}

/** Preferencias de los alimentos visibles en el historial; los ids blandos siguen resolviendo aunque falte el catálogo. */
export function paraEntradas(entries: Entry[]): Promise<Map<string, string>> {
  return nombresDeRefs(entries.map((entry) => {
    if (entry.rapida) return undefined
    try {
      return refDe(entry)
    } catch {
      return undefined
    }
  }))
}

/** Sobrescrituras guardadas para los registros de una comida, por FoodRef estable. */
export function paraComida(entries: Entry[]): Promise<Map<string, string>> {
  return paraEntradas(entries)
}

/** Preferencias existentes de la revisión y, si se edita, del registro. Una referencia solo se conserva si no se renombró. */
export async function paraRevision(items: ItemRevision[], entryEditar?: Entry): Promise<Map<number, string>> {
  const refs: Array<FoodRef | undefined> = []
  const nombresPropios = new Set<string>()
  for (const item of items) {
    const mismoNombre = normalizeName(item.nombre) === item.origen.nombreNorm
    if (!mismoNombre) {
      refs.push(undefined)
    } else if (item.origen.catalogId !== undefined) {
      refs.push({ tipo: 'catalog', id: item.origen.catalogId })
    } else if (item.origen.guardado) {
      nombresPropios.add(item.origen.nombreNorm)
      refs.push(undefined)
    } else {
      refs.push(undefined)
    }
  }

  const alimentos = nombresPropios.size > 0
    ? await db.foods.where('nombreNorm').anyOf([...nombresPropios]).toArray()
    : []
  const porNombre = new Map(alimentos.map((food) => [food.nombreNorm, food.id]))
  let i = 0
  const refsResueltas = items.map((item) => {
    const ref = refs[i++]
    if (ref) return ref
    if (normalizeName(item.nombre) === item.origen.nombreNorm && item.origen.guardado) {
      const id = porNombre.get(item.origen.nombreNorm)
      if (id !== undefined) return { tipo: 'user' as const, id }
    }
    return undefined
  })

  if (entryEditar) {
    try {
      refsResueltas[0] = refDe(entryEditar)
    } catch {
      refsResueltas[0] = undefined
    }
  }

  const preferencias = await nombresDeRefs(refsResueltas)
  return new Map(refsResueltas.flatMap((ref, index) => {
    const nombre = ref ? preferencias.get(claveRef(ref)) : undefined
    return nombre ? [[index, nombre] as const] : []
  }))
}

/** Persiste o elimina un nombre en la transacción ya abierta por el repositorio propietario. */
export function guardarEnTransaccion(ref: FoodRef, nombre: string | null): Promise<void> {
  const id = claveRef(ref)
  if (nombre === null) return db.nombresAlimentos.delete(id)
  const normalizado = nombre.trim()
  return normalizado ? db.nombresAlimentos.put({ id, nombre: normalizado }).then(() => undefined) : db.nombresAlimentos.delete(id)
}
