import { useEffect, useId, useRef, useState } from 'react'
import Icon from '../../../shared/components/Icon'
import { iconoDeCategoria } from '../lib/iconosCategoria'

interface Props {
  categoria: string | undefined
  /**
   * Sin categoría válida: `aviso` muestra una alerta («Sin categoría», en Alimentos), `hueco` reserva el sitio para
   * que los nombres queden alineados (Diario) y `nada` no pinta nada.
   */
  sinCategoria?: 'aviso' | 'hueco' | 'nada'
}

/**
 * La categoría de un alimento como icono. Pulsarlo muestra su nombre en una burbuja (toggletip) que se cierra al
 * pulsar fuera, con Escape o pulsando otra vez. Es un botón propio de 44 px: va al lado de la fila, nunca dentro.
 */
export default function IconoCategoria({ categoria, sinCategoria = 'nada' }: Props) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false) }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  const icono = iconoDeCategoria(categoria)
  if (!icono && sinCategoria === 'nada') return null
  if (!icono && sinCategoria === 'hueco') return <span aria-hidden className="h-touch w-touch shrink-0" />
  const nombre = icono ? categoria! : 'Sin categoría'

  return (
    <span ref={ref} className="relative flex shrink-0">
      <button type="button" aria-label={`Categoría: ${nombre}`} aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto(!abierto)}
        className={`flex h-touch w-touch items-center justify-center rounded-md transition-colors duration-short hover:bg-surface-muted active:bg-surface-muted ${icono ? 'text-fg-muted' : 'text-warning'}`}>
        <Icon name={icono ?? 'alert'} size={20} />
      </button>
      <span id={id} role="status"
        className={abierto ? 'absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded-sm border border-line bg-surface-elevated px-2 py-1 text-caption text-fg shadow-overlay' : 'sr-only'}>
        {abierto ? nombre : ''}
      </span>
    </span>
  )
}
