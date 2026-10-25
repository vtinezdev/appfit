// Un archivo de actividad elegido en «Importar»: FIT (binario) por su cabecera; si no, GPX o TCX por su contenido.
import { esFit, resumirFit } from './fit'
import type { ResumenGpx } from './gpx'
import { esTcx, resumirArchivoActividad } from './tcx'

export type FormatoActividad = 'GPX' | 'TCX' | 'FIT'

/** Lee los bytes del archivo y devuelve su formato y su resumen. Lanza `GpxError` si no es un formato conocido. */
export function leerArchivoActividad(bytes: Uint8Array): { formato: FormatoActividad; resumen: ResumenGpx } {
  if (esFit(bytes)) return { formato: 'FIT', resumen: resumirFit(bytes) }
  const texto = new TextDecoder().decode(bytes)
  return { formato: esTcx(texto) ? 'TCX' : 'GPX', resumen: resumirArchivoActividad(texto) }
}
