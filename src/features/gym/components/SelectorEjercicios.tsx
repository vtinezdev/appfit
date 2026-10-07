import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as setsRepo from '../data/setsRepo'
import { CATALOGO_POR_ID, EQUIPAMIENTO, MUSCULOS, type Equipo, type Musculo } from '../lib/catalogoEjercicios'
import { ErrorSeleccionEjercicio, filtrarEjercicios, opcionesEjercicios, recientesEjercicios, type OpcionEjercicio, type SeleccionEjercicio } from '../lib/selectorEjercicios'
import ModalPage from '../../../shared/components/ModalPage'
import Button from '../../../shared/components/Button'
import FilterChips from '../../../shared/components/FilterChips'
import { Input, SearchInput, Select } from '../../../shared/components/Input'
import MiniaturaEjercicio from './MiniaturaEjercicio'
import ListRow from '../../../shared/components/ListRow'
import Icon from '../../../shared/components/Icon'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'

interface Props {
  onClose: () => void
  onElegir: (value: SeleccionEjercicio) => Promise<void>
  excluir?: number[]
}
const etiqueta = (ids: string[], labels: Record<string, string>) => ids.map(id => labels[id] ?? id).join(', ')

/** La misma tarea en rutinas y sesión; no abre el teclado hasta que se toca el buscador. */
export default function SelectorEjercicios({ onClose, onElegir, excluir = [] }: Props) {
  const locales = useLiveQuery(() => exercisesRepo.listar(), [])
  const series = useLiveQuery(() => setsRepo.todas(), [])
  const [query, setQuery] = useState('')
  const [musculos, setMusculos] = useState<Musculo[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [musculo, setMusculo] = useState<Musculo | ''>('')
  const [equipo, setEquipo] = useState<Equipo | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const pending = useRef(false)
  const customOpened = useRef(false)
  const opciones = useMemo(() => opcionesEjercicios(locales ?? []), [locales])
  const disponibles = opciones.filter(e => e.localId === undefined || !excluir.includes(e.localId))
  const resultados = filtrarEjercicios(disponibles, query, musculos, equipos)
  const recientes = !query.trim() && !musculos.length && !equipos.length ? recientesEjercicios(disponibles, series ?? []) : []
  const recentKeys = new Set(recientes.map(e => e.key))

  async function elegir(value: SeleccionEjercicio) {
    if (pending.current) return
    pending.current = true; setOcupado(true); setError(null)
    try { await onElegir(value); onClose() }
    catch (e) { setError(e instanceof ErrorSeleccionEjercicio ? e.message : 'No se ha podido añadir el ejercicio. Inténtalo de nuevo.') }
    finally { pending.current = false; setOcupado(false) }
  }
  function fila(e: OpcionEjercicio) {
    return <li key={e.key}><ListRow tone="flat" disabled={ocupado}
      onClick={() => elegir(e.catalogId && CATALOGO_POR_ID.has(e.catalogId) ? { tipo: 'catalogo', catalogId: e.catalogId } : { tipo: 'local', id: e.localId! })}>
      <MiniaturaEjercicio catalogId={e.catalogId} />
      <span className="min-w-0 flex-1 break-words">
        <span className="block text-body font-semibold">{e.name}</span>
        <span className="block text-caption text-fg-muted">{etiqueta(e.primaryMuscles, MUSCULOS) || 'Sin clasificar'}{e.equipment.length > 0 && ` · ${etiqueta(e.equipment, EQUIPAMIENTO)}`}{!e.catalogId && ' · Personalizado'}</span>
      </span><Icon name="plus" size={18} className="shrink-0 text-accent-strong" />
    </ListRow></li>
  }
  return <ModalPage title={creando ? 'Ejercicio personalizado' : 'Añadir ejercicio'} onClose={onClose} busy={ocupado}
    footer={creando || error || ocupado ? <div className="space-y-2">
      {error && <ErrorState>{error}</ErrorState>}
      {creando ? <><Button block loading={ocupado} disabled={!nombre.trim() || !musculo || !equipo}
        onClick={() => { if (musculo && equipo) void elegir({ tipo: 'personalizado', nombre, musculo, equipo }) }}>Crear y añadir</Button>
        <Button variant="ghost" block disabled={ocupado} onClick={() => { setCreando(false); setError(null) }}>Volver al catálogo</Button></> :
        ocupado && <p role="status" className="text-body-sm text-fg-muted">Añadiendo ejercicio…</p>}
    </div> : undefined}>
    {creando ? <div className="space-y-section">
      <p className="text-body-sm text-fg-muted">Quedará guardado en tu catálogo personal.</p>
      <label className="block space-y-2"><span className="text-label text-fg-muted">Nombre</span><Input autoFocus value={nombre} disabled={ocupado} onChange={e => setNombre(e.target.value)} /></label>
      <label className="block space-y-2"><span className="text-label text-fg-muted">Músculo principal</span><Select value={musculo} disabled={ocupado} onChange={e => setMusculo(e.target.value as Musculo)}><option value="">Selecciona un músculo</option>{Object.entries(MUSCULOS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select></label>
      <label className="block space-y-2"><span className="text-label text-fg-muted">Equipamiento</span><Select value={equipo} disabled={ocupado} onChange={e => setEquipo(e.target.value as Equipo)}><option value="">Selecciona equipamiento</option>{Object.entries(EQUIPAMIENTO).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select></label>
    </div> : <div className="space-y-section">
      <div className="sticky top-0 z-10 bg-bg pb-3">
        <SearchInput autoFocus={customOpened.current} aria-label="Buscar ejercicio" placeholder="Buscar ejercicio…" value={query} disabled={ocupado} onChange={e => setQuery(e.target.value)} />
      </div>
      <div className="space-y-3">
        <FilterChips label="Músculo principal" opciones={MUSCULOS} seleccion={musculos} onChange={setMusculos} disabled={ocupado} />
        <FilterChips label="Equipamiento" opciones={EQUIPAMIENTO} seleccion={equipos} onChange={setEquipos} disabled={ocupado} />
        {(query || musculos.length > 0 || equipos.length > 0) && <Button variant="ghost" size="sm" disabled={ocupado} onClick={() => { setQuery(''); setMusculos([]); setEquipos([]) }}>Limpiar búsqueda y filtros</Button>}
      </div>
      {locales === undefined || series === undefined ? <LoadingState /> : <>
        {recientes.length > 0 && <section aria-label="Ejercicios recientes"><h2 className="text-title text-fg">Recientes</h2><ul className="divide-y divide-line">{recientes.map(fila)}</ul></section>}
        <section aria-label="Resultados de ejercicios"><h2 className="text-title text-fg">{recientes.length ? 'Todos los ejercicios' : 'Ejercicios'}</h2>
          <p role="status" className="text-caption text-fg-muted">{formatInt(resultados.length)} disponibles</p>
          {!resultados.length && <EmptyState>Sin coincidencias. Cambia los filtros o crea un ejercicio personalizado.</EmptyState>}
          <ul className="divide-y divide-line">{resultados.filter(e => !recentKeys.has(e.key)).map(fila)}</ul>
        </section>
      </>}
      <Button variant="ghost" block disabled={ocupado} onClick={() => { customOpened.current = true; setNombre(query.trim()); setError(null); setCreando(true) }}><Icon name="plus" size={18} />Crear ejercicio personalizado</Button>
    </div>}
  </ModalPage>
}
