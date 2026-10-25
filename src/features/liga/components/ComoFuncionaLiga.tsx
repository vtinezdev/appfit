import { ListaComoFunciona } from '../../../shared/components/ComoFunciona'
import { formatInt } from '../../../shared/lib/format'
import { LIGAS, PASO_ELITE, SEMANAS_POR_LIGA } from '../lib/liga'

/** Las reglas de la Liga: en la página «Cómo funciona» de Progreso y desplegadas en la hoja de la liga. */
export default function ComoFuncionaLiga() {
  return <ListaComoFunciona>
      <li>Cada ejercicio tiene su liga: {LIGAS.join(', ')} y, arriba del todo, Élite.</li>
      <li>Cada semana (lunes a domingo) en la que haces al menos una serie efectiva de un ejercicio suma una. Varias sesiones en la misma semana cuentan una vez. Cada {formatInt(SEMANAS_POR_LIGA)} semanas sube de liga, y a las {formatInt(PASO_ELITE)} llega a Élite.</li>
      <li>La primera semana sin el ejercicio no cuenta. Desde la segunda seguida, cada semana sin él retrocede una. Las semanas en pausa de Ritmo no cuentan.</li>
      <li>Agarre, ejecución o tipo de carga distintos cuentan como el mismo ejercicio; otro ejercicio empieza su propia liga.</li>
      <li>Élite no es una meta que haya que mantener: indica que llevas mucho tiempo con ese ejercicio y que quizá te apetezca variar. Los básicos (sentadilla, press banca, peso muerto, press militar, dominadas y remo con barra) se suelen mantener mucho más.</li>
      <li>No hay un número de semanas demostrado para cambiar un ejercicio: los umbrales son orientativos.</li>
  </ListaComoFunciona>
}
