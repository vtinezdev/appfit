import { useEffect, useRef, useState } from 'react'
import Button from '../../../shared/components/Button'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { haptic } from '../../../shared/design/motion'
import { pitar } from '../../../shared/lib/sonido'
import { formatContador, formatSegundos, segundosContador, segundosValidos } from '../lib/tiempo'

interface Props {
  open: boolean
  titulo: string
  /** Segundos del objetivo (rutina o vez anterior): al llegar, vibra y pita como el descanso. */
  objetivo?: number
  /** Lo de la vez anterior y lo mejor del ejercicio, para tenerlo a la vista. */
  anterior?: number
  mejor?: number
  /** El pitido sigue al ajuste del descanso. */
  sonido: boolean
  onGuardar: (segundos: number) => Promise<void>
  onClose: () => void
}

/**
 * Contador de una serie por tiempo (A29): «Empezar», el tiempo en grande y «Parar y guardar», que apunta los segundos y
 * marca la serie. Mide con la hora del reloj, no contando ticks: si el móvil se duerme, no se pierde tiempo.
 */
export default function CronoSerie({ open, titulo, objetivo, anterior, mejor, sonido, onGuardar, onClose }: Props) {
  const [inicio, setInicio] = useState<number | null>(null)
  const [ahora, setAhora] = useState(() => Date.now())
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const avisado = useRef(false)
  const segundos = inicio === null ? 0 : segundosContador(inicio, ahora)
  const cumplido = objetivo !== undefined && segundos >= objetivo

  useEffect(() => {
    if (inicio === null) return
    const t = window.setInterval(() => setAhora(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [inicio])

  useEffect(() => {
    if (!cumplido || avisado.current) return
    avisado.current = true
    haptic('success')
    if (sonido) pitar()
  }, [cumplido, sonido])

  function cerrar() {
    if (ocupado) return
    setInicio(null); setError(null); avisado.current = false
    onClose()
  }

  async function guardar() {
    if (inicio === null || ocupado) return
    setOcupado(true); setError(null)
    try {
      await onGuardar(segundosValidos(segundosContador(inicio, Date.now())))
      setInicio(null); avisado.current = false
      onClose()
    } catch {
      setError('No se han podido guardar los segundos. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  const referencias = [objetivo !== undefined && `Objetivo ${formatSegundos(objetivo)}`, anterior ? `Anterior ${formatSegundos(anterior)}` : null, mejor ? `Mejor ${formatSegundos(mejor)}` : null].filter(Boolean)
  return (
    <Sheet open={open} onClose={cerrar} title={titulo}>
      <div className="space-y-4">
        <p className="text-body-sm text-fg-muted">Ejercicio por tiempo: se apuntan segundos en lugar de repeticiones.</p>
        <p className={`tabular text-center font-numeric text-hero ${cumplido ? 'text-accent-strong' : 'text-fg'}`} aria-hidden>{formatContador(segundos)}</p>
        <p className="sr-only" role="status">{inicio === null ? 'Contador parado' : cumplido ? 'Objetivo cumplido' : 'Contando'}</p>
        {referencias.length > 0 && <p className="tabular text-center text-body-sm text-fg-muted">{referencias.join(' · ')}</p>}
        {mejor !== undefined && mejor > 0 && segundos > mejor && <p className="text-center text-body-sm font-semibold text-accent-strong">Más que tu mejor tiempo</p>}
        {inicio === null
          ? <Button block size="lg" onClick={() => { avisado.current = false; setAhora(Date.now()); setInicio(Date.now()) }}>Empezar</Button>
          : <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="flex-1 basis-32" disabled={ocupado} onClick={() => { setInicio(null); avisado.current = false }}>Reiniciar</Button>
            <Button className="flex-1 basis-32" loading={ocupado} onClick={() => { void guardar() }}>Parar y guardar</Button>
          </div>}
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  )
}
