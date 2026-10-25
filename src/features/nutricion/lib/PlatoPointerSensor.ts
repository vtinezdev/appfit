import type { Activators, SensorProps } from '@dnd-kit/core'

interface Opciones { distance: number }

/** Sensor público de dnd-kit: un pointerId por gesto, captura y cancelación explícita.
 * Solo el asa usa touch-action:none; el resto del plato conserva el scroll nativo.
 * No llama a internals privados ni simula eventos para cancelar otros sensores.
 */
export class PlatoPointerSensor {
  autoScrollEnabled = true
  private activated = false
  private finished = false
  private readonly id: number
  private readonly origin: { x: number; y: number }
  private readonly doc: Document
  private readonly win: Window
  private readonly handle: HTMLElement
  private readonly props: SensorProps<Opciones>

  static activators: Activators<Opciones> = [{ eventName: 'onPointerDown', handler: ({ nativeEvent }) => nativeEvent.isPrimary && nativeEvent.button === 0 }]

  constructor(props: SensorProps<Opciones>) {
    this.props = props
    const event = props.event as PointerEvent
    this.id = event.pointerId
    this.origin = { x: event.clientX, y: event.clientY }
    this.handle = props.activeNode.activatorNode.current ?? props.activeNode.node.current!
    this.doc = this.handle.ownerDocument
    this.win = this.doc.defaultView!
    this.doc.addEventListener('pointermove', this.move, { passive: false })
    this.doc.addEventListener('pointerup', this.end)
    this.doc.addEventListener('pointercancel', this.pointerCancel)
    this.doc.addEventListener('keydown', this.key)
    this.doc.addEventListener('visibilitychange', this.cancel)
    this.handle.addEventListener('lostpointercapture', this.pointerCancel)
    this.win.addEventListener('blur', this.cancel)
    this.win.addEventListener('resize', this.cancel)
    this.handle.setPointerCapture(this.id)
  }

  private move = (event: PointerEvent) => {
    if (event.pointerId !== this.id || this.finished) return
    if (!this.activated) {
      if (Math.hypot(event.clientX - this.origin.x, event.clientY - this.origin.y) < this.props.options.distance) return
      this.activated = true
      this.doc.getSelection()?.removeAllRanges()
      this.props.onStart(this.origin)
    }
    if (event.cancelable) event.preventDefault()
    this.props.onMove({ x: event.clientX, y: event.clientY })
  }

  private key = (event: KeyboardEvent) => {
    if (event.code === 'Escape') { event.preventDefault(); this.cancel() }
  }
  private pointerCancel = (event: PointerEvent) => { if (event.pointerId === this.id) this.cancel() }
  private end = (event: PointerEvent) => {
    if (event.pointerId !== this.id || this.finished) return
    this.detach()
    if (!this.activated) this.props.onAbort(this.props.active)
    this.props.onEnd()
  }
  private cancel = () => {
    if (this.finished) return
    this.detach()
    if (!this.activated) this.props.onAbort(this.props.active)
    this.props.onCancel()
  }
  private detach() {
    this.finished = true
    this.doc.removeEventListener('pointermove', this.move)
    this.doc.removeEventListener('pointerup', this.end)
    this.doc.removeEventListener('pointercancel', this.pointerCancel)
    this.doc.removeEventListener('keydown', this.key)
    this.doc.removeEventListener('visibilitychange', this.cancel)
    this.handle.removeEventListener('lostpointercapture', this.pointerCancel)
    this.win.removeEventListener('blur', this.cancel)
    this.win.removeEventListener('resize', this.cancel)
    if (this.handle.hasPointerCapture(this.id)) this.handle.releasePointerCapture(this.id)
  }
}
