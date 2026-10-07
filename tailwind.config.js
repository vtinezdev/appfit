/** @type {import('tailwindcss').Config} */

// Canal RGB con soporte de opacidad: bg-accent/40
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

/**
 * Los valores viven en src/shared/design/tokens.css; aquí solo se les da nombre de clase.
 * `theme.colors` (no `extend`) sustituye la paleta de Tailwind: slate-*, red-*, white… ya no existen.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: c('bg'),
      surface: { DEFAULT: c('surface'), elevated: c('surface-elevated'), muted: c('surface-muted') },
      overlay: c('overlay'),
      // texto: text-fg, text-fg-muted, text-fg-subtle
      fg: { DEFAULT: c('text-primary'), muted: c('text-secondary'), subtle: c('text-tertiary') },
      line: { DEFAULT: c('border'), strong: c('border-strong') }, // border-line, border-line-strong
      // Acento funcional; strong tiene contraste de texto en cada tema.
      accent: { DEFAULT: c('accent'), subtle: c('accent-subtle'), on: c('on-accent'), strong: c('accent-strong') },
      selected: { DEFAULT: c('selected'), on: c('on-selected') }, // segmento / chip activo
      success: c('success'),
      warning: c('warning'),
      destructive: { DEFAULT: c('destructive'), on: c('on-destructive') },
      // datos: significan siempre lo mismo (bg-kcal, text-protein, stroke-carbs…)
      kcal: { DEFAULT: c('kcal'), rest: c('kcal-rest') }, // rest: lo que falta en la rueda de energía
      protein: c('protein'),
      carbs: c('carbs'),
      fat: c('fat'),
      goal: c('goal'),
    },
    fontFamily: { sans: 'var(--font-sans)', display: 'var(--font-display)', numeric: 'var(--font-numeric)' },
    fontSize: {
      hero: ['var(--fs-hero)', { lineHeight: 'var(--lh-hero)', fontWeight: '700', letterSpacing: '0' }],
      display: ['var(--fs-display)', { lineHeight: 'var(--lh-display)', fontWeight: '700', letterSpacing: '-0.01em' }],
      heading: ['var(--fs-heading)', { lineHeight: 'var(--lh-heading)', fontWeight: '700', letterSpacing: '-0.02em' }],
      title: ['var(--fs-title)', { lineHeight: 'var(--lh-title)', fontWeight: '600', letterSpacing: '-0.01em' }],
      body: ['var(--fs-body)', { lineHeight: 'var(--lh-body)' }],
      'body-sm': ['var(--fs-body-sm)', { lineHeight: 'var(--lh-body-sm)' }],
      label: ['var(--fs-label)', { lineHeight: 'var(--lh-label)', fontWeight: '700', letterSpacing: '0.04em' }],
      caption: ['var(--fs-caption)', { lineHeight: 'var(--lh-caption)' }],
      metric: ['var(--fs-metric)', { lineHeight: 'var(--lh-metric)', fontWeight: '700', letterSpacing: '0' }],
    },
    borderRadius: {
      none: '0',
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      sheet: 'var(--radius-sheet)',
      pill: 'var(--radius-pill)',
    },
    extend: {
      spacing: {
        page: 'var(--space-page)',
        section: 'var(--space-section)',
        card: 'var(--space-card)',
        stack: 'var(--space-stack)',
        touch: 'var(--touch-target)',
        thumb: 'var(--thumb-size)',
        'menu-node': 'var(--menu-node-size)',
      },
      height: { nav: 'var(--nav-height)', app: 'var(--app-height)' },
      inset: { 'nav-toast': 'var(--nav-toast)' },
      minHeight: { touch: 'var(--touch-target)', 'touch-lg': 'var(--touch-target-lg)' },
      maxHeight: { sheet: 'var(--sheet-max-height)' },
      minWidth: { touch: 'var(--touch-target)' },
      boxShadow: { overlay: 'var(--shadow-overlay)', card: 'var(--shadow-card)', control: 'var(--shadow-control)' },
      transitionDuration: { short: 'var(--dur-short)', normal: 'var(--dur-normal)' },
      transitionTimingFunction: { standard: 'var(--ease-standard)' },
      // Entradas discretas. Duración y distancia salen de los tokens de motion (0 con prefers-reduced-motion).
      keyframes: {
        'shift-next': { from: { opacity: '0', transform: 'translateX(var(--motion-shift))' }, to: { opacity: '1', transform: 'none' } },
        'shift-prev': { from: { opacity: '0', transform: 'translateX(calc(var(--motion-shift) * -1))' }, to: { opacity: '1', transform: 'none' } },
        'rise-in': { from: { opacity: '0', transform: 'translateY(var(--motion-shift))' }, to: { opacity: '1', transform: 'none' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'shift-next': 'shift-next var(--dur-normal) var(--ease-standard) both',
        'shift-prev': 'shift-prev var(--dur-normal) var(--ease-standard) both',
        'rise-in': 'rise-in var(--dur-normal) var(--ease-standard) both',
        'fade-in': 'fade-in var(--dur-normal) var(--ease-standard) both',
        // Para estados de carga: si los datos llegan enseguida, no llega a verse.
        'fade-in-late': 'fade-in var(--dur-normal) var(--ease-standard) 250ms both',
      },
    },
  },
  // hover solo en dispositivos con puntero fino: en iOS un toque no deja el hover «pegado».
  future: { hoverOnlyWhenSupported: true },
  plugins: [],
}
