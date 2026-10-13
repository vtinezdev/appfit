import { useEffect, useState } from 'react'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { formatFechaHora } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import type { ResumenCopia } from '../copiaNube'

type Eleccion = 'traer' | 'subir'

interface Props {
  cargar: () => Promise<{ nube: ResumenCopia; local: ResumenCopia }>
  onElegir: (eleccion: Eleccion) => Promise<void>
}

const CONSECUENCIA: Record<Eleccion, { mensaje: string; confirmar: string }> = {
  traer: { mensaje: 'Los datos de este móvil se sustituirán por la copia de la nube. Lo que solo esté aquí se perderá.', confirmar: 'Usar la copia de la nube' },
  subir: { mensaje: 'La copia de la nube se sustituirá por los datos de este móvil. Lo que solo esté en la nube se perderá.', confirmar: 'Usar este móvil' },
}

const detalle = (r: ResumenCopia) => `${formatInt(r.comidas)} ${r.comidas === 1 ? 'comida' : 'comidas'} · ${formatInt(r.entrenos)} ${r.entrenos === 1 ? 'entreno' : 'entrenos'}`

/** La copia de la nube y los datos de este móvil, lado a lado: la persona elige cuál se queda (con confirmación). */
export default function ElegirCopia({ cargar, onElegir }: Props) {
  const [resumenes, setResumenes] = useState<{ nube: ResumenCopia; local: ResumenCopia } | null>(null)
  const [eleccion, setEleccion] = useState<Eleccion | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    cargar().then((r) => { if (vivo) setResumenes(r) }, (e: unknown) => { if (vivo) setError(e instanceof Error ? e.message : 'No se ha podido leer la copia.') })
    return () => { vivo = false }
  }, [cargar])

  async function confirmar() {
    if (!eleccion) return
    setOcupado(true)
    setError(null)
    try {
      await onElegir(eleccion)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido completar. Inténtalo de nuevo.')
      setOcupado(false)
    }
  }

  if (!resumenes) return error ? <ErrorState>{error}</ErrorState> : <LoadingState>Leyendo la copia…</LoadingState>

  const opciones: { valor: Eleccion; titulo: string; resumen: ResumenCopia; contexto: string }[] = [
    { valor: 'traer', titulo: 'Copia de la nube', resumen: resumenes.nube, contexto: `Guardada el ${formatFechaHora(Date.parse(resumenes.nube.actualizada))}` },
    { valor: 'subir', titulo: 'Este móvil', resumen: resumenes.local, contexto: 'Lo que tienes ahora aquí' },
  ]

  return (
    <div className="space-y-stack">
      <p className="text-body-sm text-fg-muted">Solo puede quedar una. La otra se sustituye y no se puede deshacer.</p>
      {opciones.map((o) => (
        <Card key={o.valor} tone="muted" className="space-y-3">
          <div>
            <h3 className="text-body font-semibold">{o.titulo}</h3>
            <p className="text-caption text-fg-muted">{o.contexto}</p>
            <p className="text-body-sm">{detalle(o.resumen)}</p>
          </div>
          {eleccion === o.valor ? (
            <ConfirmacionDestructiva mensaje={CONSECUENCIA[o.valor].mensaje} confirmar={CONSECUENCIA[o.valor].confirmar} ocupado={ocupado}
              onConfirmar={confirmar} onCancelar={() => setEleccion(null)} />
          ) : (
            <Button variant="secondary" block disabled={ocupado} onClick={() => { setError(null); setEleccion(o.valor) }}>
              {o.valor === 'traer' ? 'Quedarme con la copia de la nube' : 'Quedarme con este móvil'}
            </Button>
          )}
        </Card>
      ))}
      {error && <ErrorState>{error}</ErrorState>}
    </div>
  )
}
