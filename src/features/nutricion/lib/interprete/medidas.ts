// Intérprete local: medidas caseras ambiguas. «Una cucharada» puede ser rasa o colmada, y no pesa lo mismo de
// aceite que de crema de cacahuete: en vez de dar unos gramos por buenos, la revisión pregunta cuánto es una.
// También, la lista de todas las medidas que se entienden, para la pantalla «Medidas».
import { formatInt, formatNumber } from '../../../../shared/lib/format'
import type { ParteComida } from './parsear'
import { medidasPorAlimento, type Racion } from './raciones'
import { FORMAS, GRAMOS_POR_UNIDAD, SOLO_CON_DE, SOLO_DELANTE_DE, UNIDADES_EXACTAS, type Unidad } from './unidades'

/** Las medidas que se preguntan: cómo se nombra una («¿Cuánto es una cucharada?») y los gramos posibles, de menos a más. */
const AMBIGUAS: Partial<Record<Unidad, { una: string; opciones: number[] }>> = {
  cucharadita: { una: 'una cucharadita', opciones: [5, 8, 10, 12] },
  cucharada: { una: 'una cucharada', opciones: [10, 15, 20, 25] },
  chorrito: { una: 'un chorrito', opciones: [5, 10, 15, 20] },
  punado: { una: 'un puñado', opciones: [20, 30, 40, 50] },
  vaso: { una: 'un vaso', opciones: [150, 200, 250, 300] },
  taza: { una: 'una taza', opciones: [150, 200, 250, 300] },
  bol: { una: 'un bol', opciones: [200, 300, 400, 500] },
  plato: { una: 'un plato', opciones: [200, 250, 300, 400] },
  racion: { una: 'una ración', opciones: [100, 150, 200, 250] },
  porcion: { una: 'una porción', opciones: [60, 80, 100, 150] },
  rebanada: { una: 'una rebanada', opciones: [20, 30, 40, 60] },
  scoop: { una: 'un scoop', opciones: [25, 30, 35, 40] },
  cazo: { una: 'un cazo', opciones: [100, 150, 200, 250] },
  trozo: { una: 'un trozo', opciones: [25, 50, 100, 150] },
  filete: { una: 'un filete', opciones: [100, 150, 200, 250] },
  bola: { una: 'una bola', opciones: [40, 60, 80] },
  onza: { una: 'una onza', opciones: [5, 7, 10] },
  nuez: { una: 'una nuez', opciones: [5, 10, 15] },
  copa: { una: 'una copa', opciones: [100, 150, 200] },
}

/** Una medida casera pendiente de concretar («2 cucharadas»): cuántas son y cuántos gramos puede pesar cada una. */
export interface MedidaAmbigua {
  cantidad: number
  unidad: Unidad
  /** Gramos posibles de una unidad, de menos a más. */
  opciones: number[]
  /** Los gramos de una unidad que ha elegido el usuario. Mientras no elija, el ítem no tiene gramos. */
  elegida?: number
}

/**
 * La medida ambigua de una parte, o `undefined` si la cantidad no lo es: peso o volumen exactos, unidades
 * sueltas, medidas con un peso claro (vaso, lata…) o una medida que el alimento ya concreta (`Racion.medidas`).
 */
export function medidaAmbigua(parte: Pick<ParteComida, 'cantidad' | 'unidad'>, racion: Racion | undefined): MedidaAmbigua | undefined {
  const { unidad } = parte
  if (unidad === undefined || racion?.medidas?.[unidad] !== undefined) return undefined
  const ambigua = AMBIGUAS[unidad]
  if (!ambigua) return undefined
  return { cantidad: parte.cantidad ?? 1, unidad, opciones: [...ambigua.opciones] }
}

/** Gramos de la medida si cada unidad pesa `gramosPorUnidad` (redondeados, nunca menos de 1). */
export function gramosDeMedida(medida: Pick<MedidaAmbigua, 'cantidad'>, gramosPorUnidad: number): number {
  return Math.max(1, Math.round(medida.cantidad * gramosPorUnidad))
}

/** Lo que cambia en el ítem al elegir cuánto pesa una unidad: la opción elegida y los gramos que salen. */
export function elegirMedida(medida: MedidaAmbigua, gramosPorUnidad: number): { medida: MedidaAmbigua; gramos: number } {
  return { medida: { ...medida, elegida: gramosPorUnidad }, gramos: gramosDeMedida(medida, gramosPorUnidad) }
}

/** La pregunta de la revisión: «¿Cuánto es una cucharada?». */
export function preguntaMedida(medida: Pick<MedidaAmbigua, 'unidad'>): string {
  return `¿Cuánto es ${AMBIGUAS[medida.unidad]?.una ?? 'una unidad'}?`
}

/** Texto de una opción: «15 g» o, si hay más de una unidad, también el total («15 g × 2 = 30 g»). */
export function textoOpcionMedida(medida: Pick<MedidaAmbigua, 'cantidad'>, gramosPorUnidad: number): string {
  const una = `${formatNumber(gramosPorUnidad, 1)} g`
  if (medida.cantidad === 1) return una
  return `${una} × ${formatNumber(medida.cantidad, 2)} = ${formatInt(gramosDeMedida(medida, gramosPorUnidad))} g`
}

/** Una medida tal como se explica en la pantalla de medidas. */
export interface MedidaCatalogo {
  unidad: Unidad
  /** Cómo se puede escribir; la primera es su nombre. */
  formas: readonly string[]
  /** `pregunta`: se elige entre `opciones`; `fija`: vale `gramos`; `exacta`: peso o volumen. */
  tipo: 'pregunta' | 'fija' | 'exacta'
  opciones?: number[]
  gramos?: number
  /** Alimentos con un peso propio para esta medida («lata» de atún: 60 g). Con ellos no se pregunta. */
  porAlimento: { alimento: string; gramos: number }[]
  /** Cuándo cuenta como medida, si no es siempre («solo delante de "de"»). */
  condicion?: string
}

/** Todas las medidas que entiende el intérprete, para explicarlas: primero las que se preguntan, luego las fijas y las exactas. */
export function catalogoMedidas(): MedidaCatalogo[] {
  const excepciones = medidasPorAlimento()
  const orden = { pregunta: 0, fija: 1, exacta: 2 }
  return (Object.keys(FORMAS) as Unidad[])
    .map((unidad): MedidaCatalogo => {
      const ambigua = AMBIGUAS[unidad]
      const tipo = UNIDADES_EXACTAS.has(unidad) ? 'exacta' : ambigua ? 'pregunta' : 'fija'
      const m: MedidaCatalogo = {
        unidad,
        formas: FORMAS[unidad],
        tipo,
        porAlimento: excepciones.filter((e) => e.unidad === unidad).map(({ alimento, gramos }) => ({ alimento, gramos })),
      }
      if (ambigua) m.opciones = [...ambigua.opciones]
      else m.gramos = GRAMOS_POR_UNIDAD[unidad]
      const delante = SOLO_DELANTE_DE[unidad]
      if (delante) m.condicion = `Solo delante de ${delante.map((a) => `«de ${a}»`).join(' o ')}`
      else if (SOLO_CON_DE.has(unidad)) m.condicion = 'Solo delante de «de»'
      return m
    })
    .sort((a, b) => orden[a.tipo] - orden[b.tipo])
}

/** Los gramos de una medida para la lista: «10 · 15 · 20 · 25 g» si se pregunta, «330 g» si es fija. */
export function textoValoresMedida(m: Pick<MedidaCatalogo, 'opciones' | 'gramos'>): string {
  const valores = m.opciones ?? [m.gramos ?? 0]
  return `${valores.map((g) => formatNumber(g, 1)).join(' · ')} g`
}
