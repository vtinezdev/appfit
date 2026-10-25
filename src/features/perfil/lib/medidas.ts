// Medidas corporales (cm y %). Lógica pura; los datos viven en `medidasRepo`.
// No confundir con «Medidas caseras» de Nutrición (cucharadas, vasos…).
import type { Medida } from '../../../shared/db/types'

export type CampoMedida = 'cintura' | 'cadera' | 'pecho' | 'brazo' | 'muslo' | 'grasaPct'

export const CAMPOS_MEDIDA: { campo: CampoMedida; etiqueta: string; unidad: 'cm' | '%'; min: number; max: number }[] = [
  { campo: 'cintura', etiqueta: 'Cintura', unidad: 'cm', min: 30, max: 250 },
  { campo: 'cadera', etiqueta: 'Cadera', unidad: 'cm', min: 40, max: 250 },
  { campo: 'pecho', etiqueta: 'Pecho', unidad: 'cm', min: 40, max: 250 },
  { campo: 'brazo', etiqueta: 'Brazo', unidad: 'cm', min: 10, max: 100 },
  { campo: 'muslo', etiqueta: 'Muslo', unidad: 'cm', min: 20, max: 150 },
  { campo: 'grasaPct', etiqueta: 'Grasa corporal', unidad: '%', min: 2, max: 70 },
]

/** Valor válido del campo (finito y dentro de su rango de plausibilidad), redondeado a 1 decimal; `null` si no. */
export function validarMedida(campo: CampoMedida, valor: number): number | null {
  const def = CAMPOS_MEDIDA.find((c) => c.campo === campo)
  if (!def || !Number.isFinite(valor)) return null
  const r = Math.round(valor * 10) / 10
  return r >= def.min && r <= def.max ? r : null
}

export type BorradorMedida = Partial<Record<CampoMedida, string>>

/**
 * Convierte el formulario (texto por campo; vacío = no medido) en valores validados. Devuelve `error` con el primer
 * campo inválido, o si no se ha rellenado ninguno.
 */
export function medidasDeBorrador(b: BorradorMedida): { valores: Partial<Record<CampoMedida, number>> } | { error: string } {
  const valores: Partial<Record<CampoMedida, number>> = {}
  for (const def of CAMPOS_MEDIDA) {
    const texto = (b[def.campo] ?? '').trim().replace(',', '.')
    if (texto === '') continue
    const v = validarMedida(def.campo, Number(texto))
    if (v === null) return { error: `${def.etiqueta}: introduce un valor entre ${def.min} y ${def.max} ${def.unidad}.` }
    valores[def.campo] = v
  }
  if (Object.keys(valores).length === 0) return { error: 'Rellena al menos una medida.' }
  return { valores }
}

export interface ResumenCampo {
  campo: CampoMedida
  etiqueta: string
  unidad: 'cm' | '%'
  /** Último valor registrado de este campo (puede ser de otra fecha que el último registro). */
  ultimo: { fecha: string; valor: number } | null
  /** Último − anterior valor registrado de este campo; `null` si solo hay uno. */
  variacion: number | null
}

/** Último valor y variación respecto al anterior, por campo (cada campo se compara con su propio historial). */
export function resumenMedidas(medidas: Pick<Medida, 'fecha' | CampoMedida>[]): ResumenCampo[] {
  const ordenadas = [...medidas].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
  return CAMPOS_MEDIDA.map(({ campo, etiqueta, unidad }) => {
    const con = ordenadas.filter((m) => m[campo] !== undefined)
    const ultimo = con[0] ? { fecha: con[0].fecha, valor: con[0][campo]! } : null
    const previo = con[1]?.[campo]
    return { campo, etiqueta, unidad, ultimo, variacion: ultimo && previo !== undefined ? Math.round((ultimo.valor - previo) * 10) / 10 : null }
  })
}
