import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button, { IconButton } from '../../../shared/components/Button'
import Disclosure from '../../../shared/components/Disclosure'
import { Input } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import SectionHeader from '../../../shared/components/SectionHeader'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { Medida } from '../../../shared/db/types'
import { useAviso } from '../../../shared/hooks/useAviso'
import { parseISODate, todayISO } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import * as medidasRepo from '../data/medidasRepo'
import { CAMPOS_MEDIDA, medidasDeBorrador, resumenMedidas, type BorradorMedida } from '../lib/medidas'

const fechaCorta = (f: string) => parseISODate(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

function textoMedida(m: Medida): string {
  return CAMPOS_MEDIDA.filter((c) => m[c.campo] !== undefined).map((c) => `${c.etiqueta} ${formatNumber(m[c.campo]!, 1)} ${c.unidad}`).join(' · ')
}

/** Medidas corporales (cm y %): último valor y variación por campo, registro en una Sheet e historial con borrado y «Deshacer». */
export default function MedidasCorporales() {
  const medidas = useLiveQuery(() => medidasRepo.todas(), [])
  const { avisar, avisarError, toast } = useAviso()
  const [abierta, setAbierta] = useState(false)
  const [aperturas, setAperturas] = useState(0)
  const [fecha, setFecha] = useState(todayISO())
  const [borrador, setBorrador] = useState<BorradorMedida>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const resumen = resumenMedidas(medidas ?? [])
  const hayAlguna = resumen.some((r) => r.ultimo !== null)

  function abrir() {
    setAperturas((n) => n + 1)
    setFecha(todayISO())
    setBorrador({})
    setError(null)
    setAbierta(true)
  }

  async function guardar() {
    if (guardando) return
    const r = medidasDeBorrador(borrador)
    if ('error' in r) { setError(r.error); return }
    if (!fecha || fecha > todayISO()) { setError('Elige una fecha que no sea futura.'); return }
    setGuardando(true)
    setError(null)
    try {
      await medidasRepo.registrar(fecha, r.valores)
      setAbierta(false)
      avisar({ mensaje: 'Medidas registradas' })
    } catch {
      setError('No se han podido guardar las medidas. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function borrar(m: Medida) {
    try {
      const borrada = await medidasRepo.borrar(m.id)
      if (borrada) avisar({ mensaje: `Medidas del ${fechaCorta(borrada.fecha)} borradas`, onDeshacer: () => medidasRepo.restaurar(borrada) })
    } catch {
      avisarError('No se han podido borrar las medidas. Inténtalo de nuevo.')
    }
  }

  return <section aria-label="Medidas corporales" className="space-y-stack">
    <SectionHeader variant="section" action={<Button variant="ghost" size="sm" onClick={abrir}>Registrar</Button>}>Medidas corporales</SectionHeader>
    {!hayAlguna ? <p className="text-body-sm text-fg-muted">Cintura, cadera, pecho, brazo, muslo y grasa corporal. Registra las que quieras seguir; todo se queda en este dispositivo.</p> : (
      <ListGroup aria-label="Última medida de cada zona">
        {resumen.filter((r) => r.ultimo).map((r) => <li key={r.campo} className="flex min-h-touch items-center justify-between gap-3 py-2">
          <span className="min-w-0"><span className="block break-words text-body text-fg">{r.etiqueta}</span><span className="block text-caption text-fg-muted">{fechaCorta(r.ultimo!.fecha)}</span></span>
          <span className="tabular shrink-0 text-right"><span className="text-body font-semibold text-fg">{formatNumber(r.ultimo!.valor, 1)} <span className="font-normal text-fg-muted">{r.unidad}</span></span>
            {r.variacion !== null && <span className="block text-caption text-fg-muted">{r.variacion === 0 ? 'Sin cambios' : `${r.variacion < 0 ? '−' : '+'}${formatNumber(Math.abs(r.variacion), 1)} ${r.unidad}`} desde la anterior</span>}</span>
        </li>)}
      </ListGroup>
    )}
    {!!medidas?.length && <Disclosure title={`Historial (${formatNumber(medidas.length)})`}>
      <ul className="divide-y divide-line" aria-label="Historial de medidas">
        {medidas.map((m) => <li key={m.id} className="flex min-h-touch items-center justify-between gap-2 py-1">
          <span className="min-w-0"><span className="block text-body-sm font-medium text-fg">{fechaCorta(m.fecha)}</span><span className="tabular block break-words text-caption text-fg-muted">{textoMedida(m)}</span></span>
          <IconButton icon="trash" variant="ghost" size="sm" label={`Borrar medidas del ${fechaCorta(m.fecha)}`} onClick={() => borrar(m)} />
        </li>)}
      </ul>
    </Disclosure>}

    <Sheet key={aperturas} open={abierta} onClose={() => setAbierta(false)} title="Registrar medidas"
      footer={<div className="space-y-2">{error && <ErrorState>{error}</ErrorState>}<Button block loading={guardando} onClick={guardar}>Guardar</Button></div>}>
      <div className="space-y-3">
        <label className="block space-y-1"><span className="text-label text-fg-muted">Fecha</span>
          <Input type="date" max={todayISO()} value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-3">
          {CAMPOS_MEDIDA.map((c) => <label key={c.campo} className="block min-w-0 space-y-1">
            <span className="text-label text-fg-muted">{c.etiqueta} ({c.unidad})</span>
            <Input type="number" inputMode="decimal" step="0.1" value={borrador[c.campo] ?? ''} onChange={(e) => setBorrador({ ...borrador, [c.campo]: e.target.value })} className="tabular no-spin" />
          </label>)}
        </div>
        <p className="text-caption text-fg-muted">Deja en blanco lo que no midas. Si ya hay un registro de ese día, se completa con estos valores.</p>
      </div>
    </Sheet>
    {toast}
  </section>
}
