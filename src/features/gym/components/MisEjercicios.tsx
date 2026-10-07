import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import { EQUIPAMIENTO, MUSCULOS, type Equipo, type Musculo } from '../lib/catalogoEjercicios'
import { ErrorSeleccionEjercicio } from '../lib/selectorEjercicios'
import type { Exercise } from '../../../shared/db/types'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { Input, Select } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import ModalPage from '../../../shared/components/ModalPage'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'

/** Gestión de ejercicios personalizados: renombrar, reclasificar y borrar los que no tienen uso. */
export default function MisEjercicios({ onClose }: { onClose: () => void }) {
  const datos = useLiveQuery(async () => {
    const lista = await exercisesRepo.personalizados()
    const usos = await Promise.all(lista.map((e) => exercisesRepo.usoDe(e.id)))
    return lista.map((e, i) => ({ e, uso: usos[i] }))
  }, [])
  const [editando, setEditando] = useState<Exercise | null>(null)
  const [nombre, setNombre] = useState('')
  const [musculo, setMusculo] = useState<Musculo | ''>('')
  const [equipo, setEquipo] = useState<Equipo | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [borrado, setBorrado] = useState<Exercise | null>(null)

  function abrir(e: Exercise) {
    setEditando(e)
    setNombre(e.nombre)
    setMusculo((e.primaryMuscles?.[0] as Musculo | undefined) ?? '')
    setEquipo((e.equipment?.[0] as Equipo | undefined) ?? '')
    setError(null)
  }

  const uso = datos?.find((d) => d.e.id === editando?.id)?.uso

  async function guardar() {
    if (!editando || ocupado) return
    if (!nombre.trim() || !musculo || !equipo) { setError('Completa el nombre, músculo y equipamiento.'); return }
    setOcupado(true)
    setError(null)
    try {
      await exercisesRepo.editarPersonalizado(editando.id, { nombre, musculo, equipo })
      setEditando(null)
    } catch (e) {
      setError(e instanceof ErrorSeleccionEjercicio ? e.message : 'No se ha podido guardar el ejercicio. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  async function borrar() {
    if (!editando || ocupado) return
    setOcupado(true)
    setError(null)
    try {
      setBorrado(await exercisesRepo.borrarPersonalizado(editando.id))
      setEditando(null)
    } catch (e) {
      setError(e instanceof ErrorSeleccionEjercicio ? e.message : 'No se ha podido borrar el ejercicio. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  async function deshacer() {
    if (!borrado) return
    try {
      await exercisesRepo.restaurar(borrado)
      setBorrado(null)
    } catch {
      setError('No se ha podido deshacer. Inténtalo de nuevo.')
    }
  }

  return (
    <>
      <ModalPage title="Mis ejercicios" onClose={onClose}>
        <div className="space-y-3">
          {borrado && (
            <div role="status" className="flex min-h-touch items-center justify-between gap-3 rounded-md bg-surface-muted px-3 text-body-sm text-fg">
              <span className="min-w-0 break-words">«{borrado.nombre}» borrado</span>
              <Button variant="ghost" size="sm" onClick={deshacer}>Deshacer</Button>
            </div>
          )}
          {error && !editando && <ErrorState>{error}</ErrorState>}
          {datos === undefined ? <LoadingState /> : datos.length === 0 ? (
            <EmptyState icon="dumbbell" title="Sin ejercicios propios">Los que crees al añadir un ejercicio aparecerán aquí. Los del catálogo no se editan.</EmptyState>
          ) : (
            <ListGroup aria-label="Ejercicios personalizados">
              {datos.map(({ e, uso: u }) => (
                <li key={e.id}>
                  <ListRow onClick={() => abrir(e)}>
                    <span className="min-w-0">
                      <span className="block break-words text-body font-medium text-fg">{e.nombre}</span>
                      <span className="block text-caption text-fg-muted">{e.grupo} · {u.series} {u.series === 1 ? 'serie' : 'series'} · {u.rutinas} {u.rutinas === 1 ? 'rutina' : 'rutinas'}</span>
                    </span>
                    <Icon name="chevron-right" size={18} className="text-fg-subtle" />
                  </ListRow>
                </li>
              ))}
            </ListGroup>
          )}
        </div>
      </ModalPage>
      {editando && (
        <ModalPage title="Editar ejercicio" onClose={() => setEditando(null)} closeLabel="Lista" busy={ocupado}
          footer={<div className="space-y-2">{error && <ErrorState>{error}</ErrorState>}<Button block loading={ocupado} onClick={guardar}>Guardar</Button></div>}>
          <div className="space-y-3">
            <label className="block space-y-2"><span className="text-label text-fg-muted">Nombre</span><Input value={nombre} disabled={ocupado} onChange={(e) => setNombre(e.target.value)} /></label>
            <label className="block space-y-2"><span className="text-label text-fg-muted">Músculo principal</span>
              <Select value={musculo} disabled={ocupado} onChange={(e) => setMusculo(e.target.value as Musculo)}><option value="">Selecciona un músculo</option>{Object.entries(MUSCULOS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select></label>
            <label className="block space-y-2"><span className="text-label text-fg-muted">Equipamiento</span>
              <Select value={equipo} disabled={ocupado} onChange={(e) => setEquipo(e.target.value as Equipo)}><option value="">Selecciona equipamiento</option>{Object.entries(EQUIPAMIENTO).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select></label>
            <p className="text-caption text-fg-muted">Renombrar no cambia tu historial: las series siguen vinculadas a este ejercicio.</p>
            <div className="space-y-2 border-t border-line pt-3">
              {uso && (uso.series > 0 || uso.rutinas > 0)
                ? <p className="text-body-sm text-fg-muted">{exercisesRepo.motivoNoBorrable(uso)} Para borrarlo, quítalo antes de esas rutinas y entrenos.</p>
                : <Button variant="destructive" block disabled={ocupado} onClick={borrar}>Borrar ejercicio</Button>}
            </div>
          </div>
        </ModalPage>
      )}
    </>
  )
}
