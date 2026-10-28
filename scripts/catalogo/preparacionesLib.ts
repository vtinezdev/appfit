// Preparaciones (raciones, tiempo y pasos) de las recetas de típicos. Lógica pura, sin E/S.
// Contenido en tipicos/preparaciones.json, separado de recetas.json para no tocar las formulaciones.
// Límites iguales a los de las recetas propias (src/features/nutricion/lib/recetas.ts; lo comprueba scripts/integracion/preparacionesLimites.test.ts).
import type { Receta } from './tipicosLib.ts'

export const RACIONES_MAX = 50
export const PASOS_MAX = 40
export const PASO_MAX_CARACTERES = 1000
export const TIEMPO_MAX_MIN = 2880
export const NOTAS_MAX_CARACTERES = 2000

export interface Preparacion { id: string; raciones: number; tiempoMin: number; pasos: string[]; notas?: string }

const entero = (n: unknown, min: number, max: number) => Number.isInteger(n) && (n as number) >= min && (n as number) <= max
const texto = (s: unknown) => typeof s === 'string' && s.trim() === s && s.length > 0

/** Errores de las preparaciones frente a las recetas publicadas; vacío = válidas. */
export function validarPreparaciones(preparaciones: Preparacion[], recetas: Pick<Receta, 'id'>[]): string[] {
  const ids = new Set(recetas.map(r => r.id))
  const vistos = new Set<string>()
  return preparaciones.flatMap((p, i) => {
    const id = typeof p?.id === 'string' ? p.id : `#${i}`
    const errores: string[] = []
    if (!ids.has(id)) errores.push('la receta no existe en recetas.json')
    if (vistos.has(id)) errores.push('id repetido')
    vistos.add(id)
    if (!entero(p.raciones, 1, RACIONES_MAX)) errores.push(`raciones enteras de 1 a ${RACIONES_MAX}`)
    if (!entero(p.tiempoMin, 1, TIEMPO_MAX_MIN)) errores.push(`tiempo entero de 1 a ${TIEMPO_MAX_MIN} min`)
    if (!Array.isArray(p.pasos) || p.pasos.length < 1 || p.pasos.length > PASOS_MAX) errores.push(`de 1 a ${PASOS_MAX} pasos`)
    else p.pasos.forEach((paso, j) => {
      if (!texto(paso)) errores.push(`paso ${j + 1} vacío o con espacios sobrantes`)
      else if (paso.length > PASO_MAX_CARACTERES) errores.push(`paso ${j + 1} con más de ${PASO_MAX_CARACTERES} caracteres`)
    })
    if (p.notas !== undefined && (!texto(p.notas) || p.notas.length > NOTAS_MAX_CARACTERES)) errores.push(`notas vacías o de más de ${NOTAS_MAX_CARACTERES} caracteres`)
    const sobrantes = Object.keys(p).filter(k => !['id', 'raciones', 'tiempoMin', 'pasos', 'notas'].includes(k))
    if (sobrantes.length) errores.push(`campos desconocidos: ${sobrantes.join(', ')}`)
    return errores.map(e => `${id}: ${e}`)
  })
}

type FilaCiqual = [string, string, string, string, number, number, number, number, ...unknown[]]
const cifra = (n: number, decimales = 0) => n.toLocaleString('es-ES', { maximumFractionDigits: decimales, useGrouping: n >= 10_000 ? true : false })
const gramos = (g: number) => `${cifra(g, 1)} g`

/** Listado legible (Markdown) de las preparaciones para revisarlas: ingredientes del lote, valores por ración y pasos. */
export function informePreparaciones(preparaciones: Preparacion[], recetas: Receta[], ciqual: FilaCiqual[], titulo: string): string {
  const porId = new Map(recetas.map(r => [r.id, r]))
  const alimentos = new Map(ciqual.map(f => [f[0], f]))
  const fichas = preparaciones.map((p, i) => {
    const r = porId.get(p.id)
    if (!r) return `## ${i + 1}. ${p.id}\n\nReceta inexistente.`
    const ingredientes = r.ingredientes.map(g => ({ g, f: alimentos.get(String(g.ciqual)) }))
    const total = [4, 5, 6, 7].map(k => ingredientes.reduce((s, { g, f }) => s + (f ? (f[k] as number) * g.gramos / 100 : 0), 0))
    const crudo = r.ingredientes.reduce((s, g) => s + g.gramos, 0)
    const [kcal, prot, carb, grasa] = total.map(v => v / p.raciones)
    const avisos = [
      ...ingredientes.filter(x => !x.f).map(x => `ingrediente CIQUAL ${x.g.ciqual} inexistente`),
      ...(r.pesoFinalG > crudo ? [`el peso final (${gramos(r.pesoFinalG)}) supera la suma de ingredientes (${gramos(crudo)})`] : []),
    ]
    return [
      `## ${i + 1}. ${r.nombre}`,
      '',
      `\`${r.id}\` · ${r.categoria} · ${p.raciones} ${p.raciones === 1 ? 'ración' : 'raciones'} de ${gramos(Math.round(r.pesoFinalG / p.raciones))} · ${p.tiempoMin} min · por ración: ${cifra(kcal)} kcal, P ${cifra(prot, 1)} g, C ${cifra(carb, 1)} g, G ${cifra(grasa, 1)} g`,
      ...(avisos.length ? ['', ...avisos.map(a => `> **Revisar:** ${a}.`)] : []),
      '',
      `**Ingredientes** (lote de ${gramos(r.pesoFinalG)} cocinado)`,
      '',
      ...ingredientes.map(({ g, f }) => `- ${gramos(g.gramos)} · ${f ? f[1] : `CIQUAL ${g.ciqual}`}`),
      '',
      '**Preparación**',
      '',
      ...p.pasos.map((paso, j) => `${j + 1}. ${paso}`),
      ...(p.notas ? ['', `*Notas:* ${p.notas}`] : []),
    ].join('\n')
  })
  return [`# ${titulo}`, '', `${preparaciones.length} recetas. Generado con \`npm run catalogo:preparaciones\`; no editar a mano.`, '', ...fichas.flatMap(f => [f, ''])].join('\n')
}
