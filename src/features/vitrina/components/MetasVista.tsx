import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Ayuda from '../../../shared/components/Ayuda'
import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Campo from '../../../shared/components/Campo'
import Icon from '../../../shared/components/Icon'
import { DecimalInput, Input, Select } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import ProgressBar from '../../../shared/components/ProgressBar'
import SectionHeader from '../../../shared/components/SectionHeader'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { useAviso } from '../../../shared/hooks/useAviso'
import { todayISO } from '../../../shared/lib/dates'
import * as exercisesRepo from '../../gym/data/exercisesRepo'
import * as setsRepo from '../../gym/data/setsRepo'
import * as metasRepo from '../data/metasRepo'
import { useVitrina } from '../hooks/useVitrina'
import { nombreMesMeta, NOMBRE_TIPO_META, textoPlazo, type EstadoMeta, type NuevaMeta, type TipoMeta } from '../lib/metas'

type Hoja = { modo: 'nueva' } | { modo: 'editar'; estado: EstadoMeta }

/** Este mes y los dos siguientes (YYYY-MM), para «Km de un mes». */
function mesesProximos(hoy: string): string[] {
  const [y, m] = hoy.split('-').map(Number)
  return [0, 1, 2].map((i) => { const d = new Date(y, m - 1 + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
}

function HojaMeta({ hoja, hoy, onClose, onGuardada }: { hoja: Hoja; hoy: string; onClose: () => void; onGuardada: (mensaje: string) => void }) {
  const editando = hoja.modo === 'editar' ? hoja.estado.meta : null
  const [tipo, setTipo] = useState<TipoMeta>(editando?.tipo ?? 'record')
  const [valor, setValor] = useState<number | undefined>(editando?.valor)
  const [exerciseId, setExerciseId] = useState<number | undefined>(editando?.exerciseId)
  const [mes, setMes] = useState(editando?.mes ?? mesesProximos(hoy)[0])
  const [fecha, setFecha] = useState(editando?.fecha ?? '')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  // Ejercicios con historial, por nombre: una meta de récord sale de lo que ya entrenas.
  const ejercicios = useLiveQuery(async () => {
    const [todos, series] = await Promise.all([exercisesRepo.listar(), setsRepo.todas()])
    const usados = new Set(series.map((s) => s.exerciseId))
    return todos.filter((e) => usados.has(e.id)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [])

  async function guardar() {
    if (ocupado) return
    setOcupado(true); setError(null)
    const m: NuevaMeta = { tipo, valor: valor ?? Number.NaN, ...(tipo === 'record' ? { exerciseId } : {}), ...(tipo === 'km-mes' ? { mes } : {}), ...(fecha && tipo !== 'km-mes' ? { fecha } : {}) }
    try {
      if (editando) await metasRepo.editar(editando.id, { valor: m.valor, fecha: m.fecha, mes: m.mes }, hoy)
      else await metasRepo.crear(m, hoy)
      onGuardada(editando ? 'Meta guardada' : 'Meta creada')
    } catch (e) {
      setError(e instanceof metasRepo.MetaInvalida ? e.message : 'No se ha podido guardar la meta. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  const unidad = tipo === 'record' ? 'kg' : tipo === 'km-mes' ? 'km' : 'semanas'
  return (
    <Sheet open onClose={() => { if (!ocupado) onClose() }} title={editando ? 'Editar meta' : 'Nueva meta'}
      footer={<Button block loading={ocupado} onClick={() => { void guardar() }}>{editando ? 'Guardar' : 'Crear meta'}</Button>}>
      <div className="space-y-stack">
        {!editando && <SegmentedControl<TipoMeta> label="Tipo de meta" valor={tipo} onChange={(t) => { setTipo(t); setError(null) }}
          opciones={[{ valor: 'record', label: 'Récord' }, { valor: 'km-mes', label: 'Km de un mes' }, { valor: 'semanas', label: 'Semanas' }]} />}
        {editando && <p className="text-body-sm text-fg-muted">{NOMBRE_TIPO_META[editando.tipo]} · {hoja.modo === 'editar' && hoja.estado.titulo}</p>}
        {tipo === 'record' && !editando && <Campo etiqueta="Ejercicio">
          <Select value={exerciseId ?? ''} onChange={(e) => setExerciseId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Elige un ejercicio</option>
            {(ejercicios ?? []).map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </Select>
        </Campo>}
        {tipo === 'km-mes' && <Campo etiqueta="Mes">
          <Select value={mes} onChange={(e) => setMes(e.target.value)}>
            {mesesProximos(hoy).map((m) => <option key={m} value={m}>{nombreMesMeta(m)} de {m.slice(0, 4)}</option>)}
          </Select>
        </Campo>}
        <Campo etiqueta={tipo === 'record' ? 'Peso (kg)' : tipo === 'km-mes' ? 'Kilómetros' : 'Semanas cumplidas'}>
          <DecimalInput value={valor} onChange={setValor} placeholder={unidad} />
        </Campo>
        {tipo !== 'km-mes' && <Campo etiqueta="Plazo (opcional)" ayuda="Si pasa sin cumplirla, la meta queda «Sin cumplir»: puedes cambiar la fecha.">
          <Input type="date" min={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Campo>}
        {tipo === 'semanas' && <p className="text-caption text-fg-muted">Cuentan las semanas de Ritmo cumplidas desde esta semana.</p>}
        <p className="text-caption text-fg-muted">Las metas son de lo que entrenas, nunca de tu peso corporal.</p>
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  )
}

/** Ejemplos de la tarjeta sin metas: uno de cada tipo, con una barra a medias para ver cómo se sigue. */
const EJEMPLOS = [
  { icono: 'trophy', titulo: 'Press banca 100 kg', detalle: '85 de 100 kg', pct: 85 },
  { icono: 'route', titulo: '80 km en noviembre', detalle: '32 de 80 km', pct: 40 },
  { icono: 'calendar', titulo: '12 semanas cumplidas', detalle: '7 de 12', pct: 58 },
] as const

/**
 * Metas personales (B13) en Progreso › Semana: récord de un ejercicio, km de un mes o semanas cumplidas, con su barra y el
 * plazo. Cumplir una da la pieza «Meta cumplida» en la Vitrina. Si pasa el plazo: «Sin cumplir · ¿Cambiar fecha?», sin rojo.
 * Borrar es inmediato, con «Deshacer».
 */
export default function MetasVista() {
  const hoy = todayISO()
  const estado = useVitrina(hoy)
  const [hoja, setHoja] = useState<Hoja | null>(null)
  const [aperturas, setAperturas] = useState(0)
  const { avisar, avisarError, toast } = useAviso()
  if (!estado?.visible) return null
  const metas = estado.metas

  async function borrar(e: EstadoMeta) {
    try {
      const quitada = await metasRepo.borrar(e.meta.id)
      if (quitada) avisar({ mensaje: `Meta «${e.titulo}» borrada`, onDeshacer: () => metasRepo.restaurar(quitada).then(() => undefined) })
    } catch {
      avisarError('No se ha podido borrar la meta. Inténtalo de nuevo.')
    }
  }
  const abrir = (h: Hoja) => { setAperturas((n) => n + 1); setHoja(h) }

  return (
    <section aria-labelledby="metas" className="space-y-stack">
      <SectionHeader variant="section" action={<span className="flex items-center">
        <Ayuda titulo="Metas">
          <p>Una meta es un objetivo que te pones tú. La app sigue tu progreso con lo que ya registras, sin que apuntes nada más.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><span className="font-semibold text-fg">Récord de un ejercicio</span>: llegar a un peso en un ejercicio, como press banca a 100 kg.</li>
            <li><span className="font-semibold text-fg">Km de un mes</span>: andar o correr unos km en un mes, con tus actividades.</li>
            <li><span className="font-semibold text-fg">Semanas cumplidas</span>: cumplir el plan de Ritmo un número de semanas.</li>
          </ul>
          <p>Cuenta lo que hagas desde que la creas. Puedes ponerle plazo o no; si pasa sin cumplirla, queda como «Sin cumplir» y puedes cambiar la fecha. Al cumplirla, ganas la pieza «Meta cumplida» en la Vitrina.</p>
          <p>Nunca son de tu peso corporal.</p>
        </Ayuda>
        {metas.length > 0 && <Button variant="ghost" size="sm" onClick={() => abrir({ modo: 'nueva' })}><Icon name="plus" size={16} />Nueva meta</Button>}
      </span>}>
        <span id="metas">Metas</span>
      </SectionHeader>
      {metas.length === 0
        // Sin metas: qué es una meta con tres ejemplos de verdad (título, de qué tipo y una barra a medias) y el botón para la primera.
        ? <Card className="space-y-4">
          <p className="text-rotulo text-fg-muted">Por ejemplo</p>
          <ul aria-label="Ejemplos de metas" className="space-y-3">
            {EJEMPLOS.map((e) => <li key={e.titulo} className="flex items-center gap-3">
              <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg-muted"><Icon name={e.icono} size={18} /></span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="min-w-0 break-words text-body-sm font-semibold text-fg">{e.titulo}</span>
                  <span className="tabular text-caption text-fg-muted">{e.detalle}</span>
                </span>
                <span aria-hidden className="block h-1.5 overflow-hidden rounded-pill bg-surface-muted"><span className="block h-full rounded-pill bg-fg-subtle" style={{ width: `${e.pct}%` }} /></span>
              </span>
            </li>)}
          </ul>
          <Button variant="secondary" size="sm" onClick={() => abrir({ modo: 'nueva' })}><Icon name="plus" size={16} />Crear mi primera meta</Button>
        </Card>
        : <ListGroup aria-label="Tus metas">
          {metas.map((e) => {
            const plazo = textoPlazo(e)
            return <li key={e.meta.id} className="space-y-2 py-3">
              <div className="flex flex-wrap items-start gap-2">
                <span className="min-w-0 flex-1 basis-40">
                  <span className="block break-words text-body font-semibold text-fg">{e.titulo}</span>
                  <span className="tabular block break-words text-caption text-fg-muted">{e.detalle}{plazo ? ` · ${plazo}` : ''}</span>
                </span>
                <div className="ml-auto flex shrink-0 gap-1">
                  {!e.cumplida && <Button variant="ghost" size="sm" onClick={() => abrir({ modo: 'editar', estado: e })}>{e.sinCumplir ? '¿Cambiar fecha?' : 'Editar'}</Button>}
                  <IconButton icon="trash" variant="ghost" size="sm" label={`Borrar la meta ${e.titulo}`} onClick={() => { void borrar(e) }} />
                </div>
              </div>
              <ProgressBar value={e.cumplida ? e.objetivo : e.progreso} goal={e.objetivo} label={e.titulo} valueText={`${e.detalle}${plazo ? `, ${plazo.toLowerCase()}` : ''}`}
                colorClass={e.sinCumplir ? 'bg-fg-muted' : 'bg-accent-strong'} />
              {e.cumplida && <p className="flex items-center gap-1 text-caption font-semibold text-accent-strong"><Icon name="trophy" size={14} />Pieza «Meta cumplida» en la Vitrina</p>}
            </li>
          })}
        </ListGroup>}
      {hoja && <HojaMeta key={aperturas} hoja={hoja} hoy={hoy} onClose={() => setHoja(null)} onGuardada={(m) => { setHoja(null); avisar({ mensaje: m }) }} />}
      {toast}
    </section>
  )
}
