import TendenciaRegistros from '../../../shared/components/TendenciaRegistros'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Ayuda from '../../../shared/components/Ayuda'
import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Cambio from '../../../shared/components/Cambio'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import SectionHeader from '../../../shared/components/SectionHeader'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { Medida } from '../../../shared/db/types'
import { useAviso } from '../../../shared/hooks/useAviso'
import { parseISODate, todayISO } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import * as medidasRepo from '../data/medidasRepo'
import { CAMPOS_MEDIDA, etiquetaFechaMedida, medidasDeBorrador, resumenMedidas, type BorradorMedida, type CampoMedida } from '../lib/medidas'

const fechaCorta = (f: string) => parseISODate(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

function textoMedida(m: Medida): string {
  return CAMPOS_MEDIDA.filter((c) => m[c.campo] !== undefined).map((c) => `${c.etiqueta} ${formatNumber(m[c.campo]!, 1)} ${c.unidad}`).join(' · ')
}

/**
 * Medidas corporales (cm y %): una ficha con el último valor y el cambio de cada zona (al tocarla, su evolución en una
 * Sheet; sin ninguna medida, las seis zonas con «—» abren el registro), registro en otra Sheet (una casilla por zona con
 * su última medida; lo que explica la hoja va tras su «i») e historial con borrado y «Deshacer».
 */
export default function MedidasCorporales() {
  const medidas = useLiveQuery(() => medidasRepo.todas(), [])
  const { avisar, avisarError, toast } = useAviso()
  const [evolucion, setEvolucion] = useState<CampoMedida | null>(null)
  const [historial, setHistorial] = useState(false)
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
      // El aviso con «Deshacer» va bajo las hojas: se cierra el historial para que se vea.
      setHistorial(false)
      if (borrada) avisar({ mensaje: `Medidas del ${fechaCorta(borrada.fecha)} borradas`, onDeshacer: () => medidasRepo.restaurar(borrada) })
    } catch {
      avisarError('No se han podido borrar las medidas. Inténtalo de nuevo.')
    }
  }

  return <section aria-label="Medidas corporales" className="space-y-stack">
    <SectionHeader variant="section" action={<Button variant="ghost" size="sm" onClick={abrir}>Registrar</Button>}>Medidas corporales</SectionHeader>
    {/* Una casilla por zona medida: su último valor y el cambio desde la anterior; al tocarla, su evolución. Sin ninguna, las seis con «—». */}
    <Card padded={false} className="overflow-hidden">
      <ul aria-label="Última medida de cada zona" className="grid grid-cols-2">
        {(hayAlguna ? conValor : resumen).map((r, i, zonas) => <li key={r.campo} className={`min-w-0 border-line ${i % 2 === 0 ? 'border-r' : ''} ${i < zonas.length - (zonas.length % 2 === 0 ? 2 : 1) ? 'border-b' : ''}`}>
          <button type="button" aria-haspopup="dialog" onClick={() => r.ultimo ? setEvolucion(r.campo) : abrir()}
            aria-label={r.ultimo ? undefined : `${r.etiqueta}: sin medir. Registrar medidas`}
            className="app-button flex min-h-touch w-full min-w-0 flex-col items-start gap-1 px-card py-3 text-left">
            <span className="text-rotulo text-fg-muted">{r.etiqueta}</span>
            {r.ultimo
              ? <span className="tabular break-words text-title text-fg">{formatNumber(r.ultimo.valor, 1)} <span className="text-body font-normal text-fg-muted">{r.unidad}</span></span>
              : <span className="text-title text-fg-subtle">—</span>}
            {r.ultimo && (r.variacion !== null
              ? <Cambio diferencia={r.variacion} texto={r.variacion === 0 ? 'Sin cambios' : `${r.variacion < 0 ? '−' : '+'}${formatNumber(Math.abs(r.variacion), 1)} ${r.unidad}`} frente="desde la medida anterior" />
              : <span className="text-caption text-fg-muted">{fechaCorta(r.ultimo.fecha)}</span>)}
          </button>
        </li>)}
      </ul>
    </Card>
    {campoEvolucion && <Sheet open onClose={() => setEvolucion(null)} title={campoEvolucion.etiqueta}>
      <TendenciaRegistros puntos={(medidas ?? []).filter(m => m[campoEvolucion.campo] !== undefined).map(m => ({ fecha: m.fecha, valor: m[campoEvolucion.campo]! }))}
        unidad={campoEvolucion.unidad} titulo={campoEvolucion.etiqueta.toLowerCase()} />
    </Sheet>}
    {!!medidas?.length && <ListGroup pie={`Última medición: ${fechaCorta(medidas[0].fecha)}.`}>
      <li><ListRow aria-haspopup="dialog" onClick={() => setHistorial(true)}>
        <span className="min-w-0 flex-1 break-words text-body text-fg">Historial</span>
        <span className="tabular shrink-0 text-body-sm text-fg-muted">{formatNumber(medidas.length)} {medidas.length === 1 ? 'registro' : 'registros'}</span>
        <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
      </ListRow></li>
    </ListGroup>}
    {historial && !!medidas?.length && <Sheet open onClose={() => setHistorial(false)} title="Historial de medidas">
      <ul className="divide-y divide-line" aria-label="Historial de medidas">
        {medidas.map((m) => <li key={m.id} className="flex min-h-touch items-center justify-between gap-2 py-1">
          <span className="min-w-0"><span className="block text-body-sm font-medium text-fg">{fechaCorta(m.fecha)}</span><span className="tabular block break-words text-caption text-fg-muted">{textoMedida(m)}</span></span>
          <IconButton icon="trash" variant="ghost" size="sm" label={`Borrar medidas del ${fechaCorta(m.fecha)}`} onClick={() => borrar(m)} />
        </li>)}
      </ul>
    </Sheet>}

    <Sheet key={aperturas} open={abierta} onClose={() => setAbierta(false)} title="Registrar medidas"
      accion={<Ayuda titulo="Medidas corporales">
        <p>Cintura, cadera, pecho, brazo, muslo y grasa corporal: registra las que quieras seguir. Todo se queda en este dispositivo.</p>
        <p>Deja en blanco lo que no midas. Si ya hay un registro de ese día, se completa con estos valores.</p>
      </Ayuda>}
      footer={<div className="space-y-2">{error && <ErrorState>{error}</ErrorState>}<Button block loading={guardando} onClick={guardar}>Guardar</Button></div>}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-body-sm text-fg-muted" aria-hidden>Fecha</span>
          {/* El campo de fecha nativo, invisible encima del botón: tocarlo abre el selector del sistema. */}
          <label className="relative inline-flex min-h-touch items-center rounded-pill bg-surface-muted px-4 text-body-sm font-semibold text-fg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-strong">
            <span aria-hidden>{etiquetaFechaMedida(fecha, todayISO())}</span>
            <input type="date" aria-label="Fecha" max={todayISO()} value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer text-body opacity-0" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CAMPOS_MEDIDA.map((c) => {
            const ultimo = resumen.find((r) => r.campo === c.campo)?.ultimo
            return <label key={c.campo} className="block min-w-0 rounded-lg bg-surface-muted px-3 py-2">
              <span className="block text-rotulo text-fg-muted">{c.etiqueta}</span>
              <span className="mt-1 flex items-baseline gap-1">
                <input type="number" inputMode="decimal" step="0.1" placeholder="—" value={borrador[c.campo] ?? ''}
                  onChange={(e) => setBorrador({ ...borrador, [c.campo]: e.target.value })}
                  className="tabular no-spin w-0 min-w-0 flex-1 rounded-sm bg-transparent font-numeric text-heading text-fg placeholder:text-fg-subtle" />
                <span className="shrink-0 text-body-sm text-fg-muted">{c.unidad}</span>
              </span>
              <span className="block text-caption text-fg-muted">{ultimo ? `Última: ${formatNumber(ultimo.valor, 1)}` : 'Sin medir'}</span>
            </label>
          })}
        </div>
      </div>
    </Sheet>
    {toast}
  </section>
}
