import type { Tab } from './BottomNav'

/** Desde dónde se abre Referencias (Ajustes › Saber más, el detalle de un nutriente o «Cómo se calcula» de Perfil). */
export type OrigenReferencias = 'ajustes' | 'nutricion' | 'perfil'

const ETIQUETAS: Record<OrigenReferencias, string> = { ajustes: 'Ajustes', nutricion: 'Nutrición', perfil: 'Perfil' }

/**
 * «Volver» de Referencias según su origen: a qué destino vuelve, qué dice el botón y si recupera el foco una fila
 * (solo en Ajustes, la fila Referencias; Nutrición y Perfil vuelven a su pantalla de siempre).
 */
export function retornoDeReferencias(origen: OrigenReferencias): { tab: Tab; etiqueta: string; enfocarFila: boolean } {
  return { tab: origen, etiqueta: ETIQUETAS[origen], enfocarFila: origen === 'ajustes' }
}
