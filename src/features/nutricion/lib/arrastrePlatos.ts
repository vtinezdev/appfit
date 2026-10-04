import { closestCenter, pointerWithin, type CollisionDetection, type KeyboardCoordinateGetter, type Modifier } from '@dnd-kit/core'
import { COMIDAS, esComida } from './comidas'

/** Con puntero solo se acepta una sección bajo el dedo; soltar fuera cancela. */
export const colisionesComidas: CollisionDetection = args => args.pointerCoordinates ? pointerWithin(args) : closestCenter(args)

/** Cada flecha recorre una comida, no unos píxeles arbitrarios de un plato. */
export function crearCoordenadasComidas(): KeyboardCoordinateGetter {
  let inicio: Event | null = null
  let seleccion: unknown
  return (event, { context, currentCoordinates }) => {
    // El centro de una copia corta puede caer sobre otra comida al levantar un
    // plato muy alto. El recorrido de teclado parte de su comida real.
    if (context.activatorEvent !== inicio) {
      inicio = context.activatorEvent
      seleccion = context.active?.data.current?.plato?.entries[0].comida
    }
    const step = ['ArrowDown', 'ArrowRight'].includes(event.code) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(event.code) ? -1 : 0
    if (!step) return
    event.preventDefault()
    const actual = seleccion
    if (!esComida(actual)) return
    const index = COMIDAS.findIndex(c => c.valor === actual)
    const siguiente = COMIDAS[index + step]
    if (!siguiente) return currentCoordinates
    const target = context.droppableRects.get(`comida:${siguiente.valor}`)
    const dragging = context.collisionRect
    if (!target || !dragging) return
    seleccion = siguiente.valor
    return { x: target.left + (target.width - dragging.width) / 2, y: target.top + (target.height - dragging.height) / 2 }
  }
}

/** El texto de la copia que sigue al dedo permanece dentro del viewport. */
export const limitarCopiaAlViewport: Modifier = ({ transform, draggingNodeRect: rect, windowRect: viewport }) => {
  if (!rect || !viewport) return transform
  return { ...transform,
    x: Math.max(viewport.left - rect.left, Math.min(transform.x, viewport.right - rect.right)),
    y: Math.max(viewport.top - rect.top, Math.min(transform.y, viewport.bottom - rect.bottom)),
  }
}
