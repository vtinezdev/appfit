import PreparacionAlimento from '../components/PreparacionAlimento'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Comida, Entry } from '../../../shared/db/types'
import { comidaPorHora, formatFriendly, todayISO } from '../../../shared/lib/dates'
import { objetivosDe } from '../../perfil/data/objetivosDiaRepo'
import ModalPage from '../../../shared/components/ModalPage'
import ViewTabs from '../../../shared/components/ViewTabs'
import Icon from '../../../shared/components/Icon'
import NumberStepper from '../../../shared/components/NumberStepper'
import SectionHeader from '../../../shared/components/SectionHeader'
import Disclosure from '../../../shared/components/Disclosure'
import Sheet from '../../../shared/components/Sheet'
import * as entriesRepo from '../data/entriesRepo'
import * as planificadasRepo from '../data/planificadasRepo'
import * as mealsRepo from '../data/mealsRepo'
import * as foodsRepo from '../data/foodsRepo'
import * as nombresAlimentosRepo from '../data/nombresAlimentosRepo'
import { useInterpretarLocal } from '../hooks/useInterpretarLocal'
import {
  aItemGuardado,
  actualizaAlimentoGuardado,
  creaAlimentoNuevo,
  elegibleDeCatalogo,
  faltaCategoria,
  faltanValores,
  itemDeProductoIncompleto,
  itemDesdeElegible,
  itemSinCoincidencia,
  medidaPendiente,
  por100DesdeEntrada,
  validarKcalRapidas,
  type AlimentoElegible,
  type ItemRevision,
  type KcalRapidasDraft,
} from '../lib/alimentos'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import type { Plato } from '../lib/platos'
import { normalizeName } from '../../../shared/lib/text'
import { COMIDAS, nombreComida } from '../lib/comidas'
import { macrosPorGramos, resumenMacros, sumMacros } from '../lib/nutrition'
import AplicarPlantillaSheet from '../components/AplicarPlantillaSheet'
import ComidasTipicas from '../components/ComidasTipicas'
import ComidasTipicasSheet from '../components/ComidasTipicasSheet'
import type { ComidaTipica } from '../lib/comidasTipicas'
import DescribirComida from '../components/DescribirComida'
import ItemRevisionRow from '../components/ItemRevisionRow'
import KcalRapidasSheet from '../components/KcalRapidasSheet'
import AlimentosRapidos from '../components/AlimentosRapidos'
import EncajanConLoQueFalta from '../components/EncajanConLoQueFalta'
import CambiarAlimentoSheet from '../components/CambiarAlimentoSheet'
import EscanerCodigo from '../components/EscanerCodigo'
import Medidas from './Medidas'
import Button from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import { EmptyState, ErrorState } from '../../../shared/components/StateMessage'
import { revisionModificada } from '../lib/borradorComida'
import { faltaDelDia } from '../lib/cerrarDia'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import SelectorComida from '../components/SelectorComida'

interface Props {
  fecha: string
  entryEditar?: Entry
  platoDestino?: Plato
  /** Comida preseleccionada al abrir desde «Añadir a …» (al editar manda la de la entrada). */
  comidaInicial?: Comida
  /** Reutiliza la revisión para guardar una comida típica sin registrarla en el diario. */
  soloTipica?: boolean
  /** Guarda en el Plan (`planificadas`) en vez de en el diario: hoy o un día futuro, no cuenta hasta «Lo he comido». */
  planificar?: boolean
  onClose: () => void
  onGuardado: () => void
}


/** En edición, el ítem parte del snapshot de la entrada (no del alimento guardado, que puede haber cambiado). */
function itemDesdeEntrada(e: Entry): ItemRevision {
  const valores = por100DesdeEntrada(e)
  return { nombre: e.nombre, gramos: e.gramos, ...valores, origen: { fuente: 'manual', valores, nombreNorm: normalizeName(e.nombre), guardado: false } }
}

export default function AnadirComida({ fecha, entryEditar, platoDestino, comidaInicial, soloTipica = false, planificar = false, onClose, onGuardado }: Props) {
  const [comida, setComida] = useState<Comida>(entryEditar?.comida ?? platoDestino?.entries[0].comida ?? comidaInicial ?? comidaPorHora())
  const [metodo, setMetodo] = useState<'describir' | 'buscar'>('describir')
  const [guardandoRapido, setGuardandoRapido] = useState(false)
  const [errorRapido, setErrorRapido] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [textoOriginal, setTextoOriginal] = useState('')
  const [nombrePlato, setNombrePlato] = useState('')
  const [nombreTipica, setNombreTipica] = useState('')
  const [creandoTipica, setCreandoTipica] = useState(false)
  const [verTipicas, setVerTipicas] = useState(false)
  const tipicasId = useId()
  const [tipicaCreada, setTipicaCreada] = useState(false)
  const [guardarComoTipica, setGuardarComoTipica] = useState(false)
  const [tipicaElegida, setTipicaElegida] = useState<ComidaTipica | null>(null)
  const [anadiendo, setAnadiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)
  const [items, setItems] = useState<ItemRevision[] | null>(entryEditar ? [itemDesdeEntrada(entryEditar)] : null)
  // Identidad solo de UI: quitar un ingrediente no traslada su formulario a la fila siguiente.
  const [clavesItems, setClavesItems] = useState<string[]>(entryEditar ? [`entrada-${entryEditar.id}`] : [])
  const [aplicarAlAlimento, setAplicarAlAlimento] = useState(false)
  const alimentoDeLaEntrada = useLiveQuery(
    async () => (entryEditar?.foodId !== undefined ? ((await foodsRepo.obtener(entryEditar.foodId)) ?? null) : null),
    [entryEditar?.foodId],
  )
  const [gramosRapido, setGramosRapido] = useState<{ alimento: AlimentoElegible; gramos: number } | null>(null)
  const [kcalRapidas, setKcalRapidas] = useState<KcalRapidasDraft | null>(null)
  const [guardandoRapida, setGuardandoRapida] = useState(false)
  const [errorRapida, setErrorRapida] = useState<string | null>(null)
  const [nombreCortoEditando, setNombreCortoEditando] = useState(false)
  const [cambiando, setCambiando] = useState<number | null>(null)
  const [escaneando, setEscaneando] = useState(false)
  const [verMedidas, setVerMedidas] = useState(false)
  const local = useInterpretarLocal()
  // «Cerrar el día» (B10): lo que falta de cada macro frente al objetivo del día, para el botón de Escribir. Al
  // planificar, frente a lo ya planificado ese día.
  const falta = useLiveQuery(async () => {
    const [delDia, objetivo] = await Promise.all([planificar ? planificadasRepo.delDia(fecha) : entriesRepo.delDia(fecha), objetivosDe(fecha, todayISO())])
    return faltaDelDia(sumMacros(delDia), objetivo)
  }, [fecha, planificar])
  const [descartar, setDescartar] = useState(false)
  const confirmacionRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const focoAnterior = useRef<HTMLElement | null>(null)
  const confirmacionAnterior = useRef(false)
  const itemInicial = useRef(entryEditar ? itemDesdeEntrada(entryEditar) : undefined)
  const ocupado = guardando || guardandoRapido || guardandoRapida || local.cargando
  const tieneCambios = entryEditar && itemInicial.current
    ? comida !== entryEditar.comida || aplicarAlAlimento || revisionModificada(items?.[0], itemInicial.current)
    : !!(texto.trim() || textoOriginal || items?.length || nombrePlato.trim() || nombreTipica.trim())

  useLayoutEffect(() => {
    if (descartar) confirmacionRef.current?.querySelector('button')?.focus()
    else if (confirmacionAnterior.current) {
      const foco = focoAnterior.current
      if (foco?.isConnected && editorRef.current?.contains(foco)) foco.focus({ preventScroll: true })
      else editorRef.current?.querySelector<HTMLElement>('textarea,input,select,button')?.focus({ preventScroll: true })
    }
    confirmacionAnterior.current = descartar
  }, [descartar])

  const claveRevision = items
    ? JSON.stringify(items.map((item) => [item.nombre, item.origen.nombreNorm, item.origen.catalogId, item.origen.guardado]))
    : ''
  const nombresGuardadosRevision = useLiveQuery(
    () => (items ? nombresAlimentosRepo.paraRevision(items, entryEditar) : Promise.resolve(new Map<number, string>())),
    [claveRevision, entryEditar?.id],
  )

  useEffect(() => {
    if (!nombresGuardadosRevision) return
    setItems((prev) => prev?.map((item, i) => {
      if (item.nombreCortoModificado) return item
      const nombreCorto = nombresGuardadosRevision.get(i)
      return item.nombreCorto === nombreCorto ? item : { ...item, nombreCorto }
    }) ?? null)
  }, [claveRevision, nombresGuardadosRevision])

  async function interpretar() {
    if (local.cargando) return
    const descripcion = texto.trim()
    const resultado = await local.interpretar(descripcion)
    if (resultado) {
      abrirRevision(resultado, anadiendo)
      setTextoOriginal((prev) => anadiendo ? [prev, descripcion].filter(Boolean).join('\n') : descripcion)
      setTexto('')
      setAnadiendo(false)
      setErrorGuardar(null)
    }
  }

  function abrirRevision(nuevos: ItemRevision[], agregar = false) {
    const claves = nuevos.map(() => crypto.randomUUID())
    setItems((prev) => agregar && prev ? [...prev, ...nuevos] : nuevos)
    setClavesItems((prev) => agregar ? [...prev, ...claves] : claves)
    if (!agregar) setNombreCortoEditando(false)
  }

  /** «Cambiar»: sustituye el alimento del ítem conservando los gramos (o la medida por elegir) y las demás opciones. */
  function cambiarAlimento(alimento: AlimentoElegible) {
    if (cambiando === null || !items) return
    const actual = items[cambiando]
    const alternativas = actual.origen.alternativas?.filter((a) => a !== alimento)
    setItems(items.map((it, i) => (i === cambiando ? itemDesdeElegible(alimento, it.gramos, { gramosEstimados: it.gramosEstimados, medida: it.medida, alternativas }) : it)))
    setCambiando(null)
  }

  function actualizarItem(i: number, patch: Partial<ItemRevision>) {
    setItems((prev) => prev?.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) ?? null)
  }

  function quitarItem(i: number) {
    setItems((prev) => prev?.filter((_, idx) => idx !== i) ?? null)
    setClavesItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function guardar() {
    if (!items || items.length === 0 || guardando) return
    setGuardando(true)
    setErrorGuardar(null)
    try {
      if (soloTipica) {
        await mealsRepo.crearDesdeRevision({ nombre: nombreTipica, items: items.map(aItemGuardado) })
      } else if (entryEditar?.id) {
        const { nombre, gramos, kcal100, prot100, carb100, grasa100, nutrientes } = items[0]
        await entriesRepo.editar(entryEditar.id, {
          comida,
          nombre: nombre.trim(),
          gramos,
          kcal100,
          prot100,
          carb100,
          grasa100,
          nutrientes,
          aplicarAlAlimento,
          ...(items[0].nombreCortoModificado ? { nombreCorto: items[0].nombreCorto?.trim() || null } : {}),
        })
      } else if (planificar) {
        await planificadasRepo.planificarRevision({ fecha, comida, items: items.map(aItemGuardado), nombrePlato }, todayISO())
      } else {
        await entriesRepo.guardarComida({ fecha, comida, items: items.map(aItemGuardado), textoOriginal: textoOriginal || undefined, nombrePlato, platoDestinoId: platoDestino?.entries[0].platoId, guardarComoTipica })
      }
      onGuardado()
    } catch (e) {
      setErrorGuardar(e instanceof foodsRepo.NombreDuplicadoError || e instanceof foodsRepo.CategoriaRequeridaError || e instanceof entriesRepo.PlatoNoDisponibleError || e instanceof planificadasRepo.FechaNoPlanificable ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  function elegirRapido(alimento: AlimentoElegible, gramos: number) {
    setErrorRapido(null)
    setGramosRapido({ alimento, gramos })
  }

  async function confirmarRapido() {
    if (!gramosRapido || guardandoRapido) return
    setGuardandoRapido(true)
    setErrorRapido(null)
    try {
      const { alimento, gramos } = gramosRapido
      if (platoDestino || soloTipica || anadiendo) {
        abrirRevision([itemDesdeElegible(alimento, gramos)], anadiendo)
        setAnadiendo(false)
        setGramosRapido(null)
        return
      }
      const id = planificar
        ? await planificadasRepo.planificarAlimento({ fecha, comida, ref: alimento.ref, gramos }, todayISO())
        : alimento.ref.tipo === 'user'
        ? await entriesRepo.anadirDesdeAlimento({ fecha, comida, foodId: alimento.ref.id, gramos })
        : await entriesRepo.anadirDesdeCatalogo({ fecha, comida, catalogId: alimento.ref.id, gramos })
      if (id === undefined) { setErrorRapido('Este alimento ya no está disponible. Elige otro.'); return }
      setGramosRapido(null)
      onGuardado()
    } catch (e) {
      setErrorRapido(e instanceof planificadasRepo.FechaNoPlanificable ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.')
    } finally {
      setGuardandoRapido(false)
    }
  }

  async function guardarKcalRapidas() {
    if (!kcalRapidas || guardandoRapida) return
    const validado = validarKcalRapidas(kcalRapidas)
    if (!validado) return
    setGuardandoRapida(true)
    setErrorRapida(null)
    try {
      if (planificar) await planificadasRepo.planificarRapida({ fecha, comida, ...validado }, todayISO())
      else await entriesRepo.anadirRapida({ fecha, comida, ...validado })
      setKcalRapidas(null)
      onGuardado()
    } catch (e) {
      setErrorRapida(e instanceof planificadasRepo.FechaNoPlanificable ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.')
    } finally {
      setGuardandoRapida(false)
    }
  }

  const totales = items ? sumMacros(items.map((it) => macrosPorGramos(it, it.gramos))) : null
  const aporteRapido = gramosRapido ? macrosPorGramos(gramosRapido.alimento, gramosRapido.gramos) : null
  const kcalTotales = totales ? Math.round(totales.kcal) : 0
  const kcalRapido = aporteRapido ? Math.round(aporteRapido.kcal) : 0

  return (
    <ModalPage title={descartar ? '¿Descartar los cambios?' : soloTipica ? 'Nueva comida típica' : entryEditar ? 'Editar alimento' : platoDestino ? 'Añadir ingredientes' : planificar ? 'Planificar comida' : 'Añadir comida'} closeLabel="Cancelar" onClose={onClose} busy={ocupado}
      onBeforeClose={() => {
        if (!tieneCambios) return true
        if (!descartar) focoAnterior.current = document.activeElement as HTMLElement | null
        setDescartar(true)
        return false
      }}
      footer={!descartar && items !== null && items.length > 0 && totales && (
        <div className="space-y-2">
          {!soloTipica && <p className="flex flex-wrap justify-between gap-x-3 text-caption text-fg-muted"><span>{formatInt(items.length)} {items.length === 1 ? 'alimento' : 'alimentos'}</span><span>{nombreComida(comida)} · {formatFriendly(fecha)}</span></p>}
          {errorGuardar && <ErrorState>{errorGuardar}</ErrorState>}
          <Button size="lg" block loading={guardando} onClick={guardar} disabled={(soloTipica && !nombreTipica.trim()) || anadiendo || nombreCortoEditando || items.some((it) => !it.nombre.trim() || faltanValores(it) || medidaPendiente(it) || (!entryEditar && faltaCategoria(it)))}>
            {guardando ? 'Guardando…' : `${soloTipica ? 'Guardar comida típica' : platoDestino ? 'Añadir al plato' : entryEditar ? 'Guardar cambios' : `${planificar ? 'Planificar en' : 'Añadir a'} ${nombreComida(comida).toLowerCase()}`} · ${formatInt(kcalTotales)} kcal`}
          </Button>
        </div>
      )}>
      {descartar && <div ref={confirmacionRef} className="space-y-stack">
        <p className="text-body-sm text-fg-muted">Todavía no has guardado. Si sales, perderás los cambios de esta comida.</p>
        <Button variant="secondary" block onClick={() => setDescartar(false)}>Seguir editando</Button>
        <Button variant="danger" block onClick={onClose}>Descartar</Button>
      </div>}
      <div ref={editorRef} hidden={descartar} className="space-y-5">
        {soloTipica && <div className="space-y-stack">
          <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre de la comida típica</span><Input tone="surface" value={nombreTipica} onChange={e => setNombreTipica(e.target.value)} placeholder="Por ejemplo, mi desayuno habitual" /></label>
        </div>}
        {platoDestino ? (
          <section aria-label="Plato actual" className="space-y-2">
            <h2 className="break-words text-title text-fg">{platoDestino.nombre}</h2>
            <p className="text-body-sm text-fg-muted">{COMIDAS.find((c) => c.valor === comida)?.label} · Añade alimentos a este plato. Los ingredientes guardados se mantienen.</p>
            <details className="border-b border-line pb-2">
              <summary className="flex min-h-touch cursor-pointer items-center text-body-sm text-fg-muted">Ver ingredientes actuales ({formatInt(platoDestino.entries.length)})</summary>
              <ul className="space-y-2 pb-2">
                {platoDestino.entries.map((e) => (
                  <li key={e.id} className="break-words text-body-sm text-fg">
                    {e.nombre} · {e.rapida ? 'rápida' : `${formatNumber(e.gramos, 1)} g`} · {formatInt(e.kcal)} kcal
                  </li>
                ))}
              </ul>
            </details>
          </section>
        ) : !soloTipica && <div className="space-y-2">
          <SelectorComida valor={comida} onChange={setComida} />
          {fecha !== todayISO() && <p className="text-caption text-fg-muted">{formatFriendly(fecha)}</p>}
          {planificar && <p className="text-caption text-fg-muted">Se guarda en el Plan: no cuenta hasta que, ese día, pulses «Lo he comido».</p>}
        </div>}

          {items === null && (
            <ViewTabs label="Cómo añadir comida" opciones={[
              { valor: 'describir', label: 'Escribir', icon: 'pencil' },
              { valor: 'buscar', label: 'Buscar', icon: 'search' },
            ]} valor={metodo} onChange={setMetodo} accion={<Button variant="subtle" size="sm" disabled={local.cargando} onClick={() => setEscaneando(true)} aria-label="Escanear producto"><Icon name="barcode" size={18} />Escanear</Button>}>
              <div className="space-y-section">
                {metodo === 'describir' && <>
                  <DescribirComida texto={texto} onTextoChange={setTexto} onInterpretar={interpretar} cargando={local.cargando} error={local.error} onVerMedidas={() => setVerMedidas(true)} titulo={soloTipica ? '¿Qué sueles comer?' : planificar ? '¿Qué vas a comer?' : undefined} />
                  {!platoDestino && !soloTipica && <>
                    {tipicaCreada && <p role="status" className="text-body-sm text-fg-muted">Comida típica guardada. Ya la tienes a mano.</p>}
                    <ComidasTipicas tarjetas fecha={fecha} onElegir={setTipicaElegida} onCrear={() => { setTipicaCreada(false); setCreandoTipica(true) }} onVerTodas={() => setVerTipicas(true)} />
                    <EncajanConLoQueFalta comida={comida} fecha={fecha} falta={falta ?? null} onElegirAlimento={elegirRapido} onElegirTipica={setTipicaElegida}
                      onElegirCombinacion={(propuestos) => { setErrorGuardar(null); abrirRevision(propuestos.map((p) => itemDesdeElegible(p.alimento, p.gramos))) }} />
                    <ListGroup aria-label="Más formas de añadir">
                      <li><ListRow onClick={() => { setTipicaCreada(false); setCreandoTipica(true) }}><span aria-hidden className="icono-pastilla shrink-0 text-fg-muted"><Icon name="plus" size={20} /></span><span className="min-w-0 flex-1 text-body text-fg">Nueva comida típica</span><Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" /></ListRow></li>
                      <li><ListRow onClick={() => { setKcalRapidas({ nombre: '', kcal: 0, prot: 0, carb: 0, grasa: 0 }); setErrorRapida(null) }}><span aria-hidden className="icono-pastilla shrink-0 text-fg-muted"><Icon name="zap" size={20} /></span><span className="min-w-0 flex-1 text-body text-fg">Solo registrar calorías</span><Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" /></ListRow></li>
                    </ListGroup>
                  </>}
                </>}
                {metodo === 'buscar' && <AlimentosRapidos comida={comida} onElegir={(alimento) => elegirRapido(alimento, 100)} />}
                {!platoDestino && !soloTipica && metodo !== 'describir' && <div className="border-t border-line pt-3">
                  <Button variant="ghost" size="sm" className="-ml-3" onClick={() => { setKcalRapidas({ nombre: '', kcal: 0, prot: 0, carb: 0, grasa: 0 }); setErrorRapida(null) }}>Solo registrar calorías</Button>
                </div>}
              </div>
            </ViewTabs>
          )}

          {items !== null && totales && (
            <div className="animate-fade-in space-y-section">
              <section aria-label={items.length === 1 ? 'Alimento' : 'Alimentos'} className="space-y-1">
                <SectionHeader variant="section">{items.length === 1 ? 'Alimento' : `Alimentos · ${formatInt(items.length)}`}</SectionHeader>
                <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                  {items.length === 0 && <EmptyState title="La revisión está vacía">Añade otro alimento o vuelve a interpretar tu descripción.</EmptyState>}
                  {items.map((item, i) => (
                    <ItemRevisionRow
                      key={clavesItems[i]}
                      item={item}
                      editarInicial={!!entryEditar}
                      onChange={(patch) => actualizarItem(i, patch)}
                      nombreCorto={item.nombreCortoModificado ? item.nombreCorto : nombresGuardadosRevision?.get(i) ?? item.nombreCorto}
                      onCambioNombreCorto={setNombreCortoEditando}
                      nombreCortoBloqueado={nombreCortoEditando}
                      onQuitar={entryEditar ? undefined : () => quitarItem(i)}
                      onCambiar={entryEditar ? undefined : () => setCambiando(i)}
                      aviso={actualizaAlimentoGuardado(item) ? 'Actualizará el alimento guardado en «Alimentos».' : undefined}
                      pedirCategoria={!entryEditar && creaAlimentoNuevo(item)}
                    />
                  ))}
                </div>
              </section>
              <div className="space-y-1">
                <p className="flex flex-wrap items-baseline justify-between gap-3"><span className="text-body-sm text-fg-muted">Total de la comida</span><span className="tabular text-title font-semibold text-fg">{formatInt(kcalTotales)} <span className="text-caption font-normal text-fg-muted">kcal</span></span></p>
                <p className="tabular text-caption text-fg-muted">{resumenMacros(totales)}</p>
              </div>
              {entryEditar && alimentoDeLaEntrada && (
                <label className="flex min-h-touch items-center gap-3 px-1 text-body-sm text-fg-muted">
                  <input type="checkbox" checked={aplicarAlAlimento} onChange={(e) => setAplicarAlAlimento(e.target.checked)} className="h-5 w-5 shrink-0 accent-accent" />
                  <span className="min-w-0">Aplicar también a «{alimentoDeLaEntrada.nombre}» en Alimentos</span>
                </label>
              )}
              {!entryEditar && !platoDestino && !soloTipica && !planificar && <label className="flex min-h-touch items-center gap-3 px-1 text-body-sm text-fg">
                <input type="checkbox" checked={guardarComoTipica} onChange={e => setGuardarComoTipica(e.target.checked)} className="h-5 w-5 shrink-0 accent-accent" />
                <span className="min-w-0">Guardar como comida típica</span>
              </label>}
              {!entryEditar && !platoDestino && !soloTipica && items.length > 1 && (
                <Disclosure title={nombrePlato.trim() ? `Plato: ${nombrePlato.trim()}` : 'Poner nombre al plato'}>
                  <label htmlFor="nombre-plato" className="block text-caption text-fg-muted">Nombre del plato (opcional)</label>
                  <Input id="nombre-plato" tone="surface" value={nombrePlato} onChange={(e) => setNombrePlato(e.target.value)} placeholder="Por ejemplo, huevos con longaniza" aria-describedby="ayuda-plato" />
                  <p id="ayuda-plato" className="mt-2 text-caption text-fg-muted">Agrupa estos alimentos en el diario.</p>
                </Disclosure>
              )}
              {!entryEditar && (
                <div className="space-y-3">
                  {anadiendo ? (
                    <>
                      <DescribirComida
                        texto={texto}
                        onTextoChange={setTexto}
                        onInterpretar={interpretar}
                        cargando={local.cargando}
                        error={local.error}
                        onVerMedidas={() => setVerMedidas(true)}
                        onEscanear={() => setEscaneando(true)}
                        accion="Añadir a la revisión"
                      />
                      <Button variant="ghost" block disabled={local.cargando} onClick={() => setAnadiendo(false)}>
                        Cancelar añadido
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      block
                      onClick={() => {
                        setTexto('')
                        setAnadiendo(true)
                      }}
                    >
                      <Icon name="plus" size={18} />
                      Añadir otro alimento
                    </Button>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3"
                      disabled={anadiendo}
                      onClick={() => {
                        setTexto(textoOriginal)
                        setItems(null)
                        setClavesItems([])
                        setNombreCortoEditando(false)
                      }}
                    >
                      <Icon name="arrow-left" size={16} />
                      Editar descripción
                    </Button>
                    <Button variant="ghost" size="sm" className="-mr-3" onClick={() => setVerMedidas(true)}>
                      <Icon name="info" size={16} />
                      Medidas
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      <Sheet open={gramosRapido !== null} onClose={() => setGramosRapido(null)} title="Cantidad"
        footer={gramosRapido && <div className="space-y-2">
          {errorRapido && <ErrorState>{errorRapido}</ErrorState>}
          <Button block loading={guardandoRapido} onClick={confirmarRapido}>{platoDestino || soloTipica || anadiendo ? 'Revisar alimento' : planificar ? 'Planificar' : 'Añadir'}</Button>
        </div>}>
        {gramosRapido && aporteRapido && (
          <div className="space-y-5">
            <h3 className="break-words text-title text-fg">{gramosRapido.alimento.nombre}</h3>
            <PreparacionAlimento nombre={gramosRapido.alimento.nombre} explicar />
            <div className="text-center">
              <p className="flex items-baseline justify-center gap-1.5 text-fg">
                <span className="tabular text-display">{formatInt(kcalRapido)}</span>
                <span className="text-body text-fg-muted">kcal</span>
              </p>
              <p className="tabular mt-1 text-body-sm text-fg-subtle">
                {resumenMacros(aporteRapido)} · {formatInt(gramosRapido.alimento.kcal100)} kcal por 100 {gramosRapido.alimento.ml ? 'ml' : 'g'}
              </p>
            </div>
            <div className="flex justify-center">
              <NumberStepper label={gramosRapido.alimento.ml ? 'mililitros' : 'gramos'} value={gramosRapido.gramos} onChange={(v) => setGramosRapido({ ...gramosRapido, gramos: v })} step={10} suffix={gramosRapido.alimento.ml ? 'ml' : 'g'} />
            </div>
          </div>
        )}
      </Sheet>

      <EscanerCodigo
        open={escaneando}
        onClose={() => setEscaneando(false)}
        onEncontrado={(food) => {
          setEscaneando(false)
          setGramosRapido({ alimento: elegibleDeCatalogo(food), gramos: 100 })
        }}
        onIncompleto={({ nombre, valores, categoria }) => {
          setEscaneando(false)
          abrirRevision([itemDeProductoIncompleto(nombre, valores, categoria)], anadiendo)
          setAnadiendo(false)
        }}
        onManual={() => {
          setEscaneando(false)
          abrirRevision([itemSinCoincidencia('', 100)], anadiendo)
          setAnadiendo(false)
        }}
        onKcalRapidas={platoDestino || soloTipica || anadiendo ? undefined : () => {
          setEscaneando(false)
          setKcalRapidas({ nombre: '', kcal: 0, prot: 0, carb: 0, grasa: 0 })
          setErrorRapida(null)
        }}
      />

      {verMedidas && <Medidas onClose={() => setVerMedidas(false)} />}

      {verTipicas && <ComidasTipicasSheet id={tipicasId} comida={comida} fecha={fecha} onClose={() => setVerTipicas(false)} onElegir={setTipicaElegida} onCrear={() => { setTipicaCreada(false); setCreandoTipica(true) }} />}

      {creandoTipica && <AnadirComida soloTipica fecha={fecha} comidaInicial={comida} onClose={() => setCreandoTipica(false)} onGuardado={() => { setCreandoTipica(false); setTipicaCreada(true) }} />}

      {tipicaElegida && <AplicarPlantillaSheet meal={tipicaElegida} fecha={fecha} comida={comida} planificar={planificar} onClose={() => setTipicaElegida(null)} onAplicado={() => onGuardado()} />}

      <CambiarAlimentoSheet item={cambiando !== null ? (items?.[cambiando] ?? null) : null} onElegir={cambiarAlimento} onClose={() => setCambiando(null)} />

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

    </ModalPage>
  )
}
