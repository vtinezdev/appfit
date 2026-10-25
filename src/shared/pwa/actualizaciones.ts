import { crearGestorActualizaciones } from './gestorActualizaciones'
import { leerVersion } from './version'

export const VERSION_INSTALADA = __APP_VERSION__
const BASE = import.meta.env.BASE_URL
let registro: Promise<ServiceWorkerRegistration> | undefined

function obtenerRegistro(): Promise<ServiceWorkerRegistration> {
  registro ??= navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE, updateViaCache: 'none' }).catch(e => {
    registro = undefined
    throw e
  })
  return registro
}

async function preparar() {
  if ('serviceWorker' in navigator) await (await obtenerRegistro()).update()
}

/** Instalar puede tardar o fallar sin red. No recargar con una descarga incompleta. */
function esperarInstalacion(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve, reject) => {
    const fin = (error?: Error) => { clearTimeout(timer); worker.removeEventListener('statechange', cambio); if (error) reject(error); else resolve() }
    const cambio = () => {
      if (worker.state === 'installed' || worker.state === 'activated') fin()
      else if (worker.state === 'redundant') fin(new Error('Instalación incompleta'))
    }
    const timer = setTimeout(() => fin(new Error('La descarga está tardando demasiado')), 30000)
    worker.addEventListener('statechange', cambio)
    cambio()
  })
}

function activar(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve, reject) => {
    const fin = (error?: Error) => {
      clearTimeout(timer)
      navigator.serviceWorker.removeEventListener('controllerchange', controlado)
      worker.removeEventListener('statechange', cambio)
      if (error) reject(error); else resolve()
    }
    const controlado = () => fin()
    const cambio = () => { if (worker.state === 'redundant') fin(new Error('No se ha podido activar')) }
    const timer = setTimeout(() => fin(new Error('No se ha podido activar')), 15000)
    navigator.serviceWorker.addEventListener('controllerchange', controlado)
    worker.addEventListener('statechange', cambio)
    worker.postMessage({ type: 'SKIP_WAITING' })
  })
}

async function aplicar() {
  if (!('serviceWorker' in navigator)) return // Un navegador sin SW obtiene la versión nueva al recargar.
  const reg = await obtenerRegistro()
  // Una actualización ya descargada también se puede aplicar sin conexión.
  if (!reg.waiting) await reg.update()
  if (reg.installing) await esperarInstalacion(reg.installing)
  if (reg.waiting) await activar(reg.waiting)
  // Si otra pestaña ya activó el SW nuevo, esta página solo necesita recargarse.
}

async function aplicarConPlazo() {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([aplicar(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('No se ha podido completar la actualización')), 45000)
    })])
  } finally { clearTimeout(timer) }
}

export const actualizaciones = crearGestorActualizaciones({
  versionInstalada: VERSION_INSTALADA.id,
  desarrollo: import.meta.env.DEV,
  enLinea: () => navigator.onLine !== false,
  leerRemota: async () => {
    const respuesta = await fetch(`${BASE}version.json?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
    if (!respuesta.ok) throw new Error('No se ha podido consultar la versión')
    return leerVersion(await respuesta.json())
  },
  preparar,
  aplicar: aplicarConPlazo,
  recargar: () => window.location.reload(),
  ahora: Date.now,
})

let iniciado = false
export function iniciarActualizaciones() {
  if (iniciado || import.meta.env.DEV) return
  iniciado = true
  if ('serviceWorker' in navigator) void obtenerRegistro().catch(() => {})
  const comprobar = () => {
    if (document.visibilityState !== 'visible') return
    const e = actualizaciones.getEstado()
    if (e.fase === 'sin-conexion' || e.comprobadaEn === null || Date.now() - e.comprobadaEn >= 60000) void actualizaciones.comprobar()
  }
  void actualizaciones.comprobar()
  window.addEventListener('online', () => void actualizaciones.comprobar())
  window.addEventListener('offline', () => void actualizaciones.comprobar())
  window.addEventListener('focus', comprobar)
  document.addEventListener('visibilitychange', comprobar)
  setInterval(comprobar, 5 * 60000)
}
