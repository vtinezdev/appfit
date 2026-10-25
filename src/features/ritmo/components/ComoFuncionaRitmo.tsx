import { BloqueComoFunciona, ListaComoFunciona, ValorComoFunciona } from '../../../shared/components/ComoFunciona'
import ListGroup from '../../../shared/components/ListGroup'
import type { PlanSemanal } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { SERIES_MINIMAS } from '../../experiencia/lib/experiencia'
import { DIAS_PRESENCIA, MAX_COMODINES, SEMANAS_POR_COMODIN } from '../lib/ritmo'

/** Las reglas de Ritmo, para la página «Cómo funciona»: cómo se juzga cada semana, el hilo, los comodines y las pausas. */
export default function ComoFuncionaRitmo({ plan, conNutricion }: { plan: PlanSemanal; conNutricion: boolean }) {
  return <>
    <BloqueComoFunciona titulo="Cada semana">
      <ListGroup aria-label="Cómo se juzga una semana">
        <ValorComoFunciona regla={`${formatInt(plan.entrenos)} entrenos${conNutricion ? ` y ${formatInt(plan.diasRegistro)} días con comidas registradas` : ''}`} valor="Cumplida" />
        {conNutricion && <ValorComoFunciona regla="Solo una de las dos partes" valor="Parcial" />}
        <ValorComoFunciona regla={`Al menos un entreno${conNutricion ? ` o ${formatInt(DIAS_PRESENCIA)} días registrados` : ''}`} valor="Presente" />
        <ValorComoFunciona regla="Nada de lo anterior" valor="Vacía" />
      </ListGroup>
      <ListaComoFunciona>
        <li>Las semanas van de lunes a domingo. Un entreno cuenta con {formatInt(SERIES_MINIMAS)} series efectivas o más.</li>
        <li>Entrenar por encima del plan no suma. Descansar forma parte del plan.</li>
        <li>El plan se cambia en Ajustes › Cumbres, Caminos, Ritmo y Vitrina.</li>
      </ListaComoFunciona>
    </BloqueComoFunciona>

    <BloqueComoFunciona titulo="El hilo y los comodines">
      <ListaComoFunciona>
        <li>El hilo cuenta las semanas seguidas con presencia. La semana en curso no lo rompe hasta que acaba, y los registros atrasados siempre cuentan.</li>
        <li>Ganas un comodín por cada {formatInt(SEMANAS_POR_COMODIN)} semanas cumplidas, hasta {formatInt(MAX_COMODINES)}. Se gasta solo en una semana vacía y el hilo sigue.</li>
      </ListaComoFunciona>
    </BloqueComoFunciona>

    <BloqueComoFunciona titulo="Pausas">
      <ListaComoFunciona>
        <li>Para vacaciones, enfermedad, lesión o viaje. Una semana en pausa no rompe el hilo ni gasta comodines.</li>
        <li>En una pausa de entreno, la semana se juzga solo con el registro de comidas.</li>
      </ListaComoFunciona>
    </BloqueComoFunciona>
  </>
}
