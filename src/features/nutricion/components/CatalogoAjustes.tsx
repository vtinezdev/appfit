import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import SectionHeader from '../../../shared/components/SectionHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import * as catalogRepo from '../data/catalogRepo'
import { sincronizarCatalogo } from '../lib/catalogo/sincronizar'
import { detalleFuente, mensajeError, nombreFuente, resumenResultado } from '../lib/catalogo/textos'

type Estado = { tipo: 'ok'; texto: string } | { tipo: 'error'; texto: string } | null

/**
 * Sección de Ajustes del catálogo de alimentos descargado (CIQUAL…): qué hay instalado, su atribución
 * (la exige la licencia), buscar una versión nueva y borrarlo. Borrarlo no afecta a los datos del usuario
 * y se vuelve a descargar solo en el siguiente arranque con conexión.
 */
export default function CatalogoAjustes() {
  const fuentes = useLiveQuery(() => catalogRepo.fuentes(), [])
  const [buscando, setBuscando] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [estado, setEstado] = useState<Estado>(null)

  async function buscarActualizacion() {
    setBuscando(true)
    setEstado(null)
    try {
      setEstado({ tipo: 'ok', texto: resumenResultado(await sincronizarCatalogo()) })
    } catch (e) {
      setEstado({ tipo: 'error', texto: mensajeError(e, navigator.onLine) })
    } finally {
      setBuscando(false)
    }
  }

  async function borrar() {
    setBorrando(true)
    try {
      await catalogRepo.borrarCatalogo()
      setEstado({ tipo: 'ok', texto: 'Catálogo borrado. Se volverá a descargar al abrir la app con conexión.' })
      setConfirmandoBorrado(false)
    } catch (e) {
      setEstado({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo borrar el catálogo.' })
    } finally {
      setBorrando(false)
    }
  }

  return (
    <Card className="space-y-3">
      <SectionHeader>Catálogo de alimentos</SectionHeader>

      {fuentes === undefined ? (
        <LoadingState />
      ) : fuentes.length === 0 ? (
        <EmptyState>
          <span className="block text-body-sm text-fg-muted">Sin descargar</span>
          <span className="block text-caption">
            Se descarga solo al abrir la app con conexión. Pulsa «Buscar actualización» para hacerlo ahora.
          </span>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {fuentes.map((f) => (
            <li key={f.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body-sm text-fg-muted">{nombreFuente(f.id)}</span>
                <span className="text-body-sm text-fg-subtle">{detalleFuente(f)}</span>
              </div>
              <p className="text-caption text-fg-subtle">{f.atribucion}</p>
            </li>
          ))}
        </ul>
      )}

      {estado?.tipo === 'ok' && <p className="text-body-sm text-accent">{estado.texto}</p>}
      {estado?.tipo === 'error' && <ErrorState>{estado.texto}</ErrorState>}

      {!confirmandoBorrado ? (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={buscarActualizacion} disabled={buscando} className="flex-1">
            {buscando ? 'Buscando…' : 'Buscar actualización'}
          </Button>
          {fuentes && fuentes.length > 0 && (
            <Button variant="destructive" onClick={() => setConfirmandoBorrado(true)} disabled={buscando} className="flex-1">
              Borrar catálogo
            </Button>
          )}
        </div>
      ) : (
        <ConfirmacionDestructiva
          mensaje="¿Borrar el catálogo? No afecta a tus alimentos, comidas ni plantillas. Se volverá a descargar al abrir la app con conexión; los productos escaneados se volverán a consultar al escanearlos."
          confirmar="Sí, borrar"
          onConfirmar={borrar}
          onCancelar={() => setConfirmandoBorrado(false)}
          ocupado={borrando}
        />
      )}
    </Card>
  )
}
