import { useState } from 'react'
import Button from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { MotivoPausa, Pausa, TipoPausa } from '../../../shared/db/types'
import * as pausasRepo from '../data/pausasRepo'
import { MOTIVOS_PAUSA, TIPOS_PAUSA } from '../lib/pausas'

interface Props {
  open: boolean
  hoy: string
  onClose: () => void
  /** Tras guardar, con las pausas de antes (para «Deshacer»). */
  onPausado: (antes: Pausa[]) => void
}

/** Hoja «Pausar»: qué se pausa, por qué y desde cuándo (fin opcional: sin él sigue hasta «Reanudar»). */
export default function PausarSheet({ open, hoy, onClose, onPausado }: Props) {
  const [tipo, setTipo] = useState<TipoPausa>('total')
  const [motivo, setMotivo] = useState<MotivoPausa>('vacaciones')
  const [desde, setDesde] = useState(hoy)
  const [hasta, setHasta] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function guardar() {
    setError(null)
    setOcupado(true)
    try {
      onPausado(await pausasRepo.pausar({ desde, ...(hasta ? { hasta } : {}), tipo, motivo }))
    } catch (e) {
      setError(e instanceof pausasRepo.PausaInvalida ? e.message : 'No se ha podido guardar la pausa. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Pausar"
      footer={<div className="space-y-2">{error && <ErrorState>{error}</ErrorState>}<Button block loading={ocupado} onClick={guardar}>Pausar</Button></div>}>
      <div className="space-y-4">
        <p className="text-body-sm text-fg-muted">Una semana en pausa no rompe el hilo ni gasta comodines: se congela. Cuenta si cubre 4 días de la semana o más.</p>
        <div className="space-y-2">
          <p className="text-label text-fg-muted">Qué se pausa</p>
          <SegmentedControl label="Qué se pausa" variante="vertical" valor={tipo} onChange={setTipo}
            opciones={(Object.keys(TIPOS_PAUSA) as TipoPausa[]).map((t) => ({ valor: t, label: TIPOS_PAUSA[t].nombre, descripcion: TIPOS_PAUSA[t].descripcion }))} />
        </div>
        <div className="space-y-2">
          <p className="text-label text-fg-muted">Motivo</p>
          <SegmentedControl label="Motivo" variante="vertical" valor={motivo} onChange={setMotivo}
            opciones={(Object.keys(MOTIVOS_PAUSA) as MotivoPausa[]).map((m) => ({ valor: m, label: MOTIVOS_PAUSA[m] }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0 space-y-1"><span className="text-label text-fg-muted">Desde</span>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
          <label className="block min-w-0 space-y-1"><span className="text-label text-fg-muted">Hasta (opcional)</span>
            <Input type="date" min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
        </div>
        <p className="text-caption text-fg-muted">Sin fecha de fin, la pausa sigue hasta que pulses «Reanudar».</p>
      </div>
    </Sheet>
  )
}
