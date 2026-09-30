import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { LoadingState } from '../../shared/components/StateMessage'
import { getSettings } from '../../shared/db/settings'
import { addDays, parseISODate, todayISO } from '../../shared/lib/dates'
import { useAviso } from '../../shared/hooks/useAviso'
import * as entriesRepo from '../nutricion/data/entriesRepo'
import { sumMacros } from '../nutricion/lib/nutrition'
import * as pesosRepo from './data/pesosRepo'
import PesoCard from './components/PesoCard'
import RegistrarPesoSheet from './components/RegistrarPesoSheet'
import ResumenDiaCard from './components/ResumenDiaCard'
import { tendenciaPeso } from './lib/peso'

interface Props {
  onIrANutricion: () => void
}

const PESO_POR_DEFECTO = 70
/** Historial que se lee: de sobra para la serie de 30 días y para encontrar un pesaje de hace una semana o más. */
const DIAS_HISTORIAL = 365

/** Pantalla de arranque: lo esencial de hoy de un vistazo. Crecerá con más tarjetas. */
export default function InicioTab({ onIrANutricion }: Props) {
  const hoy = todayISO()
  const entries = useLiveQuery(() => entriesRepo.delDia(hoy), [hoy])
  const settings = useLiveQuery(() => getSettings(), [])
  const pesos = useLiveQuery(() => pesosRepo.delRango(addDays(hoy, -DIAS_HISTORIAL), hoy), [hoy])
  const { avisar, toast } = useAviso()
  const [aperturas, setAperturas] = useState(0)
  const [registrando, setRegistrando] = useState(false)

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
    <div className="space-y-section px-4 pb-4 pt-4">
      <header>
        <h1 className="text-heading text-fg">Inicio</h1>
        <p className="text-body-sm text-fg-muted first-letter:uppercase">{fechaLarga}</p>
      </header>

      {!entries || !settings || !pesos ? (
        <div className="animate-fade-in-late">
          <LoadingState />
        </div>
      ) : (
        <div className="space-y-stack">
          <ResumenDiaCard totales={sumMacros(entries)} objetivos={settings.objetivos} onVerDia={onIrANutricion} />
          <PesoCard tendencia={tendencia} onRegistrar={abrirRegistro} />
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
    </div>
  )
}
