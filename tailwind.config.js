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
      accent: { DEFAULT: c('accent'), subtle: c('accent-subtle'), on: c('on-accent') },
      success: c('success'),
      warning: c('warning'),
      destructive: c('destructive'),
      // datos: significan siempre lo mismo (bg-kcal, text-protein, stroke-carbs…)
      kcal: c('kcal'),
      protein: c('protein'),
      carbs: c('carbs'),
      fat: c('fat'),
      goal: c('goal'),
    },
    fontFamily: { sans: 'var(--font-sans)', numeric: 'var(--font-numeric)' },
    fontSize: {
      display: ['var(--fs-display)', { lineHeight: 'var(--lh-display)', fontWeight: '700', letterSpacing: '-0.02em' }],
      heading: ['var(--fs-heading)', { lineHeight: 'var(--lh-heading)', fontWeight: '650', letterSpacing: '-0.015em' }],
      title: ['var(--fs-title)', { lineHeight: 'var(--lh-title)', fontWeight: '600' }],
      body: ['var(--fs-body)', { lineHeight: 'var(--lh-body)' }],
      'body-sm': ['var(--fs-body-sm)', { lineHeight: 'var(--lh-body-sm)' }],
      label: ['var(--fs-label)', { lineHeight: 'var(--lh-label)', fontWeight: '600', letterSpacing: '0.02em' }],
      caption: ['var(--fs-caption)', { lineHeight: 'var(--lh-caption)' }],
      metric: ['var(--fs-metric)', { lineHeight: 'var(--lh-metric)', fontWeight: '700', letterSpacing: '-0.03em' }],
    },
    borderRadius: {
      none: '0',
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      pill: 'var(--radius-pill)',
    },
    extend: {
      spacing: {
        page: 'var(--space-page)',
        section: 'var(--space-section)',
        card: 'var(--space-card)',
        stack: 'var(--space-stack)',
        touch: 'var(--touch-target)',
      },
      minHeight: { touch: 'var(--touch-target)', 'touch-lg': 'var(--touch-target-lg)' },
      maxHeight: { sheet: 'var(--sheet-max-height)' },
      minWidth: { touch: 'var(--touch-target)' },
      boxShadow: { raised: 'var(--shadow-raised)', overlay: 'var(--shadow-overlay)' },
      transitionDuration: { short: 'var(--dur-short)', normal: 'var(--dur-normal)', long: 'var(--dur-long)' },
      transitionTimingFunction: { standard: 'var(--ease-standard)', emphasized: 'var(--ease-emphasized)' },
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
  plugins: [],
}
