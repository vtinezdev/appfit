import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import Sheet from '../../../shared/components/Sheet'
import type { ConfiguracionEjecucion, Workout, ConfiguracionCarga, Exercise, Lado, ObjetivoEjercicio, Routine, SetEntry, TramoDropset } from '../../../shared/db/types'
import MenuSerie from './MenuSerie'
import RirSheet from './RirSheet'
import NotaEjercicio from './NotaEjercicio'
import EjecucionEjercicio from './EjecucionEjercicio'
import ProgresionEjercicio from './ProgresionEjercicio'
import AvisoElite from '../../liga/components/AvisoElite'
import LigaSheet from '../../liga/components/LigaSheet'
import IconoLiga from '../../liga/components/IconoLiga'
import type { LigaEjercicio } from '../../liga/lib/liga'
import type { Alternativa } from '../../liga/lib/alternativas'
import { textoDivision } from '../../liga/lib/textos'
import CargaEjercicio, { cargaActual, textoCarga } from './CargaEjercicio'
import { opcionesAgarre, textoAgarre, tieneReps } from '../lib/ejecucion'
import type { CambioSerie } from '../data/setsRepo'
import { admiteCargaCorporal, modoCarga } from '../lib/carga'
import { TIPOS_SERIE, cambiosBajada, cambiosLadoBajada, conBajadaRestaurada, conLadoEspejo, etiquetasSerie, nuevaBajada, sinBajada, textoEjecucion, tipoSerie } from '../lib/serie'
import type { Anterior, TextoAnterior } from '../lib/anterior'
import { subtituloEjercicio } from '../lib/presentacionEjercicio'
import MiniaturaEjercicio from './MiniaturaEjercicio'
import { volumenSets } from '../lib/workout'
import { cargaInusual } from '../lib/cargaInusual'
import { decimalEditable, esDecimalParcial, formatInt, formatNumber, leerDecimal } from '../../../shared/lib/format'

/** El borrador evita que una respuesta asíncrona anterior interrumpa la escritura. Sin valor (lado no registrado) queda vacío. */
export function CampoSerie({ valor, label, decimal = false, disabled = false, className = '', onChange, onTerminarEdicion }: {
  valor?: number
  label: string
  decimal?: boolean
  disabled?: boolean
  className?: string
  onChange: (valor: number) => void
  onTerminarEdicion?: (valor: number) => void
}) {
  const [borrador, setBorrador] = useState<string | null>(null)
  return (
    <Input disabled={disabled} type="text" role="spinbutton" inputMode={decimal ? 'decimal' : 'numeric'} enterKeyHint={decimal ? 'done' : 'next'}
      aria-valuemin={0} aria-valuenow={leerDecimal(borrador ?? decimalEditable(valor))} aria-label={label} value={borrador ?? decimalEditable(valor)} placeholder="—"
      onFocus={() => setBorrador(decimalEditable(valor))}
      onChange={(e) => {
        const texto = e.target.value.trim()
        if (!esDecimalParcial(texto)) return
        setBorrador(texto)
        const numero = leerDecimal(texto)
        if (numero !== undefined) onChange(Math.round(numero * 100) / 100)
      }}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()
        const actual = leerDecimal(e.currentTarget.value) ?? valor ?? 0
        const siguiente = Math.round(Math.max(0, actual + (e.key === 'ArrowUp' ? 1 : -1) * (decimal ? 2.5 : 1)) * 100) / 100
        setBorrador(decimalEditable(siguiente))
        onChange(siguiente)
      }}
      onBlur={() => {
        if (borrador === '' && valor !== undefined) onChange(0)
        const n = leerDecimal(borrador ?? decimalEditable(valor))
        if (n !== undefined) onTerminarEdicion?.(n)
        setBorrador(null)
      }}
      className={`tabular no-spin text-center font-semibold ${className}`}
    />
  )
}

interface Props {
  ejercicio: Exercise
  /** Series del ejercicio en esta sesión, ordenadas. */
  sets: SetEntry[]
  /** Lo que se hizo en cada serie la sesión anterior (por id de serie). Con datos aparece la columna «Anterior». */
  anteriores?: Map<number, Anterior>
  referenciasCarga?: SetEntry[]
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
  /** Liga del ejercicio antes de este entreno (sesión activa); `avisar` en Élite si no es básico ni mantenido. */
  liga?: { estado: LigaEjercicio; avisar: boolean; hoy: string; mantenido: boolean; alternativas: Alternativa[]; sinRecords: number; rutinas: Routine[] }
  /**
   * Sesión activa: con todas sus series hechas el ejercicio se pliega en una fila (miniatura, nombre, volumen y «3/3»).
   * `plegado` lo decide la página; `onPlegar(false)` lo despliega para corregir y `onPlegar(true)` lo vuelve a plegar.
   */
  plegado?: boolean
  onPlegar?: (plegar: boolean) => void
}

type Hoja = 'menu' | 'nota' | 'carga' | 'variante' | 'progresion' | 'liga' | { serie: number } | { rir: number; lado?: Lado }
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
    className={`app-button celda-rir series-rir tabular min-h-touch w-full rounded-md border font-semibold transition-colors duration-short hover:bg-surface-muted disabled:opacity-40 ${valor === undefined ? 'border-dashed border-line-strong/60 text-caption text-fg-muted' : 'border-line-strong/40 text-body text-fg-muted'}`}>
    {valor === undefined ? 'RIR' : valor === 5 ? '5+' : valor}
  </button>
}

/** Columna «Anterior»: corta a la vista y completa para el lector de pantalla. Sin par, «—» (solo cuando cabe como columna). */
function CeldaAnterior({ dato }: { dato?: TextoAnterior }) {
  return <span className="celda-prev series-prev tabular" data-vacia={!dato}>
    <span aria-hidden="true"><span className="series-prev-label">Anterior · </span>{dato?.texto ?? '—'}</span>
    <span className="sr-only">{dato ? `Anterior: ${dato.etiqueta}` : 'Sin serie anterior'}</span>
  </span>
}

/** Panel de un ejercicio con sus series; lo comparten la sesión activa y el editor de entrenos terminados. */
export default function PanelEjercicio({ ejercicio, sets, anteriores, referenciasCarga = [], objetivo, completadas, onCompletar, preguntarRir = false, nuevaId, bloqueado, barraKg, onActualizar, onBorrar, onAgregar, onQuitar, onAviso, contexto, mover, liga, plegado = false, onPlegar }: Props) {
  const filaPlegada = useRef<HTMLButtonElement>(null)
  const estabaPlegado = useRef(plegado)
  // Al plegarse justo tras marcar la última serie, el ✓ desaparece: el foco pasa a la fila plegada en vez de perderse
  // (con la hoja del RIR abierta, cuando se cierre: la capa modal busca `data-foco-pendiente`).
  useLayoutEffect(() => {
    if (plegado && !estabaPlegado.current) {
      const activo = document.activeElement
      if (!activo || activo === document.body) filaPlegada.current?.focus({ preventScroll: true })
      else if (activo.closest('[role="dialog"]')) filaPlegada.current?.setAttribute('data-foco-pendiente', '')
    }
    estabaPlegado.current = plegado
  }, [plegado])
  const cargasRevisadas = useRef(new Set<string>())
  const [avisoCarga, setAvisoCarga] = useState<{ peso: number; referencia: number; label: string } | null>(null)
  const completo = sets.length > 0 && sets.every(s => completadas?.includes(s.id))
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
  const conAnterior = !!anteriores && anteriores.size > 0
  const fila = conAnterior ? 'series-row con-anterior' : 'series-row'

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
    if (modoCarga(s) === 'corporal') return <p className="celda-kg break-words text-center text-caption text-fg-muted">Corporal</p>
    return <CampoSerie className="celda-kg" disabled={bloqueado} valor={ausente ? undefined : tramo.peso} decimal label={label} onChange={peso => { setAvisoCarga(null); actualizar(s.id, cambio(peso)) }} onTerminarEdicion={peso => {
      if (tramo !== s) return
      const referencia = cargaInusual(s, peso, referenciasCarga)
      setAvisoCarga(referencia === null || cargasRevisadas.current.has(`${label}:${peso}`) ? null : { peso, referencia, label })
    }} />
  }

  /** Filas hijas de un tramo con lados distintos: una por lado, en la misma rejilla. */
  function filasLados(s: SetEntry, nombre: string, tramo: Pick<TramoDropset, 'lados'>, previo: Omit<Anterior, 'bajadas'> | undefined, bajada?: { id: string; n: number }): ReactNode {
    return LADOS.map(({ lado, letra, nombre: nombreLado }, i) => {
      const p = tramo.lados?.[lado]
      const que = bajada ? `bajada ${bajada.n} ${nombreLado}` : nombreLado
      const cambio = (datos: { reps?: number; peso?: number }): CambioSerie => bajada ? (a: SetEntry) => cambiosLadoBajada(a, bajada.id, lado, datos) : (a: SetEntry) => ({ lados: conLadoEspejo(a.lados, lado, datos) })
      return <div key={`${bajada?.id ?? 's'}-${lado}`} className={`${fila} series-child`}>
        <span className="celda-tipo series-child-label text-label text-fg-muted" aria-hidden>{bajada ? `↓${letra}` : letra}</span>
        {conAnterior && <CeldaAnterior dato={previo?.lados[lado] ?? previo?.fila} />}
        <CampoSerie className="celda-reps" disabled={bloqueado} valor={p?.reps} label={`Repeticiones ${que}, ${nombre} de ${ejercicio.nombre}`} onChange={reps => actualizar(s.id, cambio({ reps }))} />
        {campoKg(s, p ?? { peso: 0 }, `Kg ${que}, ${nombre} de ${ejercicio.nombre}`, peso => cambio({ peso }), !p)}
        {!bajada && <CeldaRir valor={p?.rir} label={`RIR ${nombreLado}, ${nombre} de ${ejercicio.nombre}`} disabled={bloqueado} onClick={() => setHoja({ rir: s.id, lado })} />}
        {bajada && i === 0 && <IconButton className="celda-ok" icon="close" variant="ghost" size="sm" label={`Quitar bajada ${bajada.n}, ${nombre} de ${ejercicio.nombre}`} disabled={bloqueado} onClick={() => { void quitarBajada(s, bajada.id, bajada.n) }} />}
      </div>
    })
  }

  return (
    <Card data-exercise-id={ejercicio.id} data-plegado={plegado || undefined} padded={!plegado} className={`exercise-panel ${plegado ? '' : 'space-y-3'}`}>
      {plegado ? <button ref={filaPlegada} type="button" aria-expanded={false} onClick={() => onPlegar?.(false)}
        aria-label={`${ejercicio.nombre}: ${formatInt(sets.length)} de ${formatInt(sets.length)} series hechas, ${formatInt(volumenSets(sets))} kg. Desplegar`}
        className="app-button flex min-h-touch w-full flex-wrap items-center gap-3 rounded-lg p-3 text-left">
        <MiniaturaEjercicio catalogId={ejercicio.catalogId} />
        <span className="min-w-0 flex-1 basis-32 break-words text-body font-semibold text-fg">{ejercicio.nombre}</span>
        <span className="tabular shrink-0 text-caption text-fg-muted">{formatInt(volumenSets(sets))} kg</span>
        <span className="tabular flex shrink-0 items-center gap-1 text-body-sm font-bold text-success"><Icon name="check" size={18} />{formatInt(sets.length)}/{formatInt(sets.length)}</span>
      </button> : <>
      <div className="flex items-start gap-2">
        {/* Con texto ampliado la miniatura (decorativa) pasa encima del título en lugar de estrecharlo. */}
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
        <MiniaturaEjercicio catalogId={ejercicio.catalogId} />
        <div className="min-w-0 flex-1 basis-32">
          <h2 tabIndex={-1} className="exercise-title break-words text-title text-fg">{ejercicio.nombre}</h2>
          <p className="break-words text-caption text-fg-muted">{subtituloEjercicio(ejercicio)}</p>
          {objetivo && <p className="tabular text-caption text-fg-muted">Objetivo: {objetivo.series} × {objetivo.repsMin === objetivo.repsMax ? objetivo.repsMin : `${objetivo.repsMin}–${objetivo.repsMax}`} reps{objetivo.descansoSeg ? ` · ${objetivo.descansoSeg} s de descanso` : ''}</p>}
        </div>
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
      {liga?.avisar && <AvisoElite liga={liga.estado} nombre={ejercicio.nombre} disabled={bloqueado} onAbrir={() => setHoja('liga')} />}

      <div className="space-y-2">
        {sets.length > 0 && (
          <div className={`${fila} series-head text-caption text-fg-muted`} aria-hidden>
            <span className="celda-tipo text-center">Serie</span>{conAnterior && <span className="celda-prev text-center">Anterior</span>}<span className="celda-reps text-center">Reps</span><span className="celda-kg text-center">{columnaKg}</span><span className="celda-rir text-center">RIR</span>
          </div>
        )}
        {numeradas.map(({ s, numero }) => {
          const nombreSerie = nombreDe(numero)
          const hecha = completadas?.includes(s.id) ?? false
          const tipo = tipoSerie(s)
          const letra = TIPOS_SERIE[tipo].letra
          const lados = s.ejecucion === 'lados'
          const etiquetas = etiquetasSerie(s, ejecucion)
          const previo = anteriores?.get(s.id)
          return (
            <div key={s.id} className="series-set space-y-2" data-motion-id={s.id}>
              <div className={`${fila} ${nuevaId === s.id ? 'series-new' : ''}`}>
                <button type="button" className="celda-tipo series-type app-button tabular" disabled={bloqueado} aria-haspopup="dialog"
                  aria-label={`Opciones de ${nombreSerie} de ${ejercicio.nombre}${tipo !== 'normal' && tipo !== 'calentamiento' ? ` (${TIPOS_SERIE[tipo].label.toLowerCase()})` : ''}`}
                  onClick={() => setHoja({ serie: s.id })}>
                  {letra ? <span className="series-letter">{letra}</span> : numero}
                  <Icon name="chevron-down" size={12} className="series-type-chevron text-fg-muted" />
                </button>
                {lados ? <p className="series-span text-body-sm text-fg-muted">Izquierda y derecha</p> : <>
                  {conAnterior && <CeldaAnterior dato={previo?.fila} />}
                  <CampoSerie className="celda-reps" disabled={bloqueado} valor={s.reps} label={`Repeticiones, ${nombreSerie} de ${ejercicio.nombre}`} onChange={(reps) => actualizar(s.id, { reps })} />
                  {campoKg(s, s, `${modoCarga(s) === 'asistencia' ? 'Asistencia' : modoCarga(s) === 'lastre' ? 'Lastre' : 'Peso'} en kg, ${nombreSerie} de ${ejercicio.nombre}`, peso => ({ peso }))}
                  <CeldaRir valor={s.rir} label={`RIR, ${nombreSerie} de ${ejercicio.nombre}`} disabled={bloqueado} onClick={() => setHoja({ rir: s.id })} />
                </>}
                {onCompletar ? (
                  <button type="button" className="celda-ok series-complete app-button"
                    aria-label={`${hecha ? 'Desmarcar' : 'Completar'} ${nombreSerie} de ${ejercicio.nombre}`} aria-pressed={hecha}
                    disabled={!tieneReps(s) || bloqueado} title={!tieneReps(s) ? 'Introduce las repeticiones para completar la serie' : undefined}
                    onClick={() => { void completar(s, numero) }}>
                    <Icon name="check" className="mx-auto" size={20} />
                  </button>
                ) : null}
              </div>
              {lados && filasLados(s, nombreSerie, s, previo)}
              {s.bajadas?.map((b, i) => lados ? filasLados(s, nombreSerie, b, previo?.bajadas[i], { id: b.id, n: i + 1 }) : (
                <div key={b.id} className={`${fila} series-child`}>
                  <span className="celda-tipo series-child-label text-label text-fg-muted" aria-hidden>↓</span>
                  {conAnterior && <CeldaAnterior dato={previo?.bajadas[i]?.fila} />}
                  <CampoSerie className="celda-reps" disabled={bloqueado} valor={b.reps} label={`Repeticiones bajada ${i + 1}, ${nombreSerie} de ${ejercicio.nombre}`} onChange={reps => actualizar(s.id, a => cambiosBajada(a, b.id, { reps }))} />
                  {campoKg(s, b, `Kg bajada ${i + 1}, ${nombreSerie} de ${ejercicio.nombre}`, peso => a => cambiosBajada(a, b.id, { peso }))}
                  <IconButton className="celda-ok" icon="close" variant="ghost" size="sm" label={`Quitar bajada ${i + 1}, ${nombreSerie} de ${ejercicio.nombre}`} disabled={bloqueado} onClick={() => { void quitarBajada(s, b.id, i + 1) }} />
                </div>
              ))}
              {tipo === 'dropset' && <Button variant="ghost" size="sm" className="series-add-child" disabled={bloqueado || (s.bajadas?.length ?? 0) >= 10}
                onClick={() => actualizar(s.id, a => ({ bajadas: [...(a.bajadas ?? []), nuevaBajada(a, crypto.randomUUID())] }))}><Icon name="plus" size={16} />Añadir bajada</Button>}
              {etiquetas.length > 0 && <p className="series-notes break-words text-caption text-fg-muted">{etiquetas.join(' · ')}</p>}
            </div>
          )
        })}
      </div>
      {avisoCarga && <aside aria-label="Revisar carga" className="space-y-2 border-t border-line pt-2">
        <p className="text-body-sm text-warning">Revisa {formatNumber(avisoCarga.peso, 2)} kg: en la última sesión comparable usaste hasta {formatNumber(avisoCarga.referencia, 2)} kg. Puedes corregir el valor o conservarlo.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => { cargasRevisadas.current.add(`${avisoCarga.label}:${avisoCarga.peso}`); setAvisoCarga(null) }}>El peso es correcto</Button>
          <Button variant="ghost" size="sm" onClick={e => {
            const panel = e.currentTarget.closest('[data-exercise-id]')
            const input = Array.from(panel?.querySelectorAll<HTMLInputElement>('input') ?? []).find(i => i.getAttribute('aria-label') === avisoCarga.label)
            input?.focus(); input?.select()
            setAvisoCarga(null)
          }}>Corregir peso</Button>
        </div>
      </aside>}
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" className="min-w-0 flex-1 basis-40" disabled={bloqueado} onClick={onAgregar}>
          <Icon name="plus" size={16} />
          Añadir serie
        </Button>
        {completo && onPlegar && <Button variant="subtle" disabled={bloqueado} aria-label={`Plegar ${ejercicio.nombre}`} onClick={() => onPlegar(true)}>
          <Icon name="chevron-down" size={16} className="rotate-180" />Plegar
        </Button>}
      </div>
      </>}

      {abiertaSerie && (
        <MenuSerie open titulo={`${abiertaSerie.numero === null ? 'Calentamiento' : `Serie ${abiertaSerie.numero}`} · ${ejercicio.nombre}`} serie={abiertaSerie.s} ejercicio={ejercicio} base={ejecucion} barraKg={barraKg}
          onClose={() => setHoja(null)} onCambiar={async patch => { await onActualizar(abiertaSerie.s.id, patch) }}
          onBorrar={() => { setHoja(null); onBorrar(abiertaSerie.s.id, abiertaSerie.numero ?? 0) }} />
      )}
      {abiertaRir?.s && (() => {
        const { s, numero, lado } = abiertaRir
        const valor = lado ? s.lados?.[lado]?.rir : s.rir
        return <RirSheet open titulo={`RIR · ${numero === null || numero === undefined ? 'calentamiento' : `serie ${numero}`}${lado ? ` · ${lado}` : ''}`} valor={valor} alCompletar={preguntarRir}
          onClose={() => setHoja(null)} onElegir={async rir => { await onActualizar(s.id, lado ? (a: SetEntry) => ({ lados: conLadoEspejo(a.lados, lado, { rir }) }) : { rir }) }} />
      })()}
      {contexto && hoja === 'nota' && <NotaEjercicio workoutId={contexto.workoutId} exerciseId={ejercicio.id} nombre={ejercicio.nombre} inicio={contexto.inicio} nota={contexto.nota} onClose={() => setHoja(null)} />}
      {contexto && hoja === 'carga' && <CargaEjercicio nombre={ejercicio.nombre} inicio={contexto.inicio} sets={sets} configuracion={contexto.carga} onGuardar={contexto.onCarga} onClose={() => setHoja(null)} />}
      {contexto?.onEjecucion && hoja === 'variante' && <EjecucionEjercicio open ejercicio={ejercicio} actual={ejecucion} onGuardar={contexto.onEjecucion} onClose={() => setHoja(null)} />}
      {liga && <LigaSheet open={hoja === 'liga'} liga={liga.estado} ejercicio={ejercicio} hoy={liga.hoy} alternativas={liga.alternativas} mantenido={liga.mantenido} sinRecords={liga.sinRecords} rutinas={liga.rutinas} onClose={() => setHoja(null)} />}
      {menu && <Sheet open={hoja === 'menu'} onClose={() => setHoja(null)} title={ejercicio.nombre}
        onExited={() => { const accion = despuesDelMenu.current; despuesDelMenu.current = null; accion?.() }}>
        <ListGroup variante="plana" aria-label={`Opciones de ${ejercicio.nombre}`}>
          {contexto && <li><ListRow onClick={() => elegirDelMenu(() => setHoja('nota'))}><span className="min-w-0"><span className="block text-body-sm font-semibold">{contexto.nota ? 'Editar nota' : 'Añadir nota'}</span><span className="block break-words text-caption text-fg-muted">Solo de este ejercicio en esta sesión</span></span><Icon name="pencil" size={18} className="shrink-0 text-fg-muted" /></ListRow></li>}
          {conProgresion && <li><ListRow onClick={() => elegirDelMenu(() => setHoja('progresion'))}><span className="min-w-0"><span className="block text-body-sm font-semibold">Progresión</span><span className="block break-words text-caption text-fg-muted">Objetivo y sugerencias</span></span><Icon name="chevron-right" size={18} className="shrink-0 text-fg-muted" /></ListRow></li>}
          {liga && <li><ListRow onClick={() => elegirDelMenu(() => setHoja('liga'))}><IconoLiga liga={liga.estado.division.liga} /><span className="min-w-0 flex-1"><span className="block text-body-sm font-semibold">Liga</span><span className="block break-words text-caption text-fg-muted">{textoDivision(liga.estado.division)}</span></span><Icon name="chevron-right" size={18} className="shrink-0 text-fg-muted" /></ListRow></li>}
          {mover && <li><ListRow disabled={!mover.puedeSubir} aria-label={`Subir ${ejercicio.nombre}`} onClick={() => elegirDelMenu(mover.onSubir)}><span className="text-body-sm font-semibold">Subir</span><Icon name="chevron-left" size={18} className="shrink-0 rotate-90 text-fg-muted" /></ListRow></li>}
          {mover && <li><ListRow disabled={!mover.puedeBajar} aria-label={`Bajar ${ejercicio.nombre}`} onClick={() => elegirDelMenu(mover.onBajar)}><span className="text-body-sm font-semibold">Bajar</span><Icon name="chevron-right" size={18} className="shrink-0 rotate-90 text-fg-muted" /></ListRow></li>}
          {onQuitar && <li><ListRow aria-label={`Quitar ${ejercicio.nombre} de este entreno`} onClick={() => elegirDelMenu(onQuitar)}><span className="min-w-0"><span className="block text-body-sm font-semibold text-destructive">Quitar de este entreno</span><span className="block break-words text-caption text-fg-muted">Con Deshacer; la rutina no cambia</span></span><Icon name="trash" size={18} className="shrink-0 text-destructive" /></ListRow></li>}
        </ListGroup>
      </Sheet>}
    </Card>
  )
}
