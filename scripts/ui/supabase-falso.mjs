// Supabase falso para probar Amigos en el navegador sin el proyecto real ni códigos por correo (docs/desarrollo.md).
// Imita las RPC sociales 0003–0018 y marcar_actividad, en memoria, con cuatro personas y dos solicitudes de ejemplo.
//
//   node scripts/ui/supabase-falso.mjs
//   VITE_SUPABASE_URL=http://127.0.0.1:54329 VITE_SUPABASE_PUBLISHABLE_KEY=falsa npx vite --port 5174 --strictPort --host 127.0.0.1
//
// y en http://appfit-test.localhost:5174, una sesión falsa en localStorage (clave `appfit-cuenta`, con `expires_at`
// futuro y un `user`) antes de recargar. Tras `simular_admin` con `{ p_admin: true }`, la sesión es de un
// administrador (0017): ve Moderación con cuatro denuncias de ejemplo y puede borrar, suspender y añadir a comunidades. No sustituye a supabase/pruebas/social.sql, que prueba el SQL de verdad.
import http from 'node:http'

const YO = 'yo'
const silencios = new Set()
const vistosComunidad = new Map()
const deportivos = new Map()
const moderadores = new Set()
let ADMIN = false
// comunidad|miembro -> quién le añadió (0017).
const anadidos = new Map()
const idsAnimos = new Map()
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
// Logro de Jon elegido como avatar (0012/0014): en el feed se ve su insignia en lugar del monograma.
publicaciones.set('p-logro-jon', { autor: 'jon', tipo: 'logro', fecha: hace(4000), creada: hace(3900), resumen: { v: 1, tipo: 'logro', titulo: 'Entrenos', logroId: 'entrenos', grupo: 'entreno', nivel: 2, descripcion: '50 entrenos terminados' } })
// Con 0016 sus destacados son medallas guardadas en el perfil, no publicaciones.
const deportivoJon = () => ({ bio: 'Fuerza tres días y monte los domingos.', disciplinas: ['fuerza', 'senderismo'], destacados: [], logros: [publicaciones.get('p-logro-jon').resumen], avatarId: 'p-logro-jon' })
deportivos.set('jon', deportivoJon())
// user -> identificador del catálogo (0015).
const avataresCatalogo = new Map([['lucia', 'paisaje.cumbre']])
// [publicacion, user]
const comunidades = new Map([
  ['grupo-running', { nombre: 'Running en compañía', descripcion: 'Salidas y conversaciones de quienes corren.', creador: 'pablo' }],
  ['grupo-fuerza', { nombre: 'Entreno de fuerza', descripcion: 'Progresar juntos en el gimnasio.', creador: 'jon' }],
  ['grupo-anuncios', { nombre: 'Actualizaciones de la comunidad', descripcion: 'Novedades del creador y comentarios de todos.', creador: 'jon', solo_creador_publica: true }],
])
const miembros = new Set(['grupo-running|pablo', 'grupo-fuerza|jon', 'grupo-anuncios|jon'])
publicaciones.set('p-comunidad', { autor: 'pablo', comunidad: 'grupo-running', tipo: 'texto', fecha: hace(60), creada: hace(50), resumen: { v: 1, tipo: 'texto', titulo: 'Publicación', texto: '¡Bienvenidos! No hace falta seguirnos para compartir aquí.' } })
publicaciones.set('p-anuncio', { autor: 'jon', comunidad: 'grupo-anuncios', tipo: 'texto', fecha: hace(40), creada: hace(30), resumen: { v: 1, tipo: 'texto', titulo: 'Publicación', texto: 'Estas son las novedades de la comunidad. Podéis comentarlas aquí.' } })
const inicial = { perfiles: [...perfiles].map(([k,v]) => [k, structuredClone(v)]), seg: [...seg], publicaciones: [...publicaciones].map(([k,v]) => [k, structuredClone(v)]), comunidades: [...comunidades].map(([k,v]) => [k, structuredClone(v)]), miembros: [...miembros] }
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
const modera = (id) => ADMIN || comunidades.get(id)?.creador===YO || moderadores.has(`${id}|${YO}`)
const pagina = (filtro, antes, limite, antesId) => [...publicaciones].filter(([id, pu]) => filtro(pu) && (!antes || pu.creada < antes || (pu.creada === antes && id < antesId)))
  .sort((a, b) => b[1].creada.localeCompare(a[1].creada) || b[0].localeCompare(a[0])).slice(0, limite).map(([pid]) => fila(pid))
const verPublicacion = (pid) => {
  const pu = publicaciones.get(pid)
  if (!pu || bloq(YO, pu.autor) || (pu.comunidad ? !miembros.has(`${pu.comunidad}|${YO}`) : !puedeVer(pu.autor))) throw err('no_encontrado')
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

const denunciasFalsas = [
  { id: 4, tipo: 'publicacion', objetivo: 'p-jon', creada: hace(30), denuncias: 2, motivos: ['acoso', 'spam'], detalles: ['Publica lo mismo cada día y responde mal a quien comenta.'], contenido: 'jon_92 · {}' },
  { id: 3, tipo: 'comentario', objetivo: 'c-denunciado', creada: hace(90), denuncias: 1, motivos: ['inapropiado'], detalles: [], contenido: 'lucia.run · ¡Qué barbaridad de sentadilla!' },
  { id: 2, tipo: 'perfil', objetivo: 'maria', creada: hace(600), denuncias: 3, motivos: ['suplantacion'], detalles: ['Usa la foto y el nombre de otra persona.', 'Se hace pasar por una entrenadora conocida.'], contenido: 'maria.fernandez.trail · María Fernández de la Torre Ruiz' },
  { id: 1, tipo: 'comunidad', objetivo: 'grupo-running', creada: hace(3000), denuncias: 1, motivos: ['spam'], detalles: [], contenido: 'Running en compañía · Salidas y conversaciones de quienes corren.' },
]

const rpc = {
  simular_reinicio: () => {
    silencios.clear(); vistosComunidad.clear(); deportivos.clear(); deportivos.set('jon', deportivoJon()); avataresCatalogo.clear(); avataresCatalogo.set('lucia', 'paisaje.cumbre'); moderadores.clear(); idsAnimos.clear()
    for (const [mapa, filas] of [[perfiles,inicial.perfiles],[seg,inicial.seg],[publicaciones,inicial.publicaciones],[comunidades,inicial.comunidades]]) { mapa.clear(); for (const [k,v] of filas) mapa.set(k,structuredClone(v)) }
    miembros.clear(); for (const m of inicial.miembros) miembros.add(m)
    anadidos.clear(); ADMIN = false; for (const d of denunciasFalsas) d.revisada = false
    bloqueos.clear(); reacciones.clear(); comentarios.clear(); avisosVistos = new Date(0).toISOString()
    return null
  },
  comunidades: ({ p_busqueda, p_solo_mias }) => {
    exigir()
    return [...comunidades].filter(([id,c]) => !bloq(YO,c.creador) && (!p_solo_mias || miembros.has(`${id}|${YO}`)) && c.nombre.toLowerCase().includes((p_busqueda || '').toLowerCase())).map(([id,c]) => ({ id, nombre: c.nombre, descripcion: c.descripcion, miembros: [...miembros].filter(m=>m.startsWith(`${id}|`)).length, unida: miembros.has(`${id}|${YO}`), mia: c.creador === YO, solo_creador_publica: c.solo_creador_publica === true }))
  },
  crear_comunidad: ({ p_id, p_nombre, p_descripcion, p_solo_creador_publica = false }) => {
    exigir()
    if (comunidades.get(p_id)?.creador === YO) return null
    if ([...comunidades.values()].some(c => c.nombre.toLowerCase() === p_nombre.toLowerCase())) throw err('comunidad_ocupada')
    comunidades.set(p_id,{ nombre:p_nombre, descripcion:p_descripcion, creador:YO, solo_creador_publica: p_solo_creador_publica }); miembros.add(`${p_id}|${YO}`); return null
  },
  unirse_comunidad: ({p_id}) => { exigir(); if(!comunidades.has(p_id)) throw err('no_encontrado'); miembros.add(`${p_id}|${YO}`); return null },
  salir_comunidad: ({p_id}) => { exigir(); if(comunidades.get(p_id)?.creador===YO) throw err('creador_no_puede_salir'); miembros.delete(`${p_id}|${YO}`); return null },
  editar_descripcion_comunidad: ({p_id,p_descripcion}) => { exigir(); const c=comunidades.get(p_id); if(c?.creador!==YO) throw err('no_encontrado'); if((p_descripcion??'').trim().length>300) throw err('comunidad_no_valida'); c.descripcion=(p_descripcion??'').trim(); return null },
  borrar_comunidad: ({p_id}) => { if(!perfiles.has(YO))throw err('sin_perfil'); if(comunidades.get(p_id)?.creador!==YO) throw err('no_encontrado'); comunidades.delete(p_id); for(const [id,p] of publicaciones) if(p.comunidad===p_id) publicaciones.delete(id); for(const m of miembros) if(m.startsWith(`${p_id}|`)) miembros.delete(m); return null },
  publicaciones_comunidad: ({p_id,p_antes,p_limite,p_antes_id}) => { exigir(); if(!miembros.has(`${p_id}|${YO}`)) throw err('no_miembro'); return pagina(p=>p.comunidad===p_id && !bloq(YO,p.autor),p_antes,p_limite,p_antes_id) },
  publicar_comunidad: ({p_id,p_tipo,p_fecha,p_resumen,p_comunidad}) => { exigir(); if(!miembros.has(`${p_comunidad}|${YO}`)) throw err('no_miembro'); if(publicaciones.has(p_id)) { if(publicaciones.get(p_id).autor===YO && publicaciones.get(p_id).comunidad===p_comunidad) return null; throw err('publicacion_no_valida') }; const c = comunidades.get(p_comunidad); if(c.solo_creador_publica && c.creador!==YO) throw err('solo_creador_publica'); publicaciones.set(p_id,{autor:YO,tipo:p_tipo,fecha:p_fecha,resumen:p_resumen,comunidad:p_comunidad,creada:new Date().toISOString()}); return null },
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
    if([...comunidades.values()].some(c=>c.creador===YO))throw err('comunidades_pendientes')
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
    if (!p_aceptar) { seg.delete(k); return null }
    // Como 0018: aceptar hace que os sigáis los dos.
    seg.set(k, 'aceptado')
    seg.set(`${YO}|${otro(p_alias)}`, 'aceptado')
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
    if (!['entreno', 'actividad', 'texto', 'logro'].includes(p_tipo) || JSON.stringify(p_resumen).length > 8192) throw err('publicacion_no_valida')
    publicaciones.set(p_id, { autor: YO, tipo: p_tipo, fecha: p_fecha, creada: new Date().toISOString(), resumen: p_resumen })
    console.log('publicado', JSON.stringify(p_resumen))
    return null
  },
  feed: ({ p_antes, p_limite, p_antes_id }) => { exigir(); return pagina((pu) => !pu.comunidad && puedeVer(pu.autor) && !silencios.has(pu.autor), p_antes, p_limite, p_antes_id) },
  publicaciones_de: ({ p_alias, p_antes, p_limite, p_antes_id }) => {
    exigir()
    const id = idDe(p_alias)
    if (!id || !puedeVer(id)) throw err('no_encontrado')
    return pagina((pu) => !pu.comunidad && pu.autor === id, p_antes, p_limite, p_antes_id)
  },
  publicaciones_persona_comunidad: ({ p_alias, p_comunidad, p_antes, p_antes_id, p_limite }) => { exigir(); if(!miembros.has(`${p_comunidad}|${YO}`)) throw err('no_miembro'); return pagina(p => p.comunidad === p_comunidad && p.autor === idDe(p_alias) && !bloq(YO,p.autor), p_antes, p_limite, p_antes_id) },
  reaccionar: ({ p_id }) => { exigir(); verPublicacion(p_id); reacciones.add(`${p_id}|${YO}`); return null },
  quitar_reaccion: ({ p_id }) => { exigir(); reacciones.delete(`${p_id}|${YO}`); return null },
  comentarios_de: ({ p_id }) => {
    exigir()
    const pu = verPublicacion(p_id)
    return [...comentarios].filter(([, c]) => c.publicacion === p_id).map(([id, c]) => {
      const pe = perfiles.get(c.autor)
      return { id, alias: pe.alias, nombre: pe.nombre, texto: c.texto, creado: c.creado, mio: c.autor === YO, puedo_borrar: c.autor === YO || pu.autor === YO || modera(pu.comunidad), respuesta_a: c.respuesta_a ?? null, respuesta_alias: c.respuesta_a ? perfiles.get(comentarios.get(c.respuesta_a)?.autor)?.alias : null }
    })
  },
  comentarios_pagina: ({ p_id, p_antes, p_antes_id, p_limite }) => {
    const todos = rpc.comentarios_de({ p_id })
    return { total: todos.length, items: todos.filter(c => !p_antes || c.creado < p_antes || (c.creado === p_antes && c.id < p_antes_id))
      .sort((a,b) => b.creado.localeCompare(a.creado) || b.id.localeCompare(a.id)).slice(0,p_limite) }
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
  comentar_respuesta: ({p_id,p_texto,p_respuesta}) => {
    if(p_respuesta) { const padre=comentarios.get(p_respuesta); if(!padre || padre.publicacion!==p_id || padre.respuesta_a || bloq(YO,padre.autor)) throw err('no_encontrado') }
    const id=rpc.comentar({p_id,p_texto}); comentarios.get(id).respuesta_a=p_respuesta; return id
  },
  animos_de: ({p_id,p_antes,p_antes_id,p_limite}) => {
    exigir(); if(verPublicacion(p_id).autor!==YO) throw err('no_encontrado')
    return [...reacciones].map(k=>k.split('|')).filter(([pid,id])=>pid===p_id && !bloq(YO,id)).map(([,id])=>{const clave=`${p_id}|${id}`;if(!idsAnimos.has(clave))idsAnimos.set(clave,crypto.randomUUID());return {id:idsAnimos.get(clave),alias:perfiles.get(id).alias,nombre:perfiles.get(id).nombre,creada:publicaciones.get(p_id).creada}})
      .filter(p=>!p_antes || p.creada<p_antes || (p.creada===p_antes&&p.id<p_antes_id)).sort((a,b)=>b.creada.localeCompare(a.creada)||b.id.localeCompare(a.id)).slice(0,p_limite)
  },
  silenciar: ({p_alias,p_silenciar}) => { exigir(); const id=otro(p_alias); if(p_silenciar)silencios.add(id);else silencios.delete(id);return null },
  silenciados: () => { exigir();return [...silencios].map(id=>({alias:perfiles.get(id).alias,nombre:perfiles.get(id).nombre})) },
  novedades_comunidades: () => { exigir();return Object.fromEntries([...comunidades.keys()].filter(id=>miembros.has(`${id}|${YO}`)).map(id=>[id,[...publicaciones.values()].filter(p=>p.comunidad===id&&p.autor!==YO&&p.creada>(vistosComunidad.get(id)??'')).length])) },
  ver_comunidad: ({p_id})=>{exigir();if(!miembros.has(`${p_id}|${YO}`))throw err('no_miembro');vistosComunidad.set(p_id,new Date().toISOString());return null},
  comunidades_propias: () => { if(!perfiles.has(YO))throw err('sin_perfil');return [...comunidades].filter(([,c])=>c.creador===YO).map(([id,c])=>({id,nombre:c.nombre})) },
  simular_suspension: () => { perfiles.get(YO).suspendido=true;return null },
  gestion_comunidad: ({p_id})=>{exigir();const c=comunidades.get(p_id);if(!c||bloq(YO,c.creador))throw err('no_encontrado');const creador=c.creador===YO;return {modera:modera(p_id),creador,reglas:c.reglas??'',bienvenida:c.bienvenida??'',miembros:modera(p_id)?[...perfiles].filter(([id])=>miembros.has(`${p_id}|${id}`)).map(([id,p])=>({alias:p.alias,nombre:p.nombre,creador:c.creador===id,moderador:moderadores.has(`${p_id}|${id}`),yo:id===YO})):[]}},
  gestionar_comunidad: ({p_id,p_accion,p_alias,p_texto})=>{exigir();const c=comunidades.get(p_id);if(!c||!modera(p_id)||(p_accion!=='expulsar'&&c.creador!==YO))throw err('no_encontrado');if(p_accion==='reglas'||p_accion==='bienvenida')c[p_accion]=p_texto;else{const id=otro(p_alias);if(!miembros.has(`${p_id}|${id}`)||id===YO||id===c.creador)throw err('no_encontrado');if(p_accion==='transferir'){c.creador=id;moderadores.delete(`${p_id}|${id}`)}else if(p_accion==='expulsar')miembros.delete(`${p_id}|${id}`);else if(p_accion==='nombrar')moderadores.add(`${p_id}|${id}`);else if(p_accion==='revocar')moderadores.delete(`${p_id}|${id}`)}return null},
  social_capacidades: () => { exigir(); return { camposOpcionales: true } },
  perfil_deportivo: ({p_alias,p_comunidad})=>{exigir();const id=idDe(p_alias);if(!id||bloq(YO,id))throw err('no_encontrado');if(p_comunidad&&!miembros.has(`${p_comunidad}|${YO}`))throw err('no_miembro');const pe=perfiles.get(id),de=deportivos.get(id)??{bio:'',disciplinas:[],destacados:[],logros:[],avatarId:null};const visibles=[...publicaciones].filter(([,p])=>p.autor===id&&(p_comunidad?p.comunidad===p_comunidad:!p.comunidad&&puedeVer(id)));return {...de,alias:pe.alias,nombre:pe.nombre,publicadas:visibles.length,destacados:visibles.filter(([pid])=>de.destacados.includes(pid)).map(([id,p])=>({id,resumen:p.resumen})),avatar:visibles.find(([pid])=>pid===de.avatarId)?.[1].resumen??null}},
  editar_perfil_deportivo: ({p_bio,p_disciplinas,p_destacados,p_avatar})=>{exigir();if(p_bio.length>160||p_disciplinas.length>3||p_destacados.length>3)throw err('perfil_deportivo_no_valido');deportivos.set(YO,{bio:p_bio,disciplinas:p_disciplinas,destacados:p_destacados,avatarId:p_avatar});return null},
  // 0016: hasta tres medallas de logro distintas, sin publicar.
  guardar_perfil_deportivo: ({ p_bio, p_disciplinas, p_logros }) => {
    exigir()
    const ids = p_logros.map(l => l?.logroId)
    if (p_bio.length > 160 || p_disciplinas.length > 3 || p_logros.length > 3 || new Set(ids).size !== ids.length || p_logros.some(l => l?.tipo !== 'logro' || 'nota' in l)) throw err('perfil_deportivo_no_valido')
    const de = deportivos.get(YO) ?? { avatarId: null }
    deportivos.set(YO, { ...de, bio: p_bio.trim(), disciplinas: p_disciplinas, logros: p_logros, destacados: [] })
    return null
  },
  borrar_comentario: ({ p_id }) => {
    const c = comentarios.get(p_id)
    if (!c || (c.autor !== YO && publicaciones.get(c.publicacion)?.autor !== YO && !modera(publicaciones.get(c.publicacion)?.comunidad))) throw err('no_encontrado')
    comentarios.delete(p_id)
    return null
  },
  avisos: () => {
    exigir()
    const mias = new Set([...publicaciones].filter(([, pu]) => pu.autor === YO).map(([pid]) => pid))
    const lista = [
      ...[...reacciones].map((r) => r.split('|')).filter(([pid, u]) => mias.has(pid) && u !== YO).map(([pid, u]) => ({ tipo: 'reaccion', alias: perfiles.get(u).alias, nombre: perfiles.get(u).nombre, publicacion: pid, titulo: publicaciones.get(pid).resumen.titulo, texto: null, creado: publicaciones.get(pid).creada })),
      ...[...comentarios.values()].filter((c) => mias.has(c.publicacion) && c.autor !== YO).map((c) => ({ tipo: 'comentario', alias: perfiles.get(c.autor).alias, nombre: perfiles.get(c.autor).nombre, publicacion: c.publicacion, titulo: publicaciones.get(c.publicacion).resumen.titulo, texto: c.texto.slice(0, 120), creado: c.creado })),
      ...[...anadidos].filter(([k]) => k.endsWith(`|${YO}`) && miembros.has(k)).map(([k, v]) => ({ tipo: 'anadido', alias: perfiles.get(v.por).alias, nombre: perfiles.get(v.por).nombre, publicacion: k.split('|')[0], titulo: comunidades.get(k.split('|')[0]).nombre, texto: null, creado: v.creado })),
    ].filter(a=>!bloq(YO,idDe(a.alias))).map((a) => ({ ...a, nuevo: a.creado > avisosVistos })).sort((a, b) => (a.creado < b.creado ? 1 : -1))
    return { solicitudes: [...seg].filter(([k, v]) => k.endsWith(`|${YO}`) && v === 'pendiente').length, nuevos: lista.filter((a) => a.nuevo).length, lista: lista.slice(0,30) }
  },
  marcar_avisos_vistos: () => { exigir(); avisosVistos = new Date().toISOString(); return null },
  // 0014: avatar (logro elegido) de quien se puede ver y último comentario visible de cada publicación.
  avatares_social: ({ p_alias, p_comunidad }) => {
    exigir(); if (p_comunidad && !miembros.has(`${p_comunidad}|${YO}`)) throw err('no_miembro')
    return Object.fromEntries((p_alias ?? []).slice(0, 60).flatMap((alias) => {
      const id = idDe(alias), pid = id && deportivos.get(id)?.avatarId, pu = pid && publicaciones.get(pid)
      if (!pu || bloq(YO, id) || pu.tipo !== 'logro' || (p_comunidad ? pu.comunidad !== p_comunidad : pu.comunidad || !puedeVer(id))) return []
      return [[perfiles.get(id).alias, pu.resumen]]
    }))
  },
  // 0015: avatar de catálogo (se ve donde se vea el alias) y, si no hay, el logro de 0014. Lucía tiene un paisaje.
  avatares_perfil: (args) => {
    const anteriores = rpc.avatares_social(args)
    for (const alias of args.p_alias ?? []) {
      const id = idDe(alias), a = id && avataresCatalogo.get(id)
      if (a && !bloq(YO, id)) anteriores[perfiles.get(id).alias] = a
    }
    return anteriores
  },
  editar_avatar: ({ p_avatar }) => {
    exigir()
    if (p_avatar !== null && !/^(disciplina\.[a-z-]+\.[a-z-]+|paisaje\.[a-z-]+|logro\.[a-z-]+\.[a-z-]+)$/.test(p_avatar)) throw err('avatar_no_valido')
    if (p_avatar === null) avataresCatalogo.delete(YO); else avataresCatalogo.set(YO, p_avatar)
    const de = deportivos.get(YO); if (de) deportivos.set(YO, { ...de, avatarId: null })
    return null
  },
  ultimos_comentarios: ({ p_ids }) => {
    exigir()
    return Object.fromEntries((p_ids ?? []).slice(0, 30).flatMap((pid) => {
      try { verPublicacion(pid) } catch { return [] }
      const c = [...comentarios.values()].filter((c) => c.publicacion === pid && !bloq(YO, c.autor)).sort((a, b) => b.creado.localeCompare(a.creado))[0]
      if (!c) return []
      const pe = perfiles.get(c.autor)
      return [[pid, { alias: pe.alias, nombre: pe.nombre, texto: c.texto.slice(0, 140) }]]
    }))
  },
  // Para probar los avisos: Lucía comenta y Jon da ánimo en lo último que publiqué (POST /rest/v1/rpc/simular_avisos).
  simular_comentarios_largos: ({p_id}) => {
    verPublicacion(p_id);for(const [id,c] of comentarios)if(c.publicacion===p_id)comentarios.delete(id)
    const creado=new Date().toISOString()
    for(let i=1;i<=250;i++)comentarios.set(`qa-comentario-${String(i).padStart(3,'0')}`,{publicacion:p_id,autor:'jon',texto:`Comentario de prueba ${i}`,creado})
    return null
  },
  simular_paginas_desconocidas: () => {
    const creada=new Date().toISOString()
    for(let i=0;i<45;i++)publicaciones.set(`qa-pagina-${String(i).padStart(2,'0')}`,{autor:'jon',tipo:'texto',fecha:creada,creada,resumen:i>=25?{v:99}:{v:1,tipo:'texto',titulo:'Publicación',texto:`Publicación accesible ${i}`}})
    return null
  },
  simular_publicacion_nueva: () => { const id=crypto.randomUUID(),creada=new Date().toISOString();publicaciones.set(id,{autor:'jon',tipo:'texto',fecha:creada,creada,resumen:{v:1,tipo:'texto',titulo:'Publicación',texto:'Nueva publicación para comprobar el refresco'}});return id },
  simular_avisos: () => {
    const ultima = [...publicaciones].filter(([, pu]) => pu.autor === YO).sort((a, b) => b[1].creada.localeCompare(a[1].creada) || b[0].localeCompare(a[0]))[0]
    if (!ultima) throw err('no_encontrado')
    reacciones.add(`${ultima[0]}|jon`)
    comentarios.set(`c-sim-${Date.now()}`, { publicacion: ultima[0], autor: 'lucia', texto: '¡Muy bien! ¿Repetimos el sábado?', creado: new Date().toISOString() })
    return null
  },
  // 0017: administración. Las denuncias de ejemplo se calculan con lo que existe ahora.
  soy_admin: () => ADMIN,
  // El comentario denunciado se crea aquí: simular_reinicio vacía los comentarios.
  simular_admin: ({ p_admin }) => {
    ADMIN = p_admin === true
    if (ADMIN) comentarios.set('c-denunciado', { publicacion: 'p-jon', autor: 'lucia', texto: '¡Qué barbaridad de sentadilla!', creado: hace(100) })
    return null
  },
  admin_denuncias: () => {
    if (!ADMIN) throw err('no_encontrado')
    return denunciasFalsas.filter(d => !d.revisada).map(d => {
      const autor = d.tipo === 'perfil' ? d.objetivo : d.tipo === 'publicacion' ? publicaciones.get(d.objetivo)?.autor : d.tipo === 'comentario' ? comentarios.get(d.objetivo)?.autor : comunidades.get(d.objetivo)?.creador
      const vigente = d.tipo === 'perfil' ? perfiles.has(d.objetivo) : d.tipo === 'publicacion' ? publicaciones.has(d.objetivo) : d.tipo === 'comentario' ? comentarios.has(d.objetivo) : comunidades.has(d.objetivo)
      return { id: d.id, tipo: d.tipo, creada: d.creada, denuncias: d.denuncias, motivos: d.motivos, detalles: d.detalles, contenido: d.contenido,
        autor: autor ? perfiles.get(autor)?.alias ?? null : null, autorSuspendido: Boolean(autor && perfiles.get(autor)?.suspendido), vigente,
        resumen: d.tipo === 'publicacion' ? publicaciones.get(d.objetivo)?.resumen ?? null : null, texto: d.tipo === 'comentario' ? comentarios.get(d.objetivo)?.texto ?? null : null }
    })
  },
  admin_resolver_denuncia: ({ p_id, p_accion }) => {
    const d = denunciasFalsas.find(x => x.id === p_id && !x.revisada)
    if (!ADMIN || !d) throw err('no_encontrado')
    if (p_accion === 'borrar') { if (d.tipo === 'publicacion') publicaciones.delete(d.objetivo); else if (d.tipo === 'comentario') comentarios.delete(d.objetivo); else throw err('accion_no_valida') }
    else if (p_accion === 'suspender') {
      const autor = d.tipo === 'perfil' ? d.objetivo : d.tipo === 'publicacion' ? publicaciones.get(d.objetivo)?.autor : d.tipo === 'comentario' ? comentarios.get(d.objetivo)?.autor : comunidades.get(d.objetivo)?.creador
      if (!autor || autor === YO) throw err('no_encontrado')
      perfiles.get(autor).suspendido = true; perfiles.get(autor).suspendidoDesde = new Date().toISOString()
    } else if (p_accion !== 'descartar') throw err('accion_no_valida')
    d.revisada = true
    return null
  },
  admin_suspender: ({ p_alias, p_suspender }) => {
    const id = ADMIN && idDe(p_alias)
    if (!id || id === YO || perfiles.get(id).suspendido === p_suspender) throw err('no_encontrado')
    perfiles.get(id).suspendido = p_suspender; perfiles.get(id).suspendidoDesde = p_suspender ? new Date().toISOString() : undefined
    return null
  },
  admin_suspendidos: () => {
    if (!ADMIN) throw err('no_encontrado')
    return [...perfiles.values()].filter(p => p.suspendido).map(p => ({ alias: p.alias, nombre: p.nombre, desde: p.suspendidoDesde ?? null, con_perfil: true }))
  },
  anadir_a_comunidad: ({ p_id, p_alias }) => {
    const id = ADMIN && idDe(p_alias)
    if (!id || id === YO || !comunidades.has(p_id) || perfiles.get(id).suspendido) throw err('no_encontrado')
    if (miembros.has(`${p_id}|${id}`)) throw err('ya_miembro')
    miembros.add(`${p_id}|${id}`); anadidos.set(`${p_id}|${id}`, { por: YO, creado: new Date().toISOString() })
    return null
  },
  // Para ver el aviso «te añadió»: Jon me mete en Entreno de fuerza.
  simular_anadido: () => { miembros.add(`grupo-fuerza|${YO}`); anadidos.set(`grupo-fuerza|${YO}`, { por: 'jon', creado: new Date().toISOString() }); return null },
  borrar_publicacion: ({ p_id }) => {
    if (publicaciones.get(p_id)?.autor !== YO && !modera(publicaciones.get(p_id)?.comunidad)) throw err('no_encontrado')
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
