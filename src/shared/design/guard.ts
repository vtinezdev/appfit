/**
 * Reglas que protegen el Design System (las ejecuta guard.test.ts).
 *
 * Objetivo: que el aspecto viva en los tokens, no que todo el código encaje literalmente en una regla.
 * Si algo es técnicamente legítimo, se documenta junto al código con un comentario:
 *
 *   // design-guard-allow: hex-color — el manifest de la PWA no puede leer variables CSS
 *
 * (misma línea o la línea anterior; en JSX vale `{/* design-guard-allow: … *​/}`). El motivo es obligatorio.
 * Se pueden listar varias reglas separadas por comas.
 */
export interface Rule {
  id: string
  message: string
  pattern: RegExp
}

const PALETTE = 'slate|gray|zinc|neutral|stone|red|rose|amber|orange|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|brand|white|black'
const UTIL = 'bg|text|border|ring|fill|stroke|from|via|to|divide|placeholder|accent|outline|shadow|decoration'

export const RULES: Rule[] = [
  {
    id: 'obsolete-visual',
    message: 'Patrón visual retirado: halo, sombras de cards/nav, hero ink o contador animado. Consulta DESIGN.md.',
    pattern: /bg-page-glow|shadow-raised|shadow-nav|data-surface=["']ink["']|AnimatedNumber|ProgressRing/,
  },
  {
    id: 'palette-class',
    message: 'Color de la paleta por defecto de Tailwind (slate-*, brand-*, white…). Usa un token: bg-surface, text-fg-muted, text-destructive…',
    pattern: new RegExp(`(?<![\\w-])(?:${UTIL})-(?:${PALETTE})(?:-\\d{2,3})?(?![\\w-])`),
  },
  {
    id: 'hex-color',
    message: 'Color hexadecimal escrito a mano. Define un token en tokens.css.',
    pattern: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w-])/,
  },
  {
    id: 'functional-color',
    message: 'rgb()/hsl() con valores literales. Referencia un token: rgb(var(--c-…)).',
    pattern: /\b(?:rgba?|hsla?)\(\s*(?!var\()\d/,
  },
  {
    id: 'emoji-icon',
    message: 'Emoji en la interfaz. Usa <Icon name="…" /> (o texto).',
    pattern: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u,
  },
  {
    id: 'text-size',
    message: 'Tamaño de texto fuera de la escala. Usa text-display|heading|title|body|body-sm|label|caption|metric.',
    pattern: /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl|\[[^\]]+\])(?![\w-])/,
  },
  {
    id: 'radius',
    message: 'Radio fuera de la escala. Usa rounded-sm|md|lg|pill.',
    pattern: /(?<![\w-])rounded(?:-(?:[trbl]|tl|tr|bl|br))?(?:-(?:xl|2xl|3xl|full|\[[^\]]+\])|(?=[\s"'`]))/,
  },
  {
    id: 'raw-number',
    message: 'Cifra mostrada sin formato ({Math.round(…)}). Usa formatInt()/formatNumber() de shared/lib/format: el separador de millares es el mismo en toda la app.',
    pattern: /(?<!aria-value\w+=)\{\s*Math\.round\(/, // los aria-value* van sin formato
  },
  {
    id: 'arbitrary-value',
    message: 'Valor arbitrario de spacing/tamaño/color entre corchetes. Añade un token en tokens.css + tailwind.config.js.',
    pattern: /(?<![\w-])(?:-?[pm][xytrbl]?|gap(?:-[xy])?|space-[xy]|[wh]|(?:min|max)-[wh]|inset|top|left|right|bottom|bg|border|fill|stroke)-\[[^\]]+\]/,
  },
]

export interface Violation {
  rule: string
  line: number
  text: string
  message: string
}

const ALLOW = /design-guard-allow:\s*([\w-]+(?:\s*,\s*[\w-]+)*)\s*[—–-]+\s*\S+/

function allowedOn(line: string | undefined): string[] {
  const m = line?.match(ALLOW)
  return m ? m[1].split(',').map((s) => s.trim()) : []
}

/** Devuelve las infracciones de un fichero. Las líneas de comentario puro no cuentan. */
export function scanSource(source: string, rules: Rule[] = RULES): Violation[] {
  const lines = source.split('\n')
  const out: Violation[] = []
  lines.forEach((text, i) => {
    const trimmed = text.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
    const allowed = [...allowedOn(text), ...allowedOn(lines[i - 1])]
    // Se ignora el texto de un comentario final: `codigo // nota`
    const code = text.replace(/\s\/\/\s.*$/, '')
    for (const r of rules) {
      if (allowed.includes(r.id)) continue
      if (r.pattern.test(code)) out.push({ rule: r.id, line: i + 1, text: trimmed.slice(0, 100), message: r.message })
    }
  })
  return out
}
