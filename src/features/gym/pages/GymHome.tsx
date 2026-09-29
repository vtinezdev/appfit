import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as routinesRepo from '../data/routinesRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import Sheet from '../../../shared/components/Sheet'
import ListRow from '../../../shared/components/ListRow'
import Button from '../../../shared/components/Button'
import { ErrorState } from '../../../shared/components/StateMessage'
import { useAviso } from '../../../shared/hooks/useAviso'

const ERROR_EMPEZAR = 'No se ha podido empezar el entreno. Inténtalo de nuevo.'

export default function GymHome() {
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
    <div className="space-y-3 pb-4">
      <Button size="lg" block onClick={empezarVacio}>
        Entreno vacío
      </Button>
      <Button variant="secondary" size="lg" block
        onClick={() => abrirRutinas(true)}
        disabled={!rutinas || rutinas.length === 0}
      >
        Desde rutina
      </Button>
      {rutinas?.length === 0 && <p className="text-center text-body-sm text-fg-subtle">Crea una rutina primero en la pestaña Rutinas.</p>}

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

      {toast}
    </div>
  )
}
