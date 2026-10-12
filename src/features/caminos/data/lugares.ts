// Descarga de la lista de lugares de España (rutas propias). Es un archivo estático del propio origen
// (`public/lugares/espana.json`, ver scripts/lugares/README.md); el service worker lo guarda tras el primer uso. No toca
// IndexedDB. Se carga una vez por sesión y solo al crear o editar una ruta.
import { leerPaqueteLugares, type Lugar } from '../lib/lugares'

let cargando: Promise<Lugar[]> | null = null

export function cargarLugares(): Promise<Lugar[]> {
  cargando ??= fetch('/lugares/espana.json')
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    .then(leerPaqueteLugares)
    .catch((e: unknown) => {
      cargando = null
      throw e
    })
  return cargando
}
