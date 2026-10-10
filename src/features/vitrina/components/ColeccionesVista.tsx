import Card from '../../../shared/components/Card'
import Disclosure from '../../../shared/components/Disclosure'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ProgressBar from '../../../shared/components/ProgressBar'
import SectionHeader from '../../../shared/components/SectionHeader'
import { EmptyState } from '../../../shared/components/StateMessage'
import { etiquetaPeriodo, startOfWeek } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { MUSCULOS, ZONAS_MUSCULARES } from '../../gym/lib/musculos'
import { PLANTAS_SEMANA } from '../../nutricion/lib/herbario'
import { SESIONES_DOMINADO } from '../lib/atlas'
import type { ResultadoVitrina } from '../lib/vitrina'

interface Props {
  vitrina: ResultadoVitrina
  nombres: Readonly<Record<number, string>>
  hoy: string
}

const lista = (nombres: string[]) => nombres.join(', ')

/** Colecciones: Herbario (plantas distintas) y Atlas (grupos trabajados y ejercicios dominados). */
export default function ColeccionesVista({ vitrina, nombres, hoy }: Props) {
  const { herbario, atlas } = vitrina
  const lunes = startOfWeek(hoy)
  const gruposSemana = atlas.semanas.find((s) => s.lunes === lunes)?.grupos ?? new Set()
  return <div className="space-y-section">
    {herbario && <section aria-label="Herbario" className="space-y-stack">
      <SectionHeader variant="section">Herbario</SectionHeader>
      <Card className="space-y-3">
        <p className="text-label text-fg-muted">Plantas distintas esta semana</p>
        <p className="tabular text-body text-fg"><span className="font-numeric text-heading">{formatInt(herbario.semana.length)}</span> de {formatInt(PLANTAS_SEMANA)}</p>
        <ProgressBar value={herbario.semana.length} goal={PLANTAS_SEMANA} colorClass="bg-fg" label="Plantas distintas esta semana"
          valueText={`${formatInt(herbario.semana.length)} de ${formatInt(PLANTAS_SEMANA)}`} />
        {herbario.semana.length > 0 && <p className="break-words text-body-sm text-fg">{lista(herbario.semana.map((p) => p.nombre))}</p>}
        <p className="tabular text-body-sm text-fg-muted">
          {herbario.mejorSemana ? `Mejor semana: ${formatInt(herbario.mejorSemana.plantas)} (${etiquetaPeriodo('semana', herbario.mejorSemana.lunes)})` : 'Aún sin plantas registradas'}
        </p>
        {herbario.desdeSiempre.length > 0 && <Disclosure title={`Desde siempre: ${formatInt(herbario.desdeSiempre.length)} plantas`}>
          <p className="break-words text-body-sm text-fg">{lista(herbario.desdeSiempre.map((p) => p.nombre))}</p>
        </Disclosure>}
      </Card>
      <p className="text-caption text-fg-muted">
        Frutas, verduras, patatas y tubérculos, legumbres, frutos secos y semillas, y cereales, según la categoría de cada alimento y su nombre corto.
        Las recetas y los platos preparados no se descomponen. La referencia de {formatInt(PLANTAS_SEMANA)} plantas por semana viene del American Gut Project (McDonald y col., 2018); es orientativa, no una recomendación.
      </p>
    </section>}

    <section aria-label="Atlas" className="space-y-stack">
      <SectionHeader variant="section">Atlas</SectionHeader>
      <Card className="space-y-3">
        <p className="text-label text-fg-muted">Grupos trabajados esta semana</p>
        <p className="tabular text-body text-fg"><span className="font-numeric text-heading">{formatInt(gruposSemana.size)}</span> de {formatInt(ZONAS_MUSCULARES.length)}</p>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1" aria-label="Grupos musculares esta semana">
          {ZONAS_MUSCULARES.map((z) => <li key={z} className={`flex items-center gap-2 text-body-sm ${gruposSemana.has(z) ? 'text-fg' : 'text-fg-muted'}`}>
            <Icon name={gruposSemana.has(z) ? 'check' : 'minus'} size={16} label={gruposSemana.has(z) ? 'Trabajado' : 'Sin trabajar'} />{MUSCULOS[z]}
          </li>)}
        </ul>
        <p className="tabular text-body-sm text-fg-muted">Desde siempre: {formatInt(atlas.desdeSiempre.size)} de {formatInt(ZONAS_MUSCULARES.length)} grupos</p>
      </Card>
      <SectionHeader>Ejercicios dominados ({formatInt(SESIONES_DOMINADO)} sesiones o más)</SectionHeader>
      {atlas.dominados.length === 0
        ? <EmptyState>Todavía ninguno: un ejercicio se domina tras {formatInt(SESIONES_DOMINADO)} sesiones con series efectivas.</EmptyState>
        : <ListGroup aria-label="Ejercicios dominados">
          {atlas.dominados.map((d) => <li key={d.exerciseId} className="flex min-h-touch items-center justify-between gap-3 py-2">
            <span className="min-w-0 break-words text-body text-fg">{nombres[d.exerciseId] ?? 'Ejercicio'}</span>
            <span className="tabular shrink-0 text-body-sm text-fg-muted">{formatInt(d.sesiones)} sesiones</span>
          </li>)}
        </ListGroup>}
      <p className="text-caption text-fg-muted">Cuenta el músculo principal de cada ejercicio, con la clasificación guardada al terminar cada entreno.</p>
    </section>
  </div>
}
