// Montañas de Cumbres, de menor a mayor altitud: es también la ruta sugerida (el Techo de España, el Mont Blanc y las
// Siete Cumbres en la lista de Messner, con el Puncak Jaya por Oceanía). Solo hace falta la altitud de cada cima.
// Fuentes (comprobadas el 11 de octubre de 2026):
// - Aneto (vértice 18057, 3.403,35 m), Mulhacén (vértice Mulhacén I, 3.478,69 m) y Teide (3.715 m): Instituto
//   Geográfico Nacional; los mapas redondean el Aneto a 3.404 m.
// - Mont Blanc: medición de septiembre de 2023 (4.805,59 m); su casquete de hielo cambia de un año a otro.
// - Siete Cumbres: altitudes oficiales de cada cima (Everest, medición conjunta de China y Nepal de 2020).

export type ColeccionMontana = 'espana' | 'siete'

export interface Montana {
  id: string
  nombre: string
  /** Metros sobre el nivel del mar. */
  altitud: number
  /** Cordillera y país, para situarla. */
  zona: string
  coleccion?: ColeccionMontana
}

export const MONTANAS: readonly Montana[] = [
  { id: 'aneto', nombre: 'Aneto', altitud: 3404, zona: 'Pirineos, Huesca', coleccion: 'espana' },
  { id: 'mulhacen', nombre: 'Mulhacén', altitud: 3479, zona: 'Sierra Nevada, Granada', coleccion: 'espana' },
  { id: 'teide', nombre: 'Teide', altitud: 3715, zona: 'Tenerife', coleccion: 'espana' },
  { id: 'mont-blanc', nombre: 'Mont Blanc', altitud: 4806, zona: 'Alpes, Francia e Italia' },
  { id: 'puncak-jaya', nombre: 'Puncak Jaya', altitud: 4884, zona: 'Nueva Guinea, Indonesia', coleccion: 'siete' },
  { id: 'vinson', nombre: 'Vinson', altitud: 4892, zona: 'Antártida', coleccion: 'siete' },
  { id: 'elbrus', nombre: 'Elbrus', altitud: 5642, zona: 'Cáucaso, Rusia', coleccion: 'siete' },
  { id: 'kilimanjaro', nombre: 'Kilimanjaro', altitud: 5895, zona: 'Tanzania', coleccion: 'siete' },
  { id: 'denali', nombre: 'Denali', altitud: 6190, zona: 'Alaska, Estados Unidos', coleccion: 'siete' },
  { id: 'aconcagua', nombre: 'Aconcagua', altitud: 6961, zona: 'Andes, Argentina', coleccion: 'siete' },
  { id: 'everest', nombre: 'Everest', altitud: 8849, zona: 'Himalaya, Nepal y China', coleccion: 'siete' },
]

export const COLECCIONES: Record<ColeccionMontana, { nombre: string; montanas: readonly string[] }> = {
  espana: { nombre: 'Techo de España', montanas: MONTANAS.filter((m) => m.coleccion === 'espana').map((m) => m.id) },
  siete: { nombre: 'Siete Cumbres', montanas: MONTANAS.filter((m) => m.coleccion === 'siete').map((m) => m.id) },
}

export const EVEREST = 'everest'

const POR_ID = new Map(MONTANAS.map((m) => [m.id, m]))

export function montanaDe(id: string): Montana | undefined {
  return POR_ID.get(id)
}

/** Fuente de las altitudes, en una frase para la interfaz. */
export const FUENTE_ALTITUDES = 'Altitudes del Instituto Geográfico Nacional (Aneto, Mulhacén y Teide), la medición de 2023 del Mont Blanc y las oficiales de las Siete Cumbres.'
