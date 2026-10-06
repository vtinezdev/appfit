import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, useSensor, useSensors } from '@dnd-kit/core'
import { useLiveQuery } from 'dexie-react-hooks'
import * as entriesRepo from '../data/entriesRepo'
import * as nombresAlimentosRepo from '../data/nombresAlimentosRepo'
import type { Comida, Entry } from '../../../shared/db/types'
import { addDays, formatFriendly, todayISO } from '../../../shared/lib/dates'
import { getSettings } from '../../../shared/db/settings'
import AccionesComidaSheet from '../components/AccionesComidaSheet'
import ComidaSection from '../components/ComidaSection'
import CopiarDiaSheet from '../components/CopiarDiaSheet'
import ResumenNutricional from '../components/ResumenNutricional'
import { useAviso } from '../../../shared/hooks/useAviso'
import { sumMacros } from '../lib/nutrition'
import type { Plato } from '../lib/platos'
import { IconButton } from '../../../shared/components/Button'
import { LoadingState } from '../../../shared/components/StateMessage'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import NutrientesDetalle from '../components/NutrientesDetalle'
import MoverPlatoSheet from '../components/MoverPlatoSheet'
import { COMIDAS, esComida, nombreComida } from '../lib/comidas'
import { colisionesComidas, crearCoordenadasComidas, limitarCopiaAlViewport } from '../lib/arrastrePlatos'
import { PlatoPointerSensor } from '../lib/PlatoPointerSensor'
import { haptic } from '../../../shared/design/motion'
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
  onVerReferencia?: (id: NutrienteId) => void
}


export default function Hoy({ fecha, onFechaChange, onEditarEntry, onEditarPlato, onAnadir, onVerReferencia }: Props) {
  const [detalle, setDetalle] = useState<'sencilla' | 'detallada'>('sencilla')
  const ayer = addDays(fecha, -1)
  const entries = useLiveQuery(() => entriesRepo.delDia(fecha), [fecha])
  const nombresCortos = useLiveQuery(() => nombresAlimentosRepo.paraComida(entries ?? []), [entries]) ?? new Map()
  const entriesAyer = useLiveQuery(() => entriesRepo.delDia(ayer), [ayer])
  const settings = useLiveQuery(() => getSettings(), [])
  const { avisar, avisarError, toast } = useAviso()
  const [copiarDia, setCopiarDia] = useState<{ fechaDestino: string } | null>(null)
  const [copiandoDia, setCopiandoDia] = useState(false)
  const [errorCopia, setErrorCopia] = useState<string | null>(null)
  const [repitiendo, setRepitiendo] = useState<Comida | null>(null)
  const [accionesComida, setAccionesComida] = useState<{ comida: Comida; plato?: { id: string; nombre: string } } | null>(null)
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
    if (!copiarDia || copiandoDia) return
    setCopiandoDia(true)
    setErrorCopia(null)
    try {
      const ids = await entriesRepo.copiar({ origen: { fecha }, destino: { fecha: copiarDia.fechaDestino } })
      setCopiarDia(null)
      avisarCopia(ids)
    } catch {
      setErrorCopia('No se ha podido copiar el día. Inténtalo de nuevo.')
    } finally {
      setCopiandoDia(false)
    }
  }

  function avisarPlantillaGuardada(nombre: string) {
    avisar({ mensaje: `Plantilla «${nombre}» guardada` })
  }

  async function repetirDeAyer(c: Comida) {
    if (repitiendo) return
    setRepitiendo(c)
    try {
      avisarCopia(await entriesRepo.copiar({ origen: { fecha: ayer, comida: c }, destino: { fecha, comida: c } }))
    } catch {
      avisarError('No se ha podido repetir la comida. Inténtalo de nuevo.')
    } finally {
      setRepitiendo(null)
    }
  }

  const cargado = entries && settings
  const totales = cargado ? sumMacros(entries) : null
  const objetivos = settings?.objetivos

  const porComida = new Map<Comida, Entry[]>()
  for (const c of COMIDAS) porComida.set(c.valor, [])
  for (const e of entries ?? []) porComida.get(e.comida)?.push(e)

  const porComidaAyer = new Map<Comida, number>()
  for (const e of entriesAyer ?? []) porComidaAyer.set(e.comida, (porComidaAyer.get(e.comida) ?? 0) + 1)

  const transicion = navegacion.sentido === 'next' ? 'animate-shift-next' : navegacion.sentido === 'prev' ? 'animate-shift-prev' : ''

  return (
    <div className="space-y-section">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center">
          <IconButton icon="chevron-left" label="Día anterior" variant="ghost" onClick={() => onFechaChange(addDays(fecha, -1))} />
          <h2 key={fecha} aria-live="polite" className={`min-w-0 flex-1 text-center text-body font-semibold text-fg first-letter:uppercase ${transicion}`}>
            {formatFriendly(fecha)}
          </h2>
          <IconButton icon="chevron-right" label="Día siguiente" variant="ghost" onClick={() => onFechaChange(addDays(fecha, 1))} disabled={fecha >= todayISO()} />
        </div>
        <IconButton icon="more" label="Copiar el día" variant="ghost" onClick={() => { setErrorCopia(null); setCopiarDia({ fechaDestino: fecha }) }} />
      </div>

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
            tituloVisible={false}
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
          <div className={`space-y-8 ${transicion}`}>
            {COMIDAS.map(({ valor: c, label }) => (
              <ComidaSection
                key={c}
                comida={c}
                titulo={label}
                entries={porComida.get(c) ?? []}
                nombresCortos={nombresCortos}
                onAcciones={() => setAccionesComida({ comida: c })}
                onEditar={onEditarEntry}
                onBorrar={(e) => borrar(e.id)}
                onBorrarPlato={borrarPlato}
                onEditarPlato={onEditarPlato}
                onMoverPlato={plato => { setErrorMover(null); setPlatoMover(plato) }}
                moviendo={moviendo}
                onAccionesPlato={(plato) => {
                  const id = plato.entries[0].platoId
                  if (id) setAccionesComida({ comida: c, plato: { id, nombre: plato.nombre } })
                }}
                onAnadir={() => onAnadir(c)}
                disponiblesAyer={porComidaAyer.get(c) ?? 0}
                onRepetir={() => repetirDeAyer(c)}
                ocupado={repitiendo !== null}
                repitiendo={repitiendo === c}
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
      <MoverPlatoSheet plato={platoMover} moviendo={moviendo} error={errorMover} onMover={mover} onClose={() => setPlatoMover(null)} />

      <CopiarDiaSheet
        open={copiarDia !== null}
        fechaOrigen={fecha}
        fechaDestino={copiarDia?.fechaDestino ?? fecha}
        onFechaDestinoChange={(f) => setCopiarDia((d) => (d ? { fechaDestino: f } : d))}
        onCopiar={confirmarCopiarDia}
        onClose={() => setCopiarDia(null)}
        copiando={copiandoDia}
        error={errorCopia}
      />

      {accionesComida && (
        <AccionesComidaSheet
          fecha={fecha}
          comida={accionesComida.comida}
          plato={accionesComida.plato}
          entries={(porComida.get(accionesComida.comida) ?? []).filter((e) => !accionesComida.plato || e.platoId === accionesComida.plato.id)}
          onClose={() => setAccionesComida(null)}
          onCopiado={avisarCopia}
          onPlantillaGuardada={avisarPlantillaGuardada}
        />
      )}
    </div>
  )
}
