import { Fragment, lazy, Suspense, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import PageHeader from '../../shared/components/PageHeader'
import { LoadingState } from '../../shared/components/StateMessage'
import { actualizarObjetivoHoy } from '../perfil/data/objetivosDiaRepo'
import { objetivosDe } from '../perfil/data/objetivosDiaRepo'
import { addDays, parseISODate, todayISO } from '../../shared/lib/dates'
import { useAviso } from '../../shared/hooks/useAviso'
import * as entriesRepo from '../nutricion/data/entriesRepo'
import { sumMacros } from '../nutricion/lib/nutrition'
import * as pesosRepo from './data/pesosRepo'
import TarjetaEnergia from './components/TarjetaEnergia'
import AnadirComidaAhora from './components/AnadirComidaAhora'
import type { Comida } from '../../shared/db/types'
import AccesoEntreno from './components/AccesoEntreno'
import AccesoPeso from './components/AccesoPeso'
import RegistrarPesoSheet from './components/RegistrarPesoSheet'
import HistorialPeso from './components/HistorialPeso'
import { tendenciaPeso } from './lib/peso'
import { getSettings, updateSettings } from '../../shared/db/settings'
import { getPerfil } from '../perfil/data/perfilRepo'
import * as aguaRepo from './data/aguaRepo'
import AccesoAgua from './components/AccesoAgua'
import AccesoPasos from './components/AccesoPasos'
import CreatinaHoy from './components/CreatinaHoy'
import AccesoMetas from './components/AccesoMetas'
import AccesoProgreso, { type DestinoProgreso } from './components/AccesoProgreso'
import AguaSheet from './components/AguaSheet'
import { AGUA_POR_DEFECTO_ML, formatAgua, resolverObjetivoAgua } from './lib/agua'
import AvisoBackup from './components/AvisoBackup'
import AvisoActualizacion from '../../shared/components/AvisoActualizacion'
import AvisoAmigos from '../social/components/AvisoAmigos'
import TarjetaRevisionSemanal from './components/TarjetaRevisionSemanal'
import { useTarjetaRevision } from './hooks/useRevisionSemanal'
import { useHoy } from '../../shared/hooks/useHoy'
import { usePeriodoAResumir } from '../vitrina/hooks/useTuPeriodo'
import { moduloActivo, tarjetasInicio, type TarjetaInicio } from '../../shared/lib/modulos'

// El detalle de la revisión (con récords y resumen de Gym) va en su propio chunk: no entra en el arranque de Inicio.
const RevisionSemanal = lazy(() => import('./components/RevisionSemanal'))
// «Tu mes» (B15): tarjeta y resumen en su propio trozo; solo se cargan del día 1 al 7.
const TarjetaTuPeriodo = lazy(() => import('../vitrina/components/TuPeriodo').then((m) => ({ default: m.TarjetaTuPeriodo })))
const ResumenTuPeriodo = lazy(() => import('../vitrina/components/TuPeriodo').then((m) => ({ default: m.ResumenTuPeriodo })))

interface Props {
  onIrANutricion: () => void
  /** Abre Añadir comida en Nutrición, ya en esa comida. */
  onAnadirComida: (comida: Comida) => void
  onIrAGym: () => void
  /** Cumbres, Caminos, Ritmo o Vitrina, desde sus teselas. */
  onIrAProgreso: (destino: DestinoProgreso) => void
  /** Tesela de progreso que recupera el foco al volver de su sección. */
  enfocarProgreso?: DestinoProgreso
  onExportarCopia: () => void
  onRevisarCuenta: () => void
  onIrAAmigos: () => void
  onIrASocial: () => void
  onRevisarActualizaciones: () => void
  ayudaInicial?: ReactNode
}

const PESO_POR_DEFECTO = 70
/** Historial que se lee: de sobra para encontrar un pesaje de hace una semana o más. */
const DIAS_HISTORIAL = 365

/** Pantalla de arranque en mosaico: revisión de la semana (los lunes), energía, el progreso (Cumbres, Caminos, Ritmo y Vitrina), peso, agua y pasos y el último entreno. */
export default function InicioTab({ onIrANutricion, onAnadirComida, onIrAGym, onIrAProgreso, enfocarProgreso, onExportarCopia, onRevisarCuenta, onIrAAmigos, onIrASocial, onRevisarActualizaciones, ayudaInicial }: Props) {
  const hoy = useHoy()
  const entries = useLiveQuery(() => entriesRepo.delDia(hoy), [hoy])
  const vigentes = useLiveQuery(() => objetivosDe(hoy, hoy), [hoy])
  const pesos = useLiveQuery(() => pesosRepo.delRango(addDays(hoy, -DIAS_HISTORIAL), hoy), [hoy])
  const agua = useLiveQuery(() => aguaRepo.delDia(hoy), [hoy])
  const settings = useLiveQuery(() => getSettings(), [])
  const objetivoAgua = useLiveQuery(async () => resolverObjetivoAgua((await getSettings()).aguaObjetivoMl, (await getPerfil()).sexo), [])
  const [aguaAbierta, setAguaAbierta] = useState(false)
  const { avisar, avisarError, toast } = useAviso()
  const [aperturas, setAperturas] = useState(0)
  const [registrando, setRegistrando] = useState(false)
  const [historialPeso, setHistorialPeso] = useState(false)
  const revision = useTarjetaRevision(hoy)
  const [revisionAbierta, setRevisionAbierta] = useState<string | null>(null)
  const tuPeriodo = usePeriodoAResumir(hoy)
  const [tuPeriodoAbierto, setTuPeriodoAbierto] = useState(false)

  const tendencia = pesos ? tendenciaPeso(pesos, hoy) : null
  const fechaLarga = parseISODate(hoy).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  async function anadirAgua() {
    const fecha = todayISO()
    try {
      await aguaRepo.anadir(fecha, AGUA_POR_DEFECTO_ML)
      avisar({ mensaje: `+${formatAgua(AGUA_POR_DEFECTO_ML)} de agua`, onDeshacer: () => aguaRepo.quitarUltima(fecha) })
    } catch {
      avisarError('No se ha podido añadir el agua. Inténtalo de nuevo.')
    }
  }

  async function quitarAgua() {
    const fecha = todayISO()
    try {
      const ultima = await aguaRepo.quitarUltima(fecha)
      if (ultima !== undefined) avisar({ mensaje: `−${formatAgua(ultima)} de agua`, onDeshacer: () => aguaRepo.anadir(fecha, ultima) })
    } catch {
      avisarError('No se ha podido quitar el agua. Inténtalo de nuevo.')
    }
  }

  async function cerrarRevision(lunes: string, cerradaAntes: string | undefined) {
    try {
      await updateSettings({ revisionSemanalCerrada: lunes })
      avisar({ mensaje: 'Revisión cerrada hasta el lunes', onDeshacer: () => updateSettings({ revisionSemanalCerrada: cerradaAntes }) })
    } catch {
      avisarError('No se ha podido cerrar la revisión. Inténtalo de nuevo.')
    }
  }

  async function cerrarTuPeriodo(clave: string, cerradoAntes: string | undefined) {
    try {
      await updateSettings({ resumenMesCerrado: clave })
      avisar({ mensaje: 'Resumen cerrado hasta el mes que viene', onDeshacer: () => updateSettings({ resumenMesCerrado: cerradoAntes }) })
    } catch {
      avisarError('No se ha podido cerrar el resumen. Inténtalo de nuevo.')
    }
  }

  function abrirRegistro() {
    setAperturas((n) => n + 1)
    setRegistrando(true)
  }

  async function guardarPeso(kg: number) {
    const fecha = todayISO()
    await pesosRepo.registrar(fecha, kg)
    void actualizarObjetivoHoy(fecha, 'peso')
    setRegistrando(false)
    avisar({ mensaje: 'Peso registrado' })
  }

  function tarjeta(t: TarjetaInicio): ReactNode {
    switch (t) {
      case 'energia': return <TarjetaEnergia totales={sumMacros(entries ?? [])} objetivos={vigentes!} onAbrir={onIrANutricion}
        pie={<AnadirComidaAhora onAnadir={onAnadirComida} />} />
      case 'progreso': return <AccesoProgreso onAbrir={onIrAProgreso} enfocar={enfocarProgreso} sinCaminos={!moduloActivo(settings, 'actividades')} />
      case 'registros': return <div className="inicio-registros">
        {moduloActivo(settings, 'peso') && <AccesoPeso tendencia={tendencia} pesos={pesos ?? []} hoy={hoy} onRegistrar={abrirRegistro} onVerHistorial={() => setHistorialPeso(true)} />}
        {(moduloActivo(settings, 'agua') || moduloActivo(settings, 'pasos')) && <div className="inicio-par">
          {moduloActivo(settings, 'agua') && <AccesoAgua ml={agua?.ml ?? 0} objetivo={objetivoAgua ?? null} onAnadir={anadirAgua} onQuitar={quitarAgua} onAbrir={() => setAguaAbierta(true)} />}
          {moduloActivo(settings, 'pasos') && <AccesoPasos hoy={hoy} avisar={avisar} />}
        </div>}
      </div>
      case 'metas': return <AccesoMetas hoy={hoy} onAbrir={() => onIrAProgreso('ritmo')} />
      case 'creatina': return <CreatinaHoy hoy={hoy} />
      case 'entreno': return <AccesoEntreno onAbrir={onIrAGym} />
    }
  }

  return (
    <div className="inicio-layout space-y-section px-page pt-5">
      <PageHeader overline={fechaLarga} title="Hoy" />
      <AvisoActualizacion onRevisar={onRevisarActualizaciones} />
      {ayudaInicial}
      <AvisoBackup onExportar={onExportarCopia} onRevisarCuenta={onRevisarCuenta} />
      <AvisoAmigos onIrAAmigos={onIrAAmigos} onIrASocial={onIrASocial} />
      {revision && (
        <TarjetaRevisionSemanal
          resumen={revision}
          modulos={settings}
          onVer={() => setRevisionAbierta(revision.semana.lunes)}
          onCerrar={() => cerrarRevision(revision.semana.lunes, revision.cerradaAntes)}
        />
      )}

      {tuPeriodo && <Suspense fallback={null}><TarjetaTuPeriodo periodo={tuPeriodo.periodo} hoy={hoy} onVer={() => setTuPeriodoAbierto(true)}
        onCerrar={() => cerrarTuPeriodo(tuPeriodo.periodo.clave, tuPeriodo.cerradoAntes)} /></Suspense>}

      {!entries || !vigentes || !pesos || !settings ? (
        <div className="animate-fade-in-late">
          <LoadingState />
        </div>
      ) : (
        <div className="inicio-paneles">
          {/* En el orden de Ajustes › «Lo que usas» y sin las de los módulos ocultos (B9). */}
          {tarjetasInicio(settings).map((t) => <Fragment key={t}>{tarjeta(t)}</Fragment>)}
        </div>
      )}

      {toast}

      <RegistrarPesoSheet
        key={aperturas}
        open={registrando}
        onClose={() => setRegistrando(false)}
        pesoInicial={tendencia?.actual ?? PESO_POR_DEFECTO}
        onGuardar={guardarPeso}
      />
      <AguaSheet open={aguaAbierta} onClose={() => setAguaAbierta(false)} hoy={hoy} objetivo={objetivoAgua ?? null} />
      {historialPeso && <HistorialPeso onClose={() => setHistorialPeso(false)} />}
      {tuPeriodoAbierto && tuPeriodo && <Suspense fallback={null}><ResumenTuPeriodo periodo={tuPeriodo.periodo} hoy={hoy} onClose={() => setTuPeriodoAbierto(false)} /></Suspense>}
      {revisionAbierta && <Suspense fallback={null}><RevisionSemanal lunes={revisionAbierta} hoy={hoy} onClose={() => setRevisionAbierta(null)} /></Suspense>}
    </div>
  )
}
