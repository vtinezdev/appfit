import { lazy, Suspense } from 'react'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import type { Routine } from '../../../shared/db/types'
import MiniaturaEjercicio from './MiniaturaEjercicio'
import type { FiguraMapa } from './mapaMuscularGeometria'
import { cifrasRutina, tiraMiniaturas, type MusculosRutina } from '../lib/fichaRutina'
import { MUSCULOS } from '../lib/musculos'
import type { ResumenRutina } from '../lib/rutinas'
import { cuandoFue } from '../lib/workout'

// Diferido: la geometría de los muñecos no entra en el arranque.
const MiniMapa = lazy(() => import('./MapaMuscular').then(m => ({ default: m.MiniMapa })))

/** Etiquetas de los músculos principales con la muestra de su nivel (la misma de la leyenda del mapa). */
export function EtiquetasMusculos({ musculos, max }: { musculos: MusculosRutina['principales']; max?: number }) {
  return <span className="flex flex-wrap gap-1.5">
    {musculos.slice(0, max).map(m => <span key={m.zona} className="inline-flex items-center gap-1.5 rounded-pill bg-surface-muted px-2.5 py-0.5 text-caption font-semibold text-fg">
      <span aria-hidden className="muscle-swatch" data-level={m.nivel} />{MUSCULOS[m.zona]}
    </span>)}
  </span>
}

/** «Última vez: hace 3 días» o «Sin hacer todavía». */
export const cuandoRutina = (ultima: number | null) => (ultima === null ? 'Sin hacer todavía' : `Última vez: ${cuandoFue(ultima).toLowerCase()}`)

interface Props {
  rutina: Pick<Routine, 'nombre' | 'exerciseIds'>
  resumen: ResumenRutina
  musculos: MusculosRutina
  /** `catalogId` de cada ejercicio de la rutina, en orden. */
  miniaturas: (string | undefined)[]
  figura?: FiguraMapa
  onAbrir: () => void
  /** Sin él (entreno en curso), no se ofrece empezar. */
  empezar?: { onEmpezar: () => void; loading: boolean; disabled: boolean }
}

/**
 * Una rutina guardada: cuándo se hizo, nombre, músculos principales con el mapa en miniatura y la tira de ejercicios.
 * Toda la parte superior abre su ficha; «Empezar» va aparte.
 */
export default function TarjetaRutina({ rutina, resumen, musculos, miniaturas, figura, onAbrir, empezar }: Props) {
  const tira = tiraMiniaturas(miniaturas)
  return <Card padded={false} className="overflow-hidden">
    <button type="button" onClick={onAbrir} className="app-button flex w-full flex-col gap-3 px-card pt-card text-left">
      <span className="flex w-full items-start gap-3">
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block text-rotulo text-fg-muted">{cuandoRutina(resumen.ultima)}</span>
          <span className="block break-words text-heading text-fg">{rutina.nombre}</span>
          {musculos.principales.length > 0 && <span className="block pt-1"><EtiquetasMusculos musculos={musculos.principales} max={3} /></span>}
        </span>
        {musculos.principales.length > 0 && <Suspense fallback={<span className="muscle-mini" />}><MiniMapa levels={musculos.levels} figura={figura} /></Suspense>}
      </span>
      {tira.visibles.length > 0 && <span aria-hidden className="grid w-full max-w-xs grid-cols-5 gap-1.5">
        {tira.visibles.map((c, i) => <span key={i} className="aspect-square"><MiniaturaEjercicio catalogId={c} mosaico /></span>)}
        {tira.mas > 0 && <span className="tabular flex aspect-square items-center justify-center rounded-sm bg-surface-muted text-label text-fg-muted">+{tira.mas}</span>}
      </span>}
    </button>
    <div className="flex flex-wrap items-center justify-between gap-3 px-card pb-card pt-3">
      <span className="tabular min-w-0 break-words text-body-sm text-fg-muted">{cifrasRutina(miniaturas.length, resumen.series)}</span>
      {empezar && <Button size="sm" className="ml-auto" loading={empezar.loading} disabled={empezar.disabled} aria-label={`Empezar ${rutina.nombre}`} onClick={empezar.onEmpezar}>
        <Icon name="play" size={16} />Empezar
      </Button>}
    </div>
  </Card>
}
