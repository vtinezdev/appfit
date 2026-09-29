/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanSource } from './guard'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const rules = (src: string) => scanSource(src).map((v) => v.rule)

describe('guard: detecta regresiones', () => {
  it.each([
    ['palette-class', '<div className="bg-slate-900 p-4" />'],
    ['palette-class', '<div className="text-brand-400" />'],
    ['palette-class', '<div className="text-white" />'],
    ['hex-color', "const c = '#6366f1'"],
    ['hex-color', 'fill="#fff"'],
    ['functional-color', "background: 'rgba(0, 0, 0, 0.5)'"],
    ['emoji-icon', '<span>🗑️</span>'],
    ['text-size', '<p className="text-sm" />'],
    ['text-size', '<p className="text-[13px]" />'],
    ['radius', '<div className="rounded-xl" />'],
    ['radius', '<div className="rounded" />'],
    ['radius', '<div className="rounded-full" />'],
    ['radius', '<div className="rounded-[10px]" />'],
    ['raw-number', '<span>{Math.round(kcal)} kcal</span>'],
    ['raw-number', 'const t = `P${Math.round(e.prot)}`'],
    ['arbitrary-value', '<div className="p-[13px]" />'],
    ['arbitrary-value', '<div className="bg-[#123456]" />'],
  ])('%s: %s', (rule, src) => {
    expect(rules(src)).toContain(rule)
  })
})

describe('guard: no genera falsos positivos', () => {
  it.each([
    '<div className="bg-surface text-fg-muted border-line rounded-md text-body-sm" />',
    '<div className="rounded-pill rounded-t-lg shadow-raised" />',
    "stroke: 'rgb(var(--c-accent))'",
    '<div className="transition-[width] duration-normal" />',
    '<div className="text-accent-on bg-accent-subtle" />',
    '<div className="min-h-touch w-touch" />',
    '<span>{formatInt(Math.round(e.kcal))} kcal</span>',
    'const v = Math.round(valor)',
    '<div aria-valuenow={Math.round(v)} />',
    "// un comentario con #ff0000 y bg-slate-900 no cuenta",
    ' * doc: text-sm rounded-xl',
  ])('%s', (src) => {
    expect(scanSource(src)).toEqual([])
  })
})

describe('guard: excepciones documentadas', () => {
  it('se permite en la misma línea, con motivo', () => {
    expect(scanSource("const c = '#0f0f0e' // design-guard-allow: hex-color — meta estática de la PWA")).toEqual([])
  })

  it('se permite desde la línea anterior', () => {
    const src = "// design-guard-allow: hex-color — el manifest no lee variables CSS\nconst c = '#f7f6f3'"
    expect(scanSource(src)).toEqual([])
  })

  it('solo exime la regla nombrada', () => {
    const src = '{/* design-guard-allow: hex-color — motivo */}\n<div className="bg-slate-900" style={{ color: "#fff" }} />'
    // la excepción está en la línea anterior a la 2: cubre hex-color pero no palette-class
    expect(rules(src)).toEqual(['palette-class'])
  })

  it('sin motivo no cuenta', () => {
    expect(rules("const c = '#fff' // design-guard-allow: hex-color")).toContain('hex-color')
  })

  it('admite varias reglas', () => {
    expect(scanSource("x('#fff', 'bg-slate-900') // design-guard-allow: hex-color, palette-class — fixture")).toEqual([])
  })
})

describe('el código de la app respeta el design system', () => {
  const files = walk('src').filter((f) => {
    const p = f.replace(/\\/g, '/')
    return /\.(tsx?|css)$/.test(p) && !/\.test\./.test(p) && !p.endsWith('shared/design/guard.ts') && !p.endsWith('shared/design/tokens.css')
  })

  it('no hay infracciones', () => {
    const found = files.flatMap((f) => scanSource(readFileSync(f, 'utf8')).map((v) => `${f}:${v.line} [${v.rule}] ${v.text}`))
    expect(found).toEqual([])
  })
})

describe('tokens.css es la única fuente de verdad', () => {
  const css = readFileSync('src/shared/design/tokens.css', 'utf8')
  const config = readFileSync('tailwind.config.js', 'utf8')
  const block = (start: string) => {
    const i = css.indexOf(start)
    return css.slice(i, css.indexOf('\n}', i))
  }
  const names = (b: string) => [...b.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1])
  const light = names(block(':root {'))
  const dark = names(block(":root[data-theme='dark']"))

  it('todo color del tema claro tiene su valor propio en oscuro', () => {
    const colors = light.filter((n) => n.startsWith('--c-') && n !== '--c-goal')
    expect(colors.filter((n) => !dark.includes(n))).toEqual([])
  })

  it('el oscuro no define nada que no exista en el claro', () => {
    expect(dark.filter((n) => !light.includes(n))).toEqual([])
  })

  it('tailwind.config.js solo referencia variables definidas', () => {
    const used = new Set<string>()
    for (const m of config.matchAll(/var\((--[\w-]+)\)/g)) used.add(m[1])
    for (const m of config.matchAll(/c\('([\w-]+)'\)/g)) used.add(`--c-${m[1]}`)
    expect([...used].filter((n) => !light.includes(n))).toEqual([])
  })

  it('tailwind.config.js no contiene colores propios', () => {
    expect(config).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
