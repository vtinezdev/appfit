/** Separa los seis lotes aprobados, sin red ni generación de imágenes. Ver README.md. */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const carpeta = dirname(fileURLToPath(import.meta.url))
const raiz = resolve(carpeta, '../..')
const originales = process.argv[2] ? resolve(process.argv[2]) : join(carpeta, 'originales')
const destino = join(raiz, 'src/features/social/assets/comunidades')
const fuentes = JSON.parse(await readFile(join(carpeta, 'fuentes.json'), 'utf8'))
const catalogo = []
const ids = new Set()
await mkdir(destino, { recursive: true })

// Valida todo antes de escribir: nunca recorta un lote cambiado o con otra disposición.
const lotes = await Promise.all(fuentes.lotes.map(async lote => {
  const bytes = await readFile(join(originales, lote.archivo))
  if (createHash('sha256').update(bytes).digest('hex') !== lote.sha256) throw new Error(`Ha cambiado el original ${lote.archivo}`)
  const { width, height } = await sharp(bytes).metadata()
  if (!width || !height || width % lote.columnas || height % lote.filas || width / lote.columnas !== height / lote.filas) {
    throw new Error(`El lote ${lote.archivo} no contiene recuadros cuadrados completos`)
  }
  const posiciones = new Set()
  for (const e of lote.elementos) {
    const posicion = `${e.columna}:${e.fila}`
    if (!/^lugar\.[a-z]+(?:-[a-z]+)*$/.test(e.id) || ids.has(e.id)) throw new Error(`Identificador no válido o duplicado: ${e.id}`)
    if (!Number.isInteger(e.columna) || !Number.isInteger(e.fila) || e.columna < 0 || e.columna >= lote.columnas || e.fila < 0 || e.fila >= lote.filas || posiciones.has(posicion)) {
      throw new Error(`Recuadro no válido o duplicado en ${lote.archivo}: ${posicion}`)
    }
    ids.add(e.id)
    posiciones.add(posicion)
  }
  if (posiciones.size !== lote.columnas * lote.filas) throw new Error(`Faltan recuadros en ${lote.archivo}`)
  return { lote, bytes, lado: width / lote.columnas }
}))

let total = 0
for (const { lote, bytes, lado } of lotes) {
  for (const { columna, fila, ...entrada } of lote.elementos) {
    const imagen = await sharp(bytes)
      .extract({ left: columna * lado, top: fila * lado, width: lado, height: lado })
      .resize(fuentes.dimension, fuentes.dimension)
      .webp({ quality: fuentes.calidad, effort: 6 })
      .toBuffer()
    await writeFile(join(destino, `${entrada.id.slice('lugar.'.length)}.webp`), imagen)
    catalogo.push(entrada)
    total += imagen.byteLength
  }
}
const generado = `// Generado por scripts/comunidades/preparar-imagenes.mjs a partir de fuentes.json. No editar a mano.\nexport const CATALOGO_IMAGENES_COMUNIDAD = ${JSON.stringify(catalogo, null, 2)} as const\n`
await writeFile(join(raiz, 'src/features/social/lib/catalogoImagenesComunidad.ts'), generado)
console.log(`${catalogo.length} imágenes WebP de ${fuentes.dimension} × ${fuentes.dimension}: ${total} bytes en total.`)
