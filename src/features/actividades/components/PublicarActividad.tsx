import type { Actividad } from '../../../shared/db/types'
import Publicar, { SiPuedePublicar } from '../../social/components/Publicar'
import { resumenActividad } from '../../social/lib/publicacion'
import * as actividadesRepo from '../data/actividadesRepo'
import { tituloActividad } from '../lib/actividad'

/** Compartir una actividad en Amigos desde su detalle: solo cifras, nunca el recorrido. Nada sin Amigos. */
export default function PublicarActividad({ actividad: a }: { actividad: Actividad }) {
  return (
    <SiPuedePublicar>
      <Publicar publicacion={a.publicacion} fecha={a.inicio}
        resumen={resumenActividad({ tipo: a.tipo, titulo: tituloActividad(a), duracionSeg: a.duracionSeg, distanciaM: a.distanciaM, desnivelM: a.desnivelM })}
        onAnotar={(id) => actividadesRepo.marcarPublicacion(a.id, id)} />
    </SiPuedePublicar>
  )
}
