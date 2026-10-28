import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as gimnasiosRepo from '../data/gimnasiosRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import ModalPage from '../../../shared/components/ModalPage'
import SectionHeader from '../../../shared/components/SectionHeader'
import { LoadingState } from '../../../shared/components/StateMessage'
import type { Exercise } from '../../../shared/db/types'
import { formatDiaMes } from '../../../shared/lib/dates'
import { alternativas } from '../../liga/lib/alternativas'
import { CATALOGO_POR_ID, EQUIPAMIENTO } from '../lib/catalogoEjercicios'
import type { FichaTecnica } from '../lib/fichasEjercicios'
import { nivelesFicha, textoMusculosFicha } from '../lib/fichaTecnica'
import { MUSCULOS } from '../lib/musculos'
import { historialPorVariante, textoMejorSerie } from '../lib/progreso'
import { useFiguraMapa } from '../hooks/useFiguraMapa'
import MiniaturaEjercicio from './MiniaturaEjercicio'

// Diferido: la geometría de los muñecos no entra con la sesión.
const FigurasMusculares = lazy(() => import('./MapaMuscular').then(m => ({ default: m.FigurasMusculares })))

interface Props {
  /** Ejercicio del catálogo de la app. */
  catalogId: string
  onClose: () => void
}

/**
 * Ficha de técnica de un ejercicio del catálogo (ENT-09): imagen, muñeco con sus músculos (principales en alto,
 * secundarios en medio), material, tres claves y dos errores comunes («claves de AppFit»), tu última vez y tus récords de cada variante
 * si lo has hecho y alternativas del mismo músculo (las de «Sustituir»), que abren su propia ficha. Solo lectura.
 */
export default function FichaEjercicio({ catalogId: inicial, onClose }: Props) {
  const [catalogId, setCatalogId] = useState(inicial)
  const [fichas, setFichas] = useState<Record<string, FichaTecnica> | null>(null)
  const figura = useFiguraMapa()
  const arriba = useRef<HTMLDivElement>(null)
  // Al abrir una alternativa, su ficha empieza arriba.
  useEffect(() => { if (catalogId !== inicial) arriba.current?.scrollIntoView({ block: 'start' }) }, [catalogId, inicial])
  const locales = useLiveQuery(() => exercisesRepo.listar(), [])
  const local = locales?.find(e => e.catalogId === catalogId)
  const datos = useLiveQuery(async () => local ? { exerciseId: local.id, sets: await setsRepo.delEjercicio(local.id), workouts: await workoutsRepo.terminados(),
    gimnasios: new Map((await gimnasiosRepo.listar()).map(g => [g.id, g.nombre])) } : null, [local?.id])
  useEffect(() => { void import('../lib/fichasEjercicios').then(m => setFichas(m.FICHAS)) }, [])

  const c = CATALOGO_POR_ID.get(catalogId)
  if (!c) return null
  const ficha = fichas?.[catalogId.replace(/^appfit:/, '')]
  // Al cambiar a una alternativa, la consulta anterior sigue un momento: solo vale si es de este ejercicio.
  const variantes = local && datos?.exerciseId === local.id ? historialPorVariante(datos.sets, datos.workouts, local.id, datos.gimnasios) : []
  const base: Exercise = local ?? { id: 0, nombre: c.name, nombreNorm: '', grupo: MUSCULOS[c.primaryMuscles[0]], catalogId: c.id, primaryMuscles: c.primaryMuscles, secondaryMuscles: c.secondaryMuscles, equipment: c.equipment }
  const otras = locales ? alternativas(base, locales, new Map(), { sustituir: true, hechos: new Set() }).filter(a => a.catalogId).slice(0, 4) : []
  const material = c.equipment.map(q => EQUIPAMIENTO[q]).join(', ')

  return (
    <ModalPage title={c.name} onClose={onClose}>
      <div ref={arriba} className="space-y-section">
        <div className="flex flex-wrap items-center gap-4">
          <span className="block h-40 w-40 shrink-0 overflow-hidden rounded-md"><MiniaturaEjercicio catalogId={c.id} mosaico /></span>
          <dl className="min-w-0 flex-1 basis-40 space-y-2">
            <div><dt className="text-rotulo text-fg-muted">Músculos</dt><dd className="break-words text-body-sm text-fg">{textoMusculosFicha(c)}</dd></div>
            <div><dt className="text-rotulo text-fg-muted">Material</dt><dd className="break-words text-body-sm text-fg">{material}</dd></div>
            <div><dt className="text-rotulo text-fg-muted">Tipo</dt><dd className="text-body-sm text-fg">{c.tipo === 'compuesto' ? 'Compuesto (varias articulaciones)' : 'Aislamiento (una articulación)'}</dd></div>
          </dl>
        </div>

        <Suspense fallback={<div className="poster-map-reserva" />}><FigurasMusculares levels={nivelesFicha(c)} figura={figura} /></Suspense>

        {fichas === null ? <LoadingState /> : ficha ? <>
          <section aria-label="Claves" className="space-y-stack">
            <SectionHeader variant="section">Claves</SectionHeader>
            <ol className="space-y-2">
              {ficha.claves.map((t, i) => <li key={i} className="flex gap-3">
                <span aria-hidden className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-accent text-caption font-bold text-accent-on">{i + 1}</span>
                <span className="min-w-0 break-words text-body text-fg">{t}</span>
              </li>)}
            </ol>
          </section>
          <section aria-label="Errores comunes" className="space-y-stack">
            <SectionHeader variant="section">Errores comunes</SectionHeader>
            <ul className="space-y-2">
              {ficha.errores.map((t, i) => <li key={i} className="flex gap-3">
                <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-warning" />
                <span className="min-w-0 break-words text-body text-fg">{t}</span>
              </li>)}
            </ul>
          </section>
          <p className="text-caption text-fg-muted">Claves de AppFit: orientativas, no sustituyen a quien te entrena. Si algo duele, para.</p>
        </> : <p className="text-body-sm text-fg-muted">Este ejercicio aún no tiene claves escritas.</p>}

        {variantes.length > 0 && <section aria-label="Tu historial" className="space-y-stack">
          <SectionHeader variant="section">Tú</SectionHeader>
          {variantes.length > 1 && <p className="text-body-sm text-fg-muted">Cada variante tiene sus propios récords.</p>}
          {variantes.map(v => <div key={v.clave} className="space-y-1">
            <h3 className="break-words text-rotulo text-fg-muted">{v.nombre}</h3>
            <dl className="divide-y divide-line border-y border-line">
              <div className="flex min-h-touch items-center justify-between gap-3 py-2">
                <dt className="text-body-sm text-fg-muted">Última vez</dt>
                <dd className="text-right"><span className="tabular block text-body-sm font-semibold text-fg">{textoMejorSerie(v.sesiones[0].mejor, v.modo)}</span>
                  <span className="tabular block text-caption text-fg-muted">{formatDiaMes(v.sesiones[0].inicio)}</span></dd>
              </div>
              {v.records.map(r => <div key={r.etiqueta} className="flex min-h-touch items-center justify-between gap-3 py-2">
                <dt className="min-w-0 break-words text-body-sm text-fg-muted">{r.etiqueta}</dt>
                <dd className="text-right"><span className="tabular block text-body-sm font-semibold text-fg">{r.texto}</span>
                  <span className="tabular block text-caption text-fg-muted">{formatDiaMes(r.inicio)}</span></dd>
              </div>)}
            </dl>
          </div>)}
        </section>}

        {otras.length > 0 && <section aria-label="Alternativas" className="space-y-stack">
          <SectionHeader variant="section">Alternativas</SectionHeader>
          <ListGroup aria-label={`Alternativas a ${c.name}`}>
            {otras.map(a => <li key={a.key}>
              <ListRow aria-label={`Ficha de ${a.nombre}`} onClick={() => setCatalogId(a.catalogId!)}>
                <MiniaturaEjercicio catalogId={a.catalogId} />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-body-sm font-semibold text-fg">{a.nombre}</span>
                  <span className="block break-words text-caption text-fg-muted">{a.subtitulo}</span>
                </span>
                <Icon name="chevron-right" size={18} className="shrink-0 text-fg-muted" />
              </ListRow>
            </li>)}
          </ListGroup>
        </section>}
      </div>
    </ModalPage>
  )
}
