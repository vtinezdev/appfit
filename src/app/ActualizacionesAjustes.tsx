import Button from '../shared/components/Button'
import Disclosure from '../shared/components/Disclosure'
import Icon from '../shared/components/Icon'
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
  return <div className="space-y-stack">
    <section aria-label="Estado de la actualización" className="space-y-2">
      <p role="status" className="flex items-start gap-2 text-body font-semibold text-fg">
        <Icon name={estado.hayActualizacion ? 'download' : estado.fase === 'al-dia' ? 'check' : 'info'} size={20} className="mt-1 shrink-0 text-fg-muted" />
        {textoActualizacion(estado)}
      </p>
      {estado.fase === 'al-dia' && <p className="text-body-sm text-fg-muted">Estás usando la última versión publicada.</p>}
      {(estado.fase === 'sin-conexion' || estado.fase === 'error' || estado.fase === 'sin-comprobar') && <p className="text-body-sm text-fg-muted">Hace falta conexión para saber si hay una versión nueva. Puedes seguir usando la app.</p>}
      <p className="text-caption text-fg-muted">Versión instalada: {formatFechaHoraConDia(Date.parse(VERSION_INSTALADA.fecha))}.</p>
      {estado.comprobadaEn !== null && <p className="text-caption text-fg-muted">Última comprobación: {formatFechaHoraConDia(estado.comprobadaEn)}.</p>}
      {estado.error && <ErrorState>{estado.error}</ErrorState>}
    </section>
    {estado.fase !== 'desarrollo' && <div className="space-y-2">
      {estado.hayActualizacion && <>
        <p className="text-body-sm text-fg-muted">Al actualizar se recargará la app. Guarda antes lo que estés editando; los registros guardados se conservan.</p>
        <Button variant="primary" block loading={estado.fase === 'aplicando'} disabled={ocupado} onClick={() => void actualizaciones.actualizar()}>Actualizar ahora</Button>
      </>}
      <Button variant="secondary" block loading={estado.fase === 'comprobando'} disabled={ocupado} onClick={() => void actualizaciones.comprobar()}>Comprobar actualizaciones</Button>
    </div>}
    <div className="space-y-2 text-body-sm text-fg-muted">
      <p>AppFit comprueba las novedades al abrirse y al volver a ella con conexión. Si hay una versión nueva, puedes instalarla desde aquí.</p>
      <Disclosure title="Si sigue apareciendo una versión anterior">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Con conexión, pulsa «Comprobar actualizaciones» y después «Actualizar ahora» si aparece.</li>
          <li>Si no termina, cierra AppFit por completo desde el selector de aplicaciones del móvil y vuelve a abrirla desde el mismo icono.</li>
          <li>Espera unos segundos y vuelve a comprobar el estado en esta pantalla.</li>
        </ol>
        <p className="mt-2">No hace falta borrar los datos ni reinstalar la app para actualizarla.</p>
      </Disclosure>
    </div>
  </div>
}
