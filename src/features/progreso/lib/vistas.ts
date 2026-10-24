// Vistas de Progreso (B12): qué pestañas hay y a cuál lleva cada tesela de Inicio. Funciones puras.
import type { DestinoProgreso } from '../../inicio/components/AccesoProgreso'

export type VistaProgreso = 'semana' | 'cumbres' | 'caminos' | 'vitrina'

export const VISTAS_PROGRESO: readonly VistaProgreso[] = ['semana', 'cumbres', 'caminos', 'vitrina']

/** Pestañas visibles: sin Actividades (módulos de B9), Caminos no sale. */
export const vistasProgreso = (usa: { actividades: boolean }): VistaProgreso[] =>
  VISTAS_PROGRESO.filter((v) => v !== 'caminos' || usa.actividades)

/** La tesela de Ritmo abre la pestaña Semana, que lo reúne; las demás, la suya. */
export const vistaDeTesela = (t: DestinoProgreso): VistaProgreso => (t === 'ritmo' ? 'semana' : t)

/** Y al revés, la tesela que recupera el foco al volver a Inicio desde una pestaña. */
export const teselaDeVista = (v: VistaProgreso): DestinoProgreso => (v === 'semana' ? 'ritmo' : v)
