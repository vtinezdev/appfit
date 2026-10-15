import { borrarTodosLosDatos, exportarBackup, importarBackup } from '../../shared/lib/backup'
import { hayDatosGuardados } from '../../shared/db/estadoDatos'
import { CopiaNube, type FaseCuenta } from './copiaNube'
import * as dispositivoRepo from './data/dispositivoRepo'
import { alCambiarDatos } from './data/cambiosRepo'
import type { Nube } from './data/nube'
import { ESPERA_SUBIDA_MS, INTERVALO_COMPROBACION_MS } from './lib/disparo'

/**
 * Instancia de la copia en la nube para la app y sus disparadores. Sin `VITE_SUPABASE_URL` y
 * `VITE_SUPABASE_PUBLISHABLE_KEY` la cuenta no existe: la app funciona como siempre, solo en el dispositivo.
 */
export const URL_NUBE = import.meta.env.VITE_SUPABASE_URL
export const CLAVE_NUBE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
/** Clave de la sesión de supabase-js en localStorage. */
export const CLAVE_SESION = 'appfit-cuenta'

export const cuentaDisponible = Boolean(URL_NUBE && CLAVE_NUBE)

let nube: Promise<Nube> | undefined
function cargarNube(): Promise<Nube> {
  nube ??= import('./data/nubeSupabase').then((m) => m.crearNubeSupabase(URL_NUBE!, CLAVE_NUBE!))
  return nube
}

function haySesionGuardada(): boolean {
  try {
    return localStorage.getItem(CLAVE_SESION) !== null
  } catch {
    return false
  }
}

export const copiaNube = new CopiaNube({
  nube: cargarNube,
  dispositivo: dispositivoRepo,
  exportar: exportarBackup,
  importar: importarBackup,
  hayDatos: hayDatosGuardados,
  borrarDatos: borrarTodosLosDatos,
  haySesionGuardada,
})

const FASES_ACTIVAS: FaseCuenta[] = ['al-dia', 'pendiente', 'subiendo', 'sin-conexion', 'error']
const activa = () => FASES_ACTIVAS.includes(copiaNube.leerEstado().fase)

/**
 * Arranca la cuenta (sin descargar supabase-js si nunca se ha entrado) y deja puestos los disparadores: tras cada
 * escritura con espera, al pasar a segundo plano (iOS puede cerrar la app después), al volver y al recuperar la red.
 */
export function iniciarCopiaNube(): void {
  if (!cuentaDisponible) return
  void copiaNube.iniciar().catch(() => undefined)

  let espera: ReturnType<typeof setTimeout> | undefined
  let ultimaComprobacion = Date.now()
  const subirYa = () => {
    clearTimeout(espera)
    espera = undefined
    if (activa()) void copiaNube.sincronizar()
  }
  const comprobar = () => {
    if (!activa() || Date.now() - ultimaComprobacion < INTERVALO_COMPROBACION_MS) return
    ultimaComprobacion = Date.now()
    void copiaNube.sincronizar({ comprobarNube: true })
  }

  alCambiarDatos(() => {
    if (!activa()) return
    copiaNube.marcarPendiente()
    clearTimeout(espera)
    espera = setTimeout(subirYa, ESPERA_SUBIDA_MS)
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (espera !== undefined) subirYa()
    } else {
      void copiaNube.marcarActividad()
      comprobar()
    }
  })
  window.addEventListener('online', () => {
    ultimaComprobacion = 0
    comprobar()
  })
}
