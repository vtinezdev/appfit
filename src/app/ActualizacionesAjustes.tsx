import Button from '../shared/components/Button'
import Card from '../shared/components/Card'
import Disclosure from '../shared/components/Disclosure'
import Icon from '../shared/components/Icon'
import ListGroup from '../shared/components/ListGroup'
import { ErrorState } from '../shared/components/StateMessage'
import { formatFechaHoraConDia } from '../shared/lib/dates'
import { actualizaciones, VERSION_INSTALADA } from '../shared/pwa/actualizaciones'
import { useActualizaciones } from '../shared/pwa/useActualizaciones'
import { textoActualizacion } from '../shared/pwa/version'

export function ResumenActualizacion() {
  return textoActualizacion(useActualizaciones())
}

export default function ActualizacionesAjustes() {
  const estado = useActualizaciones()
  const ocupado = estado.fase === 'comprobando' || estado.fase === 'aplicando'
  // Punto 30: el estado en una tarjeta con su icono, la versión y la comprobación debajo, y las acciones; lo que hace
  // la app y qué hacer si sigue la versión anterior, como pie y en un desplegable.
  const icono = estado.hayActualizacion ? 'download' : estado.fase === 'al-dia' ? 'check' : 'info'
  return <div className="space-y-stack">
    <Card className="space-y-4">
      <section aria-label="Estado de la actualización" className="flex items-start gap-3">
        <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${estado.fase === 'al-dia' ? 'bg-accent text-accent-on' : estado.hayActualizacion ? 'bg-fg text-bg' : 'bg-surface-muted text-fg'}`}><Icon name={icono} size={20} /></span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p role="status" className="break-words text-body font-semibold text-fg">{textoActualizacion(estado)}</p>
          {estado.fase === 'al-dia' && <p className="text-body-sm text-fg-muted">Tienes la última versión publicada.</p>}
          {(estado.fase === 'sin-conexion' || estado.fase === 'error' || estado.fase === 'sin-comprobar') && <p className="text-body-sm text-fg-muted">Hace falta conexión para saber si hay una nueva. Puedes seguir usando la app.</p>}
          {estado.hayActualizacion && <p className="text-body-sm text-fg-muted">Al actualizar, la app se recarga: guarda antes lo que estés editando. Tus registros se conservan.</p>}
        </div>
      </section>
      <dl className="tabular grid grid-cols-2 gap-3 border-t border-line pt-3 text-caption">
        <div className="min-w-0"><dt className="text-fg-muted">Versión instalada</dt><dd className="break-words font-semibold text-fg">{formatFechaHoraConDia(Date.parse(VERSION_INSTALADA.fecha))}</dd></div>
        <div className="min-w-0"><dt className="text-fg-muted">Última comprobación</dt><dd className="break-words font-semibold text-fg">{estado.comprobadaEn !== null ? formatFechaHoraConDia(estado.comprobadaEn) : 'Aún no'}</dd></div>
      </dl>
      {estado.error && <ErrorState>{estado.error}</ErrorState>}
      {estado.fase !== 'desarrollo' && <div className="space-y-2">
        {estado.hayActualizacion && <Button variant="primary" block loading={estado.fase === 'aplicando'} disabled={ocupado} onClick={() => void actualizaciones.actualizar()}>Actualizar ahora</Button>}
        <Button variant="secondary" block loading={estado.fase === 'comprobando'} disabled={ocupado} onClick={() => void actualizaciones.comprobar()}>Comprobar actualizaciones</Button>
      </div>}
    </Card>
    <ListGroup aria-label="Ayuda con las actualizaciones" pie="AppFit busca novedades al abrirse y al volver a ella con conexión.">
      <li><Disclosure title="Si sigue apareciendo una versión anterior">
        <ol className="list-decimal space-y-2 pl-5 text-body-sm text-fg-muted">
          <li>Con conexión, pulsa «Comprobar actualizaciones» y después «Actualizar ahora» si aparece.</li>
          <li>Si no termina, cierra AppFit por completo desde el selector de aplicaciones del móvil y vuelve a abrirla desde el mismo icono.</li>
          <li>Espera unos segundos y vuelve a comprobar el estado en esta pantalla.</li>
        </ol>
        <p className="mt-2 text-body-sm text-fg-muted">No hace falta borrar los datos ni reinstalar la app para actualizarla.</p>
      </Disclosure></li>
    </ListGroup>
  </div>
}
