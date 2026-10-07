import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../shared/components/Button'
import Icon from '../../shared/components/Icon'
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
import { getSettings } from '../../shared/db/settings'
import { getPerfil } from '../perfil/data/perfilRepo'
import * as aguaRepo from './data/aguaRepo'
import AccesoAgua from './components/AccesoAgua'
import AguaSheet from './components/AguaSheet'
import { AGUA_POR_DEFECTO_ML, formatAgua, resolverObjetivoAgua } from './lib/agua'
import AvisoBackup from './components/AvisoBackup'

interface Props {
  onIrANutricion: () => void
  onAnadirComida: () => void
  onIrAGym: () => void
  onExportarCopia: () => void
  ayudaInicial?: ReactNode
}

const PESO_POR_DEFECTO = 70
/** Historial que se lee: de sobra para encontrar un pesaje de hace una semana o más. */
const DIAS_HISTORIAL = 365

/** Pantalla de arranque: tarjetas breves del día (energía, entreno y peso) y registrar comida. */
export default function InicioTab({ onIrANutricion, onAnadirComida, onIrAGym, onExportarCopia, ayudaInicial }: Props) {
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

      {!entries || !vigentes || !pesos ? (
        <div className="animate-fade-in-late">
          <LoadingState />
        </div>
      ) : (
        <div className="space-y-section">
          <div className="space-y-stack">
            <TarjetaEnergia totales={sumMacros(entries)} objetivos={vigentes} onAbrir={onIrANutricion} />
            <div className="grid grid-cols-2 gap-stack">
              <AccesoEntreno onAbrir={onIrAGym} />
              <AccesoPeso tendencia={tendencia} onRegistrar={abrirRegistro} onVerHistorial={() => setHistorialPeso(true)} />
            </div>
            <AccesoAgua ml={agua?.ml ?? 0} objetivo={objetivoAgua ?? null} onAnadir={anadirAgua} onAbrir={() => setAguaAbierta(true)} />
          </div>
          <Button size="lg" block onClick={onAnadirComida}><Icon name="plus" size={20} />Registrar comida</Button>
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
    </div>
  )
}
