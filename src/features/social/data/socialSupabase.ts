import { NubeError } from '../../cuenta/data/nube'
import { clienteSupabase } from '../../cuenta/data/clienteSupabase'
import { traducir } from '../../cuenta/data/nubeSupabase'
import { leerAvatares, leerAvisos, leerPaginaSocial, leerPaginaComentarios, leerPaginaPublicaciones, leerUltimosComentarios, POR_PAGINA, type CursorSocial } from '../lib/feed'
import { mensajeSocial } from '../lib/mensajes'
import type { EstadoSeguimiento, Persona } from '../lib/relacion'
import { SocialError, type MiPerfil, type PerfilDeportivo, type Social } from './social'
import { leerLogrosDestacados } from '../lib/destacados'
import { leerComunidad, type Comunidad } from '../lib/comunidad'
import { leerDenuncias, leerSuspendidos } from '../lib/moderacion'
import { leerAvataresExclusivos } from '../lib/avatar'
import { leerCompanias } from '../lib/compania'

/** Se carga con `import()` desde `social/servicio.ts`: comparte cliente (y sesión) con la cuenta. */

interface FilaPersona {
  alias: string
  nombre: string | null
  sigo: EstadoSeguimiento
  me_sigue: EstadoSeguimiento
}

/** `perfil_deportivo` tal cual: con 0016 trae `logros`; antes, solo `destacados` (publicaciones). */
type PerfilServidor = Omit<PerfilDeportivo, 'logros'> & { logros?: unknown; destacados?: unknown; avatarId?: unknown }

const argumentosPagina = (antes: CursorSocial | null) => ({ p_antes: antes?.fecha ?? null, p_antes_id: antes?.id ?? null, p_limite: POR_PAGINA })

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

  /** Lecturas añadidas después (0014): si la función aún no está en el servidor, `null` en lugar de un error. */
  async function opcional(funcion: string, args: Record<string, unknown>): Promise<unknown> {
    let resultado: { data: unknown; error: unknown }
    try {
      resultado = await sb.rpc(funcion, args)
    } catch (e) {
      throw traducirSocial(e)
    }
    if ((resultado.error as { code?: string } | null)?.code === 'PGRST202') return null
    if (resultado.error) throw traducirSocial(resultado.error)
    return resultado.data
  }

  /** Escrituras añadidas después (0015, 0016): si la función aún no está en el servidor, un error propio, no «Amigos falta». */
  async function escritura(funcion: string, args: Record<string, unknown>, sinFuncion: string): Promise<void> {
    let resultado: { data: unknown; error: unknown }
    try {
      resultado = await sb.rpc(funcion, args)
    } catch (e) {
      throw traducirSocial(e)
    }
    if ((resultado.error as { code?: string } | null)?.code === 'PGRST202') throw new NubeError(sinFuncion)
    if (resultado.error) throw traducirSocial(resultado.error)
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
    publicar: (id, fecha, resumen, comunidad) => rpc(comunidad ? 'publicar_comunidad' : 'publicar', { p_id: id, p_tipo: resumen.tipo, p_fecha: new Date(fecha).toISOString(), p_resumen: resumen, ...(comunidad ? { p_comunidad: comunidad } : {}) }),
    comunidades: async (busqueda, soloMias) => ((await rpc<unknown[]>('comunidades', { p_busqueda: busqueda, p_solo_mias: soloMias })) ?? []).map(leerComunidad).filter((c): c is Comunidad => c !== null),
    crearComunidad: (id, nombre, descripcion, soloCreadorPublica = false) => rpc('crear_comunidad', { p_id: id, p_nombre: nombre, p_descripcion: descripcion, p_solo_creador_publica: soloCreadorPublica }),
    unirseComunidad: (id) => rpc('unirse_comunidad', { p_id: id }),
    salirComunidad: (id) => rpc('salir_comunidad', { p_id: id }),
    editarDescripcionComunidad: (id, descripcion) => rpc('editar_descripcion_comunidad', { p_id: id, p_descripcion: descripcion }),
    borrarComunidad: (id) => rpc('borrar_comunidad', { p_id: id }),
    publicacionesComunidad: async (id, antes) => leerPaginaPublicaciones(await rpc<unknown[]>('publicaciones_comunidad', { p_id: id, ...argumentosPagina(antes) })),
    denunciarComunidad: (id, motivo, detalle) => rpc('denunciar', { p_tipo: 'comunidad', p_objetivo: id, p_motivo: motivo, p_detalle: detalle }),
    borrarPublicacion: (id) => rpc('borrar_publicacion', { p_id: id }),
    denunciarPerfil: (alias, motivo, detalle) => rpc('denunciar', { p_tipo: 'perfil', p_objetivo: alias, p_motivo: motivo, p_detalle: detalle }),
    feed: async (antes) => leerPaginaPublicaciones(await rpc<unknown[]>('feed', argumentosPagina(antes))),
    publicacionesDe: async (alias, antes, comunidad) => leerPaginaPublicaciones(await rpc<unknown[]>(comunidad ? 'publicaciones_persona_comunidad' : 'publicaciones_de', { p_alias: alias, ...(comunidad ? { p_comunidad: comunidad } : {}), ...argumentosPagina(antes) })),
    reaccionar: (id) => rpc('reaccionar', { p_id: id }),
    quitarReaccion: (id) => rpc('quitar_reaccion', { p_id: id }),
    comentarios: async (id, antes = null) => leerPaginaComentarios(await rpc<unknown>('comentarios_pagina', { p_id: id, ...argumentosPagina(antes) })),
    comentar: (id, texto, respuesta) => rpc<string>('comentar_respuesta', { p_id: id, p_texto: texto, p_respuesta: respuesta ?? null }),
    borrarComentario: (id) => rpc('borrar_comentario', { p_id: id }),
    denunciarPublicacion: (id, motivo, detalle) => rpc('denunciar', { p_tipo: 'publicacion', p_objetivo: id, p_motivo: motivo, p_detalle: detalle }),
    denunciarComentario: (id, motivo, detalle) => rpc('denunciar', { p_tipo: 'comentario', p_objetivo: id, p_motivo: motivo, p_detalle: detalle }),
    animos: async (id, antes = null) => leerPaginaSocial(await rpc<unknown[]>('animos_de', { p_id: id, ...argumentosPagina(antes) }), x => {
      if (typeof x !== 'object' || !x || !('id' in x) || !('alias' in x) || typeof x.id !== 'string' || typeof x.alias !== 'string') return null
      return { id: x.id, alias: x.alias, nombre: 'nombre' in x && typeof x.nombre === 'string' ? x.nombre : null }
    }, 'creada'),
    silenciar: (alias, silenciar) => rpc('silenciar', { p_alias: alias, p_silenciar: silenciar }),
    silenciados: () => rpc('silenciados'),
    novedadesComunidades: () => rpc('novedades_comunidades'),
    verComunidad: id => rpc('ver_comunidad', { p_id: id }),
    comunidadesPropias: () => rpc('comunidades_propias'),
    gestionComunidad: id => rpc('gestion_comunidad', { p_id: id }),
    gestionarComunidad: (id, accion, alias, texto = '') => rpc('gestionar_comunidad', { p_id: id, p_accion: accion, p_alias: alias ?? null, p_texto: texto }),
    perfilDeportivo: async (alias, comunidad) => {
      const { logros, destacados, avatarId: _, ...perfil } = await rpc<PerfilServidor>('perfil_deportivo', { p_alias: alias, p_comunidad: comunidad ?? null })
      return { ...perfil, logros: leerLogrosDestacados({ logros, destacados }) }
    },
    guardarPerfilDeportivo: (bio, disciplinas, logros) => escritura('guardar_perfil_deportivo', { p_bio: bio, p_disciplinas: disciplinas, p_logros: logros },
      'Los logros destacados nuevos aún no están disponibles. Inténtalo más tarde.'),
    capacidades: () => rpc('social_capacidades'),
    avisos: async () => leerAvisos(await rpc<unknown>('avisos')),
    marcarAvisosVistos: () => rpc('marcar_avisos_vistos'),
    avatares: async (alias, comunidad) => {
      if (!alias.length) return {}
      const args = { p_alias: alias, p_comunidad: comunidad ?? null }
      return leerAvatares(await opcional('avatares_perfil', args) ?? await opcional('avatares_social', args))
    },
    // Sin 0015 en el servidor: no es que Amigos falte, solo esta función.
    editarAvatar: avatar => escritura('editar_avatar', { p_avatar: avatar }, 'Los avatares nuevos aún no están disponibles. Inténtalo más tarde.'),
    misAvataresExclusivos: async () => leerAvataresExclusivos(await opcional('mis_avatares_exclusivos', {})),
    ultimosComentarios: async (ids) => ids.length ? leerUltimosComentarios(await opcional('ultimos_comentarios', { p_ids: ids })) : {},
    // Sin 0017, nadie es administrador.
    soyAdmin: async () => (await opcional('soy_admin', {})) === true,
    denuncias: async () => leerDenuncias(await rpc<unknown>('admin_denuncias')),
    resolverDenuncia: (id, accion) => rpc('admin_resolver_denuncia', { p_id: id, p_accion: accion }),
    suspender: (alias, suspender) => rpc('admin_suspender', { p_alias: alias, p_suspender: suspender }),
    suspendidos: async () => leerSuspendidos(await rpc<unknown>('admin_suspendidos')),
    anadirAComunidad: (comunidad, alias) => rpc('anadir_a_comunidad', { p_id: comunidad, p_alias: alias }),
    companias: async () => leerCompanias(await rpc<unknown>('companias')),
    invitarCompania: (compania, alias) => rpc('invitar_compania', { p_compania: compania, p_alias: alias }),
    responderCompania: (compania, aceptar) => rpc('responder_compania', { p_compania: compania, p_aceptar: aceptar }),
    pausarCompania: (compania, pausa) => rpc('pausar_compania', { p_compania: compania, p_pausa: pausa }),
    salirCompania: (compania) => rpc('salir_compania', { p_compania: compania }),
    subirSemanaCompania: async (lunes, hechas, objetivo) => (await rpc<boolean>('subir_semana_compania', { p_lunes: lunes, p_hechas: hechas, p_objetivo: objetivo })) === true,
    animarCompanero: (compania, alias, lunes, animar) => rpc('animar_companero', { p_compania: compania, p_alias: alias, p_lunes: lunes, p_animar: animar }),
  }
}
