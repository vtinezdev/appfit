import Disclosure from '../../../shared/components/Disclosure'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import SectionHeader from '../../../shared/components/SectionHeader'
import Icon from '../../../shared/components/Icon'
import { formatInt } from '../../../shared/lib/format'
import { agruparPorLiga, PASO_ELITE, type LigaEjercicio } from '../lib/liga'
import { fechaCorta, resumenLiga } from '../lib/textos'
import ComoFuncionaLiga from './ComoFuncionaLiga'

interface Props {
  ligas: LigaEjercicio[]
  nombres: ReadonlyMap<number, string>
  hoy: string
  onElegir: (exerciseId: number) => void
}

function Fila({ l, nombre, hoy, onElegir }: { l: LigaEjercicio; nombre: string; hoy: string; onElegir: Props['onElegir'] }) {
  return <li>
    <ListRow onClick={() => onElegir(l.exerciseId)} aria-label={`${nombre}: ${l.division.nombre}, ${resumenLiga(l, hoy)}`}>
      <span className="min-w-0">
        <span className="block break-words text-body font-medium text-fg">{nombre}</span>
        <span className="tabular block text-caption text-fg-muted">{l.division.paso ? resumenLiga(l, hoy) : `Última vez: ${fechaCorta(l.ultimaFecha, hoy)}`}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {l.division.paso > 0 && <span className="text-body-sm font-semibold text-fg">{l.division.nombre}</span>}
        <Icon name="chevron-right" size={18} className="text-fg-subtle" />
      </span>
    </ListRow>
  </li>
}

/** Los ejercicios agrupados por liga, de Élite a Bronce; tocar uno lo abre en Progreso. */
export default function LigasLista({ ligas, nombres, hoy, onElegir }: Props) {
  const conNombre = ligas.filter((l) => nombres.has(l.exerciseId))
  const { grupos, sinLiga } = agruparPorLiga(conNombre)
  const enElite = grupos.find((g) => g.liga === 'Élite')?.ligas.length ?? 0
  return <section aria-labelledby="ligas-titulo" className="space-y-stack">
    <div className="space-y-2">
      <h2 id="ligas-titulo" className="text-heading text-fg">Ligas</h2>
      <p className="text-body-sm text-fg-muted">Cada semana con un ejercicio sube una división; a las {formatInt(PASO_ELITE)} llega a Élite. Toca uno para ver su liga y sus gráficas.</p>
      {enElite > 0 && <p className="tabular text-body-sm text-fg">{enElite === 1 ? 'Un ejercicio está' : `${formatInt(enElite)} ejercicios están`} en Élite: quizá te apetezca variar alguno.</p>}
    </div>
    {grupos.map((g) => <div key={g.liga} className="space-y-2">
      <SectionHeader>{g.liga}</SectionHeader>
      <ListGroup aria-label={`Ejercicios en ${g.liga}`}>
        {g.ligas.map((l) => <Fila key={l.exerciseId} l={l} nombre={nombres.get(l.exerciseId) ?? ''} hoy={hoy} onElegir={onElegir} />)}
      </ListGroup>
    </div>)}
    {grupos.length === 0 && <p className="text-body-sm text-fg-muted">Ahora ningún ejercicio tiene liga: vuelve a entrenar uno y empieza en Bronce III.</p>}
    {sinLiga.length > 0 && <Disclosure title={`Sin liga ahora (${formatInt(sinLiga.length)})`}>
      <p className="pb-2 text-body-sm text-fg-muted">Ejercicios que llevas tiempo sin hacer: si vuelves a uno, empieza de nuevo en Bronce III.</p>
      <ListGroup variante="plana" aria-label="Ejercicios sin liga">
        {sinLiga.map((l) => <Fila key={l.exerciseId} l={l} nombre={nombres.get(l.exerciseId) ?? ''} hoy={hoy} onElegir={onElegir} />)}
      </ListGroup>
    </Disclosure>}
    <ComoFuncionaLiga />
  </section>
}
