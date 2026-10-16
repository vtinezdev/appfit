import { NubeError } from '../../cuenta/data/nube'
import type { Avisos, Comentario, PublicacionFeed } from '../lib/feed'
import type { Resumen } from '../lib/publicacion'
import type { Persona } from '../lib/relacion'
import type { Comunidad } from '../lib/comunidad'

/**
 * Lo que la app necesita del servidor para la parte social (Supabase en `socialSupabase.ts`). Todo pasa por las
 * funciones de `supabase/migrations/0003_social.sql`; a las personas se las identifica por su alias. Los errores
 * llegan como `NubeError` con el mensaje ya pensado para la persona.
 */
export interface Social {
  /** Mi perfil, o `null` si aún no lo he creado. */
  miPerfil(): Promise<MiPerfil | null>
  /** `acepto`: confirma que tiene 16 años o más y acepta lo que se comparte. */
  crearPerfil(alias: string, nombre: string | null, acepto: boolean): Promise<void>
  editarPerfil(alias: string, nombre: string | null): Promise<void>
  /** Código de invitación nuevo; el anterior deja de servir. */
  nuevoCodigo(): Promise<string>
  /** Borra el perfil y todo lo social; la cuenta y la copia se quedan. */
  borrarPerfil(): Promise<void>
  /** Por alias exacto o código de invitación. Casi siempre una persona o ninguna. */
  buscar(texto: string): Promise<Persona[]>
  personas(lista: ListaPersonas): Promise<Persona[]>
  /** Devuelve cómo queda: `pendiente` hasta que la otra persona acepte. */
  pedirSeguir(alias: string): Promise<Persona['sigo']>
  /** Deja de seguir o cancela la solicitud. */
  dejarDeSeguir(alias: string): Promise<void>
  responderSolicitud(alias: string, aceptar: boolean): Promise<void>
  quitarSeguidor(alias: string): Promise<void>
  bloquear(alias: string): Promise<void>
  desbloquear(alias: string): Promise<void>
  denunciarPerfil(alias: string, motivo: MotivoDenuncia, detalle: string | null): Promise<void>
  /** `id` lo genera la app: repetirlo (un reintento) no duplica. `fecha`: ms del inicio. */
  publicar(id: string, fecha: number, resumen: Resumen, comunidad?: string): Promise<void>
  comunidades(busqueda: string, soloMias: boolean): Promise<Comunidad[]>
  crearComunidad(id: string, nombre: string, descripcion: string): Promise<void>
  unirseComunidad(id: string): Promise<void>
  salirComunidad(id: string): Promise<void>
  borrarComunidad(id: string): Promise<void>
  publicacionesComunidad(id: string, antes: string | null): Promise<PublicacionFeed[]>
  denunciarComunidad(id: string, motivo: MotivoDenuncia, detalle: string | null): Promise<void>
  /** Si ya no existe, falla con «no encontrado». */
  borrarPublicacion(id: string): Promise<void>
  /** Lo mío y de quienes sigo, lo último publicado primero. `antes`: `creada` de la última vista (o null). */
  feed(antes: string | null): Promise<PublicacionFeed[]>
  /** Lo de una persona que sigo (o lo mío), igual de paginado. */
  publicacionesDe(alias: string, antes: string | null): Promise<PublicacionFeed[]>
  reaccionar(publicacion: string): Promise<void>
  quitarReaccion(publicacion: string): Promise<void>
  comentarios(publicacion: string): Promise<Comentario[]>
  /** Devuelve el id del comentario. */
  comentar(publicacion: string, texto: string): Promise<string>
  borrarComentario(id: string): Promise<void>
  denunciarPublicacion(id: string, motivo: MotivoDenuncia, detalle: string | null): Promise<void>
  denunciarComentario(id: string, motivo: MotivoDenuncia, detalle: string | null): Promise<void>
  avisos(): Promise<Avisos>
  marcarAvisosVistos(): Promise<void>
}

export interface MiPerfil {
  alias: string
  nombre: string | null
  codigo: string
  suspendido: boolean
  /** Solicitudes de seguimiento pendientes de responder. */
  solicitudes: number
}

/** `siguiendo` incluye las solicitudes enviadas; `solicitudes`, las recibidas. */
export type ListaPersonas = 'siguiendo' | 'seguidores' | 'solicitudes' | 'bloqueados'

export type MotivoDenuncia = 'spam' | 'acoso' | 'inapropiado' | 'suplantacion' | 'otro'

export const MOTIVOS_DENUNCIA: { valor: MotivoDenuncia; label: string }[] = [
  { valor: 'acoso', label: 'Acoso o insultos' },
  { valor: 'inapropiado', label: 'Contenido inapropiado' },
  { valor: 'suplantacion', label: 'Se hace pasar por otra persona' },
  { valor: 'spam', label: 'Spam' },
  { valor: 'otro', label: 'Otro motivo' },
]

/** Error de una función social con su clave del SQL (`no_encontrado`, `limite`…), para decidir sin mirar el texto. */
export class SocialError extends NubeError {
  readonly clave: string
  constructor(mensaje: string, clave: string, tipo: NubeError['tipo'] = 'otro') {
    super(mensaje, tipo)
    this.clave = clave
  }
}
