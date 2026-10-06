import type { NutrientesAdicionales, Objetivos } from '../db/types'
import { formatInt, formatNumber } from './format'

export type NutrienteId = keyof Objetivos | keyof NutrientesAdicionales
export type TipoReferencia = 'objetivo' | 'minimo' | 'limite' | 'referencia'
export interface FuenteReferencia { nombre: string; url?: string }
export interface ReferenciaNutriente { tipo: 'minimo' | 'limite' | 'referencia'; gramos: number }
export interface ReferenciaNutricional {
  id: NutrienteId
  nombre: string
  valor: number
  unidad: 'g' | 'kcal'
  tipo: TipoReferencia
  comparador?: '≥' | '<' | '≤'
  descripcion: string
  particularidades: readonly string[]
  fuente: FuenteReferencia
  minimo?: number
  maximo?: number
}

export const FUENTES_REFERENCIAS = {
  oms: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
  sal: 'https://www.who.int/news-room/fact-sheets/detail/salt-reduction',
  ue: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32011R1169',
}
const FUENTES = {
  personal: { nombre: 'Objetivos configurados en Ajustes de APPFIT' },
  perfil: { nombre: 'Estimación energética de tu Perfil en APPFIT' },
  oms: { nombre: 'OMS · Alimentación saludable', url: FUENTES_REFERENCIAS.oms },
  sal: { nombre: 'OMS · Reducción de sal', url: FUENTES_REFERENCIAS.sal },
  ue: { nombre: 'Reglamento (UE) 1169/2011 · Anexo XIII', url: FUENTES_REFERENCIAS.ue },
} satisfies Record<string, FuenteReferencia>

export const NOMBRES_NUTRIENTES: Record<NutrienteId, string> = {
  kcal: 'Calorías', prot: 'Proteínas', carb: 'Hidratos de carbono', grasa: 'Grasas',
  fibra: 'Fibra', azucares: 'Azúcares', sal: 'Sal', agSat: 'Grasas saturadas',
}
export const IDS_NUTRIENTES: readonly NutrienteId[] = ['kcal', 'prot', 'carb', 'grasa', 'fibra', 'azucares', 'sal', 'agSat']
export const TIPOS_REFERENCIA: Record<TipoReferencia, string> = {
  objetivo: 'Objetivo personal', minimo: 'Mínimo recomendado', limite: 'Límite general', referencia: 'Referencia de etiquetado',
}

/** Conserva los criterios existentes, sin crear objetivos nuevos ni escribirlos. */
export function energiaDeReferencia(kcal: number): number {
  return Number.isFinite(kcal) && kcal > 0 ? kcal : 2000
}
export function referenciasNutrientes(kcal: number): Record<keyof NutrientesAdicionales, ReferenciaNutriente> {
  return {
    fibra: { tipo: 'minimo', gramos: 25 },
    azucares: { tipo: 'referencia', gramos: 90 },
    sal: { tipo: 'limite', gramos: 5 },
    agSat: { tipo: 'limite', gramos: energiaDeReferencia(kcal) * 0.1 / 9 },
  }
}

/** Los objetivos se reciben de Settings: nunca se sustituyen por una recomendación clínica. */
export function referenciaNutricional(id: NutrienteId, objetivos: Objetivos, origen: 'perfil' | 'manual' = 'manual'): ReferenciaNutricional {
  const base = { id, nombre: NOMBRES_NUTRIENTES[id] }
  if (id === 'kcal' || id === 'prot' || id === 'carb' || id === 'grasa') {
    const delPerfil = origen === 'perfil'
    return { ...base, valor: objetivos[id], unidad: id === 'kcal' ? 'kcal' : 'g', tipo: 'objetivo', fuente: delPerfil ? FUENTES.perfil : FUENTES.personal,
      descripcion: delPerfil
        ? `Es tu objetivo diario actual. Las calorías se calculan en Perfil con tus datos y el objetivo elegido${id === 'kcal' ? '' : '; los macros conservan el reparto en % de Ajustes'}. Los macros se editan en Ajustes.`
        : 'Es tu objetivo diario actual, editable en Ajustes. APPFIT mantiene el reparto de los macronutrientes al cambiar las calorías; al cambiar un macro, ajusta los otros para conservar la misma energía.',
      particularidades: [delPerfil
        ? 'Es una estimación orientativa con ecuaciones poblacionales (error típico de ±10 %), no una prescripción individual. El método y las fuentes están en Referencias, Energía y objetivo.'
        : 'Los valores iniciales son un punto de partida editable. El proyecto no documenta una fuente clínica para ellos; no constituyen una recomendación individual.', 'La energía de los macros se calcula con 4 kcal/g de proteína e hidratos y 9 kcal/g de grasa.'] }
  }
  const referencia = referenciasNutrientes(objetivos.kcal)[id]
  const comun = { ...base, valor: referencia.gramos, unidad: 'g' as const, tipo: referencia.tipo }
  if (id === 'fibra') return { ...comun, comparador: '≥', minimo: referencia.gramos, fuente: FUENTES.oms,
    descripcion: 'Referencia general para adultos: consumir al menos esta cantidad de fibra al día.',
    particularidades: ['Es un mínimo, no un techo de consumo. APPFIT no define un máximo general para la fibra.'] }
  if (id === 'azucares') return { ...comun, fuente: FUENTES.ue,
    descripcion: 'Valor de referencia europeo de etiquetado para azúcares totales en una dieta de 2.000 kcal. No es un máximo recomendado de salud y no se escala con tu objetivo de calorías.',
    particularidades: ['APPFIT registra azúcares totales, incluidos los propios de fruta y leche. Los datos disponibles no permiten separar los azúcares libres.', 'El límite de la OMS para azúcares libres no se aplica a este total. Superar la marca no permite concluir que se haya superado ese límite.'] }
  if (id === 'sal') return { ...comun, comparador: '<', maximo: referencia.gramos, fuente: FUENTES.sal,
    descripcion: 'Referencia general para adultos: consumir menos de esta cantidad de sal al día.',
    particularidades: ['APPFIT no define un mínimo recomendado de sal. La barra muestra únicamente el consumo conocido.'] }
  return { ...comun, comparador: '≤', maximo: referencia.gramos, fuente: FUENTES.oms,
    descripcion: `Como máximo el 10% de la energía diaria en grasas saturadas. Aquí se utiliza ${formatInt(energiaDeReferencia(objetivos.kcal))} kcal y 9 kcal por gramo.`,
    particularidades: ['Si el objetivo energético no es válido, la referencia usa 2.000 kcal. APPFIT no define un mínimo recomendado de grasas saturadas.'] }
}

export function textoReferencia(referencia: ReferenciaNutricional): string {
  const valor = formatNumber(referencia.valor, referencia.unidad === 'kcal' ? 0 : 1)
  return `${referencia.comparador ? `${referencia.comparador} ` : ''}${valor} ${referencia.unidad}/día`
}
