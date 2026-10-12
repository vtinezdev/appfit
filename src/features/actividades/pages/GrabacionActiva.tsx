import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { Actividad, TipoActividad } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import TrazadoRecorrido from '../components/TrazadoRecorrido'
import * as actividadesRepo from '../data/actividadesRepo'
import { useGps, usePantallaEncendida, type EstadoGps } from '../hooks/useGrabacionGps'
import { ETIQUETA_TIPO, formatKm, formatReloj, formatRitmo, kmTexto, NOMBRE_TIPO, ritmoSegPorKm, TIPOS_ACTIVIDAD } from '../lib/actividad'
import { anadirLectura, enPausa, pausar, reanudar, segundosEnMarcha, type EstadoGrabacion, type Lectura } from '../lib/grabacion'

/** Cada cuánto se guarda la grabación en la base de datos (además de al pausar, salir de la app y terminar). */
const GUARDAR_CADA_MS = 10_000

function textoGps(estado: EstadoGps, precision: number | null): string {
  if (estado === 'ok') return precision === null ? 'Con señal' : `Señal ±${formatInt(precision)} m`
  if (estado === 'buscando') return 'Buscando señal…'
  if (estado === 'denegado') return 'Sin permiso de ubicación'
  if (estado === 'no-disponible') return 'Este navegador no da la ubicación'
  return 'Sin señal'
}

/** Tiempo y ritmo, en un componente aparte: el reloj se repinta cada segundo sin repintar la página. */
function Reloj({ estado }: { estado: EstadoGrabacion }) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    if (enPausa(estado)) { setAhora(Date.now()); return }
    const t = window.setInterval(() => setAhora(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [estado])
  const seg = segundosEnMarcha(estado, ahora)
  return <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
    <div>
      <p className="training-muted text-rotulo">Tiempo</p>
      <p className="tabular font-numeric text-hero" aria-live="off">{formatReloj(seg)}</p>
    </div>
    <div className="text-right">
      <p className="training-muted text-rotulo">Ritmo medio</p>
      <p className="tabular text-title">{formatRitmo(ritmoSegPorKm(seg, estado.distanciaM))}</p>
    </div>
  </div>
}

interface Props {
  actividad: Actividad
  /** Al guardar: el id de la actividad terminada. */
  onTerminada: (id: number) => void
}

/**
 * Grabación con GPS en curso (Entreno › Actividades): tiempo, distancia, ritmo y el recorrido mientras se dibuja. La
 * pantalla se pide encendida; el estado se guarda cada pocos segundos para no perderlo si iOS cierra la app.
 */
export default function GrabacionActiva({ actividad, onTerminada }: Props) {
  const [estado, setEstado] = useState<EstadoGrabacion>(() => actividadesRepo.estadoDe(actividad))
  const actual = useRef(estado)
  const sucio = useRef(false)
  const [terminando, setTerminando] = useState(false)
  const [tipo, setTipo] = useState<TipoActividad>(actividad.tipo)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [descartando, setDescartando] = useState(false)
  const pausada = enPausa(estado)

  const cambiar = useCallback((siguiente: EstadoGrabacion) => {
    actual.current = siguiente
    sucio.current = true
    setEstado(siguiente)
  }, [])

  const guardar = useCallback(async () => {
    if (!sucio.current) return
    sucio.current = false
    try { await actividadesRepo.guardarGrabacion(actividad.id, actual.current) } catch { sucio.current = true }
  }, [actividad.id])

  const gps = useGps(!pausada, (l: Lectura) => {
    const r = anadirLectura(actual.current, l)
    if (!r.descarte) cambiar(r.estado)
  })
  const pantalla = usePantallaEncendida(true)

  useEffect(() => {
    const t = window.setInterval(() => { void guardar() }, GUARDAR_CADA_MS)
    const alSalir = () => { if (document.visibilityState === 'hidden') void guardar() }
    document.addEventListener('visibilitychange', alSalir)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', alSalir)
      void guardar()
    }
  }, [guardar])

  function alternarPausa() {
    const ahora = Date.now()
    cambiar(pausada ? reanudar(actual.current, ahora) : pausar(actual.current, ahora))
    void guardar()
  }

  async function terminar() {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await actividadesRepo.terminarGrabacion(actividad.id, actual.current, { tipo, nombre })
      sucio.current = false
      onTerminada(actividad.id)
    } catch (e) {
      setError(e instanceof actividadesRepo.ActividadInvalida ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  async function descartar() {
    setOcupado(true)
    try {
      sucio.current = false
      await actividadesRepo.descartarGrabacion(actividad.id)
    } catch {
      setError('No se ha podido descartar. Inténtalo de nuevo.')
      setOcupado(false)
    }
  }

  const sinGps = gps.estado === 'denegado' || gps.estado === 'no-disponible'

  return (
    <div className="space-y-section px-page pt-5">
      <section aria-label="Grabación en curso" className="training-surface space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="training-muted text-rotulo">{pausada ? 'En pausa' : 'Grabando'}</p>
            <h1 className="break-words text-display">{NOMBRE_TIPO[actividad.tipo]}</h1>
          </div>
          <p className="training-muted flex shrink-0 items-center gap-1 text-body-sm" role="status"><Icon name="locate" size={16} />{pausada ? 'GPS en pausa' : textoGps(gps.estado, gps.precision)}</p>
        </div>
        <Reloj estado={estado} />
        <div>
          <p className="training-muted text-rotulo">Distancia</p>
          <p className="tabular"><span className="font-numeric text-display">{formatKm(estado.distanciaM)}</span> <span className="training-muted text-body">km</span></p>
        </div>
        <div className="grid gap-2">
          <Button variant="ghost" size="lg" block className="training-secondary" onClick={alternarPausa}>
            <Icon name={pausada ? 'play' : 'pause'} size={20} />{pausada ? 'Reanudar' : 'Pausar'}
          </Button>
          <Button variant="ghost" size="lg" block className="training-primary" onClick={() => { setError(null); setTerminando(true) }}>
            <Icon name="stop" size={20} />Terminar
          </Button>
        </div>
      </section>

      {sinGps && <ErrorState>{gps.estado === 'denegado'
        ? 'AppFit no tiene permiso para usar tu ubicación. Actívalo en Ajustes del iPhone › Privacidad › Localización y vuelve a abrir la app.'
        : 'Este navegador no da acceso a la ubicación. Puedes registrar la actividad a mano.'}</ErrorState>}
      {!pausada && pantalla !== 'encendida' && <p className="break-words text-body-sm text-fg-muted">
        No hemos podido mantener la pantalla encendida: toca la pantalla de vez en cuando para que no se bloquee, o el GPS se parará.
      </p>}

      <Card>
        {estado.tramos.flat().length >= 2
          ? <TrazadoRecorrido recorrido={estado.tramos} label={`Recorrido: ${kmTexto(estado.distanciaM)}`} />
          : <p className="break-words text-body-sm text-fg-muted">El recorrido aparecerá aquí en cuanto empieces a moverte.</p>}
      </Card>

      <Sheet open={terminando} onClose={() => setTerminando(false)} title="Terminar actividad"
        footer={<div className="space-y-2">
          {error && <ErrorState>{error}</ErrorState>}
          {descartando
            ? <ConfirmacionDestructiva mensaje="¿Descartar la grabación? No se guarda nada y no se puede deshacer." confirmar="Sí, descartar" onConfirmar={descartar} onCancelar={() => setDescartando(false)} ocupado={ocupado} />
            : <>
              <Button block loading={ocupado} onClick={terminar}>Guardar actividad</Button>
              <Button variant="destructive" block disabled={ocupado} onClick={() => setDescartando(true)}>Descartar grabación</Button>
            </>}
        </div>}>
        <div className="space-y-4">
          <p className="tabular break-words text-body text-fg">{kmTexto(estado.distanciaM)} · {formatReloj(segundosEnMarcha(estado, Date.now()))}</p>
          <SegmentedControl<TipoActividad> label="Tipo de actividad" valor={tipo} onChange={setTipo}
            opciones={TIPOS_ACTIVIDAD.map((t) => ({ valor: t, label: ETIQUETA_TIPO[t] }))} />
          <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre (opcional)</span>
            <Input value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} placeholder="Ruta por el río" /></label>
        </div>
      </Sheet>
    </div>
  )
}
