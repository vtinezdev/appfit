import { NubeError } from '../../cuenta/data/nube'
import type { Avisos, CursorSocial, PaginaComentarios, PaginaSocial, PublicacionFeed, VistaComentario } from '../lib/feed'
import type { Resumen, ResumenLogro } from '../lib/publicacion'
import type { Avatar, AvatarExclusivo } from '../lib/avatar'
import type { Persona } from '../lib/relacion'
import type { Comunidad } from '../lib/comunidad'
import type { AccionDenuncia, Denuncia, Suspendido } from '../lib/moderacion'

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
  crearComunidad(id: string, nombre: string, descripcion: string, soloCreadorPublica?: boolean): Promise<void>
  unirseComunidad(id: string): Promise<void>
  salirComunidad(id: string): Promise<void>
  editarDescripcionComunidad(id: string, descripcion: string): Promise<void>
  borrarComunidad(id: string): Promise<void>
  publicacionesComunidad(id: string, antes: CursorSocial | null): Promise<PaginaSocial<PublicacionFeed>>
  denunciarComunidad(id: string, motivo: MotivoDenuncia, detalle: string | null): Promise<void>
  /** Si ya no existe, falla con «no encontrado». */
  borrarPublicacion(id: string): Promise<void>
  /** Lo mío y de quienes sigo, lo último publicado primero. `antes`: `creada` de la última vista (o null). */
  feed(antes: CursorSocial | null): Promise<PaginaSocial<PublicacionFeed>>
  /** Lo de una persona que sigo (o lo mío), igual de paginado. */
  publicacionesDe(alias: string, antes: CursorSocial | null, comunidad?: string): Promise<PaginaSocial<PublicacionFeed>>
  reaccionar(publicacion: string): Promise<void>
  quitarReaccion(publicacion: string): Promise<void>
  comentarios(publicacion: string, antes?: CursorSocial | null): Promise<PaginaComentarios>
  /** Devuelve el id del comentario. */
  comentar(publicacion: string, texto: string, respuesta?: string): Promise<string>
  borrarComentario(id: string): Promise<void>
  denunciarPublicacion(id: string, motivo: MotivoDenuncia, detalle: string | null): Promise<void>
  denunciarComentario(id: string, motivo: MotivoDenuncia, detalle: string | null): Promise<void>
  animos(publicacion: string, antes?: CursorSocial | null): Promise<PaginaSocial<{ id: string; alias: string; nombre: string | null }>>
  silenciar(alias: string, silenciar: boolean): Promise<void>
  silenciados(): Promise<{ alias: string; nombre: string | null }[]>
  novedadesComunidades(): Promise<Record<string, number>>
  verComunidad(id: string): Promise<void>
  comunidadesPropias(): Promise<{ id: string; nombre: string }[]>
  gestionComunidad(id: string): Promise<GestionComunidad>
  gestionarComunidad(id: string, accion: 'transferir' | 'nombrar' | 'revocar' | 'expulsar' | 'reglas' | 'bienvenida', alias?: string, texto?: string): Promise<void>
  perfilDeportivo(alias: string, comunidad?: string): Promise<PerfilDeportivo>
  /** Biografía, disciplinas y hasta tres medallas de logros conseguidos (0016); no toca el avatar. */
  guardarPerfilDeportivo(bio: string, disciplinas: string[], logros: ResumenLogro[]): Promise<void>
  /**
   * `imagenesPublicacion`: el servidor admite imágenes e insignias en el resumen (0020); `detallesEjercicio`, la liga y
   * las series de cada ejercicio (0021). Sin ellas no se envían. `rutinaCompartida`: acepta publicaciones de rutina
   * (0022); sin ella no se ofrece compartir una rutina.
   */
  capacidades(): Promise<{ camposOpcionales: boolean; imagenesPublicacion?: boolean; detallesEjercicio?: boolean; rutinaCompartida?: boolean }>
  avisos(): Promise<Avisos>
  marcarAvisosVistos(): Promise<void>
  /**
   * El avatar de cada alias: el de catálogo (0015) donde se vea su nombre o, si no tiene, el logro publicado que eligió
   * antes con la visibilidad de esa publicación (0014; desde una comunidad, solo lo publicado en ella). Sin 0015 se
   * leen solo los de 0014; sin ninguna de las dos, `{}`: la app pinta el monograma.
   */
  avatares(alias: string[], comunidad?: string): Promise<Record<string, Avatar>>
  /** Cambia mi avatar de catálogo (`null`: mis iniciales); deja de usarse el logro publicado que hubiera elegido antes. */
  editarAvatar(avatar: string | null): Promise<void>
  /** Exclusivos concedidos a mi cuenta (0019); sin esa migración, ninguno. No depende del alias ni de ser administrador. */
  misAvataresExclusivos(): Promise<AvatarExclusivo[]>
  /** El último comentario visible de cada publicación (0014), para la vista previa del feed; sin 0014, `{}`. */
  ultimosComentarios(ids: string[]): Promise<Record<string, VistaComentario>>

  // --- Administración (0017). Solo responde a quien está en `administradores`; para el resto, `no_encontrado`. ---
  // Borrar publicaciones y comentarios de cualquiera usa `borrarPublicacion` y `borrarComentario`; expulsar, `gestionarComunidad`.
  /** Si soy administrador. Sin 0017, `false`: la app no enseña nada de administración. */
  soyAdmin(): Promise<boolean>
  /** Denuncias sin revisar, una por lo denunciado, las más recientes primero. */
  denuncias(): Promise<Denuncia[]>
  /** Resuelve todas las denuncias de lo mismo que `id`. */
  resolverDenuncia(id: number, accion: AccionDenuncia): Promise<void>
  /** Suspender (`true`) o readmitir (`false`) un perfil por su alias. */
  suspender(alias: string, suspender: boolean): Promise<void>
  suspendidos(): Promise<Suspendido[]>
  /** Mete a alguien en una comunidad; le llega un aviso. */
  anadirAComunidad(comunidad: string, alias: string): Promise<void>
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

export interface GestionComunidad { modera: boolean; creador: boolean; reglas: string; bienvenida: string; miembros: { alias: string; nombre: string | null; moderador: boolean; creador: boolean; yo?: boolean }[] }

/** `logros`: los destacados (`lib/destacados.leerLogrosDestacados`). `avatar`: el logro publicado elegido antes de 0015. */
export interface PerfilDeportivo { alias: string; nombre: string | null; bio: string; disciplinas: string[]; logros: ResumenLogro[]; avatar: Resumen | null; publicadas: number }
