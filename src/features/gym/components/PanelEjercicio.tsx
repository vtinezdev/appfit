import { useRef, useState, type ReactNode } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import Sheet from '../../../shared/components/Sheet'
import type { ConfiguracionEjecucion, Workout, ConfiguracionCarga, Exercise, Lado, ObjetivoEjercicio, SetEntry, TramoDropset } from '../../../shared/db/types'
import MenuSerie from './MenuSerie'
import RirSheet from './RirSheet'
import NotaEjercicio from './NotaEjercicio'
import EjecucionEjercicio from './EjecucionEjercicio'
import ProgresionEjercicio from './ProgresionEjercicio'
import CargaEjercicio, { cargaActual, textoCarga } from './CargaEjercicio'
import { opcionesAgarre, textoAgarre, tieneReps } from '../lib/ejecucion'
import type { CambioSerie } from '../data/setsRepo'
import { admiteCargaCorporal, modoCarga } from '../lib/carga'
import { TIPOS_SERIE, cambiosBajada, cambiosLadoBajada, conBajadaRestaurada, conLado, etiquetasSerie, nuevaBajada, sinBajada, textoEjecucion, tipoSerie } from '../lib/serie'

/** El borrador evita que una respuesta asíncrona anterior interrumpa la escritura. Sin valor (lado no registrado) queda vacío. */
export function CampoSerie({ valor, label, decimal = false, disabled = false, onChange }: {
  valor?: number
  label: string
  decimal?: boolean
  disabled?: boolean
  onChange: (valor: number) => void
}) {
  const [borrador, setBorrador] = useState<string | null>(null)
  return (
    <Input disabled={disabled} type="number" inputMode={decimal ? 'decimal' : 'numeric'} enterKeyHint={decimal ? 'done' : 'next'}
      min={0} step={decimal ? 2.5 : 1} aria-label={label} value={borrador ?? valor ?? ''} placeholder="—"
      onFocus={() => setBorrador(valor === undefined ? '' : String(valor))}
      onChange={(e) => {
        const texto = e.target.value
        setBorrador(texto)
        if (texto !== '') onChange(Math.round(Math.max(0, Number(texto) || 0) * 100) / 100)
      }}
      onBlur={() => {
        if (borrador === '' && valor !== undefined) onChange(0)
        setBorrador(null)
      }}
      className="tabular no-spin text-center font-semibold"
    />
  )
}

interface Props {
  ejercicio: Exercise
  /** Series del ejercicio en esta sesión, ordenadas. */
  sets: SetEntry[]
  /** Texto bajo el título («Última vez: …»). */
  ultimaVez?: string
  objetivo?: ObjetivoEjercicio
  /** Series marcadas y acción de marcar. Sin ellas no hay columna ✓. Devuelve true si la serie quedó marcada. */
  completadas?: number[]
  onCompletar?: (serie: SetEntry, numero: number) => boolean | void | Promise<boolean | void>
  /** Abrir el RIR al marcar una serie (ajuste «Preguntar el RIR al completar»). */
  preguntarRir?: boolean
  nuevaId?: number | null
  bloqueado?: boolean
  barraKg: number
  onActualizar: (id: number, cambio: CambioSerie) => void | Promise<void>
  onBorrar: (id: number, numero: number) => void
  onAgregar: () => void
  onQuitar?: () => void
  /** Aviso con Deshacer al quitar una bajada (Toast de la página). */
  onAviso?: (aviso: { mensaje: string; onDeshacer: () => Promise<void> }) => void
  contexto?: { workoutId: number; inicio: number; nota?: string; carga?: ConfiguracionCarga; onCarga: (carga: ConfiguracionCarga) => Promise<void>; workout?: Workout; ejecucion?: ConfiguracionEjecucion; onEjecucion?: (c: ConfiguracionEjecucion, habitual: boolean) => Promise<void>; onProgresion?: (clave: string, decision: 'aplicada' | 'mantener' | 'descartada') => Promise<void> }
  mover?: { puedeSubir: boolean; puedeBajar: boolean; onSubir: () => void; onBajar: () => void }
}

type Hoja = 'menu' | 'nota' | 'carga' | 'variante' | 'progresion' | { serie: number } | { rir: number; lado?: Lado }
const LADOS: { lado: Lado; letra: string; nombre: string }[] = [{ lado: 'izquierda', letra: 'I', nombre: 'izquierda' }, { lado: 'derecha', letra: 'D', nombre: 'derecha' }]

/** Botón de ajuste del ejercicio en su cabecera: la variante común se ve sin abrir nada. */
function ChipAjuste({ label, texto, apagado, disabled, onClick }: { label: string; texto: string; apagado?: boolean; disabled?: boolean; onClick: () => void }) {
  return <button type="button" aria-label={`${label}: ${texto}`} disabled={disabled} onClick={onClick}
    className={`app-button inline-flex min-h-touch max-w-full items-center gap-1 rounded-pill bg-surface-muted px-3 text-body-sm font-semibold hover:bg-line disabled:opacity-40 ${apagado ? 'text-fg-muted' : 'text-fg'}`}>
    <span className="min-w-0 truncate">{texto}</span><Icon name="chevron-right" size={16} className="shrink-0 rotate-90 text-fg-muted" />
  </button>
}

function CeldaRir({ valor, label, disabled, onClick }: { valor?: number; label: string; disabled?: boolean; onClick: () => void }) {
  return <button type="button" aria-label={`${label}: ${valor === undefined ? 'sin dato' : valor === 5 ? '5 o más' : valor}`} disabled={disabled} onClick={onClick}
    className={`app-button series-rir tabular min-h-touch w-full rounded-md border font-semibold transition-colors duration-short hover:bg-surface-muted disabled:opacity-40 ${valor === undefined ? 'border-dashed border-line-strong/60 text-caption text-fg-muted' : 'border-line-strong/40 text-body text-fg-muted'}`}>
    {valor === undefined ? 'RIR' : valor === 5 ? '5+' : valor}
  </button>
}

/** Panel de un ejercicio con sus series; lo comparten la sesión activa y el editor de entrenos terminados. */
export default function PanelEjercicio({ ejercicio, sets, ultimaVez, objetivo, completadas, onCompletar, preguntarRir = false, nuevaId, bloqueado, barraKg, onActualizar, onBorrar, onAgregar, onQuitar, onAviso, contexto, mover }: Props) {
  const actualizar = (id: number, cambio: CambioSerie) => { void Promise.resolve(onActualizar(id, cambio)).catch(() => {}) }
  const [hoja, setHoja] = useState<Hoja | null>(null)
  const despuesDelMenu = useRef<(() => void) | null>(null)
  // Las series de calentamiento no se numeran: se marcan con «C».
  let efectivas = 0
  const numeradas = sets.map((s) => ({ s, numero: s.tipo === 'calentamiento' ? null : ++efectivas }))
  const nombreDe = (numero: number | null) => numero === null ? 'calentamiento' : `serie ${numero}`
  const abiertaSerie = typeof hoja === 'object' && hoja && 'serie' in hoja ? numeradas.find(n => n.s.id === hoja.serie) : undefined
  const abiertaRir = typeof hoja === 'object' && hoja && 'rir' in hoja ? { ...numeradas.find(n => n.s.id === hoja.rir), lado: hoja.lado } : undefined
  const ejecucion: ConfiguracionEjecucion = contexto?.ejecucion ?? { ejecucion: sets[0]?.ejecucion ?? 'bilateral', kgUnilateral: sets[0]?.kgUnilateral, agarre: sets[0]?.agarre }
  const conCarga = contexto && (admiteCargaCorporal(ejercicio) || (contexto.carga && contexto.carga.modo !== 'externa') || sets.some(s => modoCarga(s) !== 'externa'))
  const agarres = opcionesAgarre(ejercicio)
  const conAgarre = agarres.orientacion || agarres.anchura || agarres.accesorio || !!ejecucion.agarre
  const modo = cargaActual(sets, contexto?.carga).modo
  const columnaKg = modo === 'lastre' ? 'Lastre' : modo === 'asistencia' ? 'Ayuda' : 'Kg'
  const conProgresion = !!(contexto?.workout && contexto.onProgresion)
  const menu = !!(contexto || mover || onQuitar)

  /** Fila suelta: se quita al momento y se puede deshacer en su posición. */
  async function quitarBajada(s: SetEntry, id: string, n: number) {
    const indice = s.bajadas?.findIndex(b => b.id === id) ?? -1
    const bajada = s.bajadas?.[indice]
    if (!bajada) return
    try { await onActualizar(s.id, a => sinBajada(a, id)) } catch { return }
    onAviso?.({ mensaje: `Bajada ${n} quitada`, onDeshacer: async () => { await onActualizar(s.id, a => conBajadaRestaurada(a, bajada, indice)) } })
  }

  function elegirDelMenu(accion: () => void) { despuesDelMenu.current = accion; setHoja(null) }

  async function completar(s: SetEntry, numero: number | null) {
    if (!onCompletar) return
    const hecha = completadas?.includes(s.id) ?? false
    const resultado = await onCompletar(s, numero ?? 0)
    // Se pregunta al marcar (no al desmarcar) y solo si la serie aún no tiene RIR.
    if (resultado === true && !hecha && preguntarRir && s.tipo !== 'calentamiento' && s.ejecucion !== 'lados' && s.rir === undefined) setHoja({ rir: s.id })
  }

  function campoKg(s: SetEntry, tramo: { peso: number }, label: string, cambio: (peso: number) => CambioSerie, ausente = false) {
    if (modoCarga(s) === 'corporal') return <p className="break-words text-center text-caption text-fg-muted">Corporal</p>
    return <CampoSerie disabled={bloqueado} valor={ausente ? undefined : tramo.peso} decimal label={label} onChange={peso => actualizar(s.id, cambio(peso))} />
  }

  /** Filas hijas de un tramo con lados distintos: una por lado, en la misma rejilla. */
  function filasLados(s: SetEntry, nombre: string, tramo: Pick<TramoDropset, 'lados'>, bajada?: { id: string; n: number }): ReactNode {
    return LADOS.map(({ lado, letra, nombre: nombreLado }, i) => {
      const p = tramo.lados?.[lado]
      const que = bajada ? `bajada ${bajada.n} ${nombreLado}` : nombreLado
      const cambio = (datos: { reps?: number; peso?: number }): CambioSerie => bajada ? (a: SetEntry) => cambiosLadoBajada(a, bajada.id, lado, datos) : (a: SetEntry) => ({ lados: conLado(a.lados, lado, datos) })
      return <div key={`${bajada?.id ?? 's'}-${lado}`} className="series-row series-child">
        <span className="series-child-label text-label text-fg-muted" aria-hidden>{bajada ? `↓${letra}` : letra}</span>
        <CampoSerie disabled={bloqueado} valor={p?.reps} label={`Repeticiones ${que}, ${nombre} de ${ejercicio.nombre}`} onChange={reps => actualizar(s.id, cambio({ reps }))} />
        {campoKg(s, p ?? { peso: 0 }, `Kg ${que}, ${nombre} de ${ejercicio.nombre}`, peso => cambio({ peso }), !p)}
        {bajada ? <span /> : <CeldaRir valor={p?.rir} label={`RIR ${nombreLado}, ${nombre} de ${ejercicio.nombre}`} disabled={bloqueado} onClick={() => setHoja({ rir: s.id, lado })} />}
        {bajada && i === 0 ? <IconButton icon="close" variant="ghost" size="sm" label={`Quitar bajada ${bajada.n}, ${nombre} de ${ejercicio.nombre}`} disabled={bloqueado} onClick={() => { void quitarBajada(s, bajada.id, bajada.n) }} /> : <span />}
      </div>
    })
  }

  return (
    <Card data-exercise-id={ejercicio.id} className="exercise-panel space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 tabIndex={-1} className="exercise-title break-words text-title text-fg">{ejercicio.nombre}</h2>
          {ultimaVez && <p className="text-caption text-fg-muted">{ultimaVez}</p>}
          {objetivo && <p className="tabular text-caption text-fg-muted">Objetivo: {objetivo.series} × {objetivo.repsMin === objetivo.repsMax ? objetivo.repsMin : `${objetivo.repsMin}–${objetivo.repsMax}`} reps{objetivo.descansoSeg ? ` · ${objetivo.descansoSeg} s de descanso` : ''}</p>}
        </div>
        {menu && <IconButton icon="more" variant="ghost" size="sm" label={`Opciones de ${ejercicio.nombre}`} disabled={bloqueado} onClick={() => setHoja('menu')} />}
      </div>
      {contexto?.nota && <button type="button" disabled={bloqueado} onClick={() => setHoja('nota')} aria-label={`Nota de ${ejercicio.nombre}: ${contexto.nota}`}
        className="block min-h-touch w-full text-left"><span className="line-clamp-2 break-words text-body-sm text-fg-muted">{contexto.nota}</span></button>}
      {contexto && <div className="flex flex-wrap gap-2">
        {conCarga && <ChipAjuste label={`Carga de ${ejercicio.nombre}`} texto={textoCarga(sets, contexto.carga)} disabled={bloqueado} onClick={() => setHoja('carga')} />}
        {contexto.onEjecucion && <ChipAjuste label={`Ejecución de ${ejercicio.nombre}`} texto={textoEjecucion(ejecucion)} disabled={bloqueado} onClick={() => setHoja('variante')} />}
        {contexto.onEjecucion && conAgarre && <ChipAjuste label={`Agarre de ${ejercicio.nombre}`} texto={textoAgarre(ejecucion.agarre) || 'Agarre'} apagado={!ejecucion.agarre} disabled={bloqueado} onClick={() => setHoja('variante')} />}
      </div>}
      {conProgresion && <ProgresionEjercicio ejercicio={ejercicio} workout={contexto!.workout!} sets={sets} objetivo={objetivo} bloqueado={bloqueado}
        abierto={hoja === 'progresion'} onAbrir={() => setHoja('progresion')} onCerrar={() => setHoja(null)} onDecidir={contexto!.onProgresion!} />}

      <div className="space-y-2">
        {sets.length > 0 && (
          <div className="series-row series-head text-caption text-fg-muted" aria-hidden>
            <span className="text-center">Serie</span><span className="text-center">Reps</span><span className="text-center">{columnaKg}</span><span className="text-center">RIR</span><span />
          </div>
        )}
        {numeradas.map(({ s, numero }) => {
          const nombreSerie = nombreDe(numero)
          const hecha = completadas?.includes(s.id) ?? false
          const tipo = tipoSerie(s)
          const letra = TIPOS_SERIE[tipo].letra
          const lados = s.ejecucion === 'lados'
          const etiquetas = etiquetasSerie(s, ejecucion)
          return (
            <div key={s.id} className="space-y-2" data-motion-id={s.id}>
              <div data-done={hecha} className={`series-row ${lados ? 'series-lados' : ''} ${nuevaId === s.id ? 'series-new' : ''}`}>
                <button type="button" className="series-type app-button tabular" disabled={bloqueado}
                  aria-label={`Opciones de ${nombreSerie} de ${ejercicio.nombre}${tipo !== 'normal' && tipo !== 'calentamiento' ? ` (${TIPOS_SERIE[tipo].label.toLowerCase()})` : ''}`}
                  onClick={() => setHoja({ serie: s.id })}>
                  {letra ? <span className="series-letter">{letra}</span> : numero}
                </button>
                {lados ? <p className="series-span text-body-sm text-fg-muted">Izquierda y derecha</p> : <>
                  <CampoSerie disabled={bloqueado} valor={s.reps} label={`Repeticiones, ${nombreSerie} de ${ejercicio.nombre}`} onChange={(reps) => actualizar(s.id, { reps })} />
                  {campoKg(s, s, `${modoCarga(s) === 'asistencia' ? 'Asistencia' : modoCarga(s) === 'lastre' ? 'Lastre' : 'Peso'} en kg, ${nombreSerie} de ${ejercicio.nombre}`, peso => ({ peso }))}
                  <CeldaRir valor={s.rir} label={`RIR, ${nombreSerie} de ${ejercicio.nombre}`} disabled={bloqueado} onClick={() => setHoja({ rir: s.id })} />
                </>}
                {onCompletar ? (
                  <button type="button" className="series-complete app-button"
                    aria-label={`${hecha ? 'Desmarcar' : 'Completar'} ${nombreSerie} de ${ejercicio.nombre}`} aria-pressed={hecha}
                    disabled={!tieneReps(s) || bloqueado} title={!tieneReps(s) ? 'Introduce las repeticiones para completar la serie' : undefined}
                    onClick={() => { void completar(s, numero) }}>
                    <Icon name="check" className="mx-auto" size={20} />
                  </button>
                ) : <span />}
              </div>
              {lados && filasLados(s, nombreSerie, s)}
              {s.bajadas?.map((b, i) => lados ? filasLados(s, nombreSerie, b, { id: b.id, n: i + 1 }) : (
                <div key={b.id} className="series-row series-child">
                  <span className="series-child-label text-label text-fg-muted" aria-hidden>↓</span>
                  <CampoSerie disabled={bloqueado} valor={b.reps} label={`Repeticiones bajada ${i + 1}, ${nombreSerie} de ${ejercicio.nombre}`} onChange={reps => actualizar(s.id, a => cambiosBajada(a, b.id, { reps }))} />
                  {campoKg(s, b, `Kg bajada ${i + 1}, ${nombreSerie} de ${ejercicio.nombre}`, peso => a => cambiosBajada(a, b.id, { peso }))}
                  <span />
                  <IconButton icon="close" variant="ghost" size="sm" label={`Quitar bajada ${i + 1}, ${nombreSerie} de ${ejercicio.nombre}`} disabled={bloqueado} onClick={() => { void quitarBajada(s, b.id, i + 1) }} />
                </div>
              ))}
              {tipo === 'dropset' && <Button variant="ghost" size="sm" className="series-add-child" disabled={bloqueado || (s.bajadas?.length ?? 0) >= 10}
                onClick={() => actualizar(s.id, a => ({ bajadas: [...(a.bajadas ?? []), nuevaBajada(a, crypto.randomUUID())] }))}><Icon name="plus" size={16} />Añadir bajada</Button>}
              {etiquetas.length > 0 && <p className="series-notes break-words text-caption text-fg-muted">{etiquetas.join(' · ')}</p>}
            </div>
          )
        })}
      </div>
      <Button variant="ghost" block disabled={bloqueado} onClick={onAgregar}>
        <Icon name="plus" size={16} />
        Añadir serie
      </Button>

      {abiertaSerie && (
        <MenuSerie open titulo={`${abiertaSerie.numero === null ? 'Calentamiento' : `Serie ${abiertaSerie.numero}`} · ${ejercicio.nombre}`} serie={abiertaSerie.s} ejercicio={ejercicio} base={ejecucion} barraKg={barraKg}
          onClose={() => setHoja(null)} onCambiar={async patch => { await onActualizar(abiertaSerie.s.id, patch) }}
          onBorrar={() => { setHoja(null); onBorrar(abiertaSerie.s.id, abiertaSerie.numero ?? 0) }} />
      )}
      {abiertaRir?.s && (() => {
        const { s, numero, lado } = abiertaRir
        const valor = lado ? s.lados?.[lado]?.rir : s.rir
        return <RirSheet open titulo={`RIR · ${numero === null || numero === undefined ? 'calentamiento' : `serie ${numero}`}${lado ? ` · ${lado}` : ''}`} valor={valor} alCompletar={preguntarRir}
          onClose={() => setHoja(null)} onElegir={async rir => { await onActualizar(s.id, lado ? (a: SetEntry) => ({ lados: conLado(a.lados, lado, { rir }) }) : { rir }) }} />
      })()}
      {contexto && hoja === 'nota' && <NotaEjercicio workoutId={contexto.workoutId} exerciseId={ejercicio.id} nombre={ejercicio.nombre} inicio={contexto.inicio} nota={contexto.nota} onClose={() => setHoja(null)} />}
      {contexto && hoja === 'carga' && <CargaEjercicio nombre={ejercicio.nombre} inicio={contexto.inicio} sets={sets} configuracion={contexto.carga} onGuardar={contexto.onCarga} onClose={() => setHoja(null)} />}
      {contexto?.onEjecucion && hoja === 'variante' && <EjecucionEjercicio open ejercicio={ejercicio} actual={ejecucion} onGuardar={contexto.onEjecucion} onClose={() => setHoja(null)} />}
      {menu && <Sheet open={hoja === 'menu'} onClose={() => setHoja(null)} title={ejercicio.nombre}
        onExited={() => { const accion = despuesDelMenu.current; despuesDelMenu.current = null; accion?.() }}>
        <ListGroup variante="plana" aria-label={`Opciones de ${ejercicio.nombre}`}>
          {contexto && <li><ListRow onClick={() => elegirDelMenu(() => setHoja('nota'))}><span className="min-w-0"><span className="block text-body-sm font-semibold">{contexto.nota ? 'Editar nota' : 'Añadir nota'}</span><span className="block break-words text-caption text-fg-muted">Solo de este ejercicio en esta sesión</span></span><Icon name="pencil" size={18} className="shrink-0 text-fg-muted" /></ListRow></li>}
          {conProgresion && <li><ListRow onClick={() => elegirDelMenu(() => setHoja('progresion'))}><span className="min-w-0"><span className="block text-body-sm font-semibold">Progresión</span><span className="block break-words text-caption text-fg-muted">Objetivo y sugerencias</span></span><Icon name="chevron-right" size={18} className="shrink-0 text-fg-muted" /></ListRow></li>}
          {mover && <li><ListRow disabled={!mover.puedeSubir} aria-label={`Subir ${ejercicio.nombre}`} onClick={() => elegirDelMenu(mover.onSubir)}><span className="text-body-sm font-semibold">Subir</span><Icon name="chevron-left" size={18} className="shrink-0 rotate-90 text-fg-muted" /></ListRow></li>}
          {mover && <li><ListRow disabled={!mover.puedeBajar} aria-label={`Bajar ${ejercicio.nombre}`} onClick={() => elegirDelMenu(mover.onBajar)}><span className="text-body-sm font-semibold">Bajar</span><Icon name="chevron-right" size={18} className="shrink-0 rotate-90 text-fg-muted" /></ListRow></li>}
          {onQuitar && <li><ListRow aria-label={`Quitar ${ejercicio.nombre} de este entreno`} onClick={() => elegirDelMenu(onQuitar)}><span className="min-w-0"><span className="block text-body-sm font-semibold text-destructive">Quitar de este entreno</span><span className="block break-words text-caption text-fg-muted">Con Deshacer; la rutina no cambia</span></span><Icon name="trash" size={18} className="shrink-0 text-destructive" /></ListRow></li>}
        </ListGroup>
      </Sheet>}
    </Card>
  )
}
