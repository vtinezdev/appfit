import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Comida, Entry, Food, Meal } from '../../../shared/db/types'
import { comidaPorHora } from '../../../shared/lib/dates'
import AnimatedNumber from '../../../shared/components/AnimatedNumber'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import NumberStepper from '../../../shared/components/NumberStepper'
import SectionHeader from '../../../shared/components/SectionHeader'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import * as entriesRepo from '../data/entriesRepo'
import * as foodsRepo from '../data/foodsRepo'
import { useInterpretarComida, type EntradaComida } from '../hooks/useInterpretarComida'
import { aItemGuardado, actualizaAlimentoGuardado, por100DesdeEntrada, validarKcalRapidas, type ItemRevision, type KcalRapidasDraft } from '../lib/alimentos'
import { formatInt } from '../../../shared/lib/format'
import { normalizeName } from '../../../shared/lib/text'
import { macrosPorGramos, resumenMacros, sumMacros } from '../lib/nutrition'
import AplicarPlantillaSheet from '../components/AplicarPlantillaSheet'
import EntradaIA from '../components/EntradaIA'
import ItemRevisionRow from '../components/ItemRevisionRow'
import KcalRapidasSheet from '../components/KcalRapidasSheet'
import PlantillasLista from '../components/PlantillasLista'
import AlimentosRapidos from '../components/AlimentosRapidos'
import Button from '../../../shared/components/Button'
import { ErrorState } from '../../../shared/components/StateMessage'

interface Props {
  fecha: string
  entryEditar?: Entry
  onClose: () => void
  onGuardado: () => void
}

const COMIDAS: { valor: Comida; label: string }[] = [
  { valor: 'desayuno', label: 'Desayuno' },
  { valor: 'comida', label: 'Comida' },
  { valor: 'cena', label: 'Cena' },
  { valor: 'snack', label: 'Snack' },
]

/** En edición, el ítem parte del snapshot de la entrada (no del alimento guardado, que puede haber cambiado). */
function itemDesdeEntrada(e: Entry): ItemRevision {
  const valores = por100DesdeEntrada(e)
  return { nombre: e.nombre, gramos: e.gramos, ...valores, origen: { fuente: 'manual', valores, nombreNorm: normalizeName(e.nombre), guardado: false } }
}

export default function AnadirComida({ fecha, entryEditar, onClose, onGuardado }: Props) {
  const [comida, setComida] = useState<Comida>(entryEditar?.comida ?? comidaPorHora())
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)
  const [items, setItems] = useState<ItemRevision[] | null>(entryEditar ? [itemDesdeEntrada(entryEditar)] : null)
  const [aplicarAlAlimento, setAplicarAlAlimento] = useState(false)
  const alimentoDeLaEntrada = useLiveQuery(
    async () => (entryEditar?.foodId !== undefined ? ((await foodsRepo.obtener(entryEditar.foodId)) ?? null) : null),
    [entryEditar?.foodId],
  )
  const [gramosRapido, setGramosRapido] = useState<{ food: Food; gramos: number } | null>(null)
  const [kcalRapidas, setKcalRapidas] = useState<KcalRapidasDraft | null>(null)
  const [guardandoRapida, setGuardandoRapida] = useState(false)
  const [errorRapida, setErrorRapida] = useState<string | null>(null)
  const [plantillaElegida, setPlantillaElegida] = useState<Meal | null>(null)
  const ia = useInterpretarComida()

  async function interpretar(entrada: EntradaComida) {
    const resultado = await ia.interpretar(entrada)
    if (!resultado) return
    if (resultado.transcripcion) setTexto(resultado.transcripcion)
    setItems(resultado.items)
  }

  function actualizarItem(i: number, patch: Partial<ItemRevision>) {
    setItems((prev) => prev?.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) ?? null)
  }

  function quitarItem(i: number) {
    setItems((prev) => prev?.filter((_, idx) => idx !== i) ?? null)
  }

  async function guardar() {
    if (!items || items.length === 0) return
    setGuardando(true)
    setErrorGuardar(null)
    try {
      if (entryEditar?.id) {
        const { nombre, gramos, kcal100, prot100, carb100, grasa100 } = items[0]
        await entriesRepo.editar(entryEditar.id, { comida, nombre: nombre.trim(), gramos, kcal100, prot100, carb100, grasa100, aplicarAlAlimento })
      } else {
        await entriesRepo.guardarComida({ fecha, comida, items: items.map(aItemGuardado), textoOriginal: texto || undefined })
      }
      onGuardado()
    } catch (e) {
      setErrorGuardar(e instanceof foodsRepo.NombreDuplicadoError ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarRapido() {
    if (!gramosRapido) return
    const id = await entriesRepo.anadirDesdeAlimento({ fecha, comida, foodId: gramosRapido.food.id, gramos: gramosRapido.gramos })
    if (id === undefined) return
    setGramosRapido(null)
    onGuardado()
  }

  async function guardarKcalRapidas() {
    if (!kcalRapidas || guardandoRapida) return
    const validado = validarKcalRapidas(kcalRapidas)
    if (!validado) return
    setGuardandoRapida(true)
    setErrorRapida(null)
    try {
      await entriesRepo.anadirRapida({ fecha, comida, ...validado })
      setKcalRapidas(null)
      onGuardado()
    } catch {
      setErrorRapida('No se ha podido guardar. Inténtalo de nuevo.')
    } finally {
      setGuardandoRapida(false)
    }
  }

  const totales = items ? sumMacros(items.map((it) => macrosPorGramos(it, it.gramos))) : null
  const aporteRapido = gramosRapido ? macrosPorGramos(gramosRapido.food, gramosRapido.gramos) : null
  const kcalTotales = totales ? Math.round(totales.kcal) : 0
  const kcalRapido = aporteRapido ? Math.round(aporteRapido.kcal) : 0
  const columna = 'mx-auto w-full max-w-lg px-page'

  return (
    <div className="fixed inset-0 z-50 flex animate-rise-in flex-col bg-bg">
      <header className="safe-top border-b border-line">
        <div className={`${columna} flex items-center justify-between py-3`}>
          <Button variant="ghost" onClick={onClose} className="-ml-4">
            Cancelar
          </Button>
          <h1 className="text-title text-fg">{entryEditar ? 'Editar' : 'Añadir comida'}</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className={`${columna} space-y-section py-4`}>
          <SegmentedControl opciones={COMIDAS} valor={comida} onChange={setComida} />

          {items === null && (
            <>
              <PlantillasLista onElegir={setPlantillaElegida} />

              <div className="space-y-3">
                <EntradaIA
                  texto={texto}
                  onTextoChange={setTexto}
                  onInterpretar={interpretar}
                  onError={ia.setError}
                  cargando={ia.cargando}
                  error={ia.error}
                />
                <Button
                  variant="secondary"
                  block
                  onClick={() => {
                    setKcalRapidas({ nombre: '', kcal: 0, prot: 0, carb: 0, grasa: 0 })
                    setErrorRapida(null)
                  }}
                >
                  Kcal rápidas
                </Button>
              </div>

              <AlimentosRapidos comida={comida} onElegir={(food) => setGramosRapido({ food, gramos: 100 })} />
            </>
          )}

          {items !== null && totales && (
            <div className="animate-fade-in space-y-section">
              <section aria-label={items.length === 1 ? 'Alimento' : 'Alimentos'} className="space-y-1">
                <SectionHeader
                  action={
                    items.length > 1 ? (
                      <span className="tabular text-caption text-fg-subtle" title="Proteína, carbohidratos y grasa en gramos">
                        {resumenMacros(totales)}
                      </span>
                    ) : undefined
                  }
                >
                  {items.length === 1 ? 'Alimento' : `Alimentos · ${items.length}`}
                </SectionHeader>
                <Card padded={false} className="divide-y divide-line">
                  {items.map((item, i) => (
                    <ItemRevisionRow
                      key={i}
                      item={item}
                      onChange={(patch) => actualizarItem(i, patch)}
                      onQuitar={entryEditar ? undefined : () => quitarItem(i)}
                      aviso={actualizaAlimentoGuardado(item) ? 'Actualizará el alimento guardado en «Alimentos».' : undefined}
                    />
                  ))}
                </Card>
              </section>
              {entryEditar && alimentoDeLaEntrada && (
                <label className="flex min-h-touch items-center gap-3 px-1 text-body-sm text-fg-muted">
                  <input type="checkbox" checked={aplicarAlAlimento} onChange={(e) => setAplicarAlAlimento(e.target.checked)} className="h-5 w-5 shrink-0 accent-accent" />
                  <span className="min-w-0">Aplicar también a «{alimentoDeLaEntrada.nombre}» en Alimentos</span>
                </label>
              )}
              {!entryEditar && (
                <Button variant="ghost" size="sm" className="-ml-3" onClick={() => setItems(null)}>
                  <Icon name="arrow-left" size={16} />
                  Volver a interpretar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {items !== null && items.length > 0 && totales && (
        <div className="safe-bottom border-t border-line bg-bg">
          <div className={`${columna} space-y-2 py-3`}>
            {errorGuardar && <ErrorState>{errorGuardar}</ErrorState>}
            <Button size="lg" shape="pill" block onClick={guardar} disabled={guardando || items.some((it) => !it.nombre.trim())}>
              {guardando ? (
                'Guardando…'
              ) : (
                <span>
                  Guardar · <AnimatedNumber value={kcalTotales} /> kcal
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      <Sheet open={gramosRapido !== null} onClose={() => setGramosRapido(null)} title={gramosRapido?.food.nombre}>
        {gramosRapido && aporteRapido && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="flex items-baseline justify-center gap-1.5 text-fg">
                <AnimatedNumber value={kcalRapido} className="text-display" />
                <span className="text-body text-fg-muted">kcal</span>
              </p>
              <p className="tabular mt-1 text-body-sm text-fg-subtle">
                {resumenMacros(aporteRapido)} · {formatInt(gramosRapido.food.kcal100)} kcal por 100 g
              </p>
            </div>
            <div className="flex justify-center">
              <NumberStepper label="gramos" value={gramosRapido.gramos} onChange={(v) => setGramosRapido({ ...gramosRapido, gramos: v })} step={10} suffix="g" />
            </div>
            <Button block onClick={confirmarRapido}>
              Añadir
            </Button>
          </div>
        )}
      </Sheet>

      <KcalRapidasSheet
        open={kcalRapidas !== null}
        valor={kcalRapidas ?? { nombre: '', kcal: 0, prot: 0, carb: 0, grasa: 0 }}
        onChange={(patch) => setKcalRapidas((r) => (r ? { ...r, ...patch } : r))}
        onGuardar={guardarKcalRapidas}
        onClose={() => {
          setKcalRapidas(null)
          setErrorRapida(null)
        }}
        guardando={guardandoRapida}
        error={errorRapida}
      />

      {plantillaElegida && (
        <AplicarPlantillaSheet
          meal={plantillaElegida}
          fecha={fecha}
          comida={comida}
          onClose={() => setPlantillaElegida(null)}
          onAplicado={(ids) => {
            if (ids.length === 0) return
            onGuardado()
          }}
        />
      )}
    </div>
  )
}
