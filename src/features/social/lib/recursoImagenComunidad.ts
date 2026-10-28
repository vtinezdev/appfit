import { leerImagenComunidad } from './imagenComunidad'

// Se sirven con la app. No se aceptan URLs de usuarios ni se insertan todos los WebP en el JavaScript.
const RECURSOS = import.meta.glob<string>('../assets/comunidades/*.webp', { eager: true, query: '?url&no-inline', import: 'default' })

export function recursoImagenComunidad(x: unknown): string | undefined {
  const id = leerImagenComunidad(x)
  return id ? RECURSOS[`../assets/comunidades/${id.slice('lugar.'.length)}.webp`] : undefined
}
