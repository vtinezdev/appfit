import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import ModalPage from '../../../shared/components/ModalPage'
import NumberStepper from '../../../shared/components/NumberStepper'
import SectionHeader from '../../../shared/components/SectionHeader'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { EmptyState, ErrorState } from '../../../shared/components/StateMessage'
import ViewTabs from '../../../shared/components/ViewTabs'
import type { Receta } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import * as foodsRepo from '../data/foodsRepo'
import * as recetasRepo from '../data/recetasRepo'
import { useInterpretarLocal } from '../hooks/useInterpretarLocal'
import { esCategoriaAlimento, type CategoriaAlimento } from '../lib/catalogo/categorias'
import { faltanValores, itemDesdeElegible, medidaPendiente, type AlimentoElegible, type ItemRevision } from '../lib/alimentos'
import { macrosPorGramos, resumenMacros } from '../lib/nutrition'
import { ingredienteDeItem, itemDeIngrediente, pesoCrudoTotal, por100DeReceta, validarReceta } from '../lib/recetas'
import Medidas from '../pages/Medidas'
import AlimentosRapidos from './AlimentosRapidos'
import CambiarAlimentoSheet from './CambiarAlimentoSheet'
import DescribirComida from './DescribirComida'
import ItemRevisionRow from './ItemRevisionRow'
import SelectorCategoria from './SelectorCategoria'

interface Props {
  /** Sin receta: se crea una nueva. */
  receta?: Receta
  onClose: () => void
}

/**
 * Crear o editar una receta casera con el mismo flujo de ingredientes que «Añadir comida» (describir o buscar,
 * y revisar cada ingrediente), más el peso cocinado. Guardar crea o actualiza el alimento propio de la receta.
 */
export default function EditorReceta({ receta, onClose }: Props) {
  const [nombre, setNombre] = useState(receta?.nombre ?? '')
  const [categoriaElegida, setCategoria] = useState<CategoriaAlimento | null>(null)
  // La categoría vive en el alimento de la receta; si no tiene (o es nueva), se propone «Platos preparados».
  const categoriaGuardada = useLiveQuery(async () => (receta ? ((await recetasRepo.categoriaDe(receta)) ?? null) : null), [receta?.foodId])
  const categoria = categoriaElegida ?? (esCategoriaAlimento(categoriaGuardada) ? categoriaGuardada : recetasRepo.CATEGORIA_RECETA_POR_DEFECTO)
  const [items, setItems] = useState<ItemRevision[]>(() => receta?.ingredientes.map(itemDeIngrediente) ?? [])
  const [claves, setClaves] = useState<string[]>(() => items.map(() => crypto.randomUUID()))
  const [peso, setPeso] = useState<number | null>(receta?.pesoCocinadoG ?? null)
  const [metodo, setMetodo] = useState<'describir' | 'buscar'>('describir')
  const [anadiendo, setAnadiendo] = useState(!receta)
  const [texto, setTexto] = useState('')
  const [gramos, setGramos] = useState<{ alimento: AlimentoElegible; gramos: number } | null>(null)
  const [cambiando, setCambiando] = useState<number | null>(null)
  const [verMedidas, setVerMedidas] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [conservar, setConservar] = useState<'si' | 'no'>('si')
  const local = useInterpretarLocal()

  const ingredientes = items.map(ingredienteDeItem)
  const crudo = pesoCrudoTotal(ingredientes)
  // Mientras no se toque, el peso cocinado propuesto es el crudo (el cocinado suele pesar distinto: se edita).
  const pesoCocinado = peso ?? crudo
  const por100 = por100DeReceta(ingredientes, pesoCocinado)
  const invalida = validarReceta(nombre, ingredientes, pesoCocinado)
  const bloqueado = items.some((it) => !it.nombre.trim() || faltanValores(it) || medidaPendiente(it))

  function anadir(nuevos: ItemRevision[]) {
    setItems((prev) => [...prev, ...nuevos])
    setClaves((prev) => [...prev, ...nuevos.map(() => crypto.randomUUID())])
    setAnadiendo(false)
  }

  async function interpretar() {
    if (local.cargando) return
    const resultado = await local.interpretar(texto.trim())
    if (resultado) { anadir(resultado); setTexto('') }
  }

  async function guardar() {
    if (ocupado || invalida || bloqueado) return
    setOcupado(true)
    setError(null)
    try {
      const datos = { nombre, ingredientes, pesoCocinadoG: pesoCocinado, categoria }
      if (receta) await recetasRepo.actualizar(receta.id, datos)
      else await recetasRepo.crear(datos)
      onClose()
    } catch (e) {
      setError(e instanceof foodsRepo.NombreDuplicadoError || e instanceof recetasRepo.RecetaInvalidaError ? e.message : 'No se ha podido guardar la receta. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  async function borrar() {
    if (!receta || ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await recetasRepo.borrar(receta.id, conservar === 'si')
      onClose()
    } catch {
      setBorrando(false)
      setError('No se ha podido borrar la receta. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <ModalPage title={receta ? 'Editar receta' : 'Nueva receta'} closeLabel="Cancelar" onClose={onClose} busy={ocupado}
      footer={<div className="space-y-2">
        {error && <ErrorState>{error}</ErrorState>}
        {invalida && items.length > 0 && <p className="text-body-sm text-fg-muted">{invalida}</p>}
        <Button size="lg" block loading={ocupado} disabled={!!invalida || bloqueado || anadiendo && items.length === 0} onClick={guardar}>Guardar receta</Button>
      </div>}>
      <div className="space-y-section">
        <div className="space-y-3">
          <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre de la receta</span>
            <Input tone="surface" value={nombre} maxLength={80} placeholder="Por ejemplo, lentejas de la abuela" onChange={(e) => setNombre(e.target.value)} /></label>
          <SelectorCategoria tone="surface" valor={categoria} onChange={setCategoria} />
        </div>

        <section aria-label="Ingredientes" className="space-y-stack">
          <SectionHeader variant="section">{items.length === 0 ? 'Ingredientes' : `Ingredientes · ${items.length}`}</SectionHeader>
          {items.length === 0 && !anadiendo && <EmptyState>Añade los ingredientes en crudo, con su cantidad.</EmptyState>}
          {items.map((item, i) => (
            <ItemRevisionRow key={claves[i]} item={item} onChange={(patch) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))}
              onQuitar={() => { setItems((prev) => prev.filter((_, idx) => idx !== i)); setClaves((prev) => prev.filter((_, idx) => idx !== i)) }}
              onCambiar={() => setCambiando(i)} />
          ))}
          {anadiendo ? (
            <div className="space-y-3">
              <ViewTabs label="Cómo añadir ingredientes" opciones={[{ valor: 'describir', label: 'Describir' }, { valor: 'buscar', label: 'Buscar' }]} valor={metodo} onChange={setMetodo}>
                {metodo === 'describir'
                  ? <DescribirComida texto={texto} onTextoChange={setTexto} onInterpretar={interpretar} cargando={local.cargando} error={local.error} onVerMedidas={() => setVerMedidas(true)} accion="Añadir a la receta" />
                  : <AlimentosRapidos comida="comida" onElegir={(alimento) => setGramos({ alimento, gramos: 100 })} />}
              </ViewTabs>
              {items.length > 0 && <Button variant="ghost" block disabled={local.cargando} onClick={() => setAnadiendo(false)}>Cancelar añadido</Button>}
            </div>
          ) : (
            <Button variant="secondary" block onClick={() => { setTexto(''); setAnadiendo(true) }}><Icon name="plus" size={18} />Añadir ingredientes</Button>
          )}
        </section>

        {items.length > 0 && (
          <section aria-label="Resultado de la receta" className="space-y-3 border-t border-line pt-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1">
                <p className="text-label text-fg-muted">Peso cocinado</p>
                <NumberStepper label="peso cocinado en gramos" value={pesoCocinado} step={10} min={1} suffix="g" onChange={setPeso} />
              </div>
              <p className="tabular text-body-sm text-fg-muted">Crudo: {formatNumber(crudo, 1)} g</p>
            </div>
            <p className="text-caption text-fg-muted">Pesa la receta ya cocinada y escribe el total: los valores por 100 g se calculan sobre ese peso, así que el agua que se evapora o se absorbe queda contada.</p>
            <div className="space-y-1">
              <p className="tabular text-title text-fg">{formatInt(por100.kcal100)} <span className="text-body-sm font-normal text-fg-muted">kcal por 100 g</span></p>
              <p className="tabular text-body-sm text-fg-muted">{resumenMacros({ prot: por100.prot100, carb: por100.carb100, grasa: por100.grasa100 })} · por 100 g cocinados</p>
            </div>
          </section>
        )}

        {receta && (
          <section aria-label="Borrar receta" className="space-y-2 border-t border-line pt-3">
            {borrando ? (
              <div className="space-y-3">
                <SegmentedControl label="Alimento de la receta" valor={conservar} onChange={setConservar}
                  opciones={[{ valor: 'si', label: 'Conservar alimento' }, { valor: 'no', label: 'Borrar alimento' }]} />
                <p className="text-caption text-fg-muted">{conservar === 'si' ? `«${receta.nombre}» seguirá en Alimentos y en tu historial, pero ya no se podrá recalcular desde la receta.` : `También se borra «${receta.nombre}» de Alimentos. Las entradas ya registradas conservan sus valores.`}</p>
                <ConfirmacionDestructiva mensaje={`¿Borrar la receta «${receta.nombre}»? No se puede deshacer.`} confirmar="Sí, borrar" onConfirmar={borrar} onCancelar={() => setBorrando(false)} ocupado={ocupado} />
              </div>
            ) : <Button variant="destructive" block onClick={() => { setError(null); setBorrando(true) }}>Borrar receta</Button>}
          </section>
        )}
      </div>

      <Sheet open={gramos !== null} onClose={() => setGramos(null)} title="Cantidad"
        footer={gramos && <Button block onClick={() => { anadir([itemDesdeElegible(gramos.alimento, gramos.gramos)]); setGramos(null) }}>Añadir ingrediente</Button>}>
        {gramos && (
          <div className="space-y-5">
            <h3 className="break-words text-title text-fg">{gramos.alimento.nombre}</h3>
            <p className="tabular text-center text-body-sm text-fg-muted">{resumenMacros(macrosPorGramos(gramos.alimento, gramos.gramos))} · {formatInt(macrosPorGramos(gramos.alimento, gramos.gramos).kcal)} kcal</p>
            <div className="flex justify-center"><NumberStepper label="gramos" value={gramos.gramos} step={10} suffix="g" onChange={(v) => setGramos({ ...gramos, gramos: v })} /></div>
          </div>
        )}
      </Sheet>

      <CambiarAlimentoSheet item={cambiando !== null ? (items[cambiando] ?? null) : null} onClose={() => setCambiando(null)}
        onElegir={(alimento) => { if (cambiando !== null) setItems((prev) => prev.map((it, i) => i === cambiando ? itemDesdeElegible(alimento, it.gramos, { gramosEstimados: it.gramosEstimados, medida: it.medida }) : it)); setCambiando(null) }} />
      {verMedidas && <Medidas onClose={() => setVerMedidas(false)} />}
    </ModalPage>
  )
}
