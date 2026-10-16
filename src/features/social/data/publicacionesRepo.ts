import { db } from '../../../shared/db/db'
import { SocialError, type Social } from './social'

/** Borra lo compartido y libera su marca local, conservando el entreno/actividad y sus datos. */
export async function borrarPublicacion(social: Pick<Social, 'borrarPublicacion'>, id: string): Promise<void> {
  try {
    await social.borrarPublicacion(id)
  } catch (e) {
    // Permite reintentar si el servidor borró pero se perdió su respuesta, o se borró en otro dispositivo.
    if (!(e instanceof SocialError && e.clave === 'no_encontrado')) throw e
  }
  // Nunca hay red dentro de la transacción. Solo se limpian referencias a este UUID.
  await db.transaction('rw', db.workouts, db.actividades, async () => {
    await db.workouts.filter(w => w.publicacion === id).modify(w => { delete w.publicacion })
    await db.actividades.filter(a => a.publicacion === id).modify(a => { delete a.publicacion })
  })
}
