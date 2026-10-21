import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { desplazamientoFila, finDeslizar } from '../lib/deslizar'
import Icon from './Icon'

interface Props {
  /** Nombre accesible del botón («Borrar Yogur»). */
  etiqueta: string
  onBorrar: () => void
  accionCopiar?: { etiqueta: string; onCopiar: () => void }
  children: ReactNode
}

/** Respaldo antes de medir la banda de acciones; el ancho real respeta rem y texto ampliado. */
const ANCHO_ACCION = 88
/** Movimiento mínimo para decidir si el gesto es horizontal (deslizar) o vertical (scroll). */
const UMBRAL = 8

/**
 * Deslizar revela Borrar y, opcionalmente, Copiar. Con ambas acciones, el gesto solo revela; se elige con un toque.
 * Las acciones también se revelan al recibir foco de teclado. Quien borra ofrece «Deshacer».
 */
export default function FilaDeslizable({ etiqueta, onBorrar, accionCopiar, children }: Props) {
  const raiz = useRef<HTMLDivElement>(null)
  const acciones = useRef<HTMLDivElement>(null)
  const gesto = useRef<{ x: number; y: number; dx: number; horizontal: boolean | null; base: number } | null>(null)
  const movido = useRef(false)
  const [dx, setDx] = useState(0)
  const [arrastrando, setArrastrando] = useState(false)
  const abierta = dx !== 0 && !arrastrando
  const anchoAcciones = () => acciones.current?.offsetWidth ?? ANCHO_ACCION * (accionCopiar ? 2 : 1)

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
    setDx(desplazamientoFila(g.dx, raiz.current?.offsetWidth ?? 0, anchoAcciones()))
  }
  function fin() {
    const g = gesto.current
    gesto.current = null
    setArrastrando(false)
    if (!g?.horizontal) return
    const accion = finDeslizar(g.dx, raiz.current?.offsetWidth ?? 0, anchoAcciones() / (accionCopiar ? 2 : 1), !accionCopiar)
    if (accion === 'borrar') { setDx(0); onBorrar() } else setDx(accion === 'abrir' ? -anchoAcciones() : 0)
  }
  function cancelar() {
    const base = gesto.current?.base ?? 0
    gesto.current = null
    setArrastrando(false)
    setDx(base)
  }

  return (
    <div ref={raiz} className="fila-deslizable" data-arrastrando={arrastrando || undefined} data-con-copia={accionCopiar ? true : undefined}>
      <div ref={acciones} className="fila-deslizable-acciones"
        onFocusCapture={() => setDx(-anchoAcciones())}
        onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDx(0) }}>
      {accionCopiar && <button type="button" className="fila-deslizable-accion fila-deslizable-copiar" aria-label={accionCopiar.etiqueta} title={accionCopiar.etiqueta}
        aria-haspopup="dialog" onClick={() => { setDx(0); accionCopiar.onCopiar() }}>
        <Icon name="copy" size={20} /><span aria-hidden="true" className="text-caption font-semibold">Copiar</span>
      </button>}
      <button type="button" className="fila-deslizable-accion" aria-label={etiqueta} title={etiqueta}
        onClick={() => { setDx(0); onBorrar() }}>
        <Icon name="trash" size={20} /><span aria-hidden="true" className="text-caption font-semibold">Borrar</span>
      </button>
      </div>
      <div className="fila-deslizable-contenido" style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        onPointerDown={inicio} onPointerMove={mover} onPointerUp={fin} onPointerCancel={cancelar}
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
