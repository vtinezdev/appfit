import { useEffect, useState } from 'react'
import Button from '../shared/components/Button'
import Card from '../shared/components/Card'
import SectionHeader from '../shared/components/SectionHeader'
import { consultarPersistencia, entornoDeApp, solicitarPersistencia, type Persistencia } from '../shared/lib/almacenamiento'

const MENSAJES: Record<Persistencia, string> = {
  concedida: 'El navegador ha concedido protección frente al borrado automático por falta de espacio.',
  'no-concedida': 'Los datos se guardan en este dispositivo, pero el navegador aún no ha concedido protección frente al borrado automático.',
  'no-disponible': 'Este navegador no permite consultar o solicitar la protección frente al borrado automático.',
  error: 'No se ha podido comprobar la protección del almacenamiento. Puedes volver a intentarlo.',
}

export default function AlmacenamientoAjustes() {
  const [persistencia, setPersistencia] = useState<Persistencia | null>(null)
  const [solicitando, setSolicitando] = useState(false)
  const { instalada } = entornoDeApp()

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
      <SectionHeader variant="section">Tus registros</SectionHeader>
      <Card className="space-y-3">
        <p className="text-body-sm font-semibold">{instalada ? 'Guardados en el acceso de la pantalla de inicio' : 'Guardados en este navegador'}</p>
        <p className="text-body-sm text-fg-muted">Cerrar la app o actualizarla conserva los registros. Usa siempre la misma dirección y el mismo acceso.</p>
        <p role="status" className="text-body-sm text-fg-muted">{persistencia ? MENSAJES[persistencia] : 'Comprobando almacenamiento…'}</p>
        {(persistencia === 'no-concedida' || persistencia === 'error') && (
          <Button variant="secondary" block loading={solicitando} onClick={proteger}>Proteger almacenamiento</Button>
        )}
        <p className="text-caption text-fg-subtle">La copia exportada permite recuperar los datos si cambias de móvil o borras los datos del navegador.</p>
      </Card>
    </section>
  )
}
