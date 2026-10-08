// Icono de cada categoría de alimento: una familia por grupo parecido (29 categorías → 15 iconos), para que se
// distingan a 20 px. El nombre exacto de la categoría se ve al pulsar el icono (`IconoCategoria`).
import type { IconName } from '../../../shared/components/Icon'
import { esCategoriaAlimento, type CategoriaAlimento } from './catalogo/categorias'

export const ICONO_CATEGORIA: Record<CategoriaAlimento, IconName> = {
  Frutas: 'cat-fruta',
  'Verduras y hortalizas': 'cat-verdura',
  'Patatas y tubérculos': 'cat-verdura',
  Legumbres: 'cat-legumbre',
  'Frutos secos y semillas': 'cat-legumbre',
  'Alternativas vegetales': 'cat-legumbre',
  'Cereales, arroz y pasta': 'cat-cereal',
  'Pan y tostadas': 'cat-cereal',
  'Cereales de desayuno y barritas': 'cat-cereal',
  'Galletas, bollería y pasteles': 'cat-dulce',
  'Dulces y chocolate': 'cat-dulce',
  Helados: 'cat-dulce',
  Carnes: 'cat-carne',
  'Embutidos y fiambres': 'cat-carne',
  Pescados: 'cat-pescado',
  Mariscos: 'cat-pescado',
  Huevos: 'cat-huevo',
  'Leche y nata': 'cat-lacteo',
  'Yogures y postres lácteos': 'cat-lacteo',
  Quesos: 'cat-lacteo',
  'Aceites y grasas': 'cat-grasa',
  'Salsas y condimentos': 'cat-grasa',
  Bebidas: 'cat-bebida',
  'Bebidas vegetales': 'cat-bebida',
  'Bebidas alcohólicas': 'cat-alcohol',
  'Snacks salados': 'cat-snack',
  'Platos preparados': 'cat-plato',
  'Alimentos infantiles': 'cat-plato',
  Otros: 'utensils',
}

/** Icono de una categoría; `undefined` si el texto no es una categoría válida. */
export function iconoDeCategoria(categoria: string | undefined): IconName | undefined {
  return esCategoriaAlimento(categoria) ? ICONO_CATEGORIA[categoria] : undefined
}
