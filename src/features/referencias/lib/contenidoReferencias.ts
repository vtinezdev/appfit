import type { FuenteReferencia } from '../../../shared/lib/referenciasNutricionales'

export const AREAS_REFERENCIAS = [
  { id: 'catalogo', nombre: 'Catálogo de alimentos', resumen: 'Origen y alcance de los valores nutricionales.' },
  { id: 'objetivos', nombre: 'Objetivos nutricionales', resumen: 'Tus objetivos y las referencias de cada nutriente.' },
  { id: 'energia', nombre: 'Energía y objetivo', resumen: 'Cómo estima Perfil tu gasto y tu objetivo diario, con fuentes.' },
  { id: 'alimentarias', nombre: 'Recomendaciones alimentarias', resumen: 'Referencias por grupos de alimentos.' },
  { id: 'datos', nombre: 'Sobre los datos', resumen: 'Cómo interpretar la información incompleta.' },
] as const
export type AreaReferencias = (typeof AREAS_REFERENCIAS)[number]['id']

/** Fuentes realmente publicadas en public/catalogo/manifest.json y escaneo actual. */
export const FUENTES_CATALOGO = [
  { id: 'ciqual', nombre: 'ANSES · CIQUAL 2025', url: 'https://ciqual.anses.fr',
    descripcion: 'Composición de alimentos genéricos por 100 g. Los nombres del catálogo se han traducido al español.',
    licencia: 'Licence Ouverte Etalab 2.0' },
  { id: 'offes', nombre: 'Open Food Facts', url: 'https://world.openfoodfacts.org',
    descripcion: 'Selección de productos de marca de España y datos consultados al escanear códigos de barras. Los valores pueden estar expresados por 100 g o 100 ml; proceden de un catálogo colaborativo y pueden contener errores.',
    licencia: 'Open Database License (ODbL); contenidos individuales DbCL' },
] as const

export const GRUPOS_ALIMENTARIOS = [
  { id: 'fruta', nombre: 'Fruta' }, { id: 'verduras', nombre: 'Verduras' },
  { id: 'legumbres', nombre: 'Legumbres' }, { id: 'pescado', nombre: 'Pescado' },
  { id: 'frutos-secos', nombre: 'Frutos secos' }, { id: 'carnes', nombre: 'Carnes' }, { id: 'otros', nombre: 'Otros grupos' },
] as const
export type GrupoAlimentarioId = (typeof GRUPOS_ALIMENTARIOS)[number]['id']
export interface RecomendacionAlimentaria {
  grupo: GrupoAlimentarioId
  periodo: 'dia' | 'semana'
  unidad: 'raciones'
  minimo?: number
  maximo?: number
  descripcion: string
  fuente: FuenteReferencia
}
/** Placeholder interno deliberado: faltan criterios contrastados, no son recomendaciones de cero raciones. */
export const ESTADO_RECOMENDACIONES = 'pendiente-definicion' as const
export const RECOMENDACIONES_ALIMENTARIAS: readonly RecomendacionAlimentaria[] = []

export const SOBRE_LOS_DATOS = [
  { titulo: 'La cobertura importa', texto: 'No todos los alimentos tienen datos de fibra, azúcares, sal o grasas saturadas. «Información disponible en 7 de 9 alimentos» significa que el total de ese nutriente solo incluye los 7 registros con un valor conocido.' },
  { titulo: 'Sin datos no significa cero', texto: 'APPFIT suma únicamente valores conocidos. Un cero registrado sí cuenta; un dato ausente no se completa con cero. Si ningún alimento tiene información, se muestra «Sin datos». Un día sin alimentos comienza en cero.' },
  { titulo: 'Datos guardados con cada registro', texto: 'Los nutrientes se ajustan a la cantidad que registras y se conservan con esa entrada. Actualizar el catálogo no reescribe el historial. Los alimentos propios también pueden contener valores que hayas introducido manualmente.' },
  { titulo: 'Totales, no azúcares libres', texto: 'El catálogo y los registros incluyen azúcares totales. APPFIT no estima cuántos son libres ni interpreta el consumo incompleto como una evaluación de salud.' },
] as const
