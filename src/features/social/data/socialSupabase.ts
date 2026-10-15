import { NubeError } from '../../cuenta/data/nube'
import { clienteSupabase } from '../../cuenta/data/clienteSupabase'
import { traducir } from '../../cuenta/data/nubeSupabase'
import { mensajeSocial } from '../lib/mensajes'
import type { EstadoSeguimiento, Persona } from '../lib/relacion'
import { SocialError, type MiPerfil, type Social } from './social'

/** Se carga con `import()` desde `social/servicio.ts`: comparte cliente (y sesión) con la cuenta. */

interface FilaPersona {
  alias: string
  nombre: string | null
  sigo: EstadoSeguimiento
  me_sigue: EstadoSeguimiento
}

const persona = (f: FilaPersona): Persona => ({ alias: f.alias, nombre: f.nombre, sigo: f.sigo, meSigue: f.me_sigue })

/** Las claves del SQL (`alias_ocupado`…) con su mensaje; lo demás (red, sesión), como la cuenta. */
export function traducirSocial(error: unknown): NubeError {
  const e = error as { code?: string; message?: string } | null
  const mensaje = mensajeSocial(e?.message)
  if (mensaje) return new SocialError(mensaje, e!.message!, e?.message === 'sin_sesion' ? 'sesion' : 'otro')
  // La función no existe: el SQL de la parte social aún no está en el servidor.
  if (e?.code === 'PGRST202') return new NubeError('Amigos aún no está disponible. Inténtalo más tarde.')
  return traducir(error)
}

export function crearSocialSupabase(url: string, clave: string): Social {
  const sb = clienteSupabase(url, clave)

  async function rpc<T>(funcion: string, args?: Record<string, unknown>): Promise<T> {
    let resultado: { data: unknown; error: unknown }
    try {
      resultado = await sb.rpc(funcion, args)
    } catch (e) {
      throw traducirSocial(e)
    }
    if (resultado.error) throw traducirSocial(resultado.error)
    return resultado.data as T
  }

  return {
    miPerfil: () => rpc<MiPerfil | null>('mi_perfil'),
    crearPerfil: (alias, nombre, acepto) => rpc('crear_perfil', { p_alias: alias, p_nombre: nombre, p_acepto: acepto }),
    editarPerfil: (alias, nombre) => rpc('editar_perfil', { p_alias: alias, p_nombre: nombre }),
    nuevoCodigo: () => rpc<string>('nuevo_codigo'),
    borrarPerfil: () => rpc('borrar_perfil'),
    buscar: async (texto) => (await rpc<FilaPersona[]>('buscar_persona', { p_texto: texto })).map(persona),
    personas: async (lista) => (await rpc<FilaPersona[]>('personas', { p_lista: lista })).map(persona),
    pedirSeguir: (alias) => rpc<EstadoSeguimiento>('pedir_seguir', { p_alias: alias }),
    dejarDeSeguir: (alias) => rpc('dejar_de_seguir', { p_alias: alias }),
    responderSolicitud: (alias, aceptar) => rpc('responder_solicitud', { p_alias: alias, p_aceptar: aceptar }),
    quitarSeguidor: (alias) => rpc('quitar_seguidor', { p_alias: alias }),
    bloquear: (alias) => rpc('bloquear', { p_alias: alias }),
    desbloquear: (alias) => rpc('desbloquear', { p_alias: alias }),
    publicar: (id, fecha, resumen) => rpc('publicar', { p_id: id, p_tipo: resumen.tipo, p_fecha: new Date(fecha).toISOString(), p_resumen: resumen }),
    borrarPublicacion: (id) => rpc('borrar_publicacion', { p_id: id }),
    denunciarPerfil: (alias, motivo, detalle) => rpc('denunciar', { p_tipo: 'perfil', p_objetivo: alias, p_motivo: motivo, p_detalle: detalle }),
  }
}
