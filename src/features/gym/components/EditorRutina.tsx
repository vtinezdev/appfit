import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import type { ObjetivoEjercicio } from '../../../shared/db/types'
import Sheet from '../../../shared/components/Sheet'
import Button, { IconButton } from '../../../shared/components/Button'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import { ErrorState } from '../../../shared/components/StateMessage'
import { CamposAgarre } from './EjecucionEjercicio'
import MiniaturaEjercicio from './MiniaturaEjercicio'
import ObjetivoRutina from './ObjetivoRutina'
import SelectorEjercicios from './SelectorEjercicios'
import { admiteElegirAgarre, textoAgarre } from '../lib/agarres'
import type { SeleccionEjercicio } from '../lib/selectorEjercicios'
import { moverElemento } from '../lib/workout'
import { separar, superserieDe, superseriesDe, superseriesValidas, unirConSiguiente } from '../lib/superseries'

interface Props {
  /** Rutina que se edita (con `id`) o borrador de una nueva. */
  inicial: routinesRepo.RoutineInput
  /** La hoja ha terminado de cerrarse (guardada, borrada o descartada): el padre la desmonta. */
  onClose: () => void
  onBorrada?: () => void
}

/** Hoja de edición de una rutina: nombre, ejercicios (orden, agarre y objetivo), guardar y borrar. */
export default function EditorRutina({ inicial, onClose, onBorrada }: Props) {
  const [abierta, setAbierta] = useState(true)
  const [editando, setEditando] = useState(inicial)
  const [editandoAgarre, setEditandoAgarre] = useState<number | null>(null)
  const [seleccionando, setSeleccionando] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const exercises = useLiveQuery(() => exercisesRepo.listar(), [])
  const exerciseMap = new Map((exercises ?? []).map((e) => [e.id!, e]))

  async function guardar() {
    if (!editando.nombre.trim() || ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await routinesRepo.guardar(editando)
      setAbierta(false)
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
      onBorrada?.()
      setAbierta(false)
    } catch {
      setConfirmandoBorrado(false)
      setError('No se ha podido borrar la rutina. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  async function agregarEjercicio(value: SeleccionEjercicio) {
    const id = await exercisesRepo.resolverSeleccion(value)
    setEditando(previous => !previous.exerciseIds.includes(id) ? { ...previous, exerciseIds: [...previous.exerciseIds, id], ...(value.agarre !== undefined ? { agarres: { ...previous.agarres, [id]: value.agarre } } : {}) } : previous)
  }

  function quitarEjercicio(id: number) {
    const { [id]: _agarre, ...agarres } = editando.agarres ?? {}
    const { [id]: _quitado, ...objetivos } = editando.objetivos ?? {}
    setEditando({ ...editando, exerciseIds: editando.exerciseIds.filter((e) => e !== id), objetivos, agarres })
  }

  // Superseries (A21): las que siguen juntas en este orden; al guardar se quitan las que no.
  const pares = superseriesValidas(superseriesDe(editando), editando.exerciseIds)
  function alternarSuperserie(id: number) {
    const unida = superserieDe(pares, id)?.[0] === id
    setEditando({ ...editando, superseries: unida ? separar(pares, editando.exerciseIds, id) : unirConSiguiente(pares, editando.exerciseIds, id) ?? pares })
  }

  function moverEjercicio(indice: number, delta: -1 | 1) {
    setEditando({ ...editando, exerciseIds: moverElemento(editando.exerciseIds, indice, delta) })
  }

  function cambiarObjetivo(id: number, objetivo: ObjetivoEjercicio | undefined) {
    const { [id]: _anterior, ...resto } = editando.objetivos ?? {}
    setEditando({ ...editando, objetivos: objetivo ? { ...resto, [id]: objetivo } : resto })
  }

  return <>
    <Sheet open={abierta} onClose={() => setAbierta(false)} onExited={onClose} title={editando.id ? 'Editar rutina' : 'Nueva rutina'} footer={<div className="space-y-2">
      {error && <ErrorState>{error}</ErrorState>}
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
      <div className="space-y-3">
        <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre de la rutina</span><Input
          value={editando.nombre}
          onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
          placeholder="Nombre de la rutina"
        /></label>

        <div className="space-y-1">
          {editando.exerciseIds.map((id, i) => {
            const nombre = exerciseMap.get(id)?.nombre ?? 'ejercicio'
            const siguiente = editando.exerciseIds[i + 1]
            const unidaConSiguiente = superserieDe(pares, id)?.[0] === id
            const libre = siguiente !== undefined && !superserieDe(pares, id) && !superserieDe(pares, siguiente)
            const nombreSiguiente = exerciseMap.get(siguiente)?.nombre ?? 'el siguiente'
            return (
              <div key={id} className={`border-b border-line py-1 ${superserieDe(pares, id) ? 'border-l-4 border-l-accent pl-2' : ''}`}>
                <div className="flex min-h-touch flex-wrap items-center justify-between gap-2">
                  <MiniaturaEjercicio catalogId={exerciseMap.get(id)?.catalogId} />
                  <span className="min-w-0 flex-1 basis-24 break-words text-body text-fg"><span className="tabular text-caption text-fg-muted">{i + 1}. </span>{exerciseMap.get(id)?.nombre ?? '…'}</span>
                  <IconButton icon="chevron-left" label={`Subir ${nombre}`} variant="ghost" size="sm" className="rotate-90" disabled={i === 0} onClick={() => moverEjercicio(i, -1)} />
                  <IconButton icon="chevron-right" label={`Bajar ${nombre}`} variant="ghost" size="sm" className="rotate-90" disabled={i === editando.exerciseIds.length - 1} onClick={() => moverEjercicio(i, 1)} />
                  <IconButton icon="close" label={`Quitar ${nombre}`} variant="ghost" size="sm" onClick={() => quitarEjercicio(id)} />
                </div>
                {exerciseMap.has(id) && (admiteElegirAgarre(exerciseMap.get(id)!) || editando.agarres?.[id]) && <div className="space-y-3 py-2">
                  <Button variant="ghost" size="sm" className="max-w-full break-words text-left" onClick={() => setEditandoAgarre(editandoAgarre === id ? null : id)} aria-expanded={editandoAgarre === id}>
                    Agarre de {nombre}: {textoAgarre(editando.agarres?.[id]) || 'Sin especificar'}
                  </Button>
                  {editandoAgarre === id && <CamposAgarre ejercicio={exerciseMap.get(id)!} valor={editando.agarres?.[id] ?? undefined}
                    onChange={agarre => setEditando({ ...editando, agarres: { ...editando.agarres, [id]: agarre ?? null } })} />}
                </div>}
                <ObjetivoRutina nombre={nombre} objetivo={editando.objetivos?.[id]} onChange={(o) => cambiarObjetivo(id, o)} />
                {(unidaConSiguiente || libre) && <Button variant="ghost" size="sm" className="max-w-full break-words text-left" aria-pressed={unidaConSiguiente} onClick={() => alternarSuperserie(id)}>
                  <Icon name={unidaConSiguiente ? 'check' : 'plus'} size={16} />{unidaConSiguiente ? `En superserie con ${nombreSiguiente}` : `Superserie con ${nombreSiguiente}`}
                </Button>}
              </div>
            )
          })}
        </div>

        <Button variant="secondary" block onClick={() => setSeleccionando(true)}><Icon name="plus" size={18} />Añadir ejercicio</Button>
      </div>
    </Sheet>
    {seleccionando && <SelectorEjercicios excluir={editando.exerciseIds} onClose={() => setSeleccionando(false)} onElegir={agregarEjercicio} />}
  </>
}
