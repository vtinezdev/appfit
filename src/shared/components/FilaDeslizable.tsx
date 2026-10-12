import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { desplazamientoFila, finDeslizar } from '../lib/deslizar'
import Icon from './Icon'

interface Props {
  /** Nombre accesible del botón («Borrar Yogur»). */
  etiqueta: string
  onBorrar: () => void
  children: ReactNode
}

/** Ancho del botón «Borrar» que queda a la vista (en px, coincide con `.fila-deslizable-accion`). */
const ANCHO_ACCION = 88
/** Movimiento mínimo para decidir si el gesto es horizontal (deslizar) o vertical (scroll). */
const UMBRAL = 8

/**
 * Fila suelta que se borra deslizándola a la izquierda, como en Mail (ADR 035): a medias deja el botón «Borrar» a la
 * vista; hasta el final, borra. El borrado es inmediato y quien la usa ofrece «Deshacer». El botón existe siempre en el
 * árbol accesible y al recibir el foco con teclado la fila se abre, así que no depende del gesto.
 */
export default function FilaDeslizable({ etiqueta, onBorrar, children }: Props) {
  const raiz = useRef<HTMLDivElement>(null)
  const gesto = useRef<{ x: number; y: number; dx: number; horizontal: boolean | null; base: number } | null>(null)
  const movido = useRef(false)
  const [dx, setDx] = useState(0)
  const [arrastrando, setArrastrando] = useState(false)
  const abierta = dx !== 0 && !arrastrando

  // Abierta, un toque fuera la cierra.
  useEffect(() => {
    if (!abierta) return
    const fuera = (e: globalThis.PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setDx(0) }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [abierta])

  function inicio(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    gesto.current = { x: e.clientX, y: e.clientY, dx: 0, horizontal: null, base: dx }
    movido.current = false
  }
  function mover(e: PointerEvent<HTMLDivElement>) {
    const g = gesto.current
    if (!g) return
    const mx = e.clientX - g.x, my = e.clientY - g.y
    if (g.horizontal === null) {
      if (Math.abs(mx) < UMBRAL && Math.abs(my) < UMBRAL) return
      g.horizontal = Math.abs(mx) > Math.abs(my)
      if (!g.horizontal) { gesto.current = null; return }
      e.currentTarget.setPointerCapture(e.pointerId)
      setArrastrando(true)
    }
    movido.current = true
    g.dx = g.base + mx
    setDx(desplazamientoFila(g.dx, raiz.current?.offsetWidth ?? 0, ANCHO_ACCION))
  }
  function fin() {
    const g = gesto.current
    gesto.current = null
    setArrastrando(false)
    if (!g?.horizontal) return
    const accion = finDeslizar(g.dx, raiz.current?.offsetWidth ?? 0, ANCHO_ACCION)
    if (accion === 'borrar') { setDx(0); onBorrar() } else setDx(accion === 'abrir' ? -ANCHO_ACCION : 0)
  }

  return (
    <div ref={raiz} className="fila-deslizable" data-arrastrando={arrastrando || undefined}>
      <button type="button" className="fila-deslizable-accion" aria-label={etiqueta} title={etiqueta} tabIndex={0}
        onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) setDx(-ANCHO_ACCION) }} onBlur={() => setDx(0)}
        onClick={() => { setDx(0); onBorrar() }}>
        <Icon name="trash" size={20} /><span aria-hidden="true" className="text-caption font-semibold">Borrar</span>
      </button>
      <div className="fila-deslizable-contenido" style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        onPointerDown={inicio} onPointerMove={mover} onPointerUp={fin} onPointerCancel={fin}
        onClickCapture={(e) => {
          // Tras arrastrar, o con la fila abierta, el toque no abre el registro: solo suelta o cierra.
          if (movido.current) { e.preventDefault(); e.stopPropagation(); movido.current = false }
          else if (abierta) { e.preventDefault(); e.stopPropagation(); setDx(0) }
        }}>
        {children}
      </div>
    </div>
  )
}
