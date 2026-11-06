import { useEffect, useState } from 'react'
import Button from '../shared/components/Button'
import Disclosure from '../shared/components/Disclosure'
import { consultarPersistencia, solicitarPersistencia, type Persistencia } from '../shared/lib/almacenamiento'

const MENSAJES: Record<Persistencia, string> = {
  concedida: 'Están protegidos: el móvil no los borrará aunque se quede sin espacio.',
  'no-concedida': 'Aún no están protegidos: si el móvil se queda sin espacio, podría borrarlos. Protégelos y haz copias de vez en cuando.',
  'no-disponible': 'Este móvil no permite saber si están protegidos frente al borrado por falta de espacio. Haz copias de vez en cuando.',
  error: 'No se ha podido comprobar la protección del almacenamiento. Puedes volver a intentarlo.',
}

export default function AlmacenamientoAjustes() {
  const [persistencia, setPersistencia] = useState<Persistencia | null>(null)
  const [solicitando, setSolicitando] = useState(false)

  useEffect(() => {
    let activa = true
    consultarPersistencia().then((estado) => { if (activa) setPersistencia(estado) })
    return () => { activa = false }
  }, [])

  async function proteger() {
    setSolicitando(true)
    setPersistencia(await solicitarPersistencia())
    setSolicitando(false)
  }

  return (
    <section aria-label="Almacenamiento" className="space-y-stack">
      <Disclosure title="Dónde se guardan tus registros">
      <div className="space-y-3">
        <p className="text-body-sm font-semibold">Guardados en este móvil</p>
        <p className="text-body-sm text-fg-muted">Cerrar la app o actualizarla conserva los registros. Si desinstalas la app o borras sus datos, se pierden: exporta antes una copia o usa la de la cuenta.</p>
        <p role="status" className="text-body-sm text-fg-muted">{persistencia ? MENSAJES[persistencia] : 'Comprobando almacenamiento…'}</p>
        {(persistencia === 'no-concedida' || persistencia === 'error') && (
          <Button variant="secondary" block loading={solicitando} onClick={proteger}>Proteger almacenamiento</Button>
        )}
      </div>
      </Disclosure>
    </section>
  )
}
