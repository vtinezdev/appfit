import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearSocialSupabase, traducirSocial } from './socialSupabase'
import { resumenTexto } from '../lib/publicacion'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../../cuenta/data/clienteSupabase', () => ({ clienteSupabase: () => ({ rpc }) }))

describe('traducirSocial', () => {
  it('las claves del SQL llegan con su mensaje', () => {
    const error = traducirSocial({ code: 'P0001', message: 'alias_ocupado' })
    expect(error.message).toMatch(/ya lo usa otra persona/)
    expect(error.tipo).toBe('otro')
    expect(error).toMatchObject({ clave: 'alias_ocupado' })
  })

  it('sin sesión pide volver a entrar', () => {
    expect(traducirSocial({ code: 'P0001', message: 'sin_sesion' }).tipo).toBe('sesion')
  })

  it('si el SQL aún no está en el servidor, lo dice sin hablar de errores técnicos', () => {
    expect(traducirSocial({ code: 'PGRST202', message: 'Could not find the function public.mi_perfil' }).message).toMatch(/aún no está disponible/)
  })

  it('lo demás, como la cuenta: sin red es «sin conexión»', () => {
    expect(traducirSocial(new TypeError('Failed to fetch')).tipo).toBe('sin-conexion')
  })
})

describe('destinatario y funciones de comunidad', () => {
  beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: null, error: null }) })
  const social = () => crearSocialSupabase('https://appfit-pruebas.invalid', 'publica-falsa')
  it('conserva la firma de seguidores y dirige solo la selección explícita a la comunidad', async () => {
    const resumen = resumenTexto('Hola')!
    await social().publicar('id', 0, resumen)
    expect(rpc).toHaveBeenLastCalledWith('publicar', { p_id: 'id', p_tipo: 'texto', p_fecha: new Date(0).toISOString(), p_resumen: resumen })
    await social().publicar('id-2', 0, resumen, 'grupo')
    expect(rpc).toHaveBeenLastCalledWith('publicar_comunidad', { p_id: 'id-2', p_tipo: 'texto', p_fecha: new Date(0).toISOString(), p_resumen: resumen, p_comunidad: 'grupo' })
  })
  it('filtra comunidades mal formadas y pide solo las mías para elegir audiencia', async () => {
    const c = { id: 'grupo', nombre: 'Entreno', descripcion: '', miembros: 1, unida: true, mia: false }
    rpc.mockResolvedValueOnce({ data: [c, {}, null], error: null })
    expect(await social().comunidades('fuerza', true)).toEqual([{ ...c, soloCreadorPublica: false }])
    expect(rpc).toHaveBeenLastCalledWith('comunidades', { p_busqueda: 'fuerza', p_solo_mias: true })
  })
  it('mantiene los ids al reintentar crear y no pide tablas directamente', async () => {
    await social().crearComunidad('id', 'Entreno', 'Descripción')
    expect(rpc).toHaveBeenLastCalledWith('crear_comunidad', { p_id: 'id', p_nombre: 'Entreno', p_descripcion: 'Descripción', p_solo_creador_publica: false })
    await social().crearComunidad('anuncios', 'Actualizaciones', '', true)
    expect(rpc).toHaveBeenLastCalledWith('crear_comunidad', { p_id: 'anuncios', p_nombre: 'Actualizaciones', p_descripcion: '', p_solo_creador_publica: true })
    await social().unirseComunidad('id'); expect(rpc).toHaveBeenLastCalledWith('unirse_comunidad', { p_id: 'id' })
    await social().salirComunidad('id'); expect(rpc).toHaveBeenLastCalledWith('salir_comunidad', { p_id: 'id' })
    await social().editarDescripcionComunidad('id', 'Nueva'); expect(rpc).toHaveBeenLastCalledWith('editar_descripcion_comunidad', { p_id: 'id', p_descripcion: 'Nueva' })
    await social().denunciarComunidad('id', 'spam', null); expect(rpc).toHaveBeenLastCalledWith('denunciar', { p_tipo: 'comunidad', p_objetivo: 'id', p_motivo: 'spam', p_detalle: null })
    rpc.mockResolvedValueOnce({ error: { code: 'P0001', message: 'no_miembro' }, data: null })
    await expect(social().publicacionesComunidad('id', null)).rejects.toMatchObject({ clave: 'no_miembro' })
  })
})


describe('contratos de las nuevas RPC', () => {
  beforeEach(() => rpc.mockResolvedValue({ data: [], error: null }))
  const social = () => crearSocialSupabase('https://appfit-pruebas.invalid', 'publica-falsa')
  it('envía el cursor completo sin redondear microsegundos y mantiene el ámbito de comunidad', async () => {
    const antes={ fecha: '2026-10-18T10:00:00.123456+00:00', id: 'uuid-ultimo' }
    await social().feed(antes)
    expect(rpc).toHaveBeenLastCalledWith('feed',{p_antes:antes.fecha,p_antes_id:antes.id,p_limite:20})
    await social().publicacionesDe('ana',antes,'grupo')
    expect(rpc).toHaveBeenLastCalledWith('publicaciones_persona_comunidad',{p_alias:'ana',p_comunidad:'grupo',p_antes:antes.fecha,p_antes_id:antes.id,p_limite:20})
  })
  it('una respuesta lleva un objetivo explícito y el perfil solo lo elegido', async () => {
    await social().comentar('pub','Hola','raiz')
    expect(rpc).toHaveBeenLastCalledWith('comentar_respuesta',{p_id:'pub',p_texto:'Hola',p_respuesta:'raiz'})
    await social().editarPerfilDeportivo('Fuerza',['fuerza'],['logro'],null)
    expect(rpc).toHaveBeenLastCalledWith('editar_perfil_deportivo',{p_bio:'Fuerza',p_disciplinas:['fuerza'],p_destacados:['logro'],p_avatar:null})
  })
})

describe('lecturas del rediseño (0014)', () => {
  beforeEach(() => { rpc.mockReset() })
  const social = () => crearSocialSupabase('https://appfit-pruebas.invalid', 'publica-falsa')
  it('pide avatares y vistas previas en una sola llamada, sin llamar con listas vacías', async () => {
    rpc.mockResolvedValue({ data: {}, error: null })
    expect(await social().avatares([])).toEqual({})
    expect(await social().ultimosComentarios([])).toEqual({})
    expect(rpc).not.toHaveBeenCalled()
    await social().avatares(['ana', 'beto'], 'grupo')
    expect(rpc).toHaveBeenLastCalledWith('avatares_perfil', { p_alias: ['ana', 'beto'], p_comunidad: 'grupo' })
    expect(rpc).toHaveBeenCalledTimes(1)
    await social().ultimosComentarios(['p1'])
    expect(rpc).toHaveBeenLastCalledWith('ultimos_comentarios', { p_ids: ['p1'] })
  })
  it('sin 0014 en el servidor no falla: monograma y sin vista previa', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.avatares_social' } })
    expect(await social().avatares(['ana'])).toEqual({})
    expect(await social().ultimosComentarios(['p1'])).toEqual({})
  })
  it('sin 0015 lee los avatares de 0014', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.avatares_perfil' } })
    const logro = { v: 1, tipo: 'logro', titulo: 'Entrenos', logroId: 'entrenos', grupo: 'entreno', nivel: 1, descripcion: '10 entrenos' }
    rpc.mockResolvedValueOnce({ data: { ana: logro }, error: null })
    expect(await social().avatares(['ana'])).toEqual({ ana: { tipo: 'logro', logro: 'entrenos', grupo: 'entreno' } })
    expect(rpc).toHaveBeenLastCalledWith('avatares_social', { p_alias: ['ana'], p_comunidad: null })
  })
  it('editar el avatar: identificador o null; sin 0015, un error propio', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await social().editarAvatar('paisaje.cumbre')
    expect(rpc).toHaveBeenLastCalledWith('editar_avatar', { p_avatar: 'paisaje.cumbre' })
    await social().editarAvatar(null)
    expect(rpc).toHaveBeenLastCalledWith('editar_avatar', { p_avatar: null })
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.editar_avatar' } })
    await expect(social().editarAvatar('paisaje.cumbre')).rejects.toThrow('Los avatares nuevos aún no están disponibles')
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'avatar_no_valido' } })
    await expect(social().editarAvatar('paisaje.x')).rejects.toMatchObject({ clave: 'avatar_no_valido' })
  })
  it('otros errores sí llegan, traducidos', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'no_miembro' } })
    await expect(social().avatares(['ana'], 'grupo')).rejects.toMatchObject({ clave: 'no_miembro' })
  })
})
