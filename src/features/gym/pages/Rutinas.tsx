import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import type { ObjetivoEjercicio } from '../../../shared/db/types'
import SelectorEjercicios from '../components/SelectorEjercicios'
import type { SeleccionEjercicio } from '../lib/selectorEjercicios'
import Sheet from '../../../shared/components/Sheet'
import Button, { IconButton } from '../../../shared/components/Button'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import { EmptyState, ErrorState } from '../../../shared/components/StateMessage'
import ObjetivoRutina from '../components/ObjetivoRutina'
import MisEjercicios from '../components/MisEjercicios'
import { moverElemento } from '../lib/workout'
import { resumenRutina } from '../lib/rutinas'
import Card from '../../../shared/components/Card'
import { detalleRutina, MosaicoRutina } from '../components/RutinaResumen'
import CreadorRutinas from '../components/CreadorRutinas'
import ListRow from '../../../shared/components/ListRow'
import { useAviso } from '../../../shared/hooks/useAviso'

interface Props {
  /** Hay un entreno en curso: no se ofrece empezar otro. */
  enCurso: boolean
  /** Abre la sesión recién empezada. */
  onEmpezado: () => void
}

export default function Rutinas({ enCurso, onEmpezado }: Props) {
  const [editando, setEditando] = useState<routinesRepo.RoutineInput | null>(null)
  const [seleccionando, setSeleccionando] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [misEjercicios, setMisEjercicios] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rutinas = useLiveQuery(() => routinesRepo.listar(), [])
  const exercises = useLiveQuery(() => exercisesRepo.listar(), [])
  const workouts = useLiveQuery(() => workoutsRepo.listar(), [])
  const [empezando, setEmpezando] = useState<number | null>(null)
  const [errorEmpezar, setErrorEmpezar] = useState<string | null>(null)
  const [crear, setCrear] = useState(false)
  const [asistente, setAsistente] = useState(false)
  /** Lo elegido en «Crear rutina»: se abre cuando la hoja termina de cerrarse, sin apilar capas. */
  const siguiente = useRef<'blanco' | 'asistente' | null>(null)
  const { avisar, toast } = useAviso()

  const exerciseMap = new Map((exercises ?? []).map((e) => [e.id!, e]))

  /** Empieza el entreno de la rutina y lo abre. Si ya hubiera uno activo, `empezar` lo devuelve sin crear otro. */
  async function empezar(id: number) {
    setEmpezando(id)
    setErrorEmpezar(null)
    try { await workoutsRepo.empezar(id); onEmpezado() } catch { setErrorEmpezar('No se ha podido empezar el entreno. Inténtalo de nuevo.') } finally { setEmpezando(null) }
  }

  /** Abre o cierra el sheet de edición, sin arrastrar confirmaciones ni errores de la rutina anterior. */
  function abrir(draft: routinesRepo.RoutineInput | null) {
    setSeleccionando(false)
    setConfirmandoBorrado(false)
    setError(null)
    setEditando(draft)
  }

  async function guardar() {
    if (!editando || !editando.nombre.trim() || ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await routinesRepo.guardar(editando)
      abrir(null)
    } catch {
      setError('No se ha podido guardar la rutina. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  async function borrar(id: number) {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await routinesRepo.borrar(id)
      abrir(null)
    } catch {
      setConfirmandoBorrado(false)
      setError('No se ha podido borrar la rutina. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  async function agregarEjercicio(value: SeleccionEjercicio) {
    const id = await exercisesRepo.resolverSeleccion(value)
    setEditando(previous => previous && !previous.exerciseIds.includes(id) ? { ...previous, exerciseIds: [...previous.exerciseIds, id] } : previous)
  }

  function quitarEjercicio(id: number) {
    if (!editando) return
    const { [id]: _quitado, ...objetivos } = editando.objetivos ?? {}
    setEditando({ ...editando, exerciseIds: editando.exerciseIds.filter((e) => e !== id), objetivos })
  }

  function moverEjercicio(indice: number, delta: -1 | 1) {
    if (!editando) return
    setEditando({ ...editando, exerciseIds: moverElemento(editando.exerciseIds, indice, delta) })
  }

  function cambiarObjetivo(id: number, objetivo: ObjetivoEjercicio | undefined) {
    if (!editando) return
    const { [id]: _anterior, ...resto } = editando.objetivos ?? {}
    setEditando({ ...editando, objetivos: objetivo ? { ...resto, [id]: objetivo } : resto })
  }

  return (
    <div className="space-y-stack">
      <Button variant="secondary" block aria-haspopup="dialog" onClick={() => setCrear(true)}>
        <Icon name="plus" size={18} />
        Crear rutina
      </Button>
      <Button variant="subtle" block onClick={() => setMisEjercicios(true)}>Mis ejercicios</Button>

      {rutinas?.length === 0 && <EmptyState icon="dumbbell" title="Todavía no tienes rutinas">Crea una para empezar tus entrenos con los ejercicios ya elegidos.</EmptyState>}
      {rutinas && rutinas.length > 0 && (
        <ul aria-label="Tus rutinas" className="space-y-stack">
          {rutinas.map((r) => {
            const resumen = resumenRutina(r, workouts ?? [], exerciseMap)
            return <li key={r.id}>
              <Card className="rutina-card flex flex-wrap items-center gap-3">
                <button type="button" className="app-button flex min-h-touch min-w-0 flex-1 basis-48 items-center gap-3 text-left" aria-label={`Editar ${r.nombre}`} onClick={() => abrir(r)}>
                  <MosaicoRutina resumen={resumen} />
                  <span className="min-w-0">
                    <span className="block break-words text-title text-fg">{r.nombre}</span>
                    <span className="tabular block break-words text-caption text-fg-muted">{detalleRutina(r, resumen)}</span>
                  </span>
                </button>
                {!enCurso && <Button variant="secondary" size="sm" className="ml-auto" disabled={empezando !== null} loading={empezando === r.id} aria-label={`Empezar ${r.nombre}`} onClick={() => empezar(r.id)}>Empezar</Button>}
              </Card>
            </li>
          })}
        </ul>
      )}
      {errorEmpezar && <ErrorState>{errorEmpezar}</ErrorState>}

      <Sheet open={editando !== null} onClose={() => abrir(null)} title={editando?.id ? 'Editar rutina' : 'Nueva rutina'} footer={editando && <div className="space-y-2">            {error && <ErrorState>{error}</ErrorState>}

            {confirmandoBorrado && editando.id ? (
              <div className="pt-2">
                <ConfirmacionDestructiva
                  mensaje={`¿Borrar la rutina «${editando.nombre.trim() || 'sin nombre'}»? No se puede deshacer. Tus entrenos ya hechos no se borran.`}
                  confirmar="Sí, borrar"
                  onConfirmar={() => borrar(editando.id!)}
                  onCancelar={() => setConfirmandoBorrado(false)}
                  ocupado={ocupado}
                />
              </div>
            ) : (
              <div className="flex gap-2 pt-2">
                {editando.id && (
                  <Button variant="destructive" onClick={() => setConfirmandoBorrado(true)} className="flex-1">
                    Borrar
                  </Button>
                )}
                <Button loading={ocupado} onClick={guardar} disabled={!editando.nombre.trim()} className="flex-1">
                  Guardar
                </Button>
              </div>
            )}</div>}>
        {editando && (
          <div className="space-y-3">
            <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre de la rutina</span><Input
              value={editando.nombre}
              onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
              placeholder="Nombre de la rutina"
            /></label>

            <div className="space-y-1">
              {editando.exerciseIds.map((id, i) => {
                const nombre = exerciseMap.get(id)?.nombre ?? 'ejercicio'
                return (
                  <div key={id} className="border-b border-line py-1">
                    <div className="flex min-h-touch items-center justify-between gap-1">
                      <span className="tabular w-5 shrink-0 text-caption text-fg-muted">{i + 1}</span><span className="min-w-0 flex-1 break-words text-body text-fg">{exerciseMap.get(id)?.nombre ?? '…'}</span>
                      <IconButton icon="chevron-left" label={`Subir ${nombre}`} variant="ghost" size="sm" className="rotate-90" disabled={i === 0} onClick={() => moverEjercicio(i, -1)} />
                      <IconButton icon="chevron-right" label={`Bajar ${nombre}`} variant="ghost" size="sm" className="rotate-90" disabled={i === editando.exerciseIds.length - 1} onClick={() => moverEjercicio(i, 1)} />
                      <IconButton icon="close" label={`Quitar ${nombre}`} variant="ghost" size="sm" onClick={() => quitarEjercicio(id)} />
                    </div>
                    <ObjetivoRutina nombre={nombre} objetivo={editando.objetivos?.[id]} onChange={(o) => cambiarObjetivo(id, o)} />
                  </div>
                )
              })}
            </div>

            <Button variant="secondary" block onClick={() => setSeleccionando(true)}><Icon name="plus" size={18} />Añadir ejercicio</Button>


          </div>
        )}
      </Sheet>
      <Sheet open={crear} onClose={() => setCrear(false)} title="Crear rutina" onExited={() => {
        if (siguiente.current === 'blanco') abrir({ nombre: '', exerciseIds: [] })
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
      {seleccionando && editando && <SelectorEjercicios excluir={editando.exerciseIds} onClose={() => setSeleccionando(false)} onElegir={agregarEjercicio} />}
    </div>
  )
}
