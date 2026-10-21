import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, useSensor, useSensors } from '@dnd-kit/core'
import { useLiveQuery } from 'dexie-react-hooks'
import * as cheatDaysRepo from '../data/cheatDaysRepo'
import * as entriesRepo from '../data/entriesRepo'
import * as foodsRepo from '../data/foodsRepo'
import * as nombresAlimentosRepo from '../data/nombresAlimentosRepo'
import type { Comida, Entry } from '../../../shared/db/types'
import { formatFriendly, startOfWeek, todayISO, weekDates } from '../../../shared/lib/dates'
import { congelarObjetivoDia, objetivosDe, objetivosPorFecha } from '../../perfil/data/objetivosDiaRepo'
import SemanaKcal from '../components/SemanaKcal'
import { semanaKcal } from '../lib/semanaKcal'
import AccionesComidaSheet from '../components/AccionesComidaSheet'
import ComidaSection from '../components/ComidaSection'
import AccionesDiaSheet, { type PasoAccionesDia } from '../components/AccionesDiaSheet'
import { avisoAlMarcar } from '../lib/cheatDays'
import ResumenNutricional from '../components/ResumenNutricional'
import { useAviso } from '../../../shared/hooks/useAviso'
import { sumMacros } from '../lib/nutrition'
import type { Plato } from '../lib/platos'
import Button, { IconButton } from '../../../shared/components/Button'
import { LoadingState } from '../../../shared/components/StateMessage'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import NutrientesDetalle from '../components/NutrientesDetalle'
import MoverPlatoSheet from '../components/MoverPlatoSheet'
import ComidasTipicasSheet from '../components/ComidasTipicasSheet'
import AplicarPlantillaSheet from '../components/AplicarPlantillaSheet'
import type { ComidaTipica } from '../lib/comidasTipicas'
import { COMIDAS, esComida, nombreComida } from '../lib/comidas'
import { colisionesComidas, crearCoordenadasComidas, limitarCopiaAlViewport } from '../lib/arrastrePlatos'
import { PlatoPointerSensor } from '../lib/PlatoPointerSensor'
import { haptic } from '../../../shared/design/motion'
import Icon from '../../../shared/components/Icon'
import Card from '../../../shared/components/Card'
import { formatInt } from '../../../shared/lib/format'
import type { NutrienteId } from '../../../shared/lib/referenciasNutricionales'

interface Props {
  fecha: string
  onFechaChange: (fecha: string) => void
  onEditarEntry: (entry: Entry) => void
  onEditarPlato: (plato: Plato) => void
  /** Sin argumento, Añadir comida elige la comida por la hora. */
  onAnadir: (comida?: Comida) => void
  onCrearTipica: (comida: Comida) => void
  onVerReferencia?: (id: NutrienteId) => void
}


export default function Hoy({ fecha, onFechaChange, onEditarEntry, onEditarPlato, onAnadir, onCrearTipica, onVerReferencia }: Props) {
  const [detalle, setDetalle] = useState<'sencilla' | 'detallada'>('sencilla')
  const entries = useLiveQuery(() => entriesRepo.delDia(fecha), [fecha])
  const nombresCortos = useLiveQuery(() => nombresAlimentosRepo.paraComida(entries ?? []), [entries]) ?? new Map()
  const categorias = useLiveQuery(() => foodsRepo.categoriasDeEntradas(entries ?? []), [entries]) ?? new Map()
  const vigentes = useLiveQuery(() => objetivosDe(fecha, todayISO()), [fecha])
  const lunes = startOfWeek(fecha)
  const semana = useLiveQuery(async () => {
    const fechas = weekDates(lunes)
    const [delaSemana, objetivosSemana, cheatSemana] = await Promise.all([entriesRepo.entreFechas(fechas[0], fechas[6]), objetivosPorFecha(fechas, todayISO()), cheatDaysRepo.entreFechas(fechas[0], fechas[6])])
    return semanaKcal(lunes, delaSemana, objetivosSemana, todayISO(), new Set(cheatSemana))
  }, [lunes])
  const { avisar, avisarError, toast } = useAviso()
  const [accionesDia, setAccionesDia] = useState<{ paso: PasoAccionesDia; fechaDestino: string } | null>(null)
  const [copiandoDia, setCopiandoDia] = useState(false)
  const [marcandoCheat, setMarcandoCheat] = useState(false)
  const [errorDia, setErrorDia] = useState<string | null>(null)
  const cheat = semana?.find((d) => d.fecha === fecha)?.cheat ?? false
  const [comidaTipicas, setComidaTipicas] = useState<Comida | null>(null)
  const [tipicaElegida, setTipicaElegida] = useState<{ comida: Comida; tipica: ComidaTipica; fecha: string } | null>(null)
  const tipicasId = useId()
  const [accionesComida, setAccionesComida] = useState<{ comida: Comida; plato?: { id: string; nombre: string }; entrada?: Pick<Entry, 'id' | 'nombre'> } | null>(null)
  const [platoMover, setPlatoMover] = useState<Plato | null>(null)
  const [platoArrastrado, setPlatoArrastrado] = useState<Plato | null>(null)
  const [moviendo, setMoviendo] = useState(false)
  const [errorMover, setErrorMover] = useState<string | null>(null)
  const guardMoving = useRef(false)
  const alive = useRef(true)
  const fechaActual = useRef(fecha)
  fechaActual.current = fecha
  const [focoPendiente, setFocoPendiente] = useState<{ id: string; comida: Comida } | null>(null)
  const coordenadasComidas = useMemo(crearCoordenadasComidas, [])
  const sensors = useSensors(useSensor(PlatoPointerSensor, { distance: 8 }),
    useSensor(KeyboardSensor, { coordinateGetter: coordenadasComidas, scrollBehavior: 'auto' }))
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    if (!focoPendiente || platoMover) return
    const button = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-mover-plato]')).find(b =>
      b.dataset.moverPlato === focoPendiente.id && b.closest<HTMLElement>('[data-comida]')?.dataset.comida === focoPendiente.comida)
    if (button) { button.focus({ preventScroll: true }); setFocoPendiente(null) }
  }, [entries, focoPendiente, platoMover])

  async function mover(plato: Plato, destino: Comida): Promise<boolean> {
    const first = plato.entries[0]
    if (!alive.current || guardMoving.current || first.fecha !== fechaActual.current || !first.platoId || first.comida === destino) return false
    guardMoving.current = true
    setMoviendo(true)
    setErrorMover(null)
    try {
      const cambio = await entriesRepo.moverPlato({ fecha: first.fecha, origen: first.comida, destino, platoId: first.platoId, idsEsperados: plato.entries.map(e => e.id) })
      if (!cambio || !alive.current) return false
      setFocoPendiente({ id: cambio.platoId, comida: destino })
      haptic('success')
      avisar({ mensaje: `Plato movido a ${nombreComida(destino)}`, onDeshacer: async () => {
        const vuelto = await entriesRepo.deshacerMovimientoPlato(cambio)
        if (vuelto && alive.current) setFocoPendiente({ id: vuelto.platoId, comida: vuelto.destino })
      } })
      return true
    } catch (error) {
      if (!alive.current) return false
      const mensaje = error instanceof entriesRepo.PlatoNoDisponibleError || error instanceof entriesRepo.PlatoCambiadoError ? error.message : 'No se ha podido mover el plato. Inténtalo de nuevo.'
      if (platoMover) setErrorMover(mensaje)
      else avisarError(mensaje)
      return false
    } finally {
      guardMoving.current = false
      if (alive.current) setMoviendo(false)
    }
  }
  // Sentido del último cambio de día, solo para orientar la transición (no afecta a los datos).
  const [navegacion, setNavegacion] = useState<{ fecha: string; sentido: 'next' | 'prev' | null }>({ fecha, sentido: null })
  if (navegacion.fecha !== fecha) setNavegacion({ fecha, sentido: fecha > navegacion.fecha ? 'next' : 'prev' })

  async function borrar(id: number) {
    const entry = await entriesRepo.borrar(id)
    if (entry) avisar({ mensaje: `Borrada «${entry.nombre}»`, onDeshacer: () => entriesRepo.restaurar([entry]) })
  }

  async function borrarPlato(plato: Plato) {
    try {
      const borradas = await entriesRepo.borrarVarias(plato.entries.map((e) => e.id))
      if (borradas.length) avisar({ mensaje: `Borrado plato «${plato.nombre}»`, onDeshacer: () => entriesRepo.restaurar(borradas) })
    } catch {
      avisarError('No se ha podido borrar el plato. Inténtalo de nuevo.')
    }
  }

  function avisarCopia(ids: number[]) {
    if (ids.length === 0) return
    const mensaje = ids.length === 1 ? '1 entrada copiada' : `${ids.length} entradas copiadas`
    avisar({ mensaje, onDeshacer: () => entriesRepo.borrarVarias(ids) })
  }

  async function confirmarCopiarDia() {
    if (!accionesDia || copiandoDia) return
    setCopiandoDia(true)
    setErrorDia(null)
    try {
      const ids = await entriesRepo.copiar({ origen: { fecha }, destino: { fecha: accionesDia.fechaDestino } })
      void congelarObjetivoDia(accionesDia.fechaDestino)
      setAccionesDia(null)
      avisarCopia(ids)
    } catch {
      setErrorDia('No se ha podido copiar el día. Inténtalo de nuevo.')
    } finally {
      setCopiandoDia(false)
    }
  }

  /**
   * Marca o quita el cheat day del día elegido; las dos cosas se pueden deshacer. Desde la hoja de acciones, el error va
   * en línea (el Toast queda debajo); desde el botón del Diario, en el Toast.
   */
  async function alternarCheat(desdeHoja: boolean) {
    if (marcandoCheat || !semana) return
    setMarcandoCheat(true)
    setErrorDia(null)
    try {
      if (cheat) {
        const marca = await cheatDaysRepo.quitar(fecha)
        if (marca) avisar({ mensaje: 'Cheat day quitado', onDeshacer: () => cheatDaysRepo.restaurar(marca) })
      } else {
        const mensaje = avisoAlMarcar(fecha, semana.filter((d) => d.cheat).map((d) => d.fecha))
        await cheatDaysRepo.marcar(fecha)
        avisar({ mensaje, onDeshacer: () => cheatDaysRepo.quitar(fecha) })
      }
      setAccionesDia(null)
    } catch {
      const mensaje = cheat ? 'No se ha podido quitar el cheat day. Inténtalo de nuevo.' : 'No se ha podido marcar el cheat day. Inténtalo de nuevo.'
      if (desdeHoja) setErrorDia(mensaje)
      else avisarError(mensaje)
    } finally {
      setMarcandoCheat(false)
    }
  }

  function avisarPlantillaGuardada(nombre: string) {
    avisar({ mensaje: `Comida típica «${nombre}» guardada` })
  }

  const cargado = entries && vigentes
  const totales = cargado ? sumMacros(entries) : null
  const objetivos = vigentes

  const porComida = new Map<Comida, Entry[]>()
  for (const c of COMIDAS) porComida.set(c.valor, [])
  for (const e of entries ?? []) porComida.get(e.comida)?.push(e)

  const transicion = navegacion.sentido === 'next' ? 'animate-shift-next' : navegacion.sentido === 'prev' ? 'animate-shift-prev' : ''

  return (
    <div className="space-y-section">
      <SemanaKcal fecha={fecha} hoy={todayISO()} dias={semana} onFecha={onFechaChange} transicion={transicion}
        nota={semana && <Button variant="secondary" size="sm" aria-pressed={cheat} disabled={marcandoCheat} onClick={() => { void alternarCheat(false) }}>
          <Icon name="sparkles" size={18} className={cheat ? 'text-accent-strong' : 'text-fg-muted'} />{cheat ? 'Cheat day · fuera de las medias' : 'Marcar como cheat day'}
        </Button>}
        acciones={<IconButton icon="more" label="Acciones del día" variant="ghost" aria-haspopup="dialog" onClick={() => { setErrorDia(null); setAccionesDia({ paso: 'menu', fechaDestino: fecha }) }} />} />

      {!cargado || !totales || !objetivos ? (
        <div className="animate-fade-in-late">
          <LoadingState />
        </div>
      ) : (
        <>
          <ResumenNutricional
            totales={totales}
            objetivos={objetivos}
            titulo={`Resumen de ${formatFriendly(fecha).toLowerCase()}`}
            controles={<SegmentedControl label="Detalle nutricional" size="sm" valor={detalle} onChange={setDetalle}
              opciones={[{ valor: 'sencilla', label: 'Vista sencilla' }, { valor: 'detallada', label: 'Vista detallada' }]} />}
            detalle={detalle === 'detallada' && <NutrientesDetalle entries={entries} titulo="Desglose del día" objetivoKcal={objetivos.kcal} onVerReferencia={onVerReferencia} />}
          />

          <DndContext key={fecha} sensors={sensors} collisionDetection={colisionesComidas} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            accessibility={{ restoreFocus: true, screenReaderInstructions: { draggable: 'Para mover el plato, pulsa Espacio o Enter, usa las flechas entre comidas y vuelve a pulsar para soltar. Escape cancela. También puedes usar Mover en el menú de acciones del plato.' },
              announcements: {
                onDragStart: ({ active }) => `Plato ${active.data.current?.plato?.nombre} seleccionado para mover.`,
                onDragOver: ({ over }) => over && esComida(over.data.current?.comida) ? `Sobre ${nombreComida(over.data.current.comida)}.` : 'Fuera de las comidas; soltar cancela.',
                onDragEnd: ({ over }) => over && esComida(over.data.current?.comida) ? `Soltado sobre ${nombreComida(over.data.current.comida)}.` : 'Movimiento cancelado.',
                onDragCancel: () => 'Movimiento cancelado. El plato conserva su comida.',
              } }}
            onDragStart={({ active }) => { setPlatoArrastrado(active.data.current?.plato ?? null); haptic() }}
            onDragCancel={() => setPlatoArrastrado(null)}
            onDragEnd={({ active, over }) => {
              setPlatoArrastrado(null)
              const plato = active.data.current?.plato as Plato | undefined
              const destino = over?.data.current?.comida
              if (plato && esComida(destino)) void mover(plato, destino)
            }}>
          <div data-comidas-diario className={`space-y-4 ${transicion}`}>
            {COMIDAS.map(({ valor: c, label }) => (
              <ComidaSection
                key={c}
                comida={c}
                titulo={label}
                entries={porComida.get(c) ?? []}
                nombresCortos={nombresCortos}
                categorias={categorias}
                onAcciones={() => setAccionesComida({ comida: c })}
                onEditar={onEditarEntry}
                onBorrar={(e) => borrar(e.id)}
                onCopiarEntrada={entrada => setAccionesComida({ comida: c, entrada })}
                onBorrarPlato={borrarPlato}
                onEditarPlato={onEditarPlato}
                onMoverPlato={plato => { setErrorMover(null); setPlatoMover(plato) }}
                moviendo={moviendo}
                onAccionesPlato={(plato) => {
                  const id = plato.entries[0].platoId
                  if (id) setAccionesComida({ comida: c, plato: { id, nombre: plato.nombre } })
                }}
                onAnadir={() => onAnadir(c)}
                onTipicas={() => setComidaTipicas(c)}
                tipicasAbiertas={comidaTipicas === c}
                tipicasId={tipicasId}
              />
            ))}
          </div>
          {createPortal(<DragOverlay modifiers={[limitarCopiaAlViewport]} dropAnimation={null} transition="none" zIndex={45}>
            {platoArrastrado && <Card className="dnd-overlay-copy pointer-events-none space-y-1" aria-hidden>
              <p className="break-words text-body font-semibold text-fg">{platoArrastrado.nombre}</p>
              <p className="text-caption text-fg-muted">{formatInt(platoArrastrado.entries.length)} ingredientes · mueve a otra comida</p>
            </Card>}
          </DragOverlay>, document.body)}
          </DndContext>
        </>
      )}

      {toast}
      {comidaTipicas && <ComidasTipicasSheet key={`${fecha}-${comidaTipicas}`} id={tipicasId} comida={comidaTipicas} fecha={fecha} onClose={() => setComidaTipicas(null)} onElegir={tipica => setTipicaElegida({ comida: comidaTipicas, tipica, fecha })} onCrear={() => onCrearTipica(comidaTipicas)} />}
      {tipicaElegida && <AplicarPlantillaSheet meal={tipicaElegida.tipica} comida={tipicaElegida.comida} fecha={tipicaElegida.fecha} onClose={() => setTipicaElegida(null)} onAplicado={ids => {
        avisar({ mensaje: `Comida típica añadida a ${nombreComida(tipicaElegida.comida).toLowerCase()}`, onDeshacer: () => entriesRepo.borrarVarias(ids) })
      }} />}
      <MoverPlatoSheet plato={platoMover} moviendo={moviendo} error={errorMover} onMover={mover} onClose={() => setPlatoMover(null)} />

      <AccionesDiaSheet
        open={accionesDia !== null}
        paso={accionesDia?.paso ?? 'menu'}
        fechaOrigen={fecha}
        fechaDestino={accionesDia?.fechaDestino ?? fecha}
        cheat={cheat}
        onFechaDestinoChange={(f) => setAccionesDia((d) => (d ? { ...d, fechaDestino: f } : d))}
        onIrACopiar={() => { setErrorDia(null); setAccionesDia((d) => (d ? { ...d, paso: 'copiar' } : d)) }}
        onCopiar={confirmarCopiarDia}
        onCheat={() => { void alternarCheat(true) }}
        onClose={() => setAccionesDia(null)}
        copiando={copiandoDia}
        marcando={marcandoCheat}
        error={errorDia}
      />

      {accionesComida && (
        <AccionesComidaSheet
          fecha={fecha}
          comida={accionesComida.comida}
          plato={accionesComida.plato}
          entrada={accionesComida.entrada}
          entries={(porComida.get(accionesComida.comida) ?? []).filter(e => accionesComida.entrada ? e.id === accionesComida.entrada.id : !accionesComida.plato || e.platoId === accionesComida.plato.id)}
          onClose={() => setAccionesComida(null)}
          onCopiado={avisarCopia}
          onPlantillaGuardada={avisarPlantillaGuardada}
        />
      )}
    </div>
  )
}
