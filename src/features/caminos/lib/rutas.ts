// Rutas de Caminos: reales (Caminos de Santiago y grandes rutas del mundo), literarias de dominio público y fantasías
// propias de AppFit. Cada ruta es una lista de etapas con el lugar donde acaba y sus kilómetros; el orden de `RUTAS`
// es el de la ruta sugerida (de más corta a más larga dentro de cada bloque). Las nuevas van al final para no cambiar
// la ruta de quien ya camina.
//
// Fuentes (consultadas el 12 de octubre de 2026):
// - Caminos de Santiago: etapas y kilómetros de Gronze (gronze.com), la guía de referencia en español. Francés por la
//   ruta de Napoleón; Primitivo por Hospitales; Norte por Tol y Miraz; Vía de la Plata por el Sanabrés y Laza; desde
//   Melide (Primitivo) y Arzúa (Norte) siguen por el Francés. Melide–Arzúa (14,5 km) es de alberguescaminosantiago.com,
//   porque Gronze no da ese tramo suelto.
// - West Highland Way: web oficial de la ruta (westhighlandway.org). Milford Track: Department of Conservation de Nueva
//   Zelanda (doc.govt.nz).
// - Kumano Kodo (Nakahechi): Visit Wakayama, 38 km de Takijiri-oji a Hongu y 27 km de Hongu a Nachi; el reparto en
//   dos jornadas de cada tramo es aproximado.
// - Camino Inca: las cuatro jornadas habituales de las agencias autorizadas (unos 45 km); varían según la fuente.
// - La Odisea y La vuelta al mundo en 80 días (dominio público): los lugares del libro, con las identificaciones
//   tradicionales de los de la Odisea; los km son la distancia en línea recta entre ellos, calculada por AppFit.
// - La senda del dragón dormido y La piedra de fuego: fantasías de AppFit; lugares y km inventados.

export type ColeccionRuta = 'santiago' | 'mundo' | 'literatura' | 'fantasia' | 'propia'

export interface Etapa {
  /** Lugar donde acaba la etapa. */
  hasta: string
  km: number
}

export interface Ruta {
  id: string
  nombre: string
  /** Dónde está o de dónde sale, para situarla. */
  zona: string
  /** Lugar de salida. */
  desde: string
  coleccion: ColeccionRuta
  etapas: readonly Etapa[]
}

const e = (hasta: string, km: number): Etapa => ({ hasta, km })

/** Etapas finales del Francés, que comparten el Primitivo y el del Norte. */
const FINAL_FRANCES = [e('O Pedrouzo', 19.3), e('Santiago de Compostela', 19.4)]

export const RUTAS: readonly Ruta[] = [
  // ── Primera etapa: rutas de días o de pocas semanas ──
  {
    id: 'ingles', nombre: 'Camino Inglés', zona: 'Galicia', desde: 'Ferrol', coleccion: 'santiago',
    etapas: [e('Pontedeume', 27.7), e('Betanzos', 19.7), e('Hospital de Bruma', 24), e('Sigüeiro', 24.4), e('Santiago de Compostela', 15.7)],
  },
  {
    id: 'inca', nombre: 'Camino Inca', zona: 'Cusco, Perú', desde: 'Km 82 (Piscacucho)', coleccion: 'mundo',
    etapas: [e('Wayllabamba', 12), e('Pacaymayo', 11), e('Wiñay Wayna', 16), e('Machu Picchu', 6)],
  },
  {
    id: 'milford', nombre: 'Milford Track', zona: 'Fiordland, Nueva Zelanda', desde: 'Glade Wharf', coleccion: 'mundo',
    etapas: [e('Clinton Hut', 5), e('Mintaro Hut', 17.5), e('Dumpling Hut', 13), e('Sandfly Point', 18)],
  },
  {
    id: 'kumano', nombre: 'Kumano Kodo', zona: 'Nakahechi, Japón', desde: 'Takijiri-oji', coleccion: 'mundo',
    etapas: [e('Chikatsuyu', 13), e('Kumano Hongu Taisha', 25), e('Koguchi', 13), e('Kumano Nachi Taisha', 14)],
  },
  {
    id: 'fisterra', nombre: 'Camino de Fisterra y Muxía', zona: 'Galicia', desde: 'Santiago de Compostela', coleccion: 'santiago',
    etapas: [e('Negreira', 20.6), e('Olveiroa', 33.6), e('Corcubión', 21.4), e('Fisterra', 10.6), e('Muxía', 27.6)],
  },
  {
    id: 'west-highland', nombre: 'West Highland Way', zona: 'Escocia', desde: 'Milngavie', coleccion: 'mundo',
    etapas: [
      e('Drymen', 19), e('Rowardennan', 24), e('Inverarnan', 22.5), e('Tyndrum', 19.5), e('Inveroran', 14.5), e('Kingshouse', 16),
      e('Kinlochleven', 14.5), e('Fort William', 24),
    ],
  },
  {
    id: 'portugues', nombre: 'Camino Portugués', zona: 'Desde Oporto', desde: 'Oporto', coleccion: 'santiago',
    etapas: [
      e('Vilarinho', 26.5), e('Barcelos', 28.1), e('Ponte de Lima', 34.5), e('Rubiães', 17.4), e('Tui', 19.1), e('Redondela', 31.9),
      e('Pontevedra', 19.8), e('Caldas de Reis', 21.1), e('Padrón', 18.6), e('Santiago de Compostela', 24.4),
    ],
  },
  {
    id: 'primitivo', nombre: 'Camino Primitivo', zona: 'Asturias y Galicia', desde: 'Oviedo', coleccion: 'santiago',
    etapas: [
      e('Grado', 25.2), e('Salas', 22.3), e('Tineo', 19.8), e('Borres', 15.9), e('Berducedo', 24.1), e('Grandas de Salime', 20.4),
      e('A Fonsagrada', 25.2), e('O Cádavo', 24.3), e('Lugo', 29.5), e('A Ponte Ferreira', 26.5), e('Melide', 20), e('Arzúa', 14.5),
      ...FINAL_FRANCES,
    ],
  },
  {
    id: 'dragon', nombre: 'La senda del dragón dormido', zona: 'Fantasía de AppFit', desde: 'Aldea de Brezal', coleccion: 'fantasia',
    etapas: [
      e('Molino del Arroyo Frío', 18), e('Encrucijada de los Tres Robles', 24), e('Posada del Gallo Tuerto', 21), e('Puente de las Lavanderas', 26),
      e('Bosque de los Susurros', 23), e('Claro de las Luciérnagas', 19), e('Ermita del Ermitaño Calvo', 27), e('Lago Espejo', 22),
      e('Pueblo de los Herreros', 25), e('Desfiladero del Eco', 28), e('Refugio de los Pastores', 20), e('Glaciar Azul', 24),
      e('Collado del Viento', 18), e('Cueva de los Huesos', 21), e('Ladera de Ceniza', 16), e('Guarida del dragón dormido', 12),
    ],
  },
  // ── Segunda etapa: los grandes caminos ──
  {
    id: 'frances', nombre: 'Camino Francés', zona: 'Desde Saint-Jean-Pied-de-Port', desde: 'Saint-Jean-Pied-de-Port', coleccion: 'santiago',
    etapas: [
      e('Roncesvalles', 24.2), e('Zubiri', 21.4), e('Pamplona', 20.4), e('Puente la Reina', 23.9), e('Estella', 21.6), e('Los Arcos', 21.3),
      e('Logroño', 27.6), e('Nájera', 28.5), e('Santo Domingo de la Calzada', 20.7), e('Belorado', 22), e('San Juan de Ortega', 23.9),
      e('Burgos', 25.8), e('Hornillos del Camino', 20.3), e('Castrojeriz', 19.9), e('Frómista', 24.7), e('Carrión de los Condes', 18.8),
      e('Terradillos de los Templarios', 26.3), e('Bercianos del Real Camino', 23.2), e('Mansilla de las Mulas', 26.3), e('León', 18.4),
      e('San Martín del Camino', 24.6), e('Astorga', 23.7), e('Foncebadón', 25.8), e('Ponferrada', 26.8), e('Villafranca del Bierzo', 23.2),
      e('O Cebreiro', 27.8), e('Triacastela', 20.6), e('Sarria', 17.8), e('Portomarín', 22.2), e('Palas de Rei', 24.8), e('Arzúa', 28.5),
      ...FINAL_FRANCES,
    ],
  },
  {
    id: 'norte', nombre: 'Camino del Norte', zona: 'Desde Irún', desde: 'Irún', coleccion: 'santiago',
    etapas: [
      e('San Sebastián', 24.7), e('Zarautz', 22.1), e('Deba', 21), e('Markina-Xemein', 23.3), e('Gernika', 25.4), e('Lezama', 19.8),
      e('Bilbao', 11), e('Portugalete', 19.2), e('Castro Urdiales', 32.1), e('Laredo', 30.5), e('Güemes', 28.7), e('Santander', 15.3),
      e('Santillana del Mar', 36.3), e('Comillas', 22.2), e('Colombres', 28), e('Llanes', 22.9), e('Ribadesella', 30), e('Colunga', 20.1),
      e('Villaviciosa', 17.5), e('Gijón', 29.8), e('Avilés', 25.4), e('Muros de Nalón', 21.2), e('Soto de Luiña', 15.3), e('Cadavedo', 18.5),
      e('Luarca', 15.9), e('La Caridad', 30.5), e('Ribadeo', 21.3), e('Gondán', 20.9), e('Mondoñedo', 15.6), e('Abadín', 16.6),
      e('Vilalba', 20.8), e('Baamonde', 18.5), e('Sobrado dos Monxes', 39.8), e('Arzúa', 22),
      ...FINAL_FRANCES,
    ],
  },
  {
    id: 'via-plata', nombre: 'Vía de la Plata', zona: 'Desde Sevilla, por el Sanabrés', desde: 'Sevilla', coleccion: 'santiago',
    etapas: [
      e('Guillena', 21.9), e('Castilblanco de los Arroyos', 18.3), e('Almadén de la Plata', 28.2), e('Monesterio', 33.6), e('Fuente de Cantos', 20.7),
      e('Zafra', 24.2), e('Villafranca de los Barros', 19.8), e('Torremejía', 26.7), e('Mérida', 15.3), e('Alcuéscar', 35.9), e('Cáceres', 37.4),
      e('Embalse de Alcántara', 34.5), e('Grimaldo', 20.3), e('Carcaboso', 30.2), e('Aldeanueva del Camino', 38.3), e('La Calzada de Béjar', 21.8),
      e('Fuenterroble de Salvatierra', 20.2), e('San Pedro de Rozados', 27.9), e('Salamanca', 23.6), e('El Cubo del Vino', 36.4), e('Zamora', 31.6),
      e('Montamarta', 19.2), e('Granja de Moreruela', 22.6), e('Tábara', 25.1), e('Santa Marta de Tera', 22.9), e('Mombuey', 36.1),
      e('Puebla de Sanabria', 31.7), e('Lubián', 28.1), e('A Gudiña', 23.7), e('Laza', 34), e('Xunqueira de Ambía', 33), e('Ourense', 21.8),
      e('Cea', 22.3), e('O Castro', 14.5), e('Silleda', 28), e('Outeiro', 23.9), e('Santiago de Compostela', 16.7),
    ],
  },
  {
    id: 'piedra-fuego', nombre: 'La piedra de fuego', zona: 'Fantasía de AppFit', desde: 'Hondonada de Prados Verdes', coleccion: 'fantasia',
    etapas: [
      e('Vado de los Juncos', 45), e('Posada del Jabalí Rojo', 60), e('Colinas de las Tumbas', 70), e('Atalaya del Rey Olvidado', 85),
      e('Río de las Piedras Cantoras', 110), e('Valle de las Mil Fuentes', 95), e('Paso de la Nieve Eterna', 120), e('Minas de Hierro Negro', 90),
      e('Bosque de los Abedules Blancos', 80), e('Gran Río', 140), e('Cascadas de los Gigantes', 160), e('Colinas Pardas', 110),
      e('Ciénaga de las Ranas Gigantes', 95), e('Muralla de Obsidiana', 75), e('Valle de los Sauces Muertos', 85), e('Desfiladero del Cuervo', 60),
      e('Meseta de Ceniza', 120), e('Volcán del Fin', 70),
    ],
  },
  {
    id: 'odisea', nombre: 'La Odisea', zona: 'Homero · el Mediterráneo', desde: 'Troya', coleccion: 'literatura',
    etapas: [
      e('Ísmaro, la ciudad de los cícones', 121), e('Cabo Malea', 534), e('País de los lotófagos', 1160), e('Isla de los cíclopes', 572),
      e('Isla de Eolo', 103), e('Tierra de los lestrigones', 330), e('Ea, la isla de Circe', 47), e('Entrada del Hades', 96),
      e('Isla de las sirenas', 42), e('Escila y Caribdis', 279), e('Trinacria', 179), e('Ogigia, la isla de Calipso', 107),
      e('Esqueria, la isla de los feacios', 637), e('Ítaca', 155),
    ],
  },
  {
    id: 'vuelta-al-mundo', nombre: 'La vuelta al mundo en 80 días', zona: 'Julio Verne · alrededor del mundo', desde: 'Londres', coleccion: 'literatura',
    etapas: [
      e('París', 344), e('Turín', 584), e('Brindisi', 969), e('Suez', 1775), e('Adén', 2302), e('Bombay', 3049), e('Allahabad', 1175),
      e('Calcuta', 735), e('Singapur', 2899), e('Hong Kong', 2587), e('Yokohama', 2867), e('San Francisco', 8291), e('Ogden', 974),
      e('Omaha', 1339), e('Chicago', 694), e('Nueva York', 1144), e('Queenstown', 5018), e('Dublín', 216), e('Liverpool', 217), e('Londres', 287),
    ],
  },
]

export const NOMBRE_COLECCION: Record<ColeccionRuta, string> = {
  santiago: 'Caminos de Santiago',
  mundo: 'Rutas del mundo',
  literatura: 'Viajes de libro',
  fantasia: 'Fantasía',
  propia: 'Tus rutas',
}

/** Qué son los kilómetros de cada colección, en una frase. */
export const NOTA_COLECCION: Record<ColeccionRuta, string> = {
  santiago: 'Etapas y kilómetros reales',
  mundo: 'Etapas y kilómetros reales',
  literatura: 'Los lugares del libro, en línea recta',
  fantasia: 'Lugares y kilómetros inventados por AppFit',
  propia: 'Creadas por ti: km en línea recta con un 15 % más por las curvas, o los que pongas',
}

/** Metros totales de una ruta: la suma de sus etapas. */
export function metrosRuta(r: Ruta): number {
  return r.etapas.reduce((a, x) => a + Math.round(x.km * 1000), 0)
}

const POR_ID = new Map(RUTAS.map((r) => [r.id, r]))

export function rutaDe(id: string): Ruta | undefined {
  return POR_ID.get(id)
}

/** Fuente de las distancias, en una frase para la interfaz. */
export const FUENTE_RUTAS = 'Caminos de Santiago: etapas de Gronze (Melide–Arzúa, de alberguescaminosantiago.com). West Highland Way: su web oficial. Milford Track: Department of Conservation de Nueva Zelanda. Kumano Kodo: Visit Wakayama, con el reparto de cada tramo en dos jornadas aproximado. Camino Inca: las cuatro jornadas habituales (las fuentes varían entre 40 y 45 km). La Odisea y La vuelta al mundo: los lugares del libro, en línea recta (los de la Odisea, con sus identificaciones tradicionales). Las fantasías son de AppFit.'
