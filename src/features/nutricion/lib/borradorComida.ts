import type { ItemRevision } from './alimentos'

/** Excluye metadatos de búsqueda/alias que llegan al leer; solo compara valores editables. */
function valores(item: ItemRevision) {
  return [item.nombre, item.gramos, item.kcal100, item.prot100, item.carb100, item.grasa100,
    Object.entries(item.nutrientes ?? {}).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b))]
}

export function revisionModificada(actual: ItemRevision | undefined, inicial: ItemRevision) {
  return !actual || !!actual.nombreCortoModificado || JSON.stringify(valores(actual)) !== JSON.stringify(valores(inicial))
}
