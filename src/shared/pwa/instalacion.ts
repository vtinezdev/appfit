interface SolicitudInstalacion extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let solicitud: SolicitudInstalacion | null = null
const listeners = new Set<() => void>()
const notificar = () => listeners.forEach(listener => listener())

export const instalacionDisponible = () => solicitud !== null
export function subscribeInstalacion(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Se registra al arrancar: el evento puede llegar antes de abrir Ajustes. */
export function initInstalacion() {
  const disponible = (event: Event) => {
    event.preventDefault()
    solicitud = event as SolicitudInstalacion
    notificar()
  }
  const instalada = () => { solicitud = null; notificar() }
  window.addEventListener('beforeinstallprompt', disponible)
  window.addEventListener('appinstalled', instalada)
  return () => {
    window.removeEventListener('beforeinstallprompt', disponible)
    window.removeEventListener('appinstalled', instalada)
    instalada()
  }
}

/** Cada evento se puede usar una sola vez, incluso si se cancela la instalación. */
export async function instalarApp() {
  const pendiente = solicitud
  if (!pendiente) return
  solicitud = null
  notificar()
  await pendiente.prompt()
  await pendiente.userChoice
}
