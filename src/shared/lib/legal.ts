// Páginas legales: HTML estático en public/ (privacidad.html, condiciones.html, borrar-cuenta.html), con URL pública para
// Google Play y para cualquiera sin instalar la app. Sin imports: lo usa también vite.config.ts, para que el service worker
// no las sustituya por la app al navegar. ADR 065.

/** Versión de los textos legales (su «Última actualización»): la que se acepta en la bienvenida. */
export const VERSION_TEXTOS_LEGALES = '2026-11-05'

/** Edad mínima para usar Cumbra Fit, en toda la app (condiciones § 2). */
export const EDAD_MINIMA = 16

export const PAGINAS_LEGALES = {
  privacidad: { ruta: '/privacidad', archivo: 'privacidad.html', nombre: 'Política de privacidad' },
  condiciones: { ruta: '/condiciones', archivo: 'condiciones.html', nombre: 'Condiciones de uso' },
  borrarCuenta: { ruta: '/borrar-cuenta', archivo: 'borrar-cuenta.html', nombre: 'Borrar la cuenta' },
} as const

/** La web de la app (`public/conoce.html`, con sus capturas en `public/conoce/`): presentación, privacidad e instalación. */
export const PAGINA_CONOCE = { ruta: '/conoce', archivo: 'conoce.html', nombre: 'Conoce Cumbra Fit' } as const

/** Navegaciones que el service worker deja pasar a la página estática en vez de responder con la app. */
export const RUTAS_ESTATICAS_SW: RegExp[] = [...Object.values(PAGINAS_LEGALES), PAGINA_CONOCE].map(
  (p) => new RegExp(`^${p.ruta}(\\.html)?/?$`),
)
