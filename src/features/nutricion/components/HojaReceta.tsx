import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Disclosure from '../../../shared/components/Disclosure'
import Icon from '../../../shared/components/Icon'
import NumberStepper from '../../../shared/components/NumberStepper'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { VarianteReceta } from '../../../shared/db/types'
import { formatInt, formatNumber, round1 } from '../../../shared/lib/format'
import * as recetasRepo from '../data/recetasRepo'
import * as variantesRepo from '../data/variantesRepo'
import type { AlimentoElegible } from '../lib/alimentos'
import { macrosPorGramos, resumenMacros } from '../lib/nutrition'
import { textoRaciones, textoTiempo } from '../lib/recetas'
import { diferencias, gramosRacion, ingredientesPara, nombreCortoIngrediente, por100De, type RecetaVista } from '../lib/variantes'

/** Lo elegido en la hoja: la receta, la normal o una variante, y cuántos gramos cocinados. */
export interface EleccionReceta {
  vista: RecetaVista
  variante?: VarianteReceta
  gramos: number
}

interface Props {
  /** Receta elegida en Buscar o frecuentes; `null` cierra la hoja. */
  alimento: AlimentoElegible | null
  /** Texto de la acción principal sin las kcal («Añadir a cena», «Planificar en cena»). */
  accion: string
  ocupado: boolean
  error: string | null
  onAnadir: (eleccion: EleccionReceta) => void
  onCambiarIngredientes: (eleccion: EleccionReceta) => void
  onClose: () => void
}

const gramosTexto = (g: number) => `${formatNumber(g, g < 10 ? 1 : 0)} g`

/**
 * Hoja de una receta al añadir comida: la normal o una de tus variantes, la cantidad (raciones o gramos), lo que
 * aporta y sus ingredientes para esa cantidad, con «Cambiar ingredientes». La normal se registra como un alimento;
 * una variante, como un plato con sus ingredientes (lo decide quien llama con `onAnadir`).
 */
export default function HojaReceta({ alimento, accion, ocupado, error, onAnadir, onCambiarIngredientes, onClose }: Props) {
  const ref = alimento?.ref
  const datos = useLiveQuery(async () => {
    if (!ref) return null
    const vista = await recetasRepo.vista(ref)
    return vista ? { vista, variantes: await variantesRepo.deBase(vista.base) } : null
  }, [ref?.tipo, ref?.id])
  const [elegida, setElegida] = useState<string>('normal')
  const [gramos, setGramos] = useState<number | null>(null)
  const [borrada, setBorrada] = useState<VarianteReceta | null>(null)

  // Otra receta: vuelve a la normal y a su ración.
  useEffect(() => { setElegida('normal'); setGramos(null); setBorrada(null) }, [ref?.tipo, ref?.id])

  const vista = datos?.vista
  const variantes = datos?.variantes ?? []
  const variante = variantes.find((v) => String(v.id) === elegida)
  const composicion = variante ?? vista
  const gRacion = vista && composicion ? gramosRacion(vista, composicion) : null
  const cantidad = gramos ?? (gRacion !== null ? Math.round(gRacion) : 100)
  const por100 = composicion ? por100De(composicion) : null
  // La normal se registra con los valores de su alimento (los que se ven en Buscar); una variante, con los suyos.
  const aporte = alimento && por100 ? macrosPorGramos(variante ? por100 : alimento, cantidad) : null
  const ingredientes = composicion ? ingredientesPara(composicion, cantidad) : []

  async function borrarVariante(id: number) {
    const v = await variantesRepo.borrar(id)
    if (v) setBorrada(v)
    setElegida('normal')
  }

  async function deshacer() {
    if (!borrada) return
    await variantesRepo.restaurar(borrada)
    setElegida(String(borrada.id))
    setBorrada(null)
  }

  const detalles = vista
    ? ['Receta', vista.origen === 'tuya' ? 'Tuya' : 'AppFit', ...(vista.raciones ? [textoRaciones(vista.raciones)] : []), ...(vista.tiempoMin ? [textoTiempo(vista.tiempoMin)] : [])].join(' · ')
    : ''

  return (
    <Sheet open={alimento !== null} onClose={onClose} title="Receta"
      footer={vista && aporte && <div className="space-y-2">
        {error && <ErrorState>{error}</ErrorState>}
        <Button block loading={ocupado} disabled={!(cantidad > 0)} onClick={() => onAnadir({ vista, variante, gramos: cantidad })}>{accion} · {formatInt(aporte.kcal)} kcal</Button>
      </div>}>
      {datos === undefined && <LoadingState />}
      {datos === null && <ErrorState>No se encuentran los ingredientes de esta receta. Vuelve a intentarlo cuando el catálogo termine de actualizarse.</ErrorState>}
      {vista && composicion && aporte && (
        <div className="space-y-5">
          <header className="space-y-1">
            <h3 className="break-words text-title text-fg">{vista.nombre}</h3>
            <p className="flex items-center gap-1.5 text-body-sm text-fg-muted"><Icon name="recetario" size={16} className="shrink-0" /><span className="min-w-0 break-words">{detalles}</span></p>
          </header>

          {variantes.length > 0 && (
            <SegmentedControl label="Versión de la receta" variante="vertical" valor={elegida} onChange={(v) => { setElegida(v); setGramos(null) }}
              opciones={[
                { valor: 'normal', label: 'Normal', descripcion: 'La receta tal cual, con sus pasos' },
                ...variantes.map((v) => {
                  const difs = diferencias(vista.ingredientes, v.ingredientes).join(' · ') || 'Mismos ingredientes'
                  return { valor: String(v.id), label: v.nombre, ...(difs !== v.nombre ? { descripcion: difs } : {}) }
                }),
              ]} />
          )}
          {borrada && (
            <p role="status" className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-fg">
              <span className="min-w-0 break-words">Variante «{borrada.nombre}» borrada</span>
              <Button variant="ghost" size="sm" onClick={deshacer}>Deshacer</Button>
            </p>
          )}

          <div className="text-center">
            <p className="flex items-baseline justify-center gap-1.5 text-fg">
              <span className="tabular text-display">{formatInt(aporte.kcal)}</span>
              <span className="text-body text-fg-muted">kcal</span>
            </p>
            <p className="tabular mt-1 text-body-sm text-fg-subtle">{resumenMacros(aporte)} · {gramosTexto(cantidad)} cocinados</p>
          </div>

          <div className="space-y-3">
            {gRacion !== null && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-label text-fg-muted">Raciones</span>
                <NumberStepper label="raciones" value={round1(cantidad / gRacion)} step={0.5} min={0.5} onChange={(r) => setGramos(round1(Math.max(0.5, r) * gRacion))} />
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-label text-fg-muted">Gramos</span>
              <NumberStepper label="gramos" value={cantidad} step={10} min={1} suffix="g" onChange={(g) => setGramos(Math.max(1, g))} />
            </div>
          </div>

          <Disclosure title={`Ingredientes para ${gramosTexto(cantidad)} · ${ingredientes.length}`}>
            <p className="pb-2 text-caption text-fg-muted">Cantidades en crudo.</p>
            <ul className="divide-y divide-line">
              {ingredientes.map((i, idx) => (
                <li key={idx} className="flex min-h-touch items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 break-words text-body-sm text-fg" title={i.nombre}>{nombreCortoIngrediente(i.nombre)}</span>
                  <span className="tabular shrink-0 text-body-sm text-fg-muted">{gramosTexto(i.gramos)}</span>
                </li>
              ))}
            </ul>
          </Disclosure>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => onCambiarIngredientes({ vista, variante, gramos: cantidad })}><Icon name="pencil" size={18} />Cambiar ingredientes</Button>
            {variante && <Button variant="ghost" onClick={() => borrarVariante(variante.id)}>Borrar variante</Button>}
          </div>
        </div>
      )}
    </Sheet>
  )
}
