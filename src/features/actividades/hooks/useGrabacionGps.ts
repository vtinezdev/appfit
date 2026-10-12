// Acceso al GPS y a la pantalla encendida mientras se graba. Solo navegador: sin datos ni red.
import { useEffect, useRef, useState } from 'react'
import type { Lectura } from '../lib/grabacion'

export type EstadoGps = 'buscando' | 'ok' | 'denegado' | 'no-disponible' | 'error'

/**
 * Sigue la posición con alta precisión mientras `activo`. Cada lectura va a `onLectura` (la última función recibida, sin
 * volver a suscribirse). Devuelve el estado de la señal y la precisión de la última lectura.
 */
export function useGps(activo: boolean, onLectura: (l: Lectura) => void): { estado: EstadoGps; precision: number | null } {
  const [estado, setEstado] = useState<EstadoGps>('buscando')
  const [precision, setPrecision] = useState<number | null>(null)
  const callback = useRef(onLectura)
  useEffect(() => { callback.current = onLectura })

  useEffect(() => {
    if (!activo) return
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) { setEstado('no-disponible'); return }
    setEstado('buscando')
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setEstado('ok')
        setPrecision(p.coords.accuracy)
        callback.current({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          ...(p.coords.altitude !== null ? { ele: p.coords.altitude } : {}),
          precision: p.coords.accuracy,
          t: p.timestamp,
        })
      },
      (e) => setEstado(e.code === e.PERMISSION_DENIED ? 'denegado' : e.code === e.TIMEOUT ? 'buscando' : 'error'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [activo])

  return { estado, precision }
}

export type EstadoPantalla = 'encendida' | 'no-disponible' | 'suelta'

/** Pide que la pantalla no se apague mientras `activo` y lo vuelve a pedir al volver a la app (iOS lo suelta al salir). */
export function usePantallaEncendida(activo: boolean): EstadoPantalla {
  const [estado, setEstado] = useState<EstadoPantalla>('suelta')

  useEffect(() => {
    if (!activo) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) { setEstado('no-disponible'); return }
    let bloqueo: WakeLockSentinel | null = null
    let terminado = false
    const pedir = async () => {
      try {
        const nuevo = await navigator.wakeLock.request('screen')
        if (terminado) { void nuevo.release(); return }
        bloqueo = nuevo
        setEstado('encendida')
        nuevo.addEventListener('release', () => { if (!terminado) setEstado('suelta') })
      } catch {
        if (!terminado) setEstado('suelta')
      }
    }
    const alVolver = () => { if (document.visibilityState === 'visible') void pedir() }
    void pedir()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      terminado = true
      document.removeEventListener('visibilitychange', alVolver)
      void bloqueo?.release()
    }
  }, [activo])

  return estado
}
