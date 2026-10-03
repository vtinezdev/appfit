import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../shared/components/Button'
import Icon from '../../shared/components/Icon'
import PageHeader from '../../shared/components/PageHeader'
import { LoadingState } from '../../shared/components/StateMessage'
import { getSettings } from '../../shared/db/settings'
import { addDays, parseISODate, todayISO } from '../../shared/lib/dates'
import { useAviso } from '../../shared/hooks/useAviso'
import TarjetaEntreno from '../gym/components/TarjetaEntreno'
import ResumenNutricional from '../nutricion/components/ResumenNutricional'
import * as entriesRepo from '../nutricion/data/entriesRepo'
import { sumMacros } from '../nutricion/lib/nutrition'
import * as pesosRepo from './data/pesosRepo'
import PesoCard from './components/PesoCard'
import RegistrarPesoSheet from './components/RegistrarPesoSheet'
import HistorialPeso from './components/HistorialPeso'
import { tendenciaPeso } from './lib/peso'
import { saludoPorHora } from './lib/saludo'

interface Props {
  onIrANutricion: () => void
  onAnadirComida: () => void
  onIrAGym: () => void
  ayudaInicial?: ReactNode
}

const PESO_POR_DEFECTO = 70
/** Historial que se lee: de sobra para la serie de 30 días y para encontrar un pesaje de hace una semana o más. */
const DIAS_HISTORIAL = 365

/** Pantalla de arranque: lo esencial de hoy de un vistazo (resumen del día, entreno y peso). */
export default function InicioTab({ onIrANutricion, onAnadirComida, onIrAGym, ayudaInicial }: Props) {
  const hoy = todayISO()
  const entries = useLiveQuery(() => entriesRepo.delDia(hoy), [hoy])
  const settings = useLiveQuery(() => getSettings(), [])
  const pesos = useLiveQuery(() => pesosRepo.delRango(addDays(hoy, -DIAS_HISTORIAL), hoy), [hoy])
  const { avisar, toast } = useAviso()
  const [aperturas, setAperturas] = useState(0)
  const [registrando, setRegistrando] = useState(false)
  const [historialPeso, setHistorialPeso] = useState(false)

  const tendencia = pesos ? tendenciaPeso(pesos, hoy) : null
  const fechaLarga = parseISODate(hoy).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  function abrirRegistro() {
    setAperturas((n) => n + 1)
    setRegistrando(true)
  }

  async function guardarPeso(kg: number) {
    await pesosRepo.registrar(hoy, kg)
    setRegistrando(false)
    avisar({ mensaje: 'Peso registrado' })
  }

  return (
    <div className="space-y-section px-page pt-5">
      <div className="space-y-2"><p className="text-label font-bold tracking-widest text-accent-strong">APPFIT</p><PageHeader overline={fechaLarga} title={saludoPorHora()} /></div>
      {ayudaInicial}

      {!entries || !settings || !pesos ? (
        <div className="animate-fade-in-late">
          <LoadingState />
        </div>
      ) : (
        <div className="space-y-section">
          <ResumenNutricional
            titulo="Resumen de hoy"
            totales={sumMacros(entries)}
            objetivos={settings.objetivos}
            accion={
              <Button variant="ghost" size="sm" onClick={onIrANutricion}>
                Ver día
                <Icon name="chevron-right" size={16} />
              </Button>
            }
          />
          <Button block size="lg" onClick={onAnadirComida}><Icon name="plus" size={18} />Registrar comida</Button>
          <TarjetaEntreno onAbrir={onIrAGym} />
          <PesoCard tendencia={tendencia} onRegistrar={abrirRegistro} onVerHistorial={() => setHistorialPeso(true)} />
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
      {historialPeso && <HistorialPeso onClose={() => setHistorialPeso(false)} />}
    </div>
  )
}
