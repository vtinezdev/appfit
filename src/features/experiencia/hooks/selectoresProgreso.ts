// Partes del resultado compartido (`useProgreso`) con la forma de siempre de cada lectura. Funciones puras: devuelven
// el mismo objeto (o uno constante) para que React no vea cambios donde no los hay.
import type { EstadoCaminos } from '../../caminos/hooks/leerCaminos'
import type { EstadoCumbres } from '../../cumbres/hooks/leerCumbres'
import type { EstadoProgreso } from './useProgreso'
import type { EstadoExperiencia } from './leerExperiencia'

const OCULTO = { visible: false } as const

/** La experiencia (con Ritmo): el resultado compartido ya la contiene tal cual (con más campos). */
export function experienciaDe(e: EstadoProgreso): EstadoExperiencia {
  return e
}

/** Cumbres (y la experiencia), igual que la experiencia: el resultado compartido la contiene. */
export function cumbresDe(e: EstadoProgreso): EstadoCumbres {
  return e
}

/** Caminos: con la gamificación visible va en `caminos`; oculta, nada. */
export function caminosDe(e: EstadoProgreso): EstadoCaminos {
  return e.visible ? e.caminos : OCULTO
}
