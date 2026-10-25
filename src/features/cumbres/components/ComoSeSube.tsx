import { BloqueComoFunciona, ListaComoFunciona, ValorComoFunciona } from '../../../shared/components/ComoFunciona'
import Disclosure from '../../../shared/components/Disclosure'
import ListGroup from '../../../shared/components/ListGroup'
import type { PlanSemanal } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { PROPORCION_PROTEINA, RECORDS_POR_SESION, SERIES_COMPLETAS, SERIES_MINIMAS, XP, XP_ACTIVIDAD, xpDeEntreno } from '../../experiencia/lib/experiencia'
import { METROS_POR_HITO, metrosTexto } from '../lib/cumbres'
import { FUENTE_ALTITUDES } from '../lib/montanas'

/** Las reglas de Cumbres, para la página «Cómo funciona»: qué sube metros, qué no, los límites y la ruta. */
export default function ComoSeSube({ plan, conNutricion }: { plan: PlanSemanal; conNutricion: boolean }) {
  return <>
    <BloqueComoFunciona titulo="Qué sube metros">
      <ListGroup aria-label="Qué sube metros">
        <ValorComoFunciona regla={`Entreno de ${formatInt(SERIES_COMPLETAS)} series efectivas o más`} valor={metrosTexto(XP.entreno)}
          detalle={`Con menos, la parte proporcional (${formatInt(3)} series, ${metrosTexto(xpDeEntreno(3))})`} />
        <ValorComoFunciona regla="Semana cumplida" valor={metrosTexto(XP.semanaCumplida)}
          detalle={`${formatInt(plan.entrenos)} entrenos${conNutricion ? ` y ${formatInt(plan.diasRegistro)} días con comidas` : ''}, de lunes a domingo`} />
        {conNutricion && <ValorComoFunciona regla="Día con dos comidas o más" valor={metrosTexto(XP.diaRegistrado)} detalle={`Con una, ${metrosTexto(XP.diaUnaComida)}`} />}
        <ValorComoFunciona regla="Récord personal" valor={metrosTexto(XP.record)} detalle={`Hasta ${formatInt(RECORDS_POR_SESION)} por sesión`} />
        {conNutricion && <ValorComoFunciona regla={`Proteína al ${formatInt(PROPORCION_PROTEINA * 100)} % del objetivo`} valor={metrosTexto(XP.proteina)} detalle="No en un cheat day" />}
        <ValorComoFunciona regla="Cada km andado, corrido o de senderismo" valor={metrosTexto(XP_ACTIVIDAD.porKm)}
          detalle={`Hasta ${metrosTexto(XP_ACTIVIDAD.maxDia)} al día`} />
      </ListGroup>
    </BloqueComoFunciona>

    <BloqueComoFunciona titulo="Qué no cuenta">
      <p className="text-body-sm text-fg">Entrenar o registrar de más. Los kilos, las kcal, el peso y el déficit no suben ni bajan.</p>
    </BloqueComoFunciona>

    <BloqueComoFunciona titulo="Límites">
      <ListaComoFunciona>
        <li>Sube un entreno por día (el de más series) y, cada semana, los de tu plan. Para el plan cuentan los de {formatInt(SERIES_MINIMAS)} series efectivas o más.</li>
        <li>Los km cuentan los días con {formatInt(XP_ACTIVIDAD.metrosMinimos / 1000)} km o más, como mucho {formatInt(XP_ACTIVIDAD.diasPorSemana)} por semana, aparte del plan.</li>
        <li>El plan se cambia en Ajustes › Cumbres, Caminos, Ritmo y Vitrina.</li>
      </ListaComoFunciona>
    </BloqueComoFunciona>

    <BloqueComoFunciona titulo="La ruta">
      <ListaComoFunciona>
        <li>Se sube del nivel del mar a la cima, con un hito cada {metrosTexto(METROS_POR_HITO)}. No hay plazo ni se puede fallar.</li>
        <li>Al hacer cumbre, los metros que sobran no pasan a la siguiente.</li>
        <li>Va del Techo de España al Everest y sigue con volcanes, los Alpes y el Himalaya. Puedes cambiar a cualquier montaña más alta que lo ya subido, también a una coronada; con todas hechas, vuelve a empezar.</li>
        <li>En una pausa de Ritmo estás en el refugio. Cuenta desde el día en que eliges la primera montaña y sale de tus registros: si borras uno, se recalcula.</li>
      </ListaComoFunciona>
      <Disclosure title="Fuentes de las altitudes"><p className="text-body-sm text-fg-muted">{FUENTE_ALTITUDES}</p></Disclosure>
    </BloqueComoFunciona>
  </>
}
