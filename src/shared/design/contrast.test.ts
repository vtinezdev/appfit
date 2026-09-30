/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Contraste WCAG de los pares texto/fondo de tokens.css, en claro y oscuro, y dentro de la superficie «ink».
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
const inkLight = parse(block("[data-surface='ink'] {"))
const inkDark = parse(block(":root[data-theme='dark'] [data-surface='ink']"))

const light = resolve(rootLight)
const dark = resolve(rootLight, rootDark)
// Dentro de ink, las variables derivadas del :root (kcal, focus…) se resuelven en :root; las redeclaradas, en ink.
const rootOnly = { light: rootLight, dark: { ...rootLight, ...rootDark } }
const withInk = (root: Tokens, ink: Tokens[]): Record<string, readonly number[]> => {
  const base = resolve(root)
  const overrides = resolve(root, ...ink)
  // solo lo que ink redeclara cambia; el resto conserva el valor resuelto en :root
  const declared = new Set(ink.flatMap((l) => Object.keys(l)))
  return Object.fromEntries(Object.keys(base).map((k) => [k, declared.has(k) ? overrides[k] : base[k]]))
}
const ink = withInk(rootOnly.light, [inkLight])
const inkOscuro = withInk(rootOnly.dark, [inkLight, inkDark])

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
]
const FILLS = ['kcal', 'protein', 'carbs', 'fat']

// Dentro del hero negro: texto sobre ink y sobre sus pistas, naranja de texto, datos como relleno.
const TEXT_INK: [string, string][] = [
  ['text-primary', 'surface'],
  ['text-secondary', 'surface'],
  ['text-secondary', 'surface-muted'],
  ['text-tertiary', 'surface'],
  ['text-tertiary', 'surface-muted'],
  ['accent-strong', 'surface'],
  ['accent-strong', 'accent-subtle'],
  ['destructive', 'surface'],
  ['on-accent', 'accent'],
  ['on-selected', 'selected'],
]

describe.each([
  ['claro', light],
  ['oscuro', dark],
])('contraste (%s)', (_name, t) => {
  it.each(TEXT)('%s sobre %s ≥ 4.5', (fg, bg) => {
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5)
  })
  it.each(FILLS)('%s sobre surface ≥ 3 (relleno)', (k) => {
    expect(ratio(t[k], t.surface)).toBeGreaterThanOrEqual(3)
  })
  it('la marca de meta (goal) y el foco se ven sobre surface ≥ 3', () => {
    expect(ratio(t.goal, t.surface)).toBeGreaterThanOrEqual(3)
    expect(ratio(t.focus, t.surface)).toBeGreaterThanOrEqual(3)
  })
})

describe.each([
  ['ink (claro)', ink],
  ['ink (oscuro)', inkOscuro],
])('contraste dentro de %s', (_name, t) => {
  it.each(TEXT_INK)('%s sobre %s ≥ 4.5', (fg, bg) => {
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5)
  })
  it.each(FILLS)('%s sobre ink ≥ 3 (relleno) y sobre su pista ≥ 1.5', (k) => {
    expect(ratio(t[k], t.surface)).toBeGreaterThanOrEqual(3)
    expect(ratio(t[k], t['surface-muted'])).toBeGreaterThanOrEqual(1.5)
  })
  it('la meta (goal) y el foco se ven sobre ink ≥ 3', () => {
    expect(ratio(t.goal, t.surface)).toBeGreaterThanOrEqual(3)
    expect(ratio(t.focus, t.surface)).toBeGreaterThanOrEqual(3)
  })
})

// Resplandor de la cabecera: el pico del halo (accent con --glow-alpha sobre bg) no debe restar legibilidad al texto de la cabecera.
const glowAlpha = (root: string) => parseFloat(root.match(/--glow-alpha:\s*([\d.]+)/)![1])
const mezcla = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t)))
describe.each([
  ['claro', light, glowAlpha(block(':root {'))],
  ['oscuro', dark, glowAlpha(block(":root[data-theme='dark'] {"))],
])('resplandor de fondo (%s)', (_name, t, alpha) => {
  const pico = mezcla(t.accent, t.bg, alpha)
  it.each(['text-primary', 'text-secondary'])('%s sobre el pico del resplandor ≥ 4.5', (fg) => {
    expect(ratio(t[fg], pico)).toBeGreaterThanOrEqual(4.5)
  })
})
