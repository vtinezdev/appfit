import Disclosure from '../../../shared/components/Disclosure'
import { formatInt } from '../../../shared/lib/format'
import { DIVISIONES_POR_LIGA, LIGAS, PASO_ELITE } from '../lib/liga'

/** Las reglas de la Liga, bajo demanda. */
export default function ComoFuncionaLiga() {
  return <Disclosure title="Cómo funciona la liga">
    <ul className="list-disc space-y-2 pl-5 text-body-sm text-fg">
      <li>Cada ejercicio tiene su liga: {LIGAS.join(', ')}, con {formatInt(DIVISIONES_POR_LIGA)} divisiones cada una (III, II, I), y Élite.</li>
      <li>Cada semana (lunes a domingo) en la que haces al menos una serie efectiva de un ejercicio, sube una división. Varias sesiones en la misma semana cuentan una vez. A las {formatInt(PASO_ELITE)} semanas llega a Élite.</li>
      <li>La primera semana sin el ejercicio no cuenta. Desde la segunda seguida, baja una división por semana. Las semanas en pausa de Ritmo no cuentan.</li>
      <li>Agarre, ejecución o tipo de carga distintos cuentan como el mismo ejercicio; otro ejercicio empieza su propia liga.</li>
      <li>Élite no es una meta que haya que mantener: indica que llevas mucho tiempo con ese ejercicio y que quizá te apetezca variar. Los básicos (sentadilla, press banca, peso muerto, press militar, dominadas y remo con barra) se suelen mantener mucho más.</li>
      <li>No hay un número de semanas demostrado para cambiar un ejercicio: los umbrales son orientativos.</li>
    </ul>
  </Disclosure>
}
