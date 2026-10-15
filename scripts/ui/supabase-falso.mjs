// Supabase falso para probar Amigos en el navegador sin el proyecto real ni códigos por correo (docs/desarrollo.md).
// Imita las RPC de 0003_social.sql, 0004_publicaciones.sql, 0005_feed.sql y marcar_actividad, en memoria, con cuatro personas y dos solicitudes de ejemplo.
//
//   node scripts/ui/supabase-falso.mjs
//   VITE_SUPABASE_URL=http://127.0.0.1:54329 VITE_SUPABASE_PUBLISHABLE_KEY=falsa npx vite --port 5174 --strictPort --host 127.0.0.1
//
// y en http://appfit-test.localhost:5174, una sesión falsa en localStorage (clave `appfit-cuenta`, con `expires_at`
// futuro y un `user`) antes de recargar. No sustituye a supabase/pruebas/social.sql, que prueba el SQL de verdad.
import http from 'node:http'

const YO = 'yo'
const perfiles = new Map([
  ['lucia', { alias: 'lucia.run', nombre: 'Lucía Martín', codigo: 'A1B2-C3D4', suspendido: false }],
  ['pablo', { alias: 'pablo_gym', nombre: null, codigo: 'B2C3-D4E5', suspendido: false }],
  ['maria', { alias: 'maria.fernandez.trail', nombre: 'María Fernández de la Torre Ruiz', codigo: 'C3D4-E5F6', suspendido: false }],
  ['jon', { alias: 'jon_92', nombre: 'Jon', codigo: 'D4E5-F6A7', suspendido: false }],
])
// [seguidor, seguido] -> estado
const seg = new Map([
  ['pablo|yo', 'pendiente'],
  ['maria|yo', 'pendiente'],
  ['jon|yo', 'aceptado'],
  ['yo|jon', 'aceptado'],
  ['yo|lucia', 'aceptado'],
])
const bloqueos = new Set()
// id -> { autor, tipo, fecha, creada, resumen }
const publicaciones = new Map()
const hace = (min) => new Date(Date.now() - min * 60_000).toISOString()
publicaciones.set('p-lucia', { autor: 'lucia', tipo: 'actividad', fecha: hace(300), creada: hace(240), resumen: { v: 1, tipo: 'actividad', actividad: 'correr', titulo: 'Rodaje por el Retiro', duracionSeg: 2700, distanciaM: 8400, desnivelM: 45 } })
publicaciones.set('p-jon', { autor: 'jon', tipo: 'entreno', fecha: hace(1500), creada: hace(1400), resumen: { v: 1, tipo: 'entreno', titulo: 'Pierna pesada con nombre de rutina bastante largo', duracionSeg: 4500, series: 22, volumenKg: 12850, ejercicios: ['Sentadilla', 'Peso muerto rumano', 'Prensa', 'Zancadas', 'Curl femoral'], records: [{ ejercicio: 'Sentadilla', texto: '140 kg × 3' }], ligas: [{ ejercicio: 'Peso muerto rumano', texto: 'Sube a Oro' }], logros: ['Constancia II'] } })
publicaciones.set('p-rara', { autor: 'jon', tipo: 'entreno', fecha: hace(3000), creada: hace(2900), resumen: { v: 7, cosa: 'rara' } })
// [publicacion, user]
const reacciones = new Set(['p-lucia|jon'])
// id -> { publicacion, autor, texto, creado }
const comentarios = new Map([['c1', { publicacion: 'p-jon', autor: 'lucia', texto: '¡Qué barbaridad de sentadilla!', creado: hace(1300) }]])
let avisosVistos = new Date(0).toISOString()
const puedeVer = (id) => id === YO || (seg.get(`${YO}|${id}`) === 'aceptado' && !bloq(YO, id))
const fila = (pid) => {
  const pu = publicaciones.get(pid)
  const pe = pu.autor === YO ? perfiles.get(YO) : perfiles.get(pu.autor)
  return {
    id: pid, alias: pe.alias, nombre: pe.nombre, fecha: pu.fecha, creada: pu.creada, resumen: pu.resumen,
    reacciones: [...reacciones].filter((r) => r.startsWith(`${pid}|`)).length,
    comentarios: [...comentarios.values()].filter((c) => c.publicacion === pid).length,
    reaccione: reacciones.has(`${pid}|${YO}`), mia: pu.autor === YO,
  }
}
const pagina = (filtro, antes, limite) => [...publicaciones].filter(([, pu]) => filtro(pu) && (!antes || pu.creada < antes))
  .sort((a, b) => (a[1].creada < b[1].creada ? 1 : -1)).slice(0, limite).map(([pid]) => fila(pid))
const verPublicacion = (pid) => {
  const pu = publicaciones.get(pid)
  if (!pu || !puedeVer(pu.autor)) throw err('no_encontrado')
  return pu
}

const err = (message) => ({ status: 400, body: { code: 'P0001', message, details: null, hint: null } })
const idDe = (alias) => [...perfiles].find(([, p]) => p.alias === String(alias).trim().toLowerCase())?.[0]
const ver = (id) => {
  const p = perfiles.get(id)
  return { alias: p.alias, nombre: p.nombre, sigo: seg.get(`${YO}|${id}`) ?? 'no', me_sigue: seg.get(`${id}|${YO}`) ?? 'no' }
}
const bloq = (a, b) => bloqueos.has(`${a}|${b}`) || bloqueos.has(`${b}|${a}`)
const exigir = () => {
  if (!perfiles.has(YO)) throw err('sin_perfil')
  return YO
}
const otro = (alias) => {
  const id = idDe(alias)
  if (!id || id === YO) throw err('no_encontrado')
  return id
}

const rpc = {
  marcar_actividad: () => null,
  mi_perfil: () => {
    const p = perfiles.get(YO)
    if (!p) return null
    return { ...p, solicitudes: [...seg].filter(([k, v]) => k.endsWith(`|${YO}`) && v === 'pendiente').length }
  },
  crear_perfil: ({ p_alias, p_nombre, p_acepto }) => {
    if (!p_acepto) throw err('sin_aceptar')
    if (idDe(p_alias)) throw err('alias_ocupado')
    if (p_alias === 'admin') throw err('alias_reservado')
    perfiles.set(YO, { alias: p_alias, nombre: p_nombre, codigo: '9F8E-7D6C', suspendido: false })
    return null
  },
  editar_perfil: ({ p_alias, p_nombre }) => {
    exigir()
    const id = idDe(p_alias)
    if (id && id !== YO) throw err('alias_ocupado')
    Object.assign(perfiles.get(YO), { alias: p_alias, nombre: p_nombre })
    return null
  },
  nuevo_codigo: () => { exigir(); perfiles.get(YO).codigo = '1234-ABCD'; return '1234-ABCD' },
  borrar_perfil: () => {
    perfiles.delete(YO)
    for (const k of [...seg.keys()]) if (k.split('|').includes(YO)) seg.delete(k)
    return null
  },
  buscar_persona: ({ p_texto }) => {
    exigir()
    const t = String(p_texto).trim()
    const cod = t.toUpperCase().replace('-', '')
    return [...perfiles].filter(([id, p]) => id !== YO && !p.suspendido && !bloq(YO, id)
      && (p.alias === t.toLowerCase() || p.codigo.replace('-', '') === cod)).map(([id]) => ver(id))
  },
  personas: ({ p_lista }) => {
    exigir()
    const ids = [...perfiles.keys()].filter((id) => id !== YO)
    if (p_lista === 'siguiendo') return ids.filter((id) => seg.has(`${YO}|${id}`)).map(ver)
    if (p_lista === 'seguidores') return ids.filter((id) => seg.get(`${id}|${YO}`) === 'aceptado').map(ver)
    if (p_lista === 'solicitudes') return ids.filter((id) => seg.get(`${id}|${YO}`) === 'pendiente').map(ver)
    if (p_lista === 'bloqueados') return ids.filter((id) => bloqueos.has(`${YO}|${id}`)).map(ver)
    throw err('lista_no_valida')
  },
  pedir_seguir: ({ p_alias }) => {
    exigir()
    const id = otro(p_alias)
    if (bloq(YO, id)) throw err('no_encontrado')
    if (!seg.has(`${YO}|${id}`)) seg.set(`${YO}|${id}`, 'pendiente')
    return seg.get(`${YO}|${id}`)
  },
  dejar_de_seguir: ({ p_alias }) => { exigir(); seg.delete(`${YO}|${otro(p_alias)}`); return null },
  responder_solicitud: ({ p_alias, p_aceptar }) => {
    exigir()
    const k = `${otro(p_alias)}|${YO}`
    if (seg.get(k) !== 'pendiente') throw err('no_encontrado')
    if (p_aceptar) seg.set(k, 'aceptado'); else seg.delete(k)
    return null
  },
  quitar_seguidor: ({ p_alias }) => { exigir(); seg.delete(`${otro(p_alias)}|${YO}`); return null },
  bloquear: ({ p_alias }) => {
    exigir()
    const id = otro(p_alias)
    bloqueos.add(`${YO}|${id}`)
    seg.delete(`${YO}|${id}`)
    seg.delete(`${id}|${YO}`)
    return null
  },
  desbloquear: ({ p_alias }) => { exigir(); bloqueos.delete(`${YO}|${otro(p_alias)}`); return null },
  denunciar: () => { exigir(); return null },
  publicar: ({ p_id, p_tipo, p_fecha, p_resumen }) => {
    exigir()
    const previa = publicaciones.get(p_id)
    if (previa) { if (previa.autor === YO) return null; throw err('publicacion_no_valida') }
    if (!['entreno', 'actividad'].includes(p_tipo) || JSON.stringify(p_resumen).length > 8192) throw err('publicacion_no_valida')
    publicaciones.set(p_id, { autor: YO, tipo: p_tipo, fecha: p_fecha, creada: new Date().toISOString(), resumen: p_resumen })
    console.log('publicado', JSON.stringify(p_resumen))
    return null
  },
  feed: ({ p_antes, p_limite }) => { exigir(); return pagina((pu) => puedeVer(pu.autor), p_antes, p_limite) },
  publicaciones_de: ({ p_alias, p_antes, p_limite }) => {
    exigir()
    const id = idDe(p_alias)
    if (!id || !puedeVer(id)) throw err('no_encontrado')
    return pagina((pu) => pu.autor === id, p_antes, p_limite)
  },
  reaccionar: ({ p_id }) => { exigir(); verPublicacion(p_id); reacciones.add(`${p_id}|${YO}`); return null },
  quitar_reaccion: ({ p_id }) => { exigir(); reacciones.delete(`${p_id}|${YO}`); return null },
  comentarios_de: ({ p_id }) => {
    exigir()
    const pu = verPublicacion(p_id)
    return [...comentarios].filter(([, c]) => c.publicacion === p_id).map(([id, c]) => {
      const pe = perfiles.get(c.autor)
      return { id, alias: pe.alias, nombre: pe.nombre, texto: c.texto, creado: c.creado, mio: c.autor === YO, puedo_borrar: c.autor === YO || pu.autor === YO }
    })
  },
  comentar: ({ p_id, p_texto }) => {
    exigir()
    verPublicacion(p_id)
    const texto = String(p_texto ?? '').trim()
    if (!texto || texto.length > 500) throw err('comentario_no_valido')
    const id = `c${comentarios.size + 1}-${Date.now()}`
    comentarios.set(id, { publicacion: p_id, autor: YO, texto, creado: new Date().toISOString() })
    return id
  },
  borrar_comentario: ({ p_id }) => {
    const c = comentarios.get(p_id)
    if (!c || (c.autor !== YO && publicaciones.get(c.publicacion)?.autor !== YO)) throw err('no_encontrado')
    comentarios.delete(p_id)
    return null
  },
  avisos: () => {
    exigir()
    const mias = new Set([...publicaciones].filter(([, pu]) => pu.autor === YO).map(([pid]) => pid))
    const lista = [
      ...[...reacciones].map((r) => r.split('|')).filter(([pid, u]) => mias.has(pid) && u !== YO).map(([pid, u]) => ({ tipo: 'reaccion', alias: perfiles.get(u).alias, nombre: perfiles.get(u).nombre, publicacion: pid, titulo: publicaciones.get(pid).resumen.titulo, texto: null, creado: publicaciones.get(pid).creada })),
      ...[...comentarios.values()].filter((c) => mias.has(c.publicacion) && c.autor !== YO).map((c) => ({ tipo: 'comentario', alias: perfiles.get(c.autor).alias, nombre: perfiles.get(c.autor).nombre, publicacion: c.publicacion, titulo: publicaciones.get(c.publicacion).resumen.titulo, texto: c.texto.slice(0, 120), creado: c.creado })),
    ].map((a) => ({ ...a, nuevo: a.creado > avisosVistos })).sort((a, b) => (a.creado < b.creado ? 1 : -1)).slice(0, 30)
    return { solicitudes: [...seg].filter(([k, v]) => k.endsWith(`|${YO}`) && v === 'pendiente').length, nuevos: lista.filter((a) => a.nuevo).length, lista }
  },
  marcar_avisos_vistos: () => { exigir(); avisosVistos = new Date().toISOString(); return null },
  // Para probar los avisos: Lucía comenta y Jon da ánimo en lo último que publiqué (POST /rest/v1/rpc/simular_avisos).
  simular_avisos: () => {
    const ultima = [...publicaciones].filter(([, pu]) => pu.autor === YO).sort((a, b) => (a[1].creada < b[1].creada ? 1 : -1))[0]
    if (!ultima) throw err('no_encontrado')
    reacciones.add(`${ultima[0]}|jon`)
    comentarios.set(`c-sim-${Date.now()}`, { publicacion: ultima[0], autor: 'lucia', texto: '¡Muy bien! ¿Repetimos el sábado?', creado: new Date().toISOString() })
    return null
  },
  borrar_publicacion: ({ p_id }) => {
    if (publicaciones.get(p_id)?.autor !== YO) throw err('no_encontrado')
    publicaciones.delete(p_id)
    return null
  },
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*')
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] ?? '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  let cuerpo = ''
  req.on('data', (c) => { cuerpo += c })
  req.on('end', () => {
    const m = req.url.match(/^\/rest\/v1\/rpc\/(\w+)/)
    let status = 200
    let body
    if (m && rpc[m[1]]) {
      try {
        body = rpc[m[1]](cuerpo ? JSON.parse(cuerpo) : {})
      } catch (e) {
        if (e && e.status) ({ status, body } = e)
        else { status = 500; body = { message: String(e) } }
      }
    } else {
      status = 404
      body = { code: 'PGRST202', message: `Could not find ${req.url}` }
    }
    console.log(req.method, req.url, cuerpo, '->', status)
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body ?? null))
  })
}).listen(54329, '127.0.0.1', () => console.log('fake supabase en 54329'))
