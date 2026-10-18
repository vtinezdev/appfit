import Publicar, { SiPuedePublicar } from '../../social/components/Publicar'
import * as workoutsRepo from '../data/workoutsRepo'
import { useResumenEntreno, type DatosPublicarEntreno } from '../hooks/useResumenEntreno'

/**
 * Compartir un entreno terminado en Amigos (al terminarlo y en su detalle): junta lo que ya se ve en pantalla
 * (récords, cambios de liga, piezas nuevas de la Vitrina y ejercicios) en el resumen publicable. Nada sin Amigos.
 */
export default function PublicarEntreno(props: DatosPublicarEntreno) {
  return <SiPuedePublicar><Contenido {...props} /></SiPuedePublicar>
}

function Contenido(props: DatosPublicarEntreno) {
  const listo = useResumenEntreno(props)
  if (!listo) return null
  return <Publicar publicacion={listo.workout.publicacion} fecha={props.inicio} resumen={listo.resumen} onAnotar={(id) => workoutsRepo.marcarPublicacion(props.workoutId, id)} />
}
