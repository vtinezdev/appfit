import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../shared/components/Button'
import Icon from '../../shared/components/Icon'
import PageHeader from '../../shared/components/PageHeader'
import BrandMark from '../../shared/components/BrandMark'
import { LoadingState } from '../../shared/components/StateMessage'
import { objetivosVigentes } from '../perfil/data/perfilRepo'
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
  const vigentes = useLiveQuery(() => objetivosVigentes(hoy), [hoy])
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
      <div className="space-y-3">
        <PageHeader overline={fechaLarga} title={saludoPorHora()} action={<BrandMark />} />
        <p className="text-body-sm text-fg-muted">Entrena. Registra. Avanza.</p>
      </div>
      {ayudaInicial}

      {!entries || !vigentes || !pesos ? (
        <div className="animate-fade-in-late">
          <LoadingState />
        </div>
      ) : (
        <div className="space-y-section">
          <TarjetaEntreno destacado onAbrir={onIrAGym} />
          <ResumenNutricional
            integrado
            titulo="Resumen de hoy"
            totales={sumMacros(entries)}
            objetivos={vigentes}
            footer={<Button variant="secondary" block onClick={onAnadirComida}><Icon name="plus" size={18} />Registrar comida</Button>}
            accion={
              <Button variant="ghost" size="sm" onClick={onIrANutricion}>
                Ver día
                <Icon name="chevron-right" size={16} />
              </Button>
            }
          />
          <PesoCard tendencia={tendencia} onRegistrar={abrirRegistro} onVerHistorial={() => setHistorialPeso(true)} />
          <div aria-label="Accesos rápidos" className="grid grid-cols-2 gap-2 border-t border-line pt-3">
            <Button variant="secondary" onClick={onIrANutricion}><Icon name="utensils" size={20} />Nutrición</Button>
            <Button variant="secondary" onClick={onIrAGym}><Icon name="dumbbell" size={20} />Entreno</Button>
          </div>
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
