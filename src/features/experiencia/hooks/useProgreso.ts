// Lector compartido de la gamificación (REN-01): experiencia, Ritmo, Cumbres, Caminos y Vitrina se leen y calculan una
// sola vez por día y lo reparten a todas las pantallas que los usan. Solo lee (`docs/datos.md`: las lecturas nunca escriben).
import { liveQuery, type Subscription } from 'dexie'
import { useCallback, useSyncExternalStore } from 'react'
import { leerVitrina, type EstadoVitrina } from '../../vitrina/hooks/leerVitrina'

/** Todo lo derivado de la gamificación hasta `hoy` (la Vitrina incluye la experiencia, Ritmo, Cumbres y Caminos). */
export type EstadoProgreso = EstadoVitrina

/**
 * Tiempo que se conserva el cálculo después de que lo suelte la última pantalla: ir de Inicio a Cumbres, Vitrina o Ritmo
 * y volver no recalcula nada. Mientras alguien lo usa, se recalcula solo cuando cambian los datos (como `useLiveQuery`).
 */
export const MARGEN_MS = 30_000

interface Entrada {
  valor: EstadoProgreso | undefined
  oyentes: Set<() => void>
  sub: Subscription | null
  soltar: ReturnType<typeof setTimeout> | null
}

/**
 * Almacén por día: una sola suscripción `liveQuery` de Dexie por `hoy` mientras haya oyentes (y `margenMs` después del
 * último), compartida con `useSyncExternalStore`. `leer` se inyecta para los tests.
 */
export function crearAlmacenProgreso(leer: (hoy: string) => Promise<EstadoProgreso>, margenMs = MARGEN_MS) {
  const entradas = new Map<string, Entrada>()

  function cerrar(hoy: string, e: Entrada) {
    e.sub?.unsubscribe()
    entradas.delete(hoy)
  }

  return {
    suscribir(hoy: string, oyente: () => void): () => void {
      let e = entradas.get(hoy)
      if (!e) {
        e = { valor: undefined, oyentes: new Set(), sub: null, soltar: null }
        entradas.set(hoy, e)
      }
      const entrada = e
      if (entrada.soltar) { clearTimeout(entrada.soltar); entrada.soltar = null }
      entrada.oyentes.add(oyente)
      entrada.sub ??= liveQuery(() => leer(hoy)).subscribe({
        next: (valor) => { entrada.valor = valor; for (const o of [...entrada.oyentes]) o() },
        error: (err) => console.error('No se ha podido calcular el progreso', err),
      })
      return () => {
        entrada.oyentes.delete(oyente)
        if (entrada.oyentes.size === 0) entrada.soltar = setTimeout(() => { if (entrada.oyentes.size === 0) cerrar(hoy, entrada) }, margenMs)
      }
    },
    valor(hoy: string): EstadoProgreso | undefined {
      return entradas.get(hoy)?.valor
    },
  }
}

const almacen = crearAlmacenProgreso(leerVitrina)

/** Lectura directa, sin compartir (scripts de medición y tests). */
export const leerProgreso = leerVitrina

/** Todo lo derivado hasta `hoy`, compartido entre pantallas. `undefined` mientras carga. */
export function useProgreso(hoy: string): EstadoProgreso | undefined {
  const suscribir = useCallback((oyente: () => void) => almacen.suscribir(hoy, oyente), [hoy])
  const leer = () => almacen.valor(hoy)
  return useSyncExternalStore(suscribir, leer, leer)
}
