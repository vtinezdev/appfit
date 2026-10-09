/**
 * Genera public/ejercicios/<slug>.webp y src/features/gym/lib/ejerciciosConImagen.ts (la lista de slugs con imagen).
 * Dos orígenes, por prioridad:
 *  1. Ilustraciones propias generadas con IA (ChatGPT) a partir de prompts.md y prompts-2.md: cada lote es una imagen 2×2 con
 *     cuatro ejercicios que se guarda en ia/lote-NN.(png|jpg|webp); ia/<slug>.(png|jpg|webp) sustituye a un recuadro suelto.
 *  2. free-exercise-db (Unlicense) según mapeo.json, mientras falte la ilustración.
 * También reescribe prompts.md (lotes 1–29) y prompts-2.md (desde el 30, con mapa-muscular.md al final). `--prompt <slug>` imprime el prompt de un solo ejercicio.
 * Idempotente: las fotos ya convertidas no se vuelven a descargar (usa --forzar para rehacerlo todo).
 * Node 24 (type stripping) + sharp. Ver README.md.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main'
const LADO = 192
const CALIDAD = 70
const CALIDAD_IA = 78
const EXTENSIONES = ['png', 'jpg', 'jpeg', 'webp']
const forzar = process.argv.includes('--forzar')
const aqui = new URL('.', import.meta.url)
const carpetaIa = new URL('ia/', aqui)
const destino = new URL('../../public/ejercicios/', import.meta.url)
const lista = new URL('../../src/features/gym/lib/ejerciciosConImagen.ts', import.meta.url)

type Ilustracion = [slug: string, pose: string, resaltar: string]
const mapeo: Record<string, string | null> = JSON.parse(readFileSync(new URL('mapeo.json', aqui), 'utf8'))
const { lotes }: { lotes: Ilustracion[][] } = JSON.parse(readFileSync(new URL('ilustraciones.json', aqui), 'utf8'))
const catalogo = readFileSync(new URL('../../src/features/gym/lib/catalogoEjercicios.ts', import.meta.url), 'utf8')
const nombres = new Map([...catalogo.matchAll(/^\s+'([a-z0-9-]+)\|([^|']+)/gm)].map(m => [m[1], m[2]]))
const slugsCatalogo = [...nombres.keys()]

const errores: string[] = []
for (const s of slugsCatalogo) if (!(s in mapeo)) errores.push(`Falta en el mapeo: ${s}`)
for (const s of Object.keys(mapeo)) if (!nombres.has(s)) errores.push(`Sobra en el mapeo (no está en el catálogo): ${s}`)
const enLotes = lotes.flat().map(([s]) => s)
for (const s of slugsCatalogo) if (enLotes.filter(x => x === s).length !== 1) errores.push(`Debe aparecer una sola vez en ilustraciones.json: ${s}`)
for (const s of enLotes) if (!nombres.has(s)) errores.push(`Sobra en ilustraciones.json (no está en el catálogo): ${s}`)
lotes.forEach((l, i) => { if (l.length !== 4) errores.push(`El lote ${i + 1} debe tener 4 ejercicios`) })
if (errores.length) { console.error(errores.join('\n')); process.exit(1) }

// ── Prompts ──────────────────────────────────────────────────────────────────────────────────────────────
const ESTILO = 'Style, identical for every figure: clean 3D anatomical render of a lean athletic man with matte light-grey clay-like skin showing defined muscle anatomy (like a medical anatomy model), short dark hair, black shorts, barefoot. Only the target muscles are highlighted in vivid warm orange (#F26B1D) with soft shading; everything else stays neutral grey. Gym equipment in simple neutral greys and black with realistic proportions. Soft studio lighting, subtle soft floor shadow, a three-quarter view that shows the movement clearly, whole body and whole equipment visible. The technique must be anatomically and mechanically correct.'
const POSICIONES = ['Top left', 'Top right', 'Bottom left', 'Bottom right']
const ejercicio = ([, pose, resaltar]: Ilustracion) => `${pose}. Highlight in orange: ${resaltar}.`

function promptLote(lote: Ilustracion[]): string {
  return [
    'Create one square image (1:1): a 2x2 grid of four separate exercise illustrations for a fitness app, all four in exactly the same style. Pure white background everywhere, no divider lines and no borders, generous white space between the four, each figure entirely inside its own quarter of the image. No text, numbers, labels, logos or watermark.',
    ESTILO,
    lote.map((e, i) => `${POSICIONES[i]}: ${ejercicio(e)}`).join('\n'),
  ].join('\n\n')
}
function promptSuelto(e: Ilustracion): string {
  return [
    'Create one square image (1:1) with a single exercise illustration for a fitness app, centred, with generous margin. Pure white background, no borders. No text, numbers, labels, logos or watermark.',
    ESTILO,
    `Exercise: ${ejercicio(e)}`,
  ].join('\n\n')
}

const nn = (i: number) => String(i + 1).padStart(2, '0')
const pedido = process.argv.indexOf('--prompt')
if (pedido !== -1) {
  const e = lotes.flat().find(([s]) => s === process.argv[pedido + 1])
  if (!e) { console.error('Uso: npm run ejercicios:imagenes -- --prompt <slug del catálogo>'); process.exit(1) }
  console.log(promptSuelto(e))
  process.exit(0)
}

function archivoIa(nombre: string): URL | null {
  for (const ext of EXTENSIONES) { const u = new URL(`${nombre}.${ext}`, carpetaIa); if (existsSync(u)) return u }
  return null
}
const hechos = lotes.map((_, i) => archivoIa(`lote-${nn(i)}`) !== null)
const VALLA = '```'
/** prompts.md: la primera tanda (lotes 1–29, ya generada). prompts-2.md: las ampliaciones desde el lote 30 y, al final, el diseño del mapa muscular. */
const TANDAS = [
  { archivo: 'prompts.md', desde: 0, hasta: 29, extra: null },
  { archivo: 'prompts-2.md', desde: 29, hasta: lotes.length, extra: 'mapa-muscular.md' },
]
for (const { archivo, desde, hasta, extra } of TANDAS) {
  const indices = lotes.map((_, i) => i).slice(desde, hasta)
  writeFileSync(new URL(archivo, aqui), [
    `# Prompts de las ilustraciones de ejercicios (lotes ${nn(desde)}–${nn(hasta - 1)})`,
    'Generado por `imagenes.ts` a partir de `ilustraciones.json`: no editar a mano. Cómo usarlo: `README.md`.',
    `Cada lote es una imagen 2×2 con cuatro ejercicios. Guarda la imagen que genere ChatGPT como \`scripts/ejercicios/ia/lote-NN.png\` (o .jpg/.webp) y ejecuta \`npm run ejercicios:imagenes\`. Hechos: ${indices.filter(i => hechos[i]).length} de ${indices.length}.`,
    ...indices.map(i => [
      `## ${hechos[i] ? '✔' : '☐'} Lote ${nn(i)} → \`lote-${nn(i)}.png\``,
      lotes[i].map(([s], j) => `${j + 1}. ${POSICIONES[j].toLowerCase()}: ${nombres.get(s)} (\`${s}\`)`).join('\n'),
      `${VALLA}text\n${promptLote(lotes[i])}\n${VALLA}`,
    ].join('\n\n')),
    // Prompts sueltos que no son de un lote, al final y tal cual.
    ...(extra ? [readFileSync(new URL(extra, aqui), 'utf8').replace(/\r\n/g, '\n').trim()] : []),
  ].join('\n\n') + '\n')
}

// ── Ilustraciones IA ─────────────────────────────────────────────────────────────────────────────────────
async function miniatura(entrada: sharp.Sharp): Promise<Buffer> {
  // Recorta el blanco sobrante y centra la figura en un cuadrado con un pequeño margen.
  // Cada operación de sharp va en su propio paso: dentro de una cadena, trim se aplica antes que extract y resize antes que extend.
  const recortada = await sharp(await entrada.toBuffer()).trim({ background: '#ffffff', threshold: 24 }).toBuffer()
  const { width = LADO, height = LADO } = await sharp(recortada).metadata()
  const lado = Math.round(Math.max(width, height) * 1.08)
  const cuadrada = await sharp(recortada).flatten({ background: '#ffffff' })
    .extend({ top: Math.floor((lado - height) / 2), bottom: Math.ceil((lado - height) / 2), left: Math.floor((lado - width) / 2), right: Math.ceil((lado - width) / 2), background: '#ffffff' })
    .toBuffer()
  return sharp(cuadrada).resize(LADO, LADO).webp({ quality: CALIDAD_IA, effort: 6 }).toBuffer()
}

type Caja = { left: number; top: number; width: number; height: number }

/**
 * Las cuatro figuras de un lote 2×2. La IA no respeta las mitades exactas, así que cada corte va por la línea más
 * blanca cerca del centro (entre el 35 y el 65 %), y en cada cuarto se descartan los fragmentos pequeños que tocan
 * un corte (trozos de la figura vecina). Devuelve la caja del contenido de cada cuarto.
 */
async function cajasLote(png: Buffer): Promise<Caja[]> {
  const { data, info } = await sharp(png).flatten({ background: '#ffffff' }).greyscale().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const oscuro = (x: number, y: number) => data[y * W + x] < 230
  const tinta = (x0: number, x1: number, y0: number, y1: number) => {
    let n = 0
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (oscuro(x, y)) n++
    return n
  }
  const BANDA = 4
  function corte(total: number, coste: (p: number) => number): number {
    let mejor = Math.round(total / 2), min = Infinity
    for (let p = Math.round(total * 0.35); p <= Math.round(total * 0.65); p++) {
      const c = coste(p)
      if (c < min || (c === min && Math.abs(p - total / 2) < Math.abs(mejor - total / 2))) { min = c; mejor = p }
    }
    return mejor
  }
  const hIzq = corte(H, y => tinta(0, W >> 1, y, Math.min(H, y + BANDA)))
  const hDer = corte(H, y => tinta(W >> 1, W, y, Math.min(H, y + BANDA)))
  const vArr = corte(W, x => tinta(x, Math.min(W, x + BANDA), 0, Math.min(hIzq, hDer)))
  const vAba = corte(W, x => tinta(x, Math.min(W, x + BANDA), Math.max(hIzq, hDer), H))
  const cuartos: (Caja & { cortes: ('l' | 'r' | 't' | 'b')[] })[] = [
    { left: 0, top: 0, width: vArr, height: hIzq, cortes: ['r', 'b'] },
    { left: vArr, top: 0, width: W - vArr, height: hDer, cortes: ['l', 'b'] },
    { left: 0, top: hIzq, width: vAba, height: H - hIzq, cortes: ['r', 't'] },
    { left: vAba, top: hDer, width: W - vAba, height: H - hDer, cortes: ['l', 't'] },
  ]
  // Componentes conexas sobre una rejilla de celdas de 4 px (8-vecindad).
  const C = 4
  return cuartos.map(q => {
    const cw = Math.ceil(q.width / C), ch = Math.ceil(q.height / C)
    const celda = new Uint8Array(cw * ch)
    for (let y = 0; y < q.height; y++) for (let x = 0; x < q.width; x++) if (oscuro(q.left + x, q.top + y)) celda[Math.floor(y / C) * cw + Math.floor(x / C)] = 1
    const etiqueta = new Int32Array(cw * ch).fill(-1)
    const comps: { area: number; x0: number; x1: number; y0: number; y1: number }[] = []
    for (let k = 0; k < celda.length; k++) {
      if (!celda[k] || etiqueta[k] !== -1) continue
      const comp = { area: 0, x0: Infinity, x1: -1, y0: Infinity, y1: -1 }
      const pila = [k]; etiqueta[k] = comps.length
      while (pila.length) {
        const a = pila.pop()!, ax = a % cw, ay = (a - ax) / cw
        comp.area++; comp.x0 = Math.min(comp.x0, ax); comp.x1 = Math.max(comp.x1, ax); comp.y0 = Math.min(comp.y0, ay); comp.y1 = Math.max(comp.y1, ay)
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const bx = ax + dx, by = ay + dy, b = by * cw + bx
          if (bx >= 0 && by >= 0 && bx < cw && by < ch && celda[b] && etiqueta[b] === -1) { etiqueta[b] = comps.length; pila.push(b) }
        }
      }
      comps.push(comp)
    }
    const total = comps.reduce((s, c) => s + c.area, 0)
    const tocaCorte = (c: typeof comps[number]) =>
      (q.cortes.includes('l') && c.x0 === 0) || (q.cortes.includes('r') && c.x1 === cw - 1) ||
      (q.cortes.includes('t') && c.y0 === 0) || (q.cortes.includes('b') && c.y1 === ch - 1)
    const buenas = comps.filter(c => !(tocaCorte(c) && c.area < total * 0.08) && c.area >= 2)
    if (!buenas.length) return q
    const x0 = Math.min(...buenas.map(c => c.x0)) * C, y0 = Math.min(...buenas.map(c => c.y0)) * C
    const x1 = Math.min(q.width, (Math.max(...buenas.map(c => c.x1)) + 1) * C), y1 = Math.min(q.height, (Math.max(...buenas.map(c => c.y1)) + 1) * C)
    return { left: q.left + x0, top: q.top + y0, width: x1 - x0, height: y1 - y0 }
  })
}

mkdirSync(destino, { recursive: true })
const conImagen: string[] = []
const deIa = new Set<string>()
let fallos = 0
for (const [i, lote] of lotes.entries()) {
  const archivo = archivoIa(`lote-${nn(i)}`)
  const png = archivo ? readFileSync(archivo) : null
  const cajas = png ? await cajasLote(png) : null
  for (const [j, [slug]] of lote.entries()) {
    const suelto = archivoIa(slug)
    if (!suelto && !png) continue
    try {
      const entrada = suelto ? sharp(readFileSync(suelto)) : sharp(png!).extract(cajas![j])
      writeFileSync(new URL(`${slug}.webp`, destino), await miniatura(entrada))
      deIa.add(slug)
    } catch (e) { console.error(`Error con la ilustración de ${slug}: ${(e as Error).message}`); fallos++ }
  }
}

// ── Fotos de free-exercise-db (solo donde aún no hay ilustración) ────────────────────────────────────────
async function descargar(url: string): Promise<Buffer> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return Buffer.from(await r.arrayBuffer())
}
const pendientesFoto = slugsCatalogo.filter(s => !deIa.has(s) && mapeo[s] && (forzar || !existsSync(new URL(`${s}.webp`, destino))))
const indice = pendientesFoto.length
  ? new Set<string>(JSON.parse((await descargar(`${BASE}/dist/exercises.json`)).toString()).map((e: { id: string }) => e.id))
  : new Set<string>()
for (const slug of slugsCatalogo) {
  if (deIa.has(slug)) { conImagen.push(slug); continue }
  const valor = mapeo[slug]
  if (!valor) continue
  if (pendientesFoto.includes(slug)) {
    // «Id» usa la imagen 0 (posición inicial); «Id#1», la 1 (posición final).
    const [id, n = '0'] = valor.split('#')
    if (!indice.has(id)) { console.error(`No existe en free-exercise-db: ${id} (${slug})`); fallos++; continue }
    try {
      const jpg = await descargar(`${BASE}/exercises/${id}/${n}.jpg`)
      const webp = await sharp(jpg).resize(LADO, LADO, { fit: 'cover', position: 'centre' }).webp({ quality: CALIDAD, effort: 6 }).toBuffer()
      writeFileSync(new URL(`${slug}.webp`, destino), webp)
      console.log(`${slug}.webp  ${(webp.length / 1024).toFixed(1)} KB (foto)`)
    } catch (e) { console.error(`Error con ${slug}: ${(e as Error).message}`); fallos++; continue }
  }
  conImagen.push(slug)
}
// Imágenes que ya no corresponden a ningún ejercicio con imagen: se borran.
for (const f of readdirSync(destino)) if (f.endsWith('.webp') && !conImagen.includes(f.slice(0, -5))) { rmSync(new URL(f, destino)); console.log(`Borrada ${f}`) }
writeFileSync(lista, `/** Generado por scripts/ejercicios/imagenes.ts: slugs del catálogo con imagen en public/ejercicios/. No editar a mano. */
export const EJERCICIOS_CON_IMAGEN: ReadonlySet<string> = new Set([
${conImagen.map(s => `  '${s}',`).join('\n')}
])
`)
const pendientes = lotes.map((_, i) => nn(i)).filter((_, i) => !hechos[i])
console.log(`${conImagen.length} con imagen (${deIa.size} ilustraciones, ${conImagen.length - deIa.size} fotos), ${slugsCatalogo.length - conImagen.length} sin imagen${fallos ? `, ${fallos} fallos` : ''}`)
console.log(pendientes.length ? `Lotes pendientes (${pendientes.length}): ${pendientes.join(', ')}. Ver scripts/ejercicios/prompts.md y prompts-2.md` : 'Todos los lotes hechos')
if (fallos) process.exit(1)
