import { useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Icon from '../../../shared/components/Icon'
import NumberStepper from '../../../shared/components/NumberStepper'
import { formatInt } from '../../../shared/lib/format'
import { tokensConsulta } from '../../../shared/lib/text'
import { todayISO } from '../../../shared/lib/dates'
import { objetivosDe } from '../../perfil/data/objetivosDiaRepo'
import * as entriesRepo from '../data/entriesRepo'
import * as foodsRepo from '../data/foodsRepo'
import * as planificadasRepo from '../data/planificadasRepo'
import * as porcionesRepo from '../data/porcionesRepo'
import { racionDe } from '../lib/interprete/raciones'
import { sumMacros } from '../lib/nutrition'
import { opcionesCantidad, textoOpcion } from '../lib/opcionesCantidad'
import { partesNombre } from '../lib/ordenBusqueda'

// Piezas que comparten la hoja Cantidad y la revisión de Añadir comida, para que elegir cantidad se vea igual.

interface Macros3 { prot: number; carb: number; grasa: number }

function Pastilla({ color, children }: { color: string; children: string }) {
  return <span className="tabular flex items-center gap-1 rounded-pill bg-surface-muted px-2 py-0.5 text-caption text-fg"><span aria-hidden className={`h-2 w-2 rounded-pill ${color}`} />{children}</span>
}

/**
 * Proteína, hidratos y grasa en gramos como pastillas de color; con `kcal`, también las kcal delante. `compactas`
 * quita la «g» para que quepan en una fila de lista.
 */
export function PastillasMacros({ macros, kcal, compactas = false }: { macros: Macros3; kcal?: number; compactas?: boolean }) {
  const r = (n: number) => formatInt(Math.round(n))
  const g = compactas ? '' : ' g'
  return <span className="flex flex-wrap gap-1.5">
    {kcal !== undefined && <Pastilla color="bg-kcal">{`${r(kcal)} kcal`}</Pastilla>}
    <Pastilla color="bg-protein">{`P ${r(macros.prot)}${g}`}</Pastilla>
    <Pastilla color="bg-carbs">{`C ${r(macros.carb)}${g}`}</Pastilla>
    <Pastilla color="bg-fat">{`G ${r(macros.grasa)}${g}`}</Pastilla>
  </span>
}

/** El reparto de las kcal entre proteína, hidratos y grasa en una barra. */
export function BarraReparto({ macros }: { macros: Macros3 }) {
  const total = macros.prot * 4 + macros.carb * 4 + macros.grasa * 9
  if (!(total > 0)) return null
  return <span aria-hidden className="flex h-2 w-full gap-0.5 overflow-hidden rounded-pill">
    <span className="bg-protein" style={{ width: `${(macros.prot * 4 / total) * 100}%` }} />
    <span className="bg-carbs" style={{ width: `${(macros.carb * 4 / total) * 100}%` }} />
    <span className="bg-fat" style={{ width: `${(macros.grasa * 9 / total) * 100}%` }} />
  </span>
}

/**
 * «Cantidad»: botones de un toque (`opcionesCantidad`: tu ración, tus raciones, una unidad o fracciones de la receta, y
 * 100 g) y los gramos de 10 en 10. Sin `clave` (un alimento aún sin guardar) solo propone 100 g.
 */
export function CantidadesRapidas({ clave, nombre, ml = false, gramos, onGramos, pesoReceta }: {
  clave?: string; nombre: string; ml?: boolean; gramos: number; onGramos: (g: number) => void; pesoReceta?: number
}) {
  const hoy = todayISO()
  const porciones = useLiveQuery(async () => (clave ? porcionesRepo.delAlimento(clave) : []), [clave])
  const habitual = useLiveQuery(async () => (clave ? foodsRepo.racionHabitual(clave, hoy) : undefined), [clave, hoy])
  const u = ml ? 'ml' : 'g'
  const opciones = opcionesCantidad({ habitual, pesoReceta, ml, porciones: (porciones ?? []).map((p) => ({ nombre: p.nombre, gramos: p.gramos })), unidad: racionDe(tokensConsulta(partesNombre(nombre)[0]).join(' '))?.gramos })
  return <section aria-label="Cantidad" className="space-y-3">
    <h3 className="text-rotulo text-fg-muted">Cantidad</h3>
    <div role="radiogroup" aria-label="Cantidades de un toque" className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const activa = Math.abs(o.gramos - gramos) < 0.05
        return <button key={o.label} type="button" role="radio" aria-checked={activa} onClick={() => onGramos(o.gramos)}
          className={`app-button flex min-h-touch items-center rounded-pill border px-3 text-body-sm ${activa ? 'border-transparent bg-fg font-semibold text-bg' : 'border-line bg-surface text-fg-muted'}`}>{textoOpcion(o, ml)}</button>
      })}
    </div>
    <div className="flex justify-center"><NumberStepper label={ml ? 'mililitros' : 'gramos'} value={gramos} onChange={onGramos} step={10} suffix={u} /></div>
  </section>
}

/**
 * «Cómo queda tu día»: cuatro barras (kcal, proteína, hidratos, grasa) con lo que llevas ese día en gris y lo que se
 * añade en su color, frente al objetivo del día (al planificar, frente a lo planificado). Sin objetivo no se pinta.
 */
export function ComoQuedaTuDia({ aporte, fecha, planificar = false, plegable = false }: { aporte: Macros3 & { kcal: number }; fecha: string; planificar?: boolean; plegable?: boolean }) {
  const [abierto, setAbierto] = useState(!plegable)
  const id = useId()
  const hoy = todayISO()
  const dia = useLiveQuery(async () => {
    const [registros, objetivo] = await Promise.all([planificar ? planificadasRepo.delDia(fecha) : entriesRepo.delDia(fecha), objetivosDe(fecha, hoy)])
    return { llevas: sumMacros(registros), objetivo }
  }, [fecha, planificar, hoy])
  if (!dia?.objetivo || !(dia.objetivo.kcal > 0)) return null
  const filas = [
    { label: 'Kcal', llevas: dia.llevas.kcal, suma: aporte.kcal, objetivo: dia.objetivo.kcal, color: 'bg-kcal', unidad: '' },
    { label: 'Proteína', llevas: dia.llevas.prot, suma: aporte.prot, objetivo: dia.objetivo.prot, color: 'bg-protein', unidad: ' g' },
    { label: 'Hidratos', llevas: dia.llevas.carb, suma: aporte.carb, objetivo: dia.objetivo.carb, color: 'bg-carbs', unidad: ' g' },
    { label: 'Grasa', llevas: dia.llevas.grasa, suma: aporte.grasa, objetivo: dia.objetivo.grasa, color: 'bg-fat', unidad: ' g' },
  ]
  const kcalTotal = dia.llevas.kcal + aporte.kcal
  const pasado = kcalTotal > dia.objetivo.kcal
  return <section aria-labelledby={`${id}-t`} className="space-y-3">
    {plegable
      ? <button type="button" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto(!abierto)} className="app-button flex min-h-touch w-full items-center justify-between gap-3 border-y border-line py-2 text-left">
          <span className="min-w-0">
            <span id={`${id}-t`} className="block text-rotulo text-fg-muted">Cómo queda tu día</span>
            <span className={`tabular block text-body-sm ${pasado ? 'font-semibold text-warning' : 'text-fg'}`}>{formatInt(Math.round(kcalTotal))} de {formatInt(Math.round(dia.objetivo.kcal))} kcal{pasado ? ' · te pasas' : ''}</span>
          </span>
          <Icon name="chevron-down" size={18} className={`shrink-0 text-fg-subtle transition-transform duration-short ${abierto ? 'rotate-180' : ''}`} />
        </button>
      : <h3 id={`${id}-t`} className="text-rotulo text-fg-muted">Cómo queda tu día</h3>}
    <div id={id} hidden={!abierto} className="space-y-3">
    <ul className="space-y-2">
      {filas.map((f) => {
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
    <p className="flex items-center gap-3 text-caption text-fg-muted"><span className="flex items-center gap-1"><span aria-hidden className="h-2 w-3 rounded-pill bg-fg-subtle" />Lo que llevas</span><span className="flex items-center gap-1"><span aria-hidden className="h-2 w-3 rounded-pill bg-protein" />Lo que añades</span></p>
    </div>
  </section>
}

