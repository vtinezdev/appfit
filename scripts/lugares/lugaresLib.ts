// Lugares de España para las rutas propias de Caminos: de un volcado de GeoNames (ES.txt) a un paquete JSON pequeño.
// Puro (sin E/S); el CLI es `lugares.ts`. Ver scripts/lugares/README.md.

/** Provincias por código admin2 de GeoNames, con el nombre corto habitual en español (o el oficial si es el usual). */
export const PROVINCIAS: Record<string, string> = {
  C: 'A Coruña', VI: 'Álava', AB: 'Albacete', A: 'Alicante', AL: 'Almería', O: 'Asturias', AV: 'Ávila', BA: 'Badajoz', PM: 'Illes Balears',
  B: 'Barcelona', BI: 'Bizkaia', BU: 'Burgos', CC: 'Cáceres', CA: 'Cádiz', S: 'Cantabria', CS: 'Castellón', CE: 'Ceuta', CR: 'Ciudad Real',
  CO: 'Córdoba', CU: 'Cuenca', SS: 'Gipuzkoa', GI: 'Girona', GR: 'Granada', GU: 'Guadalajara', H: 'Huelva', HU: 'Huesca', J: 'Jaén',
  LO: 'La Rioja', GC: 'Las Palmas', LE: 'León', L: 'Lleida', LU: 'Lugo', M: 'Madrid', MA: 'Málaga', ME: 'Melilla', MU: 'Murcia',
  NA: 'Navarra', OR: 'Ourense', P: 'Palencia', PO: 'Pontevedra', SA: 'Salamanca', TF: 'Santa Cruz de Tenerife', SG: 'Segovia', SE: 'Sevilla',
  SO: 'Soria', T: 'Tarragona', TE: 'Teruel', TO: 'Toledo', V: 'Valencia', VA: 'Valladolid', ZA: 'Zamora', Z: 'Zaragoza',
}

/** Tipos de GeoNames que son núcleos de población (sin barrios `PPLX`, abandonados `PPLQ` ni históricos `PPLH`). */
const TIPOS = new Set(['PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLC', 'PPLL'])

/** Fila del paquete: nombre, índice de provincia, latitud, longitud (4 decimales, ~10 m) y población. */
export type FilaLugar = [nombre: string, provincia: number, lat: number, lon: number, poblacion: number]

export interface PaqueteLugares {
  formato: 1
  fuente: string
  licencia: string
  atribucion: string
  version: string
  provincias: string[]
  lugares: FilaLugar[]
}

const r4 = (n: number) => Math.round(n * 1e4) / 1e4

/**
 * Núcleos con población (en GeoNames, los municipios con su cifra del INE) de las provincias conocidas, ordenados de
 * más a menos habitantes. Sin repetir el mismo nombre en la misma provincia (se queda el más poblado).
 */
export function lugaresDeGeonames(texto: string, version: string): PaqueteLugares {
  const provincias = Object.values(PROVINCIAS).sort((a, b) => a.localeCompare(b, 'es'))
  const indice = new Map(Object.entries(PROVINCIAS).map(([codigo, nombre]) => [codigo, provincias.indexOf(nombre)]))
  const vistos = new Map<string, FilaLugar>()
  for (const linea of texto.split('\n')) {
    const c = linea.split('\t')
    if (c.length < 15 || c[6] !== 'P' || !TIPOS.has(c[7])) continue
    const poblacion = Number(c[14])
    const provincia = indice.get(c[11])
    const lat = Number(c[4])
    const lon = Number(c[5])
    if (!(poblacion > 0) || provincia === undefined || !Number.isFinite(lat) || !Number.isFinite(lon) || !c[1]) continue
    const clave = `${c[1]}|${provincia}`
    const antes = vistos.get(clave)
    if (!antes || antes[4] < poblacion) vistos.set(clave, [c[1], provincia, r4(lat), r4(lon), poblacion])
  }
  const lugares = [...vistos.values()].sort((a, b) => b[4] - a[4] || a[0].localeCompare(b[0], 'es'))
  return {
    formato: 1,
    fuente: 'GeoNames',
    licencia: 'CC BY 4.0',
    atribucion: 'Lugares y poblaciones: GeoNames (geonames.org), CC BY 4.0.',
    version,
    provincias,
    lugares,
  }
}
