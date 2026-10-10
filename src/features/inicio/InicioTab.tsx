import { lazy, Suspense, useState, type ReactNode } from 'react'
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
import AccesoEntreno from './components/AccesoEntreno'
import AccesoPeso from './components/AccesoPeso'
import RegistrarPesoSheet from './components/RegistrarPesoSheet'
import HistorialPeso from './components/HistorialPeso'
import { tendenciaPeso } from './lib/peso'
import { getSettings, updateSettings } from '../../shared/db/settings'
import { getPerfil } from '../perfil/data/perfilRepo'
import * as aguaRepo from './data/aguaRepo'
import AccesoAgua from './components/AccesoAgua'
import AccesoNivel from './components/AccesoNivel'
import AccesoSemana from './components/AccesoSemana'
import { useAtributos } from '../atributos/hooks/useAtributos'
import AguaSheet from './components/AguaSheet'
import { AGUA_POR_DEFECTO_ML, formatAgua, resolverObjetivoAgua } from './lib/agua'
import AvisoBackup from './components/AvisoBackup'
import TarjetaRevisionSemanal from './components/TarjetaRevisionSemanal'
import { useTarjetaRevision } from './hooks/useRevisionSemanal'

// El detalle de la revisión (con récords y resumen de Gym) va en su propio chunk: no entra en el arranque de Inicio.
const RevisionSemanal = lazy(() => import('./components/RevisionSemanal'))

interface Props {
  onIrANutricion: () => void
  onIrAGym: () => void
  onIrAAtributos: () => void
  onIrARitmo: () => void
  onExportarCopia: () => void
  ayudaInicial?: ReactNode
}

const PESO_POR_DEFECTO = 70
/** Historial que se lee: de sobra para encontrar un pesaje de hace una semana o más. */
const DIAS_HISTORIAL = 365

/** Pantalla de arranque en mosaico: revisión de la semana (los lunes), energía, peso y agua, el último entreno, la semana (Ritmo) y el nivel (Atributos). Registrar está en el «+» de la barra. */
export default function InicioTab({ onIrANutricion, onIrAGym, onIrAAtributos, onIrARitmo, onExportarCopia, ayudaInicial }: Props) {
  const hoy = todayISO()
  const entries = useLiveQuery(() => entriesRepo.delDia(hoy), [hoy])
  const vigentes = useLiveQuery(() => objetivosDe(hoy, hoy), [hoy])
  const pesos = useLiveQuery(() => pesosRepo.delRango(addDays(hoy, -DIAS_HISTORIAL), hoy), [hoy])
  const agua = useLiveQuery(() => aguaRepo.delDia(hoy), [hoy])
  const objetivoAgua = useLiveQuery(async () => resolverObjetivoAgua((await getSettings()).aguaObjetivoMl, (await getPerfil()).sexo), [])
  const [aguaAbierta, setAguaAbierta] = useState(false)
  const { avisar, avisarError, toast } = useAviso()
  const [aperturas, setAperturas] = useState(0)
  const [registrando, setRegistrando] = useState(false)
  const [historialPeso, setHistorialPeso] = useState(false)
  const revision = useTarjetaRevision(hoy)
  const atributos = useAtributos(hoy)
  const [revisionAbierta, setRevisionAbierta] = useState<string | null>(null)

  const tendencia = pesos ? tendenciaPeso(pesos, hoy) : null
  const fechaLarga = parseISODate(hoy).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  async function anadirAgua() {
    try {
      await aguaRepo.anadir(hoy, AGUA_POR_DEFECTO_ML)
      avisar({ mensaje: `+${formatAgua(AGUA_POR_DEFECTO_ML)} de agua`, onDeshacer: () => aguaRepo.quitarUltima(hoy) })
    } catch {
      avisarError('No se ha podido añadir el agua. Inténtalo de nuevo.')
    }
  }

  async function quitarAgua() {
    try {
      const ultima = await aguaRepo.quitarUltima(hoy)
      if (ultima !== undefined) avisar({ mensaje: `−${formatAgua(ultima)} de agua`, onDeshacer: () => aguaRepo.anadir(hoy, ultima) })
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

  function abrirRegistro() {
    setAperturas((n) => n + 1)
    setRegistrando(true)
  }

  async function guardarPeso(kg: number) {
    await pesosRepo.registrar(hoy, kg)
    void actualizarObjetivoHoy(hoy, 'peso')
    setRegistrando(false)
    avisar({ mensaje: 'Peso registrado' })
  }

  return (
    <div className="space-y-section px-page pt-5">
      <PageHeader overline={fechaLarga} title="Hoy" />
      {ayudaInicial}
      <AvisoBackup onExportar={onExportarCopia} />
      {revision && (
        <TarjetaRevisionSemanal
          resumen={revision}
          onVer={() => setRevisionAbierta(revision.semana.lunes)}
          onCerrar={() => cerrarRevision(revision.semana.lunes, revision.cerradaAntes)}
        />
      )}

      {!entries || !vigentes || !pesos ? (
        <div className="animate-fade-in-late">
          <LoadingState />
        </div>
      ) : (
        <div className="space-y-stack">
          <TarjetaEnergia totales={sumMacros(entries)} objetivos={vigentes} onAbrir={onIrANutricion} />
          <div className="grid grid-cols-2 gap-stack">
            <AccesoPeso tendencia={tendencia} pesos={pesos} hoy={hoy} onRegistrar={abrirRegistro} onVerHistorial={() => setHistorialPeso(true)} />
            <AccesoAgua ml={agua?.ml ?? 0} objetivo={objetivoAgua ?? null} onAnadir={anadirAgua} onQuitar={quitarAgua} onAbrir={() => setAguaAbierta(true)} />
          </div>
          <AccesoEntreno onAbrir={onIrAGym} />
          <AccesoSemana hoy={hoy} estado={atributos} onAbrir={onIrARitmo} />
          <AccesoNivel hoy={hoy} estado={atributos} onAbrir={onIrAAtributos} />
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
      {revisionAbierta && <Suspense fallback={null}><RevisionSemanal lunes={revisionAbierta} hoy={hoy} onClose={() => setRevisionAbierta(null)} /></Suspense>}
    </div>
  )
}
