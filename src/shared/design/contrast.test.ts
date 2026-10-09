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
const cardDark = parse(block(":root[data-theme='dark'] :is(.app-card"))
const light = resolve(rootLight)
const dark = resolve(rootLight, rootDark)
const cardOscura = resolve(rootLight, rootDark, cardDark)
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

const atmosphere = (name: string, theme: 'light' | 'dark') => {
  const value = (section: string) => block(section).match(new RegExp(`--atmosphere-${name}:\\s*([\\d.]+)`))?.[1]
  return Number((theme === 'dark' ? value(":root[data-theme='dark'] {") : undefined) ?? value(':root {'))
}
const over = (fg: readonly number[], bg: readonly number[], alpha: number) => fg.map((n, i) => n * alpha + bg[i] * (1 - alpha))
// Saturación no afecta a los extremos grises; brightness/contrast sí, en este orden CSS.
const filteredPhoto = (rgb: readonly number[], theme: 'light' | 'dark') => rgb.map(v => Math.min(255, Math.max(0,
  (v * atmosphere('photo-brightness', theme) - 127.5) * atmosphere('photo-contrast', theme) + 127.5)))


describe.each([['light', light], ['dark', dark]] as const)('luces ambientales (%s)', (theme, t) => {
  it.each([['cobalt', 'steel'], ['sand', 'slate'], ['slate', 'mist']])('lectura sobre el máximo combinado de %s/%s', (primary, secondary) => {
    const first = over(t[`atmosphere-${primary}`], t.bg, atmosphere('light-primary-opacity', theme))
    const ambient = over(t[`atmosphere-${secondary}`], first, atmosphere('light-secondary-opacity', theme))
    for (const fg of ['text-primary', 'text-secondary', 'text-tertiary', 'accent-strong']) expect(ratio(t[fg], ambient), fg).toBeGreaterThanOrEqual(4.5)
    // Extremos fotográficos + ambas luces, incluyendo posiciones intermedias del fade.
    const stops = [[0, atmosphere('wash-top', theme)], [0.18, atmosphere('wash-upper', theme)], [0.43, atmosphere('wash-middle', theme)], [0.75, 0.97], [1, 1]]
    for (const [position, wash] of stops) for (const v of [0, 255]) {
      const mask = position <= 0.4 ? 1 : (1 - position) / 0.6
      const photo = over(filteredPhoto([v, v, v], theme), ambient, atmosphere('photo-opacity', theme) * mask)
      const scene = over(t.bg, photo, wash * mask)
      const reading = over(t.bg, scene, atmosphere('reading-wash', theme))
      for (const fg of ['text-primary', 'text-secondary', 'text-tertiary', 'accent-strong']) expect(ratio(t[fg], reading), `${fg} en fade ${position}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe.each([['light', light], ['dark', dark]] as const)('lectura sobre fotografía (%s)', (theme, t) => {
  // En claro el contexto superior y la lectura sin panel también deben resistir
  // el extremo negro de las fotografías. En oscuro los paneles/cabeceras protegen lectura.
  if (theme === 'light') {
    it.each([[0, 0, 0], [255, 255, 255]])('contexto superior sin panel sobre %s', (r, g, b) => {
      const photo = over(filteredPhoto([r, g, b], theme), t.bg, atmosphere('photo-opacity', theme))
      const scene = over(t.bg, photo, atmosphere('wash-top', theme))
      for (const fg of ['text-primary', 'text-secondary']) {
        expect(ratio(t[fg], scene), fg).toBeGreaterThanOrEqual(4.5)
      }
    })

    it.each([[0, 0, 0], [255, 255, 255]])('lectura plana tras el contexto sobre %s', (r, g, b) => {
      const photo = over(filteredPhoto([r, g, b], theme), t.bg, atmosphere('photo-opacity', theme))
      const scene = over(t.bg, photo, atmosphere('wash-upper', theme))
      for (const fg of ['text-primary', 'text-secondary', 'text-tertiary', 'accent-strong']) {
        expect(ratio(t[fg], scene), fg).toBeGreaterThanOrEqual(4.5)
      }
    })
  }

  it.each([[0, 0, 0], [255, 255, 255]])('cabeceras/tabs con el extremo fotográfico %s', (r, g, b) => {
    const photo = over(filteredPhoto([r, g, b], theme), t.bg, atmosphere('photo-opacity', theme))
    const scene = over(t.bg, photo, atmosphere('wash-top', theme))
    const reading = over(t.bg, scene, atmosphere('reading-wash', theme))
    for (const fg of ['text-primary', 'text-secondary', 'text-tertiary', 'accent-strong']) {
      expect(ratio(t[fg], reading), fg).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each([[0, 0, 0], [255, 255, 255]])('paneles sobre el extremo fotográfico %s', (r, g, b) => {
    const surface = over(t.surface, [r, g, b], atmosphere('panel-opacity', theme))
    const training = over(t.training, [r, g, b], atmosphere('training-opacity', theme))
    for (const fg of ['text-primary', 'text-secondary', 'text-tertiary', 'accent-strong']) {
      expect(ratio(t[fg], surface), fg).toBeGreaterThanOrEqual(4.5)
    }
    expect(ratio(t['on-training'], training)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(t['training-muted'], training)).toBeGreaterThanOrEqual(4.5)
  })
})

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
  // Día entrenado del calendario: número sobre la rampa.
  ['text-primary', 'muscle-1'], ['text-primary', 'muscle-2'], ['text-primary', 'muscle-3'],
  ['on-muscle-4', 'muscle-4'], ['on-muscle-5', 'muscle-5'],
]
const FILLS = ['kcal', 'protein', 'carbs', 'fat']

const TEXT_INVERSE: [string, string][] = [
  ['text-primary', 'surface'], ['text-secondary', 'surface'],
  ['accent-strong', 'surface'], ['destructive', 'surface'],
]

describe.each([['claro', light], ['oscuro', dark], ['card en oscuro', cardOscura]])('contraste (%s)', (_name, t) => {
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

/** Distancia perceptual ΔE en OKLab ×100: por debajo de ~5 dos colores se confunden; por encima de 10 se separan con claridad. */
const oklab = (rgb: readonly number[]) => {
  const lin = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)
  const [r, g, b] = rgb.map(lin)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
const deltaE = (a: readonly number[], b: readonly number[]) => 100 * Math.hypot(...oklab(a).map((v, i) => v - oklab(b)[i]))

// Jerarquía cromática: cada rol se distingue de los que comparten pantalla con él.
describe.each([['claro', light], ['oscuro', dark]])('roles distinguibles (%s)', (_name, t) => {
  it.each([['protein', 'carbs'], ['protein', 'fat'], ['carbs', 'fat'], ['kcal', 'fat']])('%s y %s ≥ 10', (a, b) => expect(deltaE(t[a], t[b])).toBeGreaterThanOrEqual(10))
  // Naranja y rojo son vecinos: borrar se desplaza a carmín y siempre va con texto/icono (ADR 020).
  it('acción textual y borrar ≥ 8', () => expect(deltaE(t['accent-strong'], t.destructive)).toBeGreaterThanOrEqual(8))
  // kcal comparte a propósito la familia del acento (ADR 020): no debe derivar hacia otro tono.
  it('kcal pertenece a la familia del acento (≤ 10)', () => expect(deltaE(t.kcal, t.accent)).toBeLessThanOrEqual(10))
})
