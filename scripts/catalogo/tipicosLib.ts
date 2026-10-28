// Transformaciones puras. Node 24, sin dependencias ni acceso a disco/red.
import { normalizar, validarAlimento, validarConjunto, alimentosDePaquete, type FilaPaquete, type PaqueteCalidad, type RecetaFila } from './calidad.ts'
import type { Preparacion } from './preparacionesLib.ts'
import { CATEGORIAS_APPFIT } from './ciqualLib.ts'
export { normalizar } from './calidad.ts'
const BASE = ['kcal', 'prot', 'carb', 'grasa'] as const
const EXTRAS = ['fibra', 'azucares', 'sal', 'agSat'] as const
const CABECERA = 'id;nombre;alias;categoria;fuente;idFuente;kcal;prot;carb;grasa;fibra;azucares;sal;agSat;notas'
export interface Directo { fila: FilaPaquete; fuente: string; idFuente: string; notas: string }
export interface Receta {
  id: string; nombre: string; alias?: string[]; categoria: string; referencia: string
  pesoFinalG: number; ingredientes: { ciqual: string; gramos: number }[]
}
function exigir(ok: unknown, mensaje: string): asserts ok { if (!ok) throw new Error(mensaje) }
const redondear = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10
function metadatos(id: string, nombre: string, categoria: string, alias: string[] = []) {
  exigir(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id), `Slug inválido: ${id}`)
  exigir(nombre.trim() && CATEGORIAS_APPFIT.includes(categoria as typeof CATEGORIAS_APPFIT[number]), `Nombre/categoría inválidos: ${id}`)
  exigir(/,.*\b(crud[oa]s?|cocid[oa]s?|cocinad[oa]s?|hervid[oa]s?|frit[oa]s?|asad[oa]s?|estofad[oa]s?|guisad[oa]s?|cuajad[oa]s?|hornead[oa]s?|curad[oa]s?|list[oa]s? para consumir)\b/i.test(nombre), `Falta estado: ${id}`)
  exigir(alias.every(a => typeof a === 'string' && a.trim()), `Alias inválido: ${id}`)
  exigir(new Set(alias.map(normalizar)).size === alias.length, `Alias repetido: ${id}`)
}
/** CSV deliberadamente sin comillas, igual que traducciones.csv. Versión y nombre original van en notas. */
export function leerDirectos(csv: string): Directo[] {
  const lineas = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  exigir(lineas.shift() === CABECERA, 'Cabecera de directos.csv inválida')
  return lineas.filter(l => l.trim()).map((l, i) => {
    const c = l.split(';'); exigir(c.length === 15, `CSV fila ${i + 2}: se esperaban 15 columnas`)
    const [id, nombre, aliases, categoria, fuente, idFuente] = c
    // AppFit = valor típico estimado de etiquetas y webs (no oficial); exige las URL consultadas en notas.
    exigir(['CIQUAL', 'USDA', 'CoFID', 'Frida', 'AppFit'].includes(fuente), `Fuente no autorizada: ${fuente}`)
    exigir(fuente !== 'AppFit' || /(?:^|\|)fuentes=https?:\/\//.test(c[14]), `Faltan las fuentes consultadas: ${id}`)
    exigir(idFuente.trim() && /version=.+/.test(c[14]) && /original=.+/.test(c[14]), `Falta id, versión o nombre original: ${id}`)
    const alias = aliases ? aliases.split('|') : []; metadatos(id, nombre, categoria, alias)
    const numero = (s: string, obligatorio: boolean) => {
      if (!s.trim() && !obligatorio) return undefined
      exigir(/^\d+(?:,\d+)?$/.test(s), `Número inválido: ${id}: ${s}`)
      return redondear(Number(s.replace(',', '.')))
    }
    const valores = BASE.map((_, j) => numero(c[6 + j], true)!)
    const nutrientes: NonNullable<FilaPaquete[8]> = {}
    EXTRAS.forEach((k, j) => { const n = numero(c[10 + j], false); if (n !== undefined) nutrientes[k] = n })
    const original = /(?:^|\|)original=([^|]+)/.exec(c[14])?.[1]
    exigir(original, `Falta nombre original: ${id}`)
    const fila: FilaPaquete = [id, nombre, original, categoria, valores[0], valores[1], valores[2], valores[3]]
    if (Object.keys(nutrientes).length || alias.length) fila[8] = nutrientes
    if (alias.length) fila[9] = { alias }
    return { fila, fuente, idFuente, notas: c[14] }
  })
}
/** La receta tal como viaja en la fila: formulación y, si existe, su preparación. */
function recetaFila(r: Receta, p?: Preparacion): RecetaFila {
  const receta: RecetaFila = { peso: r.pesoFinalG, ing: r.ingredientes.map(i => [String(i.ciqual), i.gramos]) }
  if (p) {
    receta.raciones = p.raciones; receta.min = p.tiempoMin; receta.pasos = p.pasos
    if (p.notas) receta.notas = p.notas
  }
  return receta
}
export function calcularReceta(r: Receta, ciqual: PaqueteCalidad, preparacion?: Preparacion): FilaPaquete {
  metadatos(r.id, r.nombre, r.categoria, r.alias)
  exigir(ciqual.formato === 2 && ciqual.fuente === 'ciqual', 'Se necesita el paquete CIQUAL publicado')
  exigir(r.referencia.trim(), `Falta referencia: ${r.id}`)
  exigir(Number.isFinite(r.pesoFinalG) && r.pesoFinalG > 0 && r.ingredientes.length > 0, `Peso/ingredientes inválidos: ${r.id}`)
  // Sin agua de fuera de la lista, un plato no puede pesar más que lo que lleva (el agua que absorbe es un ingrediente).
  exigir(r.pesoFinalG <= r.ingredientes.reduce((s, i) => s + i.gramos, 0), `Peso final mayor que la suma de ingredientes: ${r.id}`)
  const porId = new Map(ciqual.filas.map(f => [f[0], f]))
  const ingredientes = r.ingredientes.map(i => {
    exigir(Number.isFinite(i.gramos) && i.gramos > 0, `Gramos inválidos: ${r.id}`)
    const f = porId.get(String(i.ciqual)); exigir(f, `CIQUAL inexistente: ${i.ciqual}`)
    // Ingredientes secos, aceites, especias, leche y agua no llevan el descriptor «crudo».
    // Conservas, envasados y fiambres («jamón cocido») entran tal cual se sirven; nunca un ingrediente ya cocinado.
    exigir(f[3] === 'Embutidos y fiambres' || !/\b(cocid|hervid|frit|asad|tostad)/i.test(f[1]), `Ingrediente cocinado: ${i.ciqual}`)
    return { f, gramos: i.gramos }
  })
  const valores = BASE.map((_, j) => redondear(ingredientes.reduce((s, i) => s + (i.f[4 + j] as number) * i.gramos, 0) / r.pesoFinalG))
  const n: NonNullable<FilaPaquete[8]> = {}
  for (const k of EXTRAS) if (ingredientes.every(i => i.f[8]?.[k] !== undefined)) {
    n[k] = redondear(ingredientes.reduce((s, i) => s + i.f[8]![k]! * i.gramos, 0) / r.pesoFinalG)
  }
  // Toda receta lleva su formulación en `extra.receta`, así que `nutrientes` siempre existe (aunque sea `{}`).
  const fila: FilaPaquete = [r.id, r.nombre, '', r.categoria, valores[0], valores[1], valores[2], valores[3], n]
  fila[9] = { ...(r.alias?.length ? { alias: r.alias } : {}), receta: recetaFila(r, preparacion) }
  return fila
}
/** Igualdad normalizada y similitud de tokens (Jaccard >= 0,75); no elimina estados. */
export function duplicados(filas: FilaPaquete[], otros: FilaPaquete[]) {
  const tokens = (s: string) => new Set(normalizar(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean))
  const indice = otros.map(f => ({ f, nombre: normalizar(f[1]), tokens: tokens(f[1]) }))
  return filas.flatMap(f => {
    const t = tokens(f[1])
    return indice.flatMap(o => {
      const exacto = normalizar(f[1]) === o.nombre
      const comunes = [...t].filter(x => o.tokens.has(x)).length
      const union = new Set([...t, ...o.tokens]).size
      return exacto || comunes / union >= 0.75 ? [{ id: f[0], otro: o.f[0], nombre: o.f[1], exacto }] : []
    })
  })
}
export function construir(directos: Directo[], recetas: Receta[], ciqual: PaqueteCalidad, version: string, preparaciones: Preparacion[] = []) {
  exigir(/^\d{4}-\d{2}-\d{2}$/.test(version), 'Versión inválida')
  const excluidos: string[] = []
  const avisos: string[] = []
  const aceptados = directos.filter(d => {
    const a = alimentosDePaquete({ formato: 2, fuente: 'tipicos', version, tipo: 'generico', filas: [d.fila] })[0]
    const q = validarAlimento(a, 'generico')
    exigir(!q.errores.length, JSON.stringify(q.errores))
    avisos.push(...q.avisos.map(h => `${h.id}: ${h.detalle}`))
    if (q.avisos.length && d.fuente !== 'CIQUAL') { excluidos.push(d.fila[0]); return false }
    return true
  })
  const porId = new Map(preparaciones.map(p => [p.id, p]))
  const filas = [...aceptados.map(d => d.fila), ...recetas.map(r => calcularReceta(r, ciqual, porId.get(r.id)))]
  const paquete: PaqueteCalidad = { formato: 2, fuente: 'tipicos', version, tipo: 'generico', filas }
  const calidad = validarConjunto(alimentosDePaquete(paquete), 'generico')
  exigir(!calidad.errores.length, JSON.stringify(calidad.errores))
  exigir(!duplicados(filas, ciqual.filas).some(d => d.exacto), 'Nombre ya existente en CIQUAL')
  avisos.push(...calidad.avisos.map(h => `${h.id}: ${h.detalle}`))
  return { paquete, excluidos, avisos: [...new Set(avisos)], directos: aceptados.length, recetas: recetas.length }
}
