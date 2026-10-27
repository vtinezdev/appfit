import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import Metric from '../../../shared/components/Metric'
import ModalPage from '../../../shared/components/ModalPage'
import NumberStepper from '../../../shared/components/NumberStepper'
import SectionHeader from '../../../shared/components/SectionHeader'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { Comida } from '../../../shared/db/types'
import { comidaPorHora, formatFriendly, todayISO } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { congelarObjetivoDia } from '../../perfil/data/objetivosDiaRepo'
import * as entriesRepo from '../data/entriesRepo'
import * as planificadasRepo from '../data/planificadasRepo'
import * as recetasRepo from '../data/recetasRepo'
import { COMIDAS, nombreComida } from '../lib/comidas'
import { macrosPorGramos, resumenMacros } from '../lib/nutrition'
import { escalarIngredientes, gramosPorRacion, por100DeReceta, racionesDe, textoRaciones, textoTiempo, valoresPorRacion } from '../lib/recetas'
import EditorReceta from './EditorReceta'

interface Props {
  recetaId: number
  onClose: () => void
}

type Accion = 'registrar' | 'planificar'

/** Gramos legibles: con un decimal por debajo de 10 g (sal, especias), enteros por encima. */
const gramosTexto = (g: number) => formatNumber(g, g < 10 ? 1 : 0)

/**
 * Ficha de lectura de una receta: lo que aporta por ración (y por 100 g), los ingredientes para las raciones que se
 * quieran, los pasos y las notas. Desde aquí se registra o planifica una ración y se abre el editor.
 */
export default function FichaReceta({ recetaId, onClose }: Props) {
  const receta = useLiveQuery(async () => (await recetasRepo.obtener(recetaId)) ?? null, [recetaId])
  const [racionesVista, setRacionesVista] = useState<number | null>(null)
  const [editando, setEditando] = useState<false | 'todo' | 'preparacion'>(false)
  const [accion, setAccion] = useState<Accion | null>(null)
  const [comida, setComida] = useState<Comida>(() => comidaPorHora())
  const [fecha, setFecha] = useState(todayISO())
  const [cuantas, setCuantas] = useState(1)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)

  // Borrada desde el editor: la ficha ya no tiene nada que enseñar.
  useEffect(() => { if (receta === null) onClose() }, [receta, onClose])

  if (!receta) return <ModalPage title="Receta" onClose={onClose}><LoadingState /></ModalPage>

  const raciones = racionesDe(receta)
  const vista = racionesVista ?? raciones
  const porRacion = valoresPorRacion(receta)
  const gRacion = gramosPorRacion(receta)
  const por100 = por100DeReceta(receta.ingredientes, receta.pesoCocinadoG)
  const ingredientes = escalarIngredientes(receta.ingredientes, raciones, vista)
  const pasos = receta.pasos ?? []
  const gramosAccion = Math.round(gRacion * cuantas * 10) / 10
  const aporteAccion = macrosPorGramos(por100, gramosAccion)

  function abrir(a: Accion) {
    setAccion(a)
    setFecha(todayISO())
    setCuantas(1)
    setError(null)
  }

  async function confirmar() {
    if (!receta || !accion || ocupado) return
    setOcupado(true)
    setError(null)
    try {
      const id = accion === 'registrar'
        ? await entriesRepo.anadirDesdeAlimento({ fecha, comida, foodId: receta.foodId, gramos: gramosAccion })
        : await planificadasRepo.planificarAlimento({ fecha, comida, ref: { tipo: 'user', id: receta.foodId }, gramos: gramosAccion }, todayISO())
      if (id === undefined) { setError('El alimento de esta receta ya no existe. Ábrela en Editar y guárdala para recuperarlo.'); return }
      if (accion === 'registrar') void congelarObjetivoDia(fecha)
      const verbo = (accion === 'registrar' ? 'Registrada' : 'Planificada') + (cuantas === 1 ? '' : 's')
      setHecho(`${verbo} ${textoRaciones(cuantas)} · ${nombreComida(comida)} · ${formatFriendly(fecha)}`)
      setAccion(null)
    } catch (e) {
      setError(e instanceof planificadasRepo.FechaNoPlanificable ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  const detalles = [textoRaciones(raciones), receta.tiempoMin ? textoTiempo(receta.tiempoMin) : null, `${formatInt(receta.pesoCocinadoG)} g cocinados`].filter(Boolean).join(' · ')

  return (
    <ModalPage title="Receta" onClose={onClose}
      footer={<div className="space-y-2">
        {hecho && <p role="status" className="flex items-start gap-2 text-body-sm text-fg"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-accent-strong" /><span className="min-w-0 break-words">{hecho}</span></p>}
        <Button size="lg" block onClick={() => abrir('registrar')}>Registrar una ración</Button>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => abrir('planificar')}><Icon name="calendar" size={18} />Planificar</Button>
          <Button variant="secondary" className="flex-1" onClick={() => setEditando('todo')}><Icon name="pencil" size={18} />Editar</Button>
        </div>
      </div>}>
      <div className="space-y-section">
        <header className="space-y-1">
          <h2 className="break-words text-title text-fg">{receta.nombre}</h2>
          <p className="tabular text-body-sm text-fg-muted">{detalles}</p>
        </header>

        <Card className="space-y-4">
          <Metric size="hero" valor={porRacion.kcal} unidad="kcal" label={raciones === 1 ? 'La receta entera' : 'Por ración'} caption={`${gramosTexto(gRacion)} g cocinados`} />
          <div className="grid grid-cols-3 gap-3">
            <Metric size="title" valor={formatNumber(porRacion.prot, 0)} unidad="g" label="Proteína" />
            <Metric size="title" valor={formatNumber(porRacion.carb, 0)} unidad="g" label="Hidratos" />
            <Metric size="title" valor={formatNumber(porRacion.grasa, 0)} unidad="g" label="Grasa" />
          </div>
          <p className="tabular border-t border-line pt-3 text-caption text-fg-muted">Por 100 g: {formatInt(por100.kcal100)} kcal · {resumenMacros({ prot: por100.prot100, carb: por100.carb100, grasa: por100.grasa100 })}</p>
        </Card>

        <section aria-label="Ingredientes" className="space-y-stack">
          <SectionHeader variant="section">{`Ingredientes · ${receta.ingredientes.length}`}</SectionHeader>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span className="text-body-sm text-fg-muted">Cantidades para</span>
            <NumberStepper label="raciones" value={vista} min={1} suffix={vista === 1 ? 'ración' : 'rac.'} onChange={(v) => setRacionesVista(Math.max(1, Math.round(v)))} />
          </div>
          <ListGroup variante="plana" aria-label="Ingredientes">
            {ingredientes.map((i, idx) => (
              <li key={idx} className="flex min-h-touch items-baseline justify-between gap-3 py-2">
                <span className="min-w-0 break-words text-body text-fg">{i.nombre}</span>
                <span className="tabular shrink-0 text-body text-fg-muted">{gramosTexto(i.gramos)} g</span>
              </li>
            ))}
          </ListGroup>
          {vista !== raciones && <p className="text-caption text-fg-muted">Recalculado para {textoRaciones(vista)}; la receta guardada sigue siendo para {textoRaciones(raciones)}.</p>}
        </section>

        <section aria-label="Preparación" className="space-y-stack">
          <SectionHeader variant="section">Preparación</SectionHeader>
          {pasos.length === 0
            ? <EmptyState action={<Button variant="secondary" onClick={() => setEditando('preparacion')}><Icon name="plus" size={18} />Añadir preparación</Button>}>Apunta los pasos para tenerlos a mano mientras cocinas.</EmptyState>
            : (
              <ol className="space-y-4">
                {pasos.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span aria-hidden className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-label text-fg">{i + 1}</span>
                    <p className="min-w-0 flex-1 whitespace-pre-line break-words pt-1 text-body text-fg"><span className="sr-only">Paso {i + 1}: </span>{p}</p>
                  </li>
                ))}
              </ol>
            )}
        </section>

        {receta.notas && (
          <section aria-label="Notas" className="space-y-stack">
            <SectionHeader variant="section">Notas</SectionHeader>
            <p className="whitespace-pre-line break-words text-body text-fg">{receta.notas}</p>
          </section>
        )}
      </div>

      <Sheet open={accion !== null} onClose={() => setAccion(null)} title={accion === 'planificar' ? 'Planificar' : 'Registrar'}
        footer={<div className="space-y-2">
          {error && <ErrorState>{error}</ErrorState>}
          <Button block loading={ocupado} disabled={!fecha} onClick={confirmar}>{accion === 'planificar' ? 'Planificar' : 'Registrar'} {textoRaciones(cuantas)}</Button>
        </div>}>
        <div className="space-y-4">
          <p className="break-words text-body font-medium text-fg">{receta.nombre}</p>
          <SegmentedControl label="Comida" opciones={COMIDAS} valor={comida} onChange={setComida} />
          <label className="block space-y-1"><span className="text-label text-fg-muted">Día</span>
            <Input type="date" min={accion === 'planificar' ? todayISO() : undefined} max={accion === 'registrar' ? todayISO() : undefined} value={fecha} onChange={(e) => { setFecha(e.target.value); setError(null) }} /></label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-label text-fg-muted">Raciones</span>
            <NumberStepper label="raciones" value={cuantas} step={0.5} min={0.5} onChange={(v) => setCuantas(Math.max(0.5, v))} />
          </div>
          <p className="tabular text-body-sm text-fg-muted">{gramosTexto(gramosAccion)} g · {formatInt(aporteAccion.kcal)} kcal · {resumenMacros(aporteAccion)}</p>
        </div>
      </Sheet>

      {editando && <EditorReceta receta={receta} irAPreparacion={editando === 'preparacion'} onClose={() => setEditando(false)} />}
    </ModalPage>
  )
}
