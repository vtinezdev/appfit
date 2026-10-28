import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Badge from '../../../shared/components/Badge'
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
import { formatInt, formatNumber, round1 } from '../../../shared/lib/format'
import { congelarObjetivoDia } from '../../perfil/data/objetivosDiaRepo'
import * as entriesRepo from '../data/entriesRepo'
import * as planificadasRepo from '../data/planificadasRepo'
import * as recetasRepo from '../data/recetasRepo'
import { COMIDAS, nombreComida } from '../lib/comidas'
import { macrosPorGramos } from '../lib/nutrition'
import { textoRaciones, textoTiempo } from '../lib/recetas'
import { gramosRacion, ingredientesPara, por100De, vistaDeRecetaPropia } from '../lib/variantes'
import EditorReceta from './EditorReceta'

/** Una receta tuya (editable) o un plato del recetario AppFit (solo lectura). */
type Props = ({ recetaId: number; catalogId?: undefined } | { catalogId: string; recetaId?: undefined }) & { onClose: () => void }

type Accion = 'registrar' | 'planificar'

/** Lo que dura la confirmación de registrar, planificar o copiar en lugar del botón principal. */
const CONFIRMACION_MS = 4000

/** El tiempo como cifra y unidad («1 h 15» + «min»), para que quepa en una columna estrecha. */
function tiempoMetrica(min: number): { valor: string; unidad: string } {
  const texto = textoTiempo(min)
  const unidad = texto.endsWith(' min') ? 'min' : 'h'
  return { valor: texto.slice(0, -(unidad.length + 1)), unidad }
}

/** Gramos legibles: con un decimal por debajo de 10 g (sal, especias), enteros por encima. */
const gramosTexto = (g: number) => formatNumber(g, g < 10 ? 1 : 0)

/**
 * Ficha de lectura de una receta: lo que aporta por ración (y por 100 g), los ingredientes para las raciones que se
 * quieran, los pasos y las notas. Desde aquí se registra o planifica (raciones o gramos) y, si es tuya, se edita.
 * Las del recetario AppFit no se editan: se cambian con variantes al añadir comida o con «Copiar a mis recetas», que
 * crea una receta tuya igual y pasa a enseñarla (ya editable).
 */
export default function FichaReceta({ recetaId, catalogId, onClose }: Props) {
  // Tras «Copiar a mis recetas», la ficha enseña la copia.
  const [copiaId, setCopiaId] = useState<number | null>(null)
  const idPropia = copiaId ?? recetaId
  const datos = useLiveQuery(async () => {
    if (idPropia !== undefined) {
      const receta = await recetasRepo.obtener(idPropia)
      return receta ? { receta, vista: vistaDeRecetaPropia(receta) } : null
    }
    const vista = await recetasRepo.vista({ tipo: 'catalog', id: catalogId! })
    return vista ? { receta: undefined, vista } : null
  }, [idPropia, catalogId])
  const [racionesVista, setRacionesVista] = useState<number | null>(null)
  const [editando, setEditando] = useState<false | 'todo' | 'preparacion'>(false)
  const [accion, setAccion] = useState<Accion | null>(null)
  const [comida, setComida] = useState<Comida>(() => comidaPorHora())
  const [fecha, setFecha] = useState(todayISO())
  const [gramos, setGramos] = useState(100)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)
  const [copiando, setCopiando] = useState(false)
  const [errorCopia, setErrorCopia] = useState<string | null>(null)

  // Borrada desde el editor (o ya no está en el catálogo): la ficha ya no tiene nada que enseñar.
  useEffect(() => { if (datos === null) onClose() }, [datos, onClose])
  // La confirmación ocupa el sitio del botón principal un momento y lo devuelve.
  useEffect(() => {
    if (!hecho) return
    const t = setTimeout(() => setHecho(null), CONFIRMACION_MS)
    return () => clearTimeout(t)
  }, [hecho])

  if (!datos) return <ModalPage title="Receta" onClose={onClose}><LoadingState /></ModalPage>

  const { receta, vista } = datos
  const propia = receta !== undefined
  const raciones = vista.raciones ?? 1
  const vistaRaciones = racionesVista ?? raciones
  const gRacion = gramosRacion(vista, vista)
  const por100 = por100De(vista)
  const porRacion = gRacion !== null ? macrosPorGramos(por100, gRacion) : null
  const ingredientes = ingredientesPara(vista, (vista.pesoCocinadoG * vistaRaciones) / raciones)
  const pasos = vista.pasos ?? []
  const aporteAccion = macrosPorGramos(por100, gramos)

  function abrir(a: Accion) {
    setAccion(a)
    setFecha(todayISO())
    setGramos(gRacion !== null ? Math.round(gRacion) : 100)
    setError(null)
  }

  async function confirmar() {
    if (!accion || ocupado) return
    setOcupado(true)
    setError(null)
    try {
      const { ref } = vista
      const id = accion === 'planificar'
        ? await planificadasRepo.planificarAlimento({ fecha, comida, ref, gramos }, todayISO())
        : ref.tipo === 'user'
        ? await entriesRepo.anadirDesdeAlimento({ fecha, comida, foodId: ref.id, gramos })
        : await entriesRepo.anadirDesdeCatalogo({ fecha, comida, catalogId: ref.id, gramos })
      if (id === undefined) { setError(propia ? 'El alimento de esta receta ya no existe. Ábrela en Editar y guárdala para recuperarlo.' : 'Esta receta ya no está en el catálogo.'); return }
      if (accion === 'registrar') void congelarObjetivoDia(fecha)
      const cantidad = gRacion !== null ? textoRaciones(round1(gramos / gRacion)) : `${gramosTexto(gramos)} g`
      setHecho(`${accion === 'registrar' ? 'Registrado' : 'Planificado'} · ${cantidad} · ${nombreComida(comida)} · ${formatFriendly(fecha)}`)
      setAccion(null)
    } catch (e) {
      setError(e instanceof planificadasRepo.FechaNoPlanificable ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  async function copiar() {
    if (copiando || catalogId === undefined) return
    setCopiando(true)
    setErrorCopia(null)
    try {
      setCopiaId(await recetasRepo.copiarDelCatalogo(catalogId))
      setRacionesVista(null)
      setHecho('Copiada a tus recetas')
    } catch (e) {
      setErrorCopia(e instanceof recetasRepo.RecetaInvalidaError ? e.message : 'No se ha podido copiar. Inténtalo de nuevo.')
    } finally {
      setCopiando(false)
    }
  }

  const macros = porRacion ?? { prot: por100.prot100, carb: por100.carb100, grasa: por100.grasa100 }

  return (
    <ModalPage title="Receta" onClose={onClose}
      footer={<div className="space-y-2">
        {errorCopia && <ErrorState>{errorCopia}</ErrorState>}
        <div role="status">
          {hecho && <p className="flex min-h-touch-lg items-center justify-center gap-2 rounded-md bg-accent-subtle px-4 py-2 text-center text-body font-semibold text-accent-strong"><Icon name="check" size={18} className="shrink-0" /><span className="min-w-0 break-words">{hecho}</span></p>}
        </div>
        {!hecho && <Button size="lg" block onClick={() => abrir('registrar')}>{gRacion !== null ? 'Registrar una ración' : 'Registrar'}</Button>}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="flex-auto whitespace-nowrap" onClick={() => abrir('planificar')}><Icon name="calendar" size={18} />Planificar</Button>
          {propia
            ? <Button variant="secondary" className="flex-auto whitespace-nowrap" onClick={() => setEditando('todo')}><Icon name="pencil" size={18} />Editar</Button>
            : <Button variant="secondary" className="flex-auto whitespace-nowrap" loading={copiando} onClick={copiar}><Icon name="copy" size={18} />Copiar a mis recetas</Button>}
        </div>
      </div>}>
      <div className="space-y-section">
        <header className="space-y-1.5">
          <Badge tone={propia ? 'accent' : 'neutral'}>{propia ? 'Tuya' : 'AppFit'}</Badge>
          <h2 className="break-words text-heading text-fg">{vista.nombre}</h2>
        </header>

        <Card className="space-y-4">
          <div className="grid grid-cols-3 gap-3 border-b border-line pb-4">
            {vista.raciones ? <Metric size="title" valor={formatNumber(vista.raciones, 1)} label="Raciones" /> : null}
            {vista.tiempoMin ? <Metric size="title" {...tiempoMetrica(vista.tiempoMin)} label="Tiempo" /> : null}
            <Metric size="title" valor={formatInt(vista.pesoCocinadoG)} unidad="g" label="Cocinado" />
          </div>
          {porRacion && gRacion !== null
            ? <div className="flex flex-wrap items-end justify-between gap-3">
                <Metric size="hero" valor={porRacion.kcal} unidad="kcal" label={raciones === 1 ? `La receta entera · ${gramosTexto(gRacion)} g` : `Por ración · ${gramosTexto(gRacion)} g`} />
                <Metric size="title" align="right" valor={por100.kcal100} unidad="kcal" label="100 g" />
              </div>
            : <Metric size="hero" valor={por100.kcal100} unidad="kcal" label="Por 100 g" />}
          <div className="grid grid-cols-3 gap-3">
            <Metric size="title" valor={formatNumber(macros.prot, 0)} unidad="g" label="Proteína" />
            <Metric size="title" valor={formatNumber(macros.carb, 0)} unidad="g" label="Hidratos" />
            <Metric size="title" valor={formatNumber(macros.grasa, 0)} unidad="g" label="Grasa" />
          </div>
        </Card>

        <Card>
          <section aria-label="Ingredientes" className="space-y-2">
            <SectionHeader variant="section" action={vista.raciones
              ? <NumberStepper label="raciones" value={vistaRaciones} min={1} suffix={vistaRaciones === 1 ? 'ración' : 'rac.'} onChange={(v) => setRacionesVista(Math.max(1, Math.round(v)))} />
              : undefined}>Ingredientes</SectionHeader>
            <ListGroup variante="plana" aria-label="Ingredientes">
              {ingredientes.map((i, idx) => (
                <li key={idx} className="flex min-h-touch items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 break-words text-body text-fg">{i.nombre}</span>
                  <span className="tabular shrink-0 text-body text-fg-muted">{gramosTexto(i.gramos)} g</span>
                </li>
              ))}
            </ListGroup>
          </section>
        </Card>

        <section aria-label="Preparación" className="space-y-stack">
          <SectionHeader variant="section" action={vista.raciones && pasos.length > 0 ? <span className="tabular text-caption text-fg-muted">para {textoRaciones(raciones)}</span> : undefined}>Preparación</SectionHeader>
          {pasos.length === 0
            ? propia
              ? <EmptyState action={<Button variant="secondary" onClick={() => setEditando('preparacion')}><Icon name="plus" size={18} />Añadir preparación</Button>}>Apunta los pasos para tenerlos a mano mientras cocinas.</EmptyState>
              : <EmptyState>Esta receta aún no tiene los pasos escritos. Sus ingredientes y lo que aporta ya están completos.</EmptyState>
            : (
              <ol className="space-y-4">
                {pasos.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span aria-hidden className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-accent text-label text-accent-on">{i + 1}</span>
                    <p className="min-w-0 flex-1 whitespace-pre-line break-words pt-1 text-body text-fg"><span className="sr-only">Paso {i + 1}: </span>{p}</p>
                  </li>
                ))}
              </ol>
            )}
          {vista.notas && (
            <div className="flex gap-3">
              <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-fg-muted"><Icon name="comentario" size={16} /></span>
              <p className="min-w-0 flex-1 whitespace-pre-line break-words pt-1 text-body text-fg-muted"><span className="sr-only">Notas: </span>{vista.notas}</p>
            </div>
          )}
        </section>
      </div>

      <Sheet open={accion !== null} onClose={() => setAccion(null)} title={accion === 'planificar' ? 'Planificar' : 'Registrar'} subtitle={vista.nombre}
        footer={<div className="space-y-2">
          {error && <ErrorState>{error}</ErrorState>}
          <Button block loading={ocupado} disabled={!fecha || !(gramos > 0)} onClick={confirmar}>{accion === 'planificar' ? 'Planificar' : 'Registrar'} · {formatInt(aporteAccion.kcal)} kcal</Button>
        </div>}>
        <div className="space-y-4">
          <SegmentedControl label="Comida" opciones={COMIDAS} valor={comida} onChange={setComida} />
          <label className="block space-y-1"><span className="text-label text-fg-muted">Día</span>
            <Input type="date" min={accion === 'planificar' ? todayISO() : undefined} max={accion === 'registrar' ? todayISO() : undefined} value={fecha} onChange={(e) => { setFecha(e.target.value); setError(null) }} /></label>
          {gRacion !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-label text-fg-muted">Raciones</span>
              <NumberStepper label="raciones" value={round1(gramos / gRacion)} step={0.5} min={0.5} onChange={(r) => setGramos(round1(Math.max(0.5, r) * gRacion))} />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-label text-fg-muted">Gramos</span>
            <NumberStepper label="gramos" value={gramos} step={10} min={1} suffix="g" onChange={(g) => setGramos(Math.max(1, g))} />
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-md bg-surface-muted p-3">
            <Metric size="title" valor={formatNumber(aporteAccion.prot, 0)} unidad="g" label="Proteína" />
            <Metric size="title" valor={formatNumber(aporteAccion.carb, 0)} unidad="g" label="Hidratos" />
            <Metric size="title" valor={formatNumber(aporteAccion.grasa, 0)} unidad="g" label="Grasa" />
          </div>
        </div>
      </Sheet>

      {editando && receta && <EditorReceta receta={receta} irAPreparacion={editando === 'preparacion'} onClose={() => setEditando(false)} />}
    </ModalPage>
  )
}
