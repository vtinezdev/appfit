import { useLiveQuery } from 'dexie-react-hooks'
import Disclosure from '../../../shared/components/Disclosure'
import Icon from '../../../shared/components/Icon'
import { claveRef } from '../../../shared/db/foodRef'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import * as recetasRepo from '../data/recetasRepo'
import type { AlimentoElegible } from '../lib/alimentos'
import { etiquetaFuente } from '../lib/catalogo/textos'
import { iconoDeCategoria } from '../lib/iconosCategoria'
import { macrosPorGramos } from '../lib/nutrition'
import { partesNombre } from '../lib/ordenBusqueda'
import { BarraReparto, CantidadesRapidas, ComoQuedaTuDia, PastillasMacros } from './PiezasCantidad'
import PreparacionAlimento from './PreparacionAlimento'

interface Props {
  alimento: AlimentoElegible
  gramos: number
  onGramos: (g: number) => void
  fecha: string
  planificar?: boolean
}

/**
 * La hoja Cantidad (página 3 de Añadir comida, opción B de Víctor): el alimento con su icono, nombre en dos partes y
 * fuente; las kcal de esa cantidad con sus macros; cantidades de un toque y los gramos; y «Cómo queda tu día». Una
 * receta casera dice sus ingredientes y peso cocinado, propone fracciones de la receta y cuenta qué va de cada
 * ingrediente en esa cantidad.
 */
export default function CantidadAlimento({ alimento, gramos, onGramos, fecha, planificar = false }: Props) {
  const clave = claveRef(alimento.ref)
  const receta = useLiveQuery(async () => (alimento.ref.tipo === 'user' ? (await recetasRepo.deAlimento(alimento.ref.id)) ?? null : null), [clave])
  const [cabeza, detalle] = partesNombre(alimento.nombre)
  const aporte = macrosPorGramos(alimento, gramos)
  const fuente = receta ? 'Receta' : alimento.ref.tipo === 'user' ? 'Tuyo' : etiquetaFuente(alimento.ref.id.split(':')[0])
  const factorReceta = receta ? gramos / receta.pesoCocinadoG : 0

  return <div className="space-y-section">
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <span aria-hidden className="icono-pastilla shrink-0 text-fg-muted"><Icon name={iconoDeCategoria(alimento.categoria) ?? 'utensils'} size={20} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-title text-fg">{cabeza}</h3>
          {detalle && <p className="break-words text-body-sm text-fg-muted">{detalle}</p>}
          {receta && <p className="tabular text-body-sm text-fg-muted">{formatInt(receta.ingredientes.length)} {receta.ingredientes.length === 1 ? 'ingrediente' : 'ingredientes'} · {formatNumber(receta.pesoCocinadoG, 0)} g cocinada</p>}
        </div>
        <span className="shrink-0 pt-1 text-caption text-fg-subtle">{fuente}</span>
      </div>
      <PreparacionAlimento nombre={alimento.nombre} explicar />
    </div>

    <div className="space-y-3">
      <p className="tabular flex items-baseline gap-2"><span className="font-numeric text-display text-fg">{formatInt(Math.round(aporte.kcal))}</span><span className="text-body text-fg-muted">kcal en {formatNumber(gramos, 1)} {alimento.ml ? 'ml' : 'g'}</span></p>
      <PastillasMacros macros={aporte} />
      <BarraReparto macros={aporte} />
    </div>

    <CantidadesRapidas clave={clave} nombre={alimento.nombre} ml={alimento.ml} gramos={gramos} onGramos={onGramos} pesoReceta={receta?.pesoCocinadoG} />

    {receta && <Disclosure title="Ingredientes en esta cantidad">
      <ul className="divide-y divide-line text-body-sm">
        {receta.ingredientes.map((ing, i) => <li key={i} className="flex justify-between gap-3 py-2">
          <span className="min-w-0 break-words text-fg">{ing.nombre}</span>
          <span className="tabular shrink-0 text-fg-muted">{formatNumber(ing.gramos * factorReceta, 0)} g</span>
        </li>)}
      </ul>
    </Disclosure>}

    <ComoQuedaTuDia aporte={aporte} fecha={fecha} planificar={planificar} />
  </div>
}
