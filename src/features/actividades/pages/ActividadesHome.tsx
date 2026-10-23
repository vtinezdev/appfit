import { useRef, useState, type ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import FilaDeslizable from '../../../shared/components/FilaDeslizable'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import Metric from '../../../shared/components/Metric'
import SectionHeader from '../../../shared/components/SectionHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { Actividad, PuntoRecorrido } from '../../../shared/db/types'
import { useAviso } from '../../../shared/hooks/useAviso'
import { formatFechaHora, todayISO } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import HojaActividad from '../components/HojaActividad'
import HojaGrabar from '../components/HojaGrabar'
import TrazadoRecorrido from '../components/TrazadoRecorrido'
import * as actividadesRepo from '../data/actividadesRepo'
import { cifrasActividad, duracionTexto, formatKm, nombreMes, porMes, resumenSemana, tituloActividad } from '../lib/actividad'
import { valoresIniciales, type ValoresActividad } from '../lib/formulario'
import { GpxError, MAX_BYTES_GPX } from '../lib/gpx'
import { leerArchivoActividad, type FormatoActividad } from '../lib/importar'

type Hoja =
  | { tipo: 'manual'; n: number; inicial: ValoresActividad }
  | { tipo: 'gpx'; n: number; inicial: ValoresActividad; recorrido: PuntoRecorrido[][]; archivo: string; formato: FormatoActividad }

/**
 * Actividades (Entreno › Actividades): grabar con el GPS, importar un GPX, TCX o FIT o registrar a mano; la semana y el historial
 * por meses. Cada fila abre su detalle y se borra deslizándola, con «Deshacer».
 */
export default function ActividadesHome({ onAbrir }: { onAbrir: (id: number) => void }) {
  const hoy = todayISO()
  const actividades = useLiveQuery(() => actividadesRepo.terminadas(), [])
  const [hoja, setHoja] = useState<Hoja | null>(null)
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [grabar, setGrabar] = useState(false)
  const [aperturasGrabar, setAperturasGrabar] = useState(0)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const { avisar, avisarError, toast } = useAviso()

  async function leerArchivo(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setErrorArchivo(null)
    if (f.size > MAX_BYTES_GPX) { setErrorArchivo('El archivo es demasiado grande para una sola actividad.'); return }
    try {
      const { formato, resumen: r } = leerArchivoActividad(new Uint8Array(await f.arrayBuffer()))
      setHojaAbierta(true)
      setHoja({
        tipo: 'gpx', n: Date.now(), archivo: f.name, formato, recorrido: r.recorrido,
        inicial: valoresIniciales({ tipo: r.tipo, inicio: r.inicio, duracionSeg: r.duracionSeg ?? 0, distanciaM: r.distanciaM, desnivelM: r.desnivelM, nombre: r.nombre }),
      })
    } catch (err) {
      setErrorArchivo(err instanceof GpxError ? err.message : 'No se ha podido leer el archivo.')
    }
  }

  async function borrar(a: Actividad) {
    try {
      const borrada = await actividadesRepo.borrar(a.id)
      if (borrada) avisar({ mensaje: `${tituloActividad(a)} borrada`, onDeshacer: () => actividadesRepo.restaurar(borrada) })
    } catch {
      avisarError('No se ha podido borrar. Inténtalo de nuevo.')
    }
  }

  const semana = actividades ? resumenSemana(actividades, hoy) : null
  const meses = actividades ? porMes(actividades) : []

  return (
    <div className="space-y-section">
      <section aria-label="Salir a caminar o correr" className="training-surface space-y-4 p-5">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3"><h2 className="text-display">Sal a moverte</h2><Icon name="footprints" size={28} className="training-muted mt-1" /></div>
          <p className="training-muted break-words text-body-sm">Caminar, correr o senderismo: los km te suben metros en Cumbres y avanzan tu Camino.</p>
        </div>
        <Button variant="ghost" size="lg" block className="training-primary" onClick={() => { setAperturasGrabar((n) => n + 1); setGrabar(true) }}>
          <Icon name="locate" size={20} />Grabar con el GPS
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" className="training-secondary flex-1 basis-40" onClick={() => archivo.current?.click()}><Icon name="upload" size={18} />Importar GPX, TCX o FIT</Button>
          <Button variant="ghost" className="training-secondary flex-1 basis-40" onClick={() => { setHoja({ tipo: 'manual', n: Date.now(), inicial: valoresIniciales() }); setHojaAbierta(true) }}><Icon name="pencil" size={18} />Registrar a mano</Button>
        </div>
        <input ref={archivo} type="file" accept=".gpx,.tcx,.fit,application/gpx+xml,application/vnd.garmin.tcx+xml,application/vnd.ant.fit,application/xml,text/xml,application/octet-stream" className="sr-only" tabIndex={-1} aria-hidden onChange={leerArchivo} />
      </section>
      {errorArchivo && <ErrorState>{errorArchivo}</ErrorState>}

      {!actividades || !semana ? <LoadingState /> : <>
        <section aria-label="Esta semana" className="space-y-stack">
          <SectionHeader variant="section">Esta semana</SectionHeader>
          <Card className="metric-grid gap-3">
            <Metric size="title" label="Distancia" valor={formatKm(semana.distanciaM)} unidad="km" />
            <Metric size="title" label="Tiempo" valor={duracionTexto(semana.duracionSeg)} />
            <Metric size="title" label="Salidas" valor={formatInt(semana.salidas)} />
          </Card>
        </section>

        {meses.length === 0
          ? <EmptyState icon="footprints" title="Aún no hay actividades">Graba una salida, importa el GPX, TCX o FIT de tu reloj o de Strava, o apúntala a mano.</EmptyState>
          : meses.map((m) => <section key={m.mes} aria-label={nombreMes(`${m.mes}-01`)} className="space-y-stack">
            <SectionHeader variant="section">{nombreMes(`${m.mes}-01`)}</SectionHeader>
            <ListGroup aria-label={`Actividades de ${nombreMes(`${m.mes}-01`).toLowerCase()}`}>
              {m.actividades.map((a) => <li key={a.id}>
                <FilaDeslizable etiqueta={`Borrar ${tituloActividad(a)}`} onBorrar={() => { void borrar(a) }}>
                  <button type="button" onClick={() => onAbrir(a.id)} className="app-button flex min-h-touch w-full items-center gap-3 py-3 text-left">
                    {a.recorrido?.length
                      ? <TrazadoRecorrido recorrido={a.recorrido} variante="fila" />
                      : <span className="flex h-thumb w-thumb shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg-muted"><Icon name="footprints" size={22} /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-body font-semibold text-fg">{tituloActividad(a)}</span>
                      <span className="tabular block break-words text-caption text-fg-muted">{formatFechaHora(a.inicio)}</span>
                      <span className="tabular block break-words text-body-sm text-fg-muted">{cifrasActividad(a)}</span>
                    </span>
                    <Icon name="chevron-right" size={18} className="text-fg-subtle" />
                  </button>
                </FilaDeslizable>
              </li>)}
            </ListGroup>
          </section>)}
      </>}

      {hoja?.tipo === 'manual' && <HojaActividad key={hoja.n} open={hojaAbierta} onClose={() => setHojaAbierta(false)} titulo="Registrar actividad" accion="Guardar actividad"
        intro="Para una salida que no grabaste. Los km cuentan para Cumbres y tu Camino."
        inicial={hoja.inicial}
        onGuardar={async (datos) => {
          await actividadesRepo.crear({ ...datos, origen: 'manual' })
          setHojaAbierta(false)
          avisar({ mensaje: 'Actividad guardada' })
        }} />}
      {hoja?.tipo === 'gpx' && <HojaActividad key={hoja.n} open={hojaAbierta} onClose={() => setHojaAbierta(false)} titulo={`Importar ${hoja.formato}`} accion="Guardar actividad"
        intro={`Datos de «${hoja.archivo}». Revísalos antes de guardar.`}
        inicial={hoja.inicial} recorrido={hoja.recorrido.length ? hoja.recorrido : undefined}
        onGuardar={async (datos) => {
          await actividadesRepo.crear({ ...datos, origen: 'gpx', recorrido: hoja.recorrido })
          setHojaAbierta(false)
          avisar({ mensaje: 'Actividad importada' })
        }} />}
      <HojaGrabar key={aperturasGrabar} open={grabar} onClose={() => setGrabar(false)}
        onEmpezar={(tipo) => { actividadesRepo.empezarGrabacion(tipo).catch(() => avisarError('No se ha podido empezar a grabar. Inténtalo de nuevo.')) }} />
      {toast}
    </div>
  )
}
