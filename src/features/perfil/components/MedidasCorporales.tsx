import TendenciaRegistros from '../../../shared/components/TendenciaRegistros'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Cambio from '../../../shared/components/Cambio'
import Disclosure from '../../../shared/components/Disclosure'
import { Input } from '../../../shared/components/Input'
import SectionHeader from '../../../shared/components/SectionHeader'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { Medida } from '../../../shared/db/types'
import { useAviso } from '../../../shared/hooks/useAviso'
import { parseISODate, todayISO } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import * as medidasRepo from '../data/medidasRepo'
import { CAMPOS_MEDIDA, medidasDeBorrador, resumenMedidas, type BorradorMedida, type CampoMedida } from '../lib/medidas'

const fechaCorta = (f: string) => parseISODate(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

function textoMedida(m: Medida): string {
  return CAMPOS_MEDIDA.filter((c) => m[c.campo] !== undefined).map((c) => `${c.etiqueta} ${formatNumber(m[c.campo]!, 1)} ${c.unidad}`).join(' · ')
}

/**
 * Medidas corporales (cm y %): una ficha con el último valor y el cambio de cada zona (al tocarla, su evolución en una
 * Sheet), registro en otra Sheet e historial con borrado y «Deshacer».
 */
export default function MedidasCorporales() {
  const medidas = useLiveQuery(() => medidasRepo.todas(), [])
  const { avisar, avisarError, toast } = useAviso()
  const [evolucion, setEvolucion] = useState<CampoMedida | null>(null)
  const [abierta, setAbierta] = useState(false)
  const [aperturas, setAperturas] = useState(0)
  const [fecha, setFecha] = useState(todayISO())
  const [borrador, setBorrador] = useState<BorradorMedida>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const resumen = resumenMedidas(medidas ?? [])
  const conValor = resumen.filter((r) => r.ultimo !== null)
  const hayAlguna = conValor.length > 0
  const campoEvolucion = CAMPOS_MEDIDA.find((c) => c.campo === evolucion)

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
      // Una casilla por zona medida: su último valor y el cambio desde la anterior; al tocarla, su evolución.
      <Card padded={false} className="overflow-hidden">
        <ul aria-label="Última medida de cada zona" className="grid grid-cols-2">
          {conValor.map((r, i) => <li key={r.campo} className={`min-w-0 border-line ${i % 2 === 0 ? 'border-r' : ''} ${i < conValor.length - (conValor.length % 2 === 0 ? 2 : 1) ? 'border-b' : ''}`}>
            <button type="button" aria-haspopup="dialog" onClick={() => setEvolucion(r.campo)}
              className="app-button flex min-h-touch w-full min-w-0 flex-col items-start gap-1 px-card py-3 text-left">
              <span className="text-rotulo text-fg-muted">{r.etiqueta}</span>
              <span className="tabular break-words text-title text-fg">{formatNumber(r.ultimo!.valor, 1)} <span className="text-body font-normal text-fg-muted">{r.unidad}</span></span>
              {r.variacion !== null
                ? <Cambio diferencia={r.variacion} texto={r.variacion === 0 ? 'Sin cambios' : `${r.variacion < 0 ? '−' : '+'}${formatNumber(Math.abs(r.variacion), 1)} ${r.unidad}`} frente="desde la medida anterior" />
                : <span className="text-caption text-fg-muted">{fechaCorta(r.ultimo!.fecha)}</span>}
            </button>
          </li>)}
        </ul>
      </Card>
    )}
    {campoEvolucion && <Sheet open onClose={() => setEvolucion(null)} title={campoEvolucion.etiqueta}>
      <TendenciaRegistros puntos={(medidas ?? []).filter(m => m[campoEvolucion.campo] !== undefined).map(m => ({ fecha: m.fecha, valor: m[campoEvolucion.campo]! }))}
        unidad={campoEvolucion.unidad} titulo={campoEvolucion.etiqueta.toLowerCase()} />
    </Sheet>}
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
