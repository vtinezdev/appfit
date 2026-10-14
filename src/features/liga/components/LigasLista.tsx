import ComoFunciona from '../../../shared/components/ComoFunciona'
import Disclosure from '../../../shared/components/Disclosure'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import Icon from '../../../shared/components/Icon'
import { formatInt } from '../../../shared/lib/format'
import { agruparPorLiga, PASO_ELITE, type LigaEjercicio } from '../lib/liga'
import { fechaCorta, resumenLiga, textoDivision } from '../lib/textos'
import ComoFuncionaLiga from './ComoFuncionaLiga'
import InsigniaLiga, { SemanasLiga } from './InsigniaLiga'

interface Props {
  ligas: LigaEjercicio[]
  nombres: ReadonlyMap<number, string>
  hoy: string
  onElegir: (exerciseId: number) => void
}

function Fila({ l, nombre, hoy, onElegir }: { l: LigaEjercicio; nombre: string; hoy: string; onElegir: Props['onElegir'] }) {
  return <li>
    <ListRow onClick={() => onElegir(l.exerciseId)} aria-label={`${nombre}: ${textoDivision(l.division)}, ${resumenLiga(l, hoy)}`}>
      <span className="min-w-0">
        <span className="block break-words text-body font-medium text-fg">{nombre}</span>
        <span className="tabular block text-caption text-fg-muted">{l.division.paso ? resumenLiga(l, hoy) : `Última vez: ${fechaCorta(l.ultimaFecha, hoy)}`}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {l.division.semana > 0 && <SemanasLiga semana={l.division.semana} />}
        <Icon name="chevron-right" size={18} className="text-fg-subtle" />
      </span>
    </ListRow>
  </li>
}

/** Los ejercicios agrupados por liga, de Élite a Bronce, con su insignia; tocar uno lo abre en Progreso. */
export default function LigasLista({ ligas, nombres, hoy, onElegir }: Props) {
  const conNombre = ligas.filter((l) => nombres.has(l.exerciseId))
  const { grupos, sinLiga } = agruparPorLiga(conNombre)
  const enElite = grupos.find((g) => g.liga === 'Élite')?.ligas.length ?? 0
  return <section aria-labelledby="ligas-titulo" className="space-y-stack">
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="ligas-titulo" className="text-heading text-fg">Ligas</h2>
        <ComoFunciona nombre="la liga" volver="Progreso"><ComoFuncionaLiga /></ComoFunciona>
      </div>
      <p className="text-body-sm text-fg-muted">Cada semana con un ejercicio suma una; a las {formatInt(PASO_ELITE)} llega a Élite.</p>
      {enElite > 0 && <p className="tabular text-body-sm text-fg">{enElite === 1 ? 'Un ejercicio está' : `${formatInt(enElite)} ejercicios están`} en Élite: quizá te apetezca variar alguno.</p>}
    </div>
    {grupos.map((g) => <div key={g.liga} className="space-y-2">
      <h3 className="flex items-center gap-2 px-1 text-label text-fg-muted"><InsigniaLiga liga={g.liga} size={20} />{g.liga}</h3>
      <ListGroup aria-label={`Ejercicios en ${g.liga}`}>
        {g.ligas.map((l) => <Fila key={l.exerciseId} l={l} nombre={nombres.get(l.exerciseId) ?? ''} hoy={hoy} onElegir={onElegir} />)}
      </ListGroup>
    </div>)}
    {grupos.length === 0 && <p className="text-body-sm text-fg-muted">Ahora ningún ejercicio tiene liga: vuelve a entrenar uno y empieza en Bronce.</p>}
    {sinLiga.length > 0 && <Disclosure title={`Hace tiempo que no los haces (${formatInt(sinLiga.length)})`}>
      <p className="pb-2 text-body-sm text-fg-muted">Si vuelves a uno, empieza de nuevo en Bronce.</p>
      <ListGroup variante="plana" aria-label="Ejercicios sin liga">
        {sinLiga.map((l) => <Fila key={l.exerciseId} l={l} nombre={nombres.get(l.exerciseId) ?? ''} hoy={hoy} onElegir={onElegir} />)}
      </ListGroup>
    </Disclosure>}
  </section>
}
