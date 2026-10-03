/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Contraste WCAG de los pares texto/fondo de tokens.css, en claro y oscuro, y en el aviso invertido.
 * Si cambias un color y falla, ajusta el token. Resuelve `var(--c-…)` (--c-kcal, --c-goal, --c-focus…) en el bloque donde se declara.
 */
const css = readFileSync('src/shared/design/tokens.css', 'utf8')
const block = (start: string) => css.slice(css.indexOf(start), css.indexOf('\n}', css.indexOf(start)))

type Tokens = Record<string, string>
const parse = (b: string): Tokens => Object.fromEntries([...b.matchAll(/--c-([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))

/** Aplica cascada de bloques y resuelve las referencias `var(--c-x)` con los valores del propio elemento. */
function resolve(...layers: Tokens[]): Record<string, readonly number[]> {
  const merged = Object.assign({}, ...layers) as Tokens
  const out: Record<string, readonly number[]> = {}
  const get = (name: string, depth = 0): readonly number[] => {
    if (depth > 5) throw new Error(`Referencia circular en --c-${name}`)
    const v = merged[name]
    if (v === undefined) throw new Error(`Falta --c-${name}`)
    const ref = v.match(/^var\(--c-([\w-]+)\)$/)
    if (ref) return get(ref[1], depth + 1)
    const m = v.match(/^(\d+) (\d+) (\d+)$/)
    if (!m) throw new Error(`Valor no RGB en --c-${name}: ${v}`)
    return [+m[1], +m[2], +m[3]]
  }
  for (const k of Object.keys(merged)) out[k] = get(k)
  return out
}

const rootLight = parse(block(':root {'))
const rootDark = parse(block(":root[data-theme='dark'] {"))
const inverseLight = parse(block("[data-surface='inverse'] {"))
const inverseDark = parse(block(":root[data-theme='dark'] [data-surface='inverse']"))
const light = resolve(rootLight)
const dark = resolve(rootLight, rootDark)
const inverse = resolve(rootLight, inverseLight)
const inverseOscuro = resolve(rootLight, rootDark, inverseLight, inverseDark)

const lum = ([r, g, b]: readonly number[]) => {
  const f = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a: readonly number[], b: readonly number[]) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Texto que se lee: mínimo 4.5:1. Los colores de datos se usan como relleno de barras/gráficas (mínimo 3:1 en no-texto).
const TEXT: [string, string][] = [
  ['text-primary', 'bg'],
  ['text-primary', 'surface'],
  ['text-secondary', 'surface'],
  ['text-secondary', 'surface-muted'],
  ['text-tertiary', 'bg'],
  ['text-tertiary', 'surface'],
  ['text-tertiary', 'surface-muted'],
  ['on-accent', 'accent'],
  ['accent-strong', 'surface'],
  ['accent-strong', 'bg'],
  ['accent-strong', 'surface-muted'],
  ['accent-strong', 'accent-subtle'],
  ['on-selected', 'selected'],
  ['destructive', 'surface'],
  ['destructive', 'surface-muted'],
  ['on-destructive', 'destructive'],
  ['warning', 'surface'],
  ['success', 'surface'],
  ['on-success', 'success'],
  ['on-training', 'training'],
  ['training-muted', 'training'],
]
const FILLS = ['kcal', 'protein', 'carbs', 'fat']

const TEXT_INVERSE: [string, string][] = [
  ['text-primary', 'surface'], ['text-secondary', 'surface'],
  ['accent-strong', 'surface'], ['destructive', 'surface'],
]

describe.each([['claro', light], ['oscuro', dark]])('contraste (%s)', (_name, t) => {
  it.each(TEXT)('%s sobre %s ≥ 4.5', (fg, bg) => expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5))
  it.each(FILLS)('%s sobre surface ≥ 3 (relleno)', (k) => expect(ratio(t[k], t.surface)).toBeGreaterThanOrEqual(3))
  it.each(['protein', 'carbs', 'fat'])('%s como texto sobre todas las superficies ≥ 4.5', k => {
    for (const bg of ['bg', 'surface', 'surface-muted']) expect(ratio(t[k], t[bg])).toBeGreaterThanOrEqual(4.5)
  })
  it.each(['surface', 'surface-muted'])('borde de campo reconocible sobre %s ≥ 3', bg => expect(ratio(t['border-strong'], t[bg])).toBeGreaterThanOrEqual(3))
  it('la meta y el foco tienen contraste ≥ 3', () => {
    expect(ratio(t.goal, t.surface)).toBeGreaterThanOrEqual(3)
    expect(ratio(t.focus, t.surface)).toBeGreaterThanOrEqual(3)
  })
})
describe.each([['inverse (claro)', inverse], ['inverse (oscuro)', inverseOscuro]])('avisos %s', (_name, t) => {
  it.each(TEXT_INVERSE)('%s sobre %s ≥ 4.5', (fg, bg) => expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5))
  it('el foco se ve ≥ 3', () => expect(ratio(t.focus, t.surface)).toBeGreaterThanOrEqual(3))
})
