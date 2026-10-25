import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import type { Exercise, Routine } from '../../../shared/db/types'
import type { Alternativa } from '../lib/alternativas'
import { esBasico } from '../lib/basicos'
import type { LigaEjercicio } from '../lib/liga'
import DetalleLiga from './DetalleLiga'
import VariarElite from './VariarElite'

interface Props {
  liga: LigaEjercicio
  ejercicio: Exercise | undefined
  hoy: string
  /** En Élite: alternativas y si el usuario lo mantiene. */
  alternativas: Alternativa[]
  mantenido: boolean
  sinRecords: number
  /** Rutinas que incluyen el ejercicio (para «Usar» una alternativa). */
  rutinas: Routine[]
  onVerTodas: () => void
}

/** La liga de un ejercicio en Progreso, encima de sus gráficas. */
export default function BloqueLiga({ liga, ejercicio, hoy, alternativas, mantenido, sinRecords, rutinas, onVerTodas }: Props) {
  return <section aria-labelledby="liga-ejercicio">
    <Card className="space-y-3">
      <DetalleLiga liga={liga} ejercicio={ejercicio} hoy={hoy} tituloId="liga-ejercicio" mantenido={mantenido} sinRecords={sinRecords} />
      {liga.division.elite && ejercicio && <VariarElite exerciseId={ejercicio.id} nombre={ejercicio.nombre} alternativas={alternativas} basico={esBasico(ejercicio)} mantenido={mantenido} rutinas={rutinas} />}
      <Button variant="ghost" size="sm" onClick={onVerTodas}>Ver todas las ligas</Button>
    </Card>
  </section>
}
