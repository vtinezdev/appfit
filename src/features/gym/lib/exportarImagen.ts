// SVG → PNG en el navegador (ENT-11), pensado para reutilizarse fuera del póster (cruce X3). Sin red externa: la letra
// sale de /fonts/ del propio origen y se incrusta en el SVG, porque una imagen no carga recursos de fuera.

const FUENTES = [
  { url: '/fonts/saira-latin-variable.woff2', estilo: 'normal' },
  { url: '/fonts/saira-latin-italic-variable.woff2', estilo: 'italic' },
] as const

let fuentes: Promise<string> | null = null

async function aDataUri(url: string): Promise<string> {
  const respuesta = await fetch(url)
  if (!respuesta.ok) throw new Error(`No se ha podido leer ${url}`)
  const bytes = new Uint8Array(await respuesta.arrayBuffer())
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:font/woff2;base64,${btoa(binario)}`
}

/** Las `@font-face` de Saira con la letra incrustada (se leen una vez por sesión). */
export function cssFuentesIncrustadas(): Promise<string> {
  fuentes ??= Promise.all(FUENTES.map(async (f) => `@font-face{font-family:'Saira';font-style:${f.estilo};font-weight:100 900;font-stretch:50% 125%;src:url(${await aDataUri(f.url)}) format('woff2')}`))
    .then((reglas) => reglas.join(''))
    .catch((e) => { fuentes = null; throw e })
  return fuentes
}

/** Pinta un SVG (texto) en un canvas de `ancho` × `alto` y devuelve el PNG. */
export async function svgAPng(svg: string, ancho: number, alto: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const imagen = new Image()
    imagen.decoding = 'async'
    imagen.src = url
    await imagen.decode()
    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Sin canvas')
    ctx.drawImage(imagen, 0, 0, ancho, alto)
    return await new Promise<Blob>((resolver, rechazar) => canvas.toBlob((b) => (b ? resolver(b) : rechazar(new Error('Sin PNG'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Si el móvil puede mandar archivos con su hoja de compartir (WhatsApp, Instagram…). */
export function puedeCompartirArchivos(): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([new Blob()], 'prueba.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

/** Abre la hoja de compartir con la imagen. `false` si la persona la cerró sin compartir. */
export async function compartirImagen(png: Blob, nombre: string): Promise<boolean> {
  try {
    await navigator.share({ files: [new File([png], nombre, { type: 'image/png' })] })
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return false
    throw e
  }
}

/** Descarga la imagen (como el backup). */
export function descargarImagen(png: Blob, nombre: string): void {
  const url = URL.createObjectURL(png)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
