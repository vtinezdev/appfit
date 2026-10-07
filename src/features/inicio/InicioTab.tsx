import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../shared/components/Button'
import Icon from '../../shared/components/Icon'
import PageHeader from '../../shared/components/PageHeader'
import { LoadingState } from '../../shared/components/StateMessage'
import { objetivosVigentes } from '../perfil/data/perfilRepo'
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

interface Props {
  onIrANutricion: () => void
  onAnadirComida: () => void
  onIrAGym: () => void
  ayudaInicial?: ReactNode
}

const PESO_POR_DEFECTO = 70
/** Historial que se lee: de sobra para encontrar un pesaje de hace una semana o más. */
const DIAS_HISTORIAL = 365

/** Pantalla de arranque: tarjetas breves del día (energía, entreno y peso) y registrar comida. */
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
      <PageHeader overline={fechaLarga} title="Hoy" />
      {ayudaInicial}

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
      {historialPeso && <HistorialPeso onClose={() => setHistorialPeso(false)} />}
    </div>
  )
}
