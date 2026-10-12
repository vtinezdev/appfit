// Montañas de Cumbres en el orden de la ruta sugerida: primero el Techo de España, el Mont Blanc y las Siete Cumbres
// (lista de Messner, con el Puncak Jaya por Oceanía), de menor a mayor altitud; después, la segunda etapa (ADR 034):
// volcanes, Alpes y los gigantes del Himalaya y el Karakórum, también de menor a mayor. Las nuevas van detrás para no
// cambiar la montaña de quien ya sube. Solo hace falta la altitud de cada cima.
// Fuentes (comprobadas el 11 y el 12 de octubre de 2026):
// - Aneto (vértice 18057, 3.403,35 m), Mulhacén (vértice Mulhacén I, 3.478,69 m) y Teide (3.715 m): Instituto
//   Geográfico Nacional; los mapas redondean el Aneto a 3.404 m.
// - Mont Blanc: medición de septiembre de 2023 (4.805,59 m); su casquete de hielo cambia de un año a otro.
// - Siete Cumbres: altitudes oficiales de cada cima (Everest, medición conjunta de China y Nepal de 2020).
// - Fuji: Autoridad de Información Geoespacial de Japón (vértice de 3.775,63 m; la cima, 3.776 m).
// - Jungfrau (4.158 m), Cervino (4.478 m) y Monte Rosa, Punta Dufour (4.634 m): swisstopo.
// - Chimborazo: medición de 2016 del Instituto Geográfico Militar de Ecuador con la misión geodésica francesa
//   (6.263,47 m). Cotopaxi: 5.897 m, la altitud de referencia habitual.
// - Ojos del Salado: 6.893 m, la del Instituto Geográfico Militar de Chile (otras mediciones dan 6.891 m).
// - K2 (8.611 m), Kangchenjunga (8.586 m), Lhotse (8.516 m) y Makalu (8.485 m): altitudes aceptadas habitualmente.

export type ColeccionMontana = 'espana' | 'siete' | 'alpes' | 'volcanes' | 'gigantes'

export interface Montana {
  id: string
  nombre: string
  /** Metros sobre el nivel del mar. */
  altitud: number
  /** Cordillera y país, para situarla. */
  zona: string
  colecciones?: readonly ColeccionMontana[]
}

export const MONTANAS: readonly Montana[] = [
  { id: 'aneto', nombre: 'Aneto', altitud: 3404, zona: 'Pirineos, Huesca', colecciones: ['espana'] },
  { id: 'mulhacen', nombre: 'Mulhacén', altitud: 3479, zona: 'Sierra Nevada, Granada', colecciones: ['espana'] },
  { id: 'teide', nombre: 'Teide', altitud: 3715, zona: 'Tenerife', colecciones: ['espana', 'volcanes'] },
  { id: 'mont-blanc', nombre: 'Mont Blanc', altitud: 4806, zona: 'Alpes, Francia e Italia', colecciones: ['alpes'] },
  { id: 'puncak-jaya', nombre: 'Puncak Jaya', altitud: 4884, zona: 'Nueva Guinea, Indonesia', colecciones: ['siete'] },
  { id: 'vinson', nombre: 'Vinson', altitud: 4892, zona: 'Antártida', colecciones: ['siete'] },
  { id: 'elbrus', nombre: 'Elbrus', altitud: 5642, zona: 'Cáucaso, Rusia', colecciones: ['siete', 'volcanes'] },
  { id: 'kilimanjaro', nombre: 'Kilimanjaro', altitud: 5895, zona: 'Tanzania', colecciones: ['siete', 'volcanes'] },
  { id: 'denali', nombre: 'Denali', altitud: 6190, zona: 'Alaska, Estados Unidos', colecciones: ['siete'] },
  { id: 'aconcagua', nombre: 'Aconcagua', altitud: 6961, zona: 'Andes, Argentina', colecciones: ['siete'] },
  { id: 'everest', nombre: 'Everest', altitud: 8849, zona: 'Himalaya, Nepal y China', colecciones: ['siete', 'gigantes'] },
  // Segunda etapa.
  { id: 'fuji', nombre: 'Fuji', altitud: 3776, zona: 'Honshu, Japón', colecciones: ['volcanes'] },
  { id: 'jungfrau', nombre: 'Jungfrau', altitud: 4158, zona: 'Alpes berneses, Suiza', colecciones: ['alpes'] },
  { id: 'cervino', nombre: 'Cervino', altitud: 4478, zona: 'Alpes, Suiza e Italia', colecciones: ['alpes'] },
  { id: 'monte-rosa', nombre: 'Monte Rosa', altitud: 4634, zona: 'Alpes, Suiza e Italia', colecciones: ['alpes'] },
  { id: 'cotopaxi', nombre: 'Cotopaxi', altitud: 5897, zona: 'Andes, Ecuador', colecciones: ['volcanes'] },
  { id: 'chimborazo', nombre: 'Chimborazo', altitud: 6263, zona: 'Andes, Ecuador', colecciones: ['volcanes'] },
  { id: 'ojos-del-salado', nombre: 'Ojos del Salado', altitud: 6893, zona: 'Andes, Chile y Argentina', colecciones: ['volcanes'] },
  { id: 'makalu', nombre: 'Makalu', altitud: 8485, zona: 'Himalaya, Nepal y China', colecciones: ['gigantes'] },
  { id: 'lhotse', nombre: 'Lhotse', altitud: 8516, zona: 'Himalaya, Nepal y China', colecciones: ['gigantes'] },
  { id: 'kangchenjunga', nombre: 'Kangchenjunga', altitud: 8586, zona: 'Himalaya, Nepal e India', colecciones: ['gigantes'] },
  { id: 'k2', nombre: 'K2', altitud: 8611, zona: 'Karakórum, Pakistán y China', colecciones: ['gigantes'] },
]

const NOMBRES_COLECCION: Record<ColeccionMontana, string> = {
  espana: 'Techo de España',
  siete: 'Siete Cumbres',
  alpes: 'Alpes',
  volcanes: 'Volcanes',
  gigantes: 'Los cinco más altos',
}

const coleccion = (id: ColeccionMontana) => ({ nombre: NOMBRES_COLECCION[id], montanas: MONTANAS.filter((m) => m.colecciones?.includes(id)).map((m) => m.id) })

export const COLECCIONES: Record<ColeccionMontana, { nombre: string; montanas: readonly string[] }> = {
  espana: coleccion('espana'),
  siete: coleccion('siete'),
  alpes: coleccion('alpes'),
  volcanes: coleccion('volcanes'),
  gigantes: coleccion('gigantes'),
}

export const EVEREST = 'everest'

const POR_ID = new Map(MONTANAS.map((m) => [m.id, m]))

export function montanaDe(id: string): Montana | undefined {
  return POR_ID.get(id)
}

/** Fuente de las altitudes, en una frase para la interfaz. */
export const FUENTE_ALTITUDES = 'Altitudes del Instituto Geográfico Nacional (Aneto, Mulhacén y Teide), la medición de 2023 del Mont Blanc, las oficiales de las Siete Cumbres, swisstopo (Jungfrau, Cervino y Monte Rosa), la Autoridad de Información Geoespacial de Japón (Fuji), los institutos geográficos militares de Ecuador (Chimborazo, 2016) y Chile (Ojos del Salado) y las aceptadas habitualmente para el Cotopaxi y los gigantes del Himalaya y el Karakórum.'
