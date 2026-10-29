import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import Sheet from '../../../shared/components/Sheet'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { EmptyState, ErrorState } from '../../../shared/components/StateMessage'
import MisEjercicios from '../components/MisEjercicios'
import { resumenRutina } from '../lib/rutinas'
import { musculosRutina } from '../lib/fichaRutina'
import TarjetaRutina from '../components/TarjetaRutina'
import EditorRutina from '../components/EditorRutina'
import CreadorRutinas from '../components/CreadorRutinas'
import ListRow from '../../../shared/components/ListRow'
import { useAviso } from '../../../shared/hooks/useAviso'
import { useFiguraMapa } from '../hooks/useFiguraMapa'

interface Props {
  /** Hay un entreno en curso: no se ofrece empezar otro. */
  enCurso: boolean
  /** Abre la sesión recién empezada. */
  onEmpezado: () => void
  /** Abre la ficha de una rutina. */
  onAbrirRutina: (id: number) => void
}

export default function Rutinas({ enCurso, onEmpezado, onAbrirRutina }: Props) {
  const [nueva, setNueva] = useState(0)
  const [misEjercicios, setMisEjercicios] = useState(false)
  const rutinas = useLiveQuery(() => routinesRepo.listar(), [])
  const exercises = useLiveQuery(() => exercisesRepo.listar(), [])
  const workouts = useLiveQuery(() => workoutsRepo.listar(), [])
  const [empezando, setEmpezando] = useState<number | null>(null)
  const [errorEmpezar, setErrorEmpezar] = useState<string | null>(null)
  const [crear, setCrear] = useState(false)
  const [asistente, setAsistente] = useState(false)
  /** Lo elegido en «Crear rutina»: se abre cuando la hoja termina de cerrarse, sin apilar capas. */
  const siguiente = useRef<'blanco' | 'asistente' | null>(null)
  const figura = useFiguraMapa()
  const { avisar, toast } = useAviso()

  const exerciseMap = new Map((exercises ?? []).map((e) => [e.id!, e]))

  /** Empieza el entreno de la rutina y lo abre. Si ya hubiera uno activo, `empezar` lo devuelve sin crear otro. */
  async function empezar(id: number) {
    setEmpezando(id)
    setErrorEmpezar(null)
    try { await workoutsRepo.empezar(id); onEmpezado() } catch { setErrorEmpezar('No se ha podido empezar el entreno. Inténtalo de nuevo.') } finally { setEmpezando(null) }
  }

  return (
    <div className="space-y-stack">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="flex-1 basis-36" aria-haspopup="dialog" onClick={() => setCrear(true)}>
          <Icon name="plus" size={18} />
          Crear rutina
        </Button>
        <Button variant="subtle" className="flex-1 basis-36" onClick={() => setMisEjercicios(true)}>Mis ejercicios</Button>
      </div>

      {rutinas?.length === 0 && <EmptyState icon="dumbbell" title="Todavía no tienes rutinas" />}
      {rutinas && rutinas.length > 0 && (
        <ul aria-label="Tus rutinas" className="space-y-stack">
          {rutinas.map((r) => <li key={r.id}>
            <TarjetaRutina rutina={r} resumen={resumenRutina(r, workouts ?? [], exerciseMap)} musculos={musculosRutina(r, exercises ?? [])} figura={figura}
              miniaturas={r.exerciseIds.filter(id => exerciseMap.has(id)).map(id => exerciseMap.get(id)?.catalogId)} onAbrir={() => onAbrirRutina(r.id)}
              empezar={enCurso ? undefined : { onEmpezar: () => empezar(r.id), loading: empezando === r.id, disabled: empezando !== null }} />
          </li>)}
        </ul>
      )}
      {errorEmpezar && <ErrorState>{errorEmpezar}</ErrorState>}

      <Sheet open={crear} onClose={() => setCrear(false)} title="Crear rutina" onExited={() => {
        if (siguiente.current === 'blanco') setNueva((n) => n + 1)
        if (siguiente.current === 'asistente') setAsistente(true)
        siguiente.current = null
      }}>
        <div className="space-y-2">
          <ListRow tone="muted" onClick={() => { siguiente.current = 'blanco'; setCrear(false) }}>
            <span className="min-w-0 space-y-0.5">
              <span className="block font-medium">En blanco</span>
              <span className="block text-caption text-fg-muted">Eliges tú el nombre, los ejercicios y sus objetivos.</span>
            </span>
          </ListRow>
          <ListRow tone="muted" onClick={() => { siguiente.current = 'asistente'; setCrear(false) }}>
            <span className="min-w-0 space-y-0.5">
              <span className="block font-medium">Con el asistente</span>
              <span className="block text-caption text-fg-muted">Un plan de rutinas según tus días, tiempo, material y objetivo, que puedes cambiar antes de guardar.</span>
            </span>
          </ListRow>
        </div>
      </Sheet>
      {asistente && <CreadorRutinas onClose={() => setAsistente(false)}
        onGuardado={(ids) => avisar({ mensaje: `${ids.length} rutinas creadas`, onDeshacer: () => routinesRepo.borrarVarias(ids) })} />}
      {toast}
      {misEjercicios && <MisEjercicios onClose={() => setMisEjercicios(false)} />}
      {nueva > 0 && <EditorRutina key={nueva} inicial={{ nombre: '', exerciseIds: [] }} onClose={() => setNueva(0)} />}
    </div>
  )
}
