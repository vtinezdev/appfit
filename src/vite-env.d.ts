/// <reference types="vite/client" />

declare const __APP_VERSION__: { readonly id: string; readonly fecha: string }

interface ImportMetaEnv {
  /** Proyecto de Supabase de la cuenta (ver docs/features/cuenta.md). Sin ellas, la app funciona sin cuenta. */
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}
