import { useLiveQuery } from 'dexie-react-hooks'
import Disclosure from '../../../shared/components/Disclosure'
import Icon from '../../../shared/components/Icon'
import NumberStepper from '../../../shared/components/NumberStepper'
import { claveRef } from '../../../shared/db/foodRef'
import { todayISO } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { tokensConsulta } from '../../../shared/lib/text'
import { objetivosDe } from '../../perfil/data/objetivosDiaRepo'
import * as entriesRepo from '../data/entriesRepo'
import * as foodsRepo from '../data/foodsRepo'
import * as planificadasRepo from '../data/planificadasRepo'
import * as porcionesRepo from '../data/porcionesRepo'
import * as recetasRepo from '../data/recetasRepo'
import type { AlimentoElegible } from '../lib/alimentos'
import { etiquetaFuente } from '../lib/catalogo/textos'
import { iconoDeCategoria } from '../lib/iconosCategoria'
import { racionDe } from '../lib/interprete/raciones'
import { macrosPorGramos, sumMacros } from '../lib/nutrition'
import { opcionesCantidad, textoOpcion } from '../lib/opcionesCantidad'
import { partesNombre } from '../lib/ordenBusqueda'
import PreparacionAlimento from './PreparacionAlimento'

interface Props {
  alimento: AlimentoElegible
  gramos: number
  onGramos: (g: number) => void
  fecha: string
  planificar?: boolean
}

function Pastilla({ color, children }: { color: string; children: string }) {
  return <span className="tabular flex items-center gap-1 rounded-pill bg-surface-muted px-2 py-0.5 text-caption text-fg"><span aria-hidden className={`h-2 w-2 rounded-pill ${color}`} />{children}</span>
}

/**
 * La hoja Cantidad (página 3 de Añadir comida, opción B de Víctor): el alimento con su icono, nombre en dos partes y
 * fuente; las kcal de esa cantidad con sus macros; cantidades de un toque (`opcionesCantidad`) y los gramos; y «Cómo
 * queda tu día», lo que llevas y lo que suma frente a tu objetivo. Una receta casera dice sus ingredientes y peso
 * cocinado, propone fracciones de la receta y cuenta qué va de cada ingrediente en esa cantidad.
 */
export default function CantidadAlimento({ alimento, gramos, onGramos, fecha, planificar = false }: Props) {
  const hoy = todayISO()
  const clave = claveRef(alimento.ref)
  const porciones = useLiveQuery(() => porcionesRepo.delAlimento(clave), [clave])
  const habitual = useLiveQuery(() => foodsRepo.racionHabitual(alimento.ref, hoy), [clave, hoy])
  const receta = useLiveQuery(async () => (alimento.ref.tipo === 'user' ? (await recetasRepo.deAlimento(alimento.ref.id)) ?? null : null), [clave])
  const dia = useLiveQuery(async () => {
    const [registros, objetivo] = await Promise.all([planificar ? planificadasRepo.delDia(fecha) : entriesRepo.delDia(fecha), objetivosDe(fecha, hoy)])
    return { llevas: sumMacros(registros), objetivo }
  }, [fecha, planificar, hoy])
  const [cabeza, detalle] = partesNombre(alimento.nombre)
  const u = alimento.ml ? 'ml' : 'g'
  const aporte = macrosPorGramos(alimento, gramos)
  const kcalM = aporte.prot * 4 + aporte.carb * 4 + aporte.grasa * 9
  const opciones = opcionesCantidad({ habitual, pesoReceta: receta?.pesoCocinadoG, porciones: (porciones ?? []).map((p) => ({ nombre: p.nombre, gramos: p.gramos })), unidad: racionDe(tokensConsulta(cabeza).join(' '))?.gramos, ml: alimento.ml })
  const r = (n: number) => formatInt(Math.round(n))
  const fuente = receta ? 'Receta' : alimento.ref.tipo === 'user' ? 'Tuyo' : etiquetaFuente(alimento.ref.id.split(':')[0])
  const factorReceta = receta ? gramos / receta.pesoCocinadoG : 0

  const filasDia = dia?.objetivo ? [
    { label: 'Kcal', llevas: dia.llevas.kcal, suma: aporte.kcal, objetivo: dia.objetivo.kcal, color: 'bg-kcal', unidad: '' },
    { label: 'Proteína', llevas: dia.llevas.prot, suma: aporte.prot, objetivo: dia.objetivo.prot, color: 'bg-protein', unidad: ' g' },
    { label: 'Hidratos', llevas: dia.llevas.carb, suma: aporte.carb, objetivo: dia.objetivo.carb, color: 'bg-carbs', unidad: ' g' },
    { label: 'Grasa', llevas: dia.llevas.grasa, suma: aporte.grasa, objetivo: dia.objetivo.grasa, color: 'bg-fat', unidad: ' g' },
  ] : []

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
      <p className="tabular flex items-baseline gap-2"><span className="font-numeric text-display text-fg">{formatInt(Math.round(aporte.kcal))}</span><span className="text-body text-fg-muted">kcal en {formatNumber(gramos, 1)} {u}</span></p>
      <div className="flex flex-wrap gap-1.5">
        <Pastilla color="bg-protein">{`P ${r(aporte.prot)} g`}</Pastilla>
        <Pastilla color="bg-carbs">{`C ${r(aporte.carb)} g`}</Pastilla>
        <Pastilla color="bg-fat">{`G ${r(aporte.grasa)} g`}</Pastilla>
      </div>
      {kcalM > 0 && <span aria-hidden className="flex h-2 w-full gap-0.5 overflow-hidden rounded-pill">
        <span className="bg-protein" style={{ width: `${(aporte.prot * 4 / kcalM) * 100}%` }} />
        <span className="bg-carbs" style={{ width: `${(aporte.carb * 4 / kcalM) * 100}%` }} />
        <span className="bg-fat" style={{ width: `${(aporte.grasa * 9 / kcalM) * 100}%` }} />
      </span>}
    </div>

    <section aria-labelledby="cantidad-rapida" className="space-y-3">
      <h3 id="cantidad-rapida" className="text-rotulo text-fg-muted">Cantidad</h3>
      <div role="radiogroup" aria-labelledby="cantidad-rapida" className="flex flex-wrap gap-2">
        {opciones.map((o) => {
          const activa = Math.abs(o.gramos - gramos) < 0.05
          return <button key={o.label} type="button" role="radio" aria-checked={activa} onClick={() => onGramos(o.gramos)}
            className={`app-button flex min-h-touch items-center rounded-pill border px-3 text-body-sm ${activa ? 'border-transparent bg-fg font-semibold text-bg' : 'border-line bg-surface text-fg-muted'}`}>{textoOpcion(o, alimento.ml)}</button>
        })}
      </div>
      <div className="flex justify-center"><NumberStepper label={alimento.ml ? 'mililitros' : 'gramos'} value={gramos} onChange={onGramos} step={10} suffix={u} /></div>
    </section>

    {receta && <Disclosure title="Ingredientes en esta cantidad">
      <ul className="divide-y divide-line text-body-sm">
        {receta.ingredientes.map((ing, i) => <li key={i} className="flex justify-between gap-3 py-2">
          <span className="min-w-0 break-words text-fg">{ing.nombre}</span>
          <span className="tabular shrink-0 text-fg-muted">{formatNumber(ing.gramos * factorReceta, 0)} g</span>
        </li>)}
      </ul>
    </Disclosure>}

    {filasDia.length > 0 && <section aria-labelledby="como-queda" className="space-y-3">
      <h3 id="como-queda" className="text-rotulo text-fg-muted">Cómo queda tu día</h3>
      <ul className="space-y-2">
        {filasDia.map((f) => {
          const llevas = Math.min(100, (f.llevas / f.objetivo) * 100)
          const suma = Math.max(0, Math.min(100 - llevas, (f.suma / f.objetivo) * 100))
          const total = f.llevas + f.suma
          return <li key={f.label} className="space-y-1">
            <span className="flex items-baseline justify-between gap-2 text-caption">
              <span className="text-fg">{f.label}</span>
              <span className={`tabular ${total > f.objetivo ? 'font-semibold text-warning' : 'text-fg-muted'}`}>{formatInt(Math.round(total))}{f.unidad} de {formatInt(Math.round(f.objetivo))}{f.unidad}</span>
            </span>
            <span aria-hidden className="flex h-2 w-full overflow-hidden rounded-pill bg-surface-muted">
              <span className="bg-fg-subtle" style={{ width: `${llevas}%` }} />
              <span className={f.color} style={{ width: `${suma}%` }} />
            </span>
          </li>
        })}
      </ul>
      <p className="flex items-center gap-3 text-caption text-fg-muted"><span className="flex items-center gap-1"><span aria-hidden className="h-2 w-3 rounded-pill bg-fg-subtle" />Lo que llevas</span><span className="flex items-center gap-1"><span aria-hidden className="h-2 w-3 rounded-pill bg-protein" />Este alimento</span></p>
    </section>}

  </div>
}
