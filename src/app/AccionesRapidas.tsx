import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Icon, { type IconName } from '../shared/components/Icon'
import ListGroup from '../shared/components/ListGroup'
import ListRow from '../shared/components/ListRow'
import Sheet from '../shared/components/Sheet'
import { ErrorState } from '../shared/components/StateMessage'
import { useAviso } from '../shared/hooks/useAviso'
import * as routinesRepo from '../features/gym/data/routinesRepo'
import * as workoutsRepo from '../features/gym/data/workoutsRepo'
import RegistroRapido from '../features/inicio/components/RegistroRapido'

interface Props {
  open: boolean
  onClose: () => void
  /** Abre Añadir comida en Nutrición. */
  onComida: () => void
  /** Lleva a Entreno (la sesión activa, si la hay). */
  onEntreno: () => void
}

function Accion({ icon, titulo, detalle, onClick }: { icon: IconName; titulo: string; detalle?: string; onClick: () => void }) {
  return <li><ListRow onClick={onClick}>
    <span className="flex min-w-0 items-center gap-3"><Icon name={icon} size={20} className="text-fg-muted" />
      <span className="min-w-0"><span className="block text-body font-semibold text-fg">{titulo}</span>{detalle && <span className="block break-words text-caption text-fg-muted">{detalle}</span>}</span></span>
    <Icon name="chevron-right" size={18} className="text-fg-subtle" />
  </ListRow></li>
}

/**
 * Hoja del «+» central: registrar comida, empezar o volver al entreno, registrar peso y añadir agua, con los flujos de
 * siempre. La acción elegida se ejecuta al terminar de cerrarse la hoja (sin apilar capas).
 */
export default function AccionesRapidas({ open, onClose, onComida, onEntreno }: Props) {
  const activo = useLiveQuery(() => workoutsRepo.activo(), [])
  const rutinas = useLiveQuery(() => routinesRepo.listar(), [])
  const [paso, setPaso] = useState<'acciones' | 'rutina'>('acciones')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [registro, setRegistro] = useState<'peso' | 'agua' | null>(null)
  const [apertura, setApertura] = useState(0)
  const despues = useRef<(() => void) | null>(null)
  const { avisar, toast } = useAviso()

  function elegir(accion: () => void) { despues.current = accion; onClose() }
  function registrar(que: 'peso' | 'agua') { elegir(() => { setApertura(n => n + 1); setRegistro(que) }) }

  async function empezar(routineId?: number) {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await workoutsRepo.empezar(routineId)
      elegir(onEntreno)
    } catch {
      setError('No se ha podido empezar el entreno. Inténtalo de nuevo.')
    } finally { setOcupado(false) }
  }

  return <>
    <Sheet open={open} onClose={onClose} title={paso === 'rutina' ? 'Empezar entreno' : 'Registrar'}
      onExited={() => { setPaso('acciones'); setError(null); const accion = despues.current; despues.current = null; accion?.() }}>
      {paso === 'acciones' ? <ListGroup variante="plana" aria-label="Acciones rápidas">
        <Accion icon="utensils" titulo="Registrar comida" onClick={() => elegir(onComida)} />
        {activo
          ? <Accion icon="dumbbell" titulo="Volver al entreno" detalle="Tienes una sesión en curso" onClick={() => elegir(onEntreno)} />
          : <Accion icon="dumbbell" titulo="Empezar entreno" detalle={rutinas?.length ? 'Vacío o desde una rutina' : 'Entreno vacío'} onClick={() => { if (rutinas?.length) setPaso('rutina'); else void empezar() }} />}
        <Accion icon="scale" titulo="Registrar peso" onClick={() => registrar('peso')} />
        <Accion icon="droplet" titulo="Añadir agua" onClick={() => registrar('agua')} />
      </ListGroup> : <div className="space-y-2">
        <ListGroup variante="plana" aria-label="Cómo empezar">
          <Accion icon="plus" titulo="Entreno vacío" onClick={() => { void empezar() }} />
          {rutinas?.map(r => <Accion key={r.id} icon="dumbbell" titulo={r.nombre} detalle={`${r.exerciseIds.length} ejercicio${r.exerciseIds.length === 1 ? '' : 's'}`} onClick={() => { void empezar(r.id) }} />)}
        </ListGroup>
      </div>}
      {error && <ErrorState>{error}</ErrorState>}
    </Sheet>
    <RegistroRapido que={registro} apertura={apertura} onCerrar={() => setRegistro(null)} onPesoGuardado={() => avisar({ mensaje: 'Peso registrado' })} />
    {toast}
  </>
}
