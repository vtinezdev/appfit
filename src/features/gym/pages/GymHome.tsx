import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as routinesRepo from '../data/routinesRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import Sheet from '../../../shared/components/Sheet'
import ListRow from '../../../shared/components/ListRow'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import TarjetaEntreno from '../components/TarjetaEntreno'
import RegistrarEntrenoPasado from '../components/RegistrarEntrenoPasado'
import { ErrorState } from '../../../shared/components/StateMessage'
import { useAviso } from '../../../shared/hooks/useAviso'

const ERROR_EMPEZAR = 'No se ha podido empezar el entreno. Inténtalo de nuevo.'

export default function GymHome({ onRegistrado }: { onRegistrado: (id: number) => void }) {
  const [pasado, setPasado] = useState(0)
  const [eligiendoRutina, setEligiendoRutina] = useState(false)
  const [errorRutina, setErrorRutina] = useState<string | null>(null)
  const rutinas = useLiveQuery(() => routinesRepo.listar(), [])
  const { avisarError, toast } = useAviso()

  async function empezarVacio() {
    try {
      await workoutsRepo.empezar()
    } catch {
      avisarError(ERROR_EMPEZAR)
    }
  }

  async function empezarDesdeRutina(routineId: number) {
    try {
      await workoutsRepo.empezar(routineId)
      setEligiendoRutina(false)
    } catch {
      setErrorRutina(ERROR_EMPEZAR)
    }
  }

  function abrirRutinas(abierto: boolean) {
    setErrorRutina(null)
    setEligiendoRutina(abierto)
  }

  return (
    <div className="space-y-section">
      <section aria-label="Empezar a entrenar" className="training-surface space-y-5 p-5">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3"><h2 className="text-display">Tu próxima sesión</h2><Icon name="dumbbell" size={28} className="training-muted mt-1" /></div>
          <p className="training-muted text-body-sm">Elige una rutina o empieza con los ejercicios que quieras.</p>
        </div>
        <div className="space-y-2">
          <Button variant={rutinas?.length ? 'ghost' : 'primary'} className={rutinas?.length ? 'training-secondary' : ''} size="lg" block onClick={empezarVacio}>
            <Icon name="plus" size={20} />
            Entreno vacío
          </Button>
          {!!rutinas?.length && <Button size="lg" block onClick={() => abrirRutinas(true)}>Desde rutina</Button>}
          <Button variant="subtle" block onClick={() => setPasado((n) => n + 1)}>Registrar entreno pasado</Button>
          {rutinas?.length === 0 && <p className="training-muted text-center text-caption">O crea una rutina en la pestaña Rutinas.</p>}
        </div>
      </section>

      <TarjetaEntreno soloUltimo />

      <Sheet open={eligiendoRutina} onClose={() => abrirRutinas(false)} title="Elegir rutina">
        <div className="space-y-2">
          {rutinas?.map((r) => (
            <ListRow tone="muted" key={r.id} onClick={() => empezarDesdeRutina(r.id!)}>
              {r.nombre}
            </ListRow>
          ))}
          {errorRutina && <ErrorState>{errorRutina}</ErrorState>}
        </div>
      </Sheet>

      {pasado > 0 && <RegistrarEntrenoPasado key={pasado} open onClose={() => setPasado(0)} onRegistrado={onRegistrado} />}

      {toast}
    </div>
  )
}
