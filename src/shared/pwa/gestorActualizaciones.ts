import type { EstadoActualizacion, VersionApp } from './version'

interface Puertos {
  versionInstalada: string
  enLinea: () => boolean
  leerRemota: () => Promise<VersionApp>
  preparar: () => Promise<void>
  aplicar: () => Promise<void>
  recargar: () => void
  ahora: () => number
  desarrollo?: boolean
}

/** Estado de esta página: descargar un SW nuevo no equivale a estar ejecutando esa versión. */
export function crearGestorActualizaciones(p: Puertos) {
  let estado: EstadoActualizacion = { fase: p.desarrollo ? 'desarrollo' : 'sin-comprobar', hayActualizacion: false, comprobadaEn: null, error: null }
  const oyentes = new Set<() => void>()
  let comprobacion: Promise<void> | undefined
  const aplicando = () => estado.fase === 'aplicando'
  const cambiar = (cambio: Partial<EstadoActualizacion>) => { estado = { ...estado, ...cambio }; oyentes.forEach(fn => fn()) }

  function comprobar(): Promise<void> {
    if (p.desarrollo || estado.fase === 'aplicando') return Promise.resolve()
    if (comprobacion) return comprobacion
    comprobacion = (async () => {
      if (!p.enLinea()) { cambiar({ fase: 'sin-conexion', error: null }); return }
      cambiar({ fase: 'comprobando', error: null })
      try {
        const version = await p.leerRemota()
        if (!p.enLinea()) { cambiar({ fase: 'sin-conexion' }); return }
        const hayActualizacion = version.id !== p.versionInstalada
        cambiar({ hayActualizacion, fase: hayActualizacion ? 'disponible' : 'al-dia', comprobadaEn: p.ahora() })
        // La descarga es independiente: un fallo de caché no cambia la versión que ejecuta esta página.
        void p.preparar().catch(() => {})
      } catch {
        cambiar({ fase: p.enLinea() ? 'error' : 'sin-conexion', error: 'No se ha podido comprobar la versión. Inténtalo de nuevo con conexión.' })
      }
    })().finally(() => { comprobacion = undefined })
    return comprobacion
  }

  async function actualizar(): Promise<void> {
    if (p.desarrollo || aplicando()) return
    if (comprobacion) await comprobacion
    if (!estado.hayActualizacion || aplicando()) return
    cambiar({ fase: 'aplicando', error: null })
    try {
      await p.aplicar()
      p.recargar()
    } catch {
      cambiar({ fase: 'disponible', error: 'No se ha podido actualizar. Comprueba la conexión y vuelve a intentarlo.' })
    }
  }

  return {
    getEstado: () => estado,
    suscribir: (fn: () => void) => { oyentes.add(fn); return () => { oyentes.delete(fn) } },
    comprobar,
    actualizar,
  }
}
