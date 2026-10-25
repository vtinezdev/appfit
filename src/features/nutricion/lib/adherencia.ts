// Adherencia, rachas y alimentos más frecuentes del Resumen. Funciones puras.
import { claveRef, refDe } from '../../../shared/db/foodRef'
import type { Entry } from '../../../shared/db/types'
import { addDays } from '../../../shared/lib/dates'
import { nombreVisible } from './nombresCortos'

/** Un día cuenta como «en rango» si sus kcal están a ±10 % del objetivo. */
export const TOLERANCIA_ADHERENCIA = 0.1

export interface Adherencia {
  /** Días con algún registro dentro del periodo (hasta hoy). */
  diasRegistrados: number
  /** De ellos, los que están a ±10 % del objetivo de kcal de ese día. */
  diasEnRango: number
  /** 0–100, entero; `null` si no hay días registrados. */
  porcentaje: number | null
}

/**
 * Adherencia de un periodo: de los días con registro (no futuros), qué parte está dentro de ±10 % del objetivo de kcal
 * de ese mismo día. Un día sin registro no es un día fuera de rango: no cuenta.
 */
export function calcularAdherencia(
  fechas: string[],
  hoy: string,
  kcalPorDia: ReadonlyMap<string, number>,
  kcalObjetivo: (fecha: string) => number,
  tolerancia: number = TOLERANCIA_ADHERENCIA,
): Adherencia {
  const registrados = fechas.filter((f) => f <= hoy && (kcalPorDia.get(f) ?? 0) > 0)
  const enRango = registrados.filter((f) => {
    const objetivo = kcalObjetivo(f)
    return objetivo > 0 && Math.abs((kcalPorDia.get(f) ?? 0) - objetivo) <= objetivo * tolerancia + 1e-9
  })
  return {
    diasRegistrados: registrados.length,
    diasEnRango: enRango.length,
    porcentaje: registrados.length === 0 ? null : Math.round((enRango.length / registrados.length) * 100),
  }
}

export interface Rachas {
  /** Días seguidos con registro que llegan hasta hoy; si hoy aún no hay, hasta ayer (la racha no se rompe hasta que acaba el día). */
  actual: number
  /** La racha más larga de todo el historial. */
  mejor: number
}

/** Rachas de días registrados a partir de las fechas (YYYY-MM-DD, sin repetir ni orden obligatorio) con alguna entrada. */
export function calcularRachas(fechasConRegistro: Iterable<string>, hoy: string): Rachas {
  const set = new Set(fechasConRegistro)
  const ordenadas = [...set].sort()
  let mejor = 0
  let corrida = 0
  let anterior: string | null = null
  for (const f of ordenadas) {
    corrida = anterior !== null && addDays(anterior, 1) === f ? corrida + 1 : 1
    mejor = Math.max(mejor, corrida)
    anterior = f
  }
  let cursor = set.has(hoy) ? hoy : addDays(hoy, -1)
  let actual = 0
  while (set.has(cursor)) {
    actual += 1
    cursor = addDays(cursor, -1)
  }
  return { actual, mejor }
}

export interface AlimentoTop {
  /** `claveRef` del alimento. */
  clave: string
  nombre: string
  kcal: number
  prot: number
  gramos: number
  veces: number
}

/**
 * Alimentos del periodo agrupados por referencia (propio o del catálogo), con su nombre corto. Las «Kcal rápidas» y las
 * entradas sin referencia no se agrupan (no son un alimento identificable) y quedan fuera.
 */
export function agruparAlimentos(entries: Entry[], personales: ReadonlyMap<string, string> = new Map()): AlimentoTop[] {
  const grupos = new Map<string, AlimentoTop & { ultimo: number }>()
  for (const e of entries) {
    if (e.rapida) continue
    let ref
    try { ref = refDe(e) } catch { continue }
    if (!ref) continue
    const clave = claveRef(ref)
    const g = grupos.get(clave) ?? { clave, nombre: nombreVisible(e, personales), kcal: 0, prot: 0, gramos: 0, veces: 0, ultimo: 0 }
    g.kcal += e.kcal
    g.prot += e.prot
    g.gramos += e.gramos
    g.veces += 1
    if (e.createdAt >= g.ultimo) { g.ultimo = e.createdAt; g.nombre = nombreVisible(e, personales) }
    grupos.set(clave, g)
  }
  return [...grupos.values()].map(({ ultimo: _ultimo, ...g }) => g)
}

/** Los `n` primeros por `criterio` (kcal o proteína), de más a menos; el empate se resuelve por nombre. */
export function topAlimentos(alimentos: AlimentoTop[], criterio: 'kcal' | 'prot', n = 5): AlimentoTop[] {
  return [...alimentos].sort((a, b) => b[criterio] - a[criterio] || a.nombre.localeCompare(b.nombre, 'es')).filter((a) => a[criterio] > 0).slice(0, n)
}
