/**
 * Lenguaje visual de los datos: cada magnitud nutricional tiene UN color y UNA etiqueta,
 * sea en una barra, una gráfica o un texto. Los colores salen de los tokens (--c-kcal, --c-protein…).
 * Las clases están escritas enteras para que Tailwind las detecte.
 */
export type MacroKey = 'kcal' | 'prot' | 'carbs' | 'fat'

export const MACROS: Record<MacroKey, { label: string; short: string; unit: string; bg: string; text: string }> = {
  kcal: { label: 'Calorías', short: 'Kcal', unit: 'kcal', bg: 'bg-kcal', text: 'text-kcal' },
  prot: { label: 'Proteína', short: 'P', unit: 'g', bg: 'bg-protein', text: 'text-protein' },
  carbs: { label: 'Carbohidratos', short: 'C', unit: 'g', bg: 'bg-carbs', text: 'text-carbs' },
  fat: { label: 'Grasa', short: 'G', unit: 'g', bg: 'bg-fat', text: 'text-fat' },
}
