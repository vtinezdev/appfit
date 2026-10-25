import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button, { IconButton } from '../../../shared/components/Button'
import Campo from '../../../shared/components/Campo'
import Icon from '../../../shared/components/Icon'
import { Select } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import SectionHeader from '../../../shared/components/SectionHeader'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { Aviso } from '../../../shared/hooks/useAviso'
import type { Comida } from '../../../shared/db/types'
import { addDays, comidaPorHora } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { congelarObjetivoDia } from '../../perfil/data/objetivosDiaRepo'
import * as comidasTipicasRepo from '../data/comidasTipicasRepo'
import * as planificadasRepo from '../data/planificadasRepo'
import { COMIDAS, nombreComida } from '../lib/comidas'
import type { ComidaTipica } from '../lib/comidasTipicas'
import { sumMacros } from '../lib/nutrition'
import { agruparPlanificadas, cantidadCompra, diasPlanificables, listaCompra, nombreDia, textoListaCompra, type GrupoPlanificado } from '../lib/planificadas'

const OPCIONES_COMIDA = COMIDAS.map((c) => ({ valor: c.valor, label: c.label }))

/** Colocar una comida típica en hoy o un día de la próxima semana (nunca en días pasados). */
function PlanificarSheet({ hoy, onClose, onPlanificado }: { hoy: string; onClose: () => void; onPlanificado: (ids: number[], fecha: string, comida: Comida) => void }) {
  const dias = diasPlanificables(hoy)
  const [fecha, setFecha] = useState(addDays(hoy, 1))
  const [comida, setComida] = useState<Comida>(comidaPorHora())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tipicas = useLiveQuery(() => comidasTipicasRepo.listar(hoy), [hoy])

  async function elegir(tipica: ComidaTipica) {
    if (guardando) return
    setGuardando(true); setError(null)
    try {
      const ids = await planificadasRepo.planificar(tipica.items, { fecha, comida }, hoy)
      onPlanificado(ids, fecha, comida)
      onClose()
    } catch (e) {
      setError(e instanceof planificadasRepo.FechaNoPlanificable ? e.message : 'No se ha podido planificar. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Planificar una comida">
      <div className="space-y-stack">
        <Campo etiqueta="Día">
          <Select value={fecha} onChange={(e) => setFecha(e.target.value)}>
            {dias.map((d) => <option key={d} value={d}>{nombreDia(d, hoy)}</option>)}
          </Select>
        </Campo>
        <SegmentedControl label="Comida" size="sm" opciones={OPCIONES_COMIDA} valor={comida} onChange={setComida} />
        <section aria-label="Comidas típicas para planificar" className="space-y-2">
          <p className="text-label text-fg-muted">Elige una comida típica</p>
          {!tipicas ? <LoadingState /> : tipicas.length === 0
            ? <p className="text-body-sm text-fg-muted">Todavía no tienes comidas típicas. Guarda una desde el Diario y podrás planificarla.</p>
            : <ul className="divide-y divide-line">
              {tipicas.map((t) => <li key={t.clave}>
                <ListRow tone="flat" disabled={guardando} onClick={() => void elegir(t)}>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block break-words text-body font-semibold">{t.nombre}</span>
                    <span className="tabular block text-caption text-fg-muted">{formatInt(t.items.length)} {t.items.length === 1 ? 'alimento' : 'alimentos'} · {formatInt(sumMacros(t.items).kcal)} kcal</span>
                  </span>
                  <Icon name="plus" size={18} className="shrink-0 text-fg-subtle" />
                </ListRow>
              </li>)}
            </ul>}
        </section>
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  )
}

type Alcance = '2' | '4' | '8'
const OPCIONES_ALCANCE: { valor: Alcance; label: string }[] = [{ valor: '2', label: 'Hoy y mañana' }, { valor: '4', label: '4 días' }, { valor: '8', label: 'Semana' }]

/** Lo que hay que comprar para lo planificado de los próximos días, copiable como texto. */
function ListaCompraSheet({ hoy, onClose }: { hoy: string; onClose: () => void }) {
  const [alcance, setAlcance] = useState<Alcance>('8')
  const [copiada, setCopiada] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const articulos = useLiveQuery(async () => listaCompra(await planificadasRepo.entreFechas(hoy, addDays(hoy, Number(alcance) - 1))), [hoy, alcance])

  function copiar() {
    if (!articulos?.length) return
    setError(null)
    const texto = `Lista de la compra (AppFit)\n${textoListaCompra(articulos)}`
    if (!navigator.clipboard) { setError('No se ha podido copiar. Apúntala a mano.'); return }
    navigator.clipboard.writeText(texto).then(() => setCopiada(true), () => setError('No se ha podido copiar. Apúntala a mano.'))
  }

  return (
    <Sheet open onClose={onClose} title="Lista de la compra">
      <div className="space-y-stack">
        <SegmentedControl label="Días" size="sm" opciones={OPCIONES_ALCANCE} valor={alcance} onChange={(v) => { setAlcance(v); setCopiada(false) }} />
        {!articulos ? <LoadingState /> : articulos.length === 0
          ? <p className="text-body-sm text-fg-muted">No hay nada planificado en estos días.</p>
          : <ListGroup variante="plana" aria-label="Alimentos que comprar">
            {articulos.map((a) => <li key={a.clave} className="flex min-h-touch flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
              <span className="min-w-0 flex-1 basis-40 break-words text-body text-fg">{a.nombre}</span>
              <span className="tabular text-body-sm text-fg-muted">{cantidadCompra(a.gramos)}</span>
            </li>)}
          </ListGroup>}
        <p className="text-caption text-fg-muted">Suma los gramos de lo planificado; las kcal rápidas no salen.</p>
        {articulos && articulos.length > 0 && <Button variant="secondary" className="w-full" onClick={copiar}>
          <Icon name={copiada ? 'check' : 'copy'} size={18} />{copiada ? 'Lista copiada' : 'Copiar lista'}
        </Button>}
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  )
}

/**
 * Comidas planificadas (B16), al pie del Diario de hoy: lo colocado para hoy y los próximos días, atenuado y fuera de
 * los totales hasta «Lo he comido». Desde aquí se planifica y se saca la lista de la compra.
 */
export default function Planificadas({ hoy, avisar, avisarError }: { hoy: string; avisar: (aviso: Aviso) => void; avisarError: (mensaje: string) => void }) {
  const filas = useLiveQuery(() => planificadasRepo.todas(), [])
  const [planificando, setPlanificando] = useState(false)
  const [lista, setLista] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  if (!filas) return null
  const grupos = agruparPlanificadas(filas)
  const claveGrupo = (g: GrupoPlanificado) => `${g.fecha}|${g.comida}`
  const tituloGrupo = (g: GrupoPlanificado) => `${nombreDia(g.fecha, hoy)} · ${nombreComida(g.comida)}`

  async function comido(g: GrupoPlanificado) {
    if (ocupado) return
    setOcupado(claveGrupo(g))
    try {
      const hecho = await planificadasRepo.loHeComido(g.fecha, g.comida, hoy)
      if (hecho.entradas.length === 0) return
      void congelarObjetivoDia(g.fecha, hoy)
      avisar({ mensaje: `Añadida a ${nombreComida(g.comida).toLowerCase()}`, onDeshacer: () => planificadasRepo.deshacerComido(hecho) })
    } catch {
      avisarError('No se ha podido añadir. Inténtalo de nuevo.')
    } finally {
      setOcupado(null)
    }
  }

  async function quitar(g: GrupoPlanificado) {
    try {
      const borradas = await planificadasRepo.borrar(g.filas.map((f) => f.id))
      if (borradas.length) avisar({ mensaje: `Quitada la planificada de ${tituloGrupo(g).toLowerCase()}`, onDeshacer: () => planificadasRepo.restaurar(borradas) })
    } catch {
      avisarError('No se ha podido quitar. Inténtalo de nuevo.')
    }
  }

  return (
    <section aria-label="Comidas planificadas" className="space-y-2">
      <SectionHeader variant="section" action={<Button variant="subtle" size="sm" onClick={() => setPlanificando(true)}><Icon name="calendar" size={18} />Planificar</Button>}>Planificadas</SectionHeader>
      {grupos.length === 0
        ? <p className="text-body-sm text-fg-muted">Coloca una comida típica en hoy o en los próximos días. No cuenta hasta que pulses «Lo he comido».</p>
        : <ListGroup variante="plana" aria-label="Lo planificado">
          {grupos.map((g) => <li key={claveGrupo(g)} className="flex min-h-touch flex-wrap items-center gap-x-2 gap-y-1 py-2">
            <span className="min-w-0 flex-1 basis-40">
              <span className="block break-words text-body-sm font-semibold text-fg-muted first-letter:uppercase">{tituloGrupo(g)}</span>
              <span className="tabular block break-words text-caption text-fg-subtle">{g.filas.map((f) => f.nombre).join(', ')} · {formatInt(g.kcal)} kcal</span>
            </span>
            <span className="flex items-center gap-1">
              {g.fecha <= hoy && <Button variant="secondary" size="sm" loading={ocupado === claveGrupo(g)} disabled={ocupado !== null} onClick={() => void comido(g)}><Icon name="check" size={16} />Lo he comido</Button>}
              <IconButton icon="close" label={`Quitar la planificada de ${tituloGrupo(g).toLowerCase()}`} variant="ghost" onClick={() => void quitar(g)} />
            </span>
          </li>)}
        </ListGroup>}
      {filas.length > 0 && <Button variant="subtle" size="sm" onClick={() => setLista(true)}><Icon name="copy" size={18} />Lista de la compra</Button>}
      {planificando && <PlanificarSheet hoy={hoy} onClose={() => setPlanificando(false)} onPlanificado={(ids, fecha, comida) => {
        avisar({ mensaje: `Planificada para ${nombreDia(fecha, hoy).toLowerCase()} · ${nombreComida(comida).toLowerCase()}`, onDeshacer: async () => { await planificadasRepo.borrar(ids) } })
      }} />}
      {lista && <ListaCompraSheet hoy={hoy} onClose={() => setLista(false)} />}
    </section>
  )
}
