import { BloqueComoFunciona, ListaComoFunciona } from '../../../shared/components/ComoFunciona'
import { formatInt } from '../../../shared/lib/format'
import { PLANTAS_SEMANA } from '../../nutricion/lib/herbario'
import { SESIONES_DOMINADO } from '../lib/atlas'

/** Las reglas de la Vitrina, para la página «Cómo funciona»: logros, récords y colecciones. */
export default function ComoFuncionaVitrina({ conNutricion }: { conNutricion: boolean }) {
  return <>
    <BloqueComoFunciona titulo="Logros">
      <ListaComoFunciona>
        <li>Cada nivel de un logro es una pieza; los repetibles cuentan una vez.</li>
        <li>Salen de tus registros con su fecha real: si borras uno, la pieza puede desaparecer.</li>
      </ListaComoFunciona>
    </BloqueComoFunciona>

    <BloqueComoFunciona titulo="Récords">
      <ListaComoFunciona>
        <li>Solo cuentan las series efectivas de entrenos terminados.</li>
        <li>Cada variante (ejecución, agarre, técnica) y tipo de carga tiene su propia marca.</li>
        <li>El 1RM es una estimación con la fórmula de Epley.</li>
      </ListaComoFunciona>
    </BloqueComoFunciona>

    <BloqueComoFunciona titulo="Colecciones">
      <ListaComoFunciona>
        {conNutricion && <li>Herbario: frutas, verduras, patatas y tubérculos, legumbres, frutos secos y semillas, y cereales distintos, según la categoría de cada alimento y su nombre corto. Las recetas y los platos preparados no se descomponen.</li>}
        {conNutricion && <li>La referencia de {formatInt(PLANTAS_SEMANA)} plantas por semana viene del American Gut Project (McDonald y col., 2018). Es orientativa, no una recomendación.</li>}
        <li>Atlas: cuenta el músculo principal de cada ejercicio, con la clasificación guardada al terminar cada entreno.</li>
        <li>Un ejercicio se domina tras {formatInt(SESIONES_DOMINADO)} sesiones con series efectivas.</li>
      </ListaComoFunciona>
    </BloqueComoFunciona>
  </>
}
