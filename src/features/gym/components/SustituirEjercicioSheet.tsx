import { useState } from 'react'
import Sheet from '../../../shared/components/Sheet'
import Button from '../../../shared/components/Button'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import Icon from '../../../shared/components/Icon'
import { ErrorState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import MiniaturaEjercicio from './MiniaturaEjercicio'
import type { Alternativa } from '../../liga/lib/alternativas'
import type { SeleccionEjercicio } from '../lib/selectorEjercicios'

export interface OpcionSustituir extends Alternativa {
  /** «3 × 10 · 32 kg, hace 23 días» o «Nunca» (`lib/sustituir.textoUltimaVez`). */
  ultimaVez: string
}

const series = (n: number) => (n === 1 ? '1 serie' : `${formatInt(n)} series`)

/**
 * Sustituir un ejercicio en plena sesión (ENT-01): alternativas del mismo músculo principal con su última vez, «Buscar otro…»
 * y, si es de la rutina, «Cambiar también en la rutina» (sin marcar por defecto). Las acciones las hace la página.
 */
export default function SustituirEjercicioSheet({ open, onClose, onExited, nombre, pendientes, hechas, opciones, rutina, ocupado, error, onElegir, onBuscar }: {
  open: boolean; onClose: () => void; onExited?: () => void
  nombre: string; pendientes: number; hechas: number; opciones: OpcionSustituir[]
  /** Nombre de la rutina si el ejercicio está en ella: solo entonces se ofrece cambiarla. */
  rutina?: string
  ocupado: boolean; error: string | null
  onElegir: (seleccion: SeleccionEjercicio, tambienRutina: boolean) => void
  onBuscar: (tambienRutina: boolean) => void
}) {
  const [tambienRutina, setTambienRutina] = useState(false)
  return (
    <Sheet open={open} onClose={() => { if (!ocupado) onClose() }} onExited={() => { setTambienRutina(false); onExited?.() }} title={`Sustituir ${nombre}`}>
      <div className="space-y-stack">
        <p className="text-body-sm text-fg-muted">
          {pendientes > 0
            ? `${pendientes === 1 ? 'La serie sin marcar pasa' : `Las ${series(pendientes)} sin marcar pasan`} al ejercicio que elijas${hechas > 0 ? `; ${hechas === 1 ? 'la hecha se queda' : `las ${formatInt(hechas)} hechas se quedan`} en ${nombre}` : ''}.`
            : `Ya has hecho todas sus series: el ejercicio que elijas empieza con una serie.`}
        </p>
        {opciones.length > 0 && <ListGroup variante="plana" aria-label={`Alternativas a ${nombre}`}>
          {opciones.map(o => <li key={o.key}>
            <ListRow disabled={ocupado} onClick={() => onElegir(o.seleccion, tambienRutina)}>
              <MiniaturaEjercicio catalogId={o.catalogId} />
              <span className="min-w-0 flex-1">
                <span className="block break-words text-body-sm font-semibold">{o.nombre}</span>
                <span className="block break-words text-caption text-fg-muted">{o.subtitulo} · Última vez: {o.ultimaVez}</span>
              </span>
              <Icon name="chevron-right" size={18} className="shrink-0 text-fg-muted" />
            </ListRow>
          </li>)}
        </ListGroup>}
        {rutina && <label className="flex min-h-touch items-center gap-3 text-body-sm text-fg">
          <input type="checkbox" className="h-5 w-5 shrink-0 accent-accent" checked={tambienRutina} disabled={ocupado} onChange={e => setTambienRutina(e.target.checked)} />
          <span className="min-w-0 break-words">Cambiar también en la rutina {rutina}</span>
        </label>}
        {error && <ErrorState>{error}</ErrorState>}
        <Button variant="secondary" block disabled={ocupado} onClick={() => onBuscar(tambienRutina)}>Buscar otro…</Button>
      </div>
    </Sheet>
  )
}
