import type { Objetivos } from '../../../shared/db/types'

type Macro = 'prot' | 'carb' | 'grasa'

/** Kcal por gramo de cada macro (Atwater). */
export const KCAL_POR_GRAMO: Record<Macro, number> = { prot: 4, carb: 4, grasa: 9 }

const MACROS: Macro[] = ['prot', 'carb', 'grasa']

/** Reparto de kcal que se usa cuando no hay ninguno del que partir (todos los macros a 0). */
const REPARTO_INICIAL: Record<Macro, number> = { prot: 0.3, carb: 0.4, grasa: 0.3 }

/** Diferencia máxima entre kcal y la suma de macros que se da por cuadrada (redondear a gramos enteros deja unas pocas kcal). */
export const TOLERANCIA_KCAL = 5

export function kcalDeMacros(o: Pick<Objetivos, Macro>): number {
  return o.prot * KCAL_POR_GRAMO.prot + o.carb * KCAL_POR_GRAMO.carb + o.grasa * KCAL_POR_GRAMO.grasa
}

export function objetivosCuadran(o: Objetivos): boolean {
  return Math.abs(kcalDeMacros(o) - o.kcal) <= TOLERANCIA_KCAL
}

/** Fracción de kcal que aporta cada uno de `macros` dentro de ese grupo. Sin kcal en el grupo, el reparto inicial. */
function reparto(o: Pick<Objetivos, Macro>, macros: Macro[]): Record<Macro, number> {
  const sumar = (peso: (m: Macro) => number) => macros.reduce((acc, m) => acc + peso(m), 0)
  let peso = (m: Macro) => Math.max(0, o[m]) * KCAL_POR_GRAMO[m]
  if (sumar(peso) <= 0) peso = (m) => REPARTO_INICIAL[m]
  const total = sumar(peso)
  const r = { prot: 0, carb: 0, grasa: 0 }
  for (const m of macros) r[m] = peso(m) / total
  return r
}

/**
 * Pasa `kcal` a gramos enteros de `macros` según `fracciones`. Todos se redondean salvo el último macro de 4 kcal/g,
 * que se queda con el resto: así la suma no se aleja de `kcal` más de 2 kcal.
 */
function repartirKcal(kcal: number, macros: Macro[], fracciones: Record<Macro, number>): Record<Macro, number> {
  const orden = [...macros].sort((a, b) => KCAL_POR_GRAMO[b] - KCAL_POR_GRAMO[a]) // grasa primero
  const g = { prot: 0, carb: 0, grasa: 0 }
  let resto = kcal
  orden.forEach((m, i) => {
    const gramos = i === orden.length - 1 ? resto / KCAL_POR_GRAMO[m] : (kcal * fracciones[m]) / KCAL_POR_GRAMO[m]
    g[m] = Math.max(0, Math.round(gramos))
    resto -= g[m] * KCAL_POR_GRAMO[m]
  })
  return g
}

/**
 * Objetivos tras cambiar `campo` a `valor`, con kcal y macros cuadrados (4·P + 4·C + 9·G ≈ kcal):
 * - kcal: los tres macros se escalan manteniendo el reparto en % que tenían.
 * - un macro: las kcal no cambian; los otros dos se reparten lo que queda manteniendo su proporción entre ellos.
 *   El macro no puede pasar de las kcal totales.
 * Se calcula siempre desde `base` (los objetivos antes de empezar a editar), así los valores intermedios al teclear
 * («2», «25», «250»…) no pierden el reparto por redondeo.
 */
export function reajustarObjetivos(base: Objetivos, campo: keyof Objetivos, valor: number): Objetivos {
  const v = Math.max(0, Math.round(Number.isFinite(valor) ? valor : 0))
  if (campo === 'kcal') {
    return { kcal: v, ...repartirKcal(v, MACROS, reparto(base, MACROS)) }
  }
  const gramos = Math.min(v, Math.floor(base.kcal / KCAL_POR_GRAMO[campo]))
  const otros = MACROS.filter((m) => m !== campo)
  const resto = base.kcal - gramos * KCAL_POR_GRAMO[campo]
  return { kcal: base.kcal, ...repartirKcal(resto, otros, reparto(base, otros)), [campo]: gramos }
}

/** Cuadra unos objetivos que no cuadran: mantiene las kcal y ajusta los macros a su reparto actual. */
export function cuadrarObjetivos(o: Objetivos): Objetivos {
  return reajustarObjetivos(o, 'kcal', o.kcal)
}
