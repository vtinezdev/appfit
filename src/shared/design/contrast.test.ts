/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Contraste WCAG de los pares texto/fondo de tokens.css, en claro y oscuro. Si cambias un color y falla, ajusta el token. */
const css = readFileSync('src/shared/design/tokens.css', 'utf8')
const block = (start: string) => css.slice(css.indexOf(start), css.indexOf('\n}', css.indexOf(start)))
const parse = (b: string) =>
  Object.fromEntries([...b.matchAll(/--c-([\w-]+):\s*(\d+) (\d+) (\d+);/g)].map((m) => [m[1], [+m[2], +m[3], +m[4]] as const]))

const light = parse(block(':root {'))
const dark = { ...light, ...parse(block(":root[data-theme='dark']")) }

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
  ['accent', 'surface'],
  ['accent', 'accent-subtle'],
  ['destructive', 'surface'],
  ['destructive', 'surface-muted'],
  ['warning', 'surface'],
  ['success', 'surface'],
]
const FILLS = ['kcal', 'protein', 'carbs', 'fat']

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
})
