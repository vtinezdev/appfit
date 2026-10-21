/** Qué hace una fila al soltarla tras deslizarla a la izquierda (ver `FilaDeslizable`). */
export type FinDeslizar = 'cerrar' | 'abrir' | 'borrar'

/**
 * Al soltar: más allá del 60 % del ancho de la fila, borra (deslizar hasta el final); más allá de la mitad del botón,
 * deja las acciones a la vista; si no, vuelve a su sitio. Con `borradoDirecto=false`, solo abre o cierra.
 * `dx` es negativo hacia la izquierda.
 */
export function finDeslizar(dx: number, anchoFila: number, anchoAccion: number, borradoDirecto = true): FinDeslizar {
  const recorrido = -dx
  if (borradoDirecto && anchoFila > 0 && recorrido >= anchoFila * 0.6) return 'borrar'
  if (recorrido >= anchoAccion / 2) return 'abrir'
  return 'cerrar'
}

/** Desplazamiento que se pinta mientras se arrastra: solo hacia la izquierda y, pasado el botón, con resistencia. */
export function desplazamientoFila(dx: number, anchoFila: number, anchoAccion: number): number {
  if (dx >= 0) return 0
  const recorrido = -dx
  const conResistencia = recorrido <= anchoAccion ? recorrido : anchoAccion + (recorrido - anchoAccion) * 0.85
  return -Math.min(conResistencia, Math.max(anchoFila, anchoAccion))
}
