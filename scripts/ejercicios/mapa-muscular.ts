/**
 * Genera src/features/gym/components/mapaMuscularGeometria.ts a partir de la imagen de referencia del mapa muscular
 * (ia/mapa-muscular.png: cuatro figuras en fila, hombre frontal, hombre trasera, mujer frontal y mujer trasera; estilo A
 * de mapa-muscular.md). No forma parte del build; se ejecuta a mano: `npm run ejercicios:mapa`. Node 24 + sharp.
 *
 * 1. Cada píxel es fondo (blanco unido al borde), separador (líneas blancas o contorno oscuro) o relleno gris/naranja.
 * 2. Las zonas de relleno conexas del mismo tipo son las formas; las diminutas se descartan.
 * 3. Cada píxel del cuerpo pasa a la forma más cercana (así las formas teselan el cuerpo y el hueco lo pinta el trazo).
 * 4. Cada forma se asigna a una zona muscular si su centroide cae en uno de los rectángulos de ZONAS (coordenadas de la
 *    imagen, lado izquierdo; el derecho se obtiene por simetría respecto al eje de la figura). Las demás son detalle neutro.
 * 5. Contornos → simplificación (Ramer-Douglas-Peucker) → curvas cuadráticas suaves, en un viewBox común a las cuatro.
 * Los rectángulos y cortes valen solo para esta imagen: si se cambia, hay que revisarlos con la imagen de depuración
 * (`--depurar` escribe ia/mapa-muscular-depuracion.png con cada zona de un color).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const aqui = new URL('.', import.meta.url)
const IMAGEN = new URL('ia/mapa-muscular.png', aqui)
const SALIDA = new URL('../../src/features/gym/components/mapaMuscularGeometria.ts', import.meta.url)
const AREA_MINIMA = 80
const EPSILON = 1.4
/** Unidades del viewBox: enteras y finas (un cuerpo mide 1360), para escribir coordenadas cortas sin decimales. */
const ALTO_CUERPO = 1360
const MARGEN = 24

type Rect = [x0: number, y0: number, x1: number, y1: number]
type Zona = 'pecho' | 'espalda' | 'hombros' | 'biceps' | 'triceps' | 'antebrazo' | 'cuadriceps' | 'isquiotibiales' | 'gluteos' | 'aductores' | 'gemelos' | 'core'
type Figura = { clave: string; x0: number; x1: number; eje: number; zonas: [Zona, Rect[]][]; cortes?: [number, number, number, number][] }

// El orden importa: gana el primer rectángulo que contiene el centroide.
const FIGURAS: Figura[] = [
  { clave: 'hombre.frontal', x0: 0, x1: 400, eje: 207, zonas: [
    ['aductores', [[176, 490, 207, 560]]],
    ['hombros', [[40, 170, 125, 270]]],
    ['pecho', [[125, 200, 207, 280]]],
    ['biceps', [[55, 280, 120, 345]]],
    ['antebrazo', [[20, 345, 120, 480]]],
    ['core', [[120, 285, 208, 475]]],
    ['cuadriceps', [[95, 500, 185, 660]]],
    ['gemelos', [[100, 700, 195, 880]]],
  ] },
  { clave: 'hombre.trasera', x0: 400, x1: 780, eje: 585, zonas: [
    ['hombros', [[440, 190, 500, 240]]],
    ['triceps', [[425, 270, 495, 370]]],
    ['antebrazo', [[400, 370, 470, 480]]],
    ['core', [[500, 365, 560, 420]]],
    ['espalda', [[495, 190, 586, 420]]],
    ['gluteos', [[500, 425, 586, 500]]],
    ['aductores', [[570, 500, 600, 540]]],
    ['isquiotibiales', [[500, 540, 586, 650]]],
    ['gemelos', [[480, 700, 586, 860]]],
  ] },
  { clave: 'mujer.frontal', x0: 780, x1: 1150, eje: 954, cortes: [[855, 876, 925, 876], [983, 876, 1053, 876]], zonas: [
    ['hombros', [[830, 225, 890, 275]]],
    ['pecho', [[890, 250, 955, 310]]],
    ['biceps', [[825, 290, 880, 360]]],
    ['antebrazo', [[790, 365, 880, 470]]],
    ['core', [[870, 320, 955, 500]]],
    ['aductores', [[925, 500, 955, 600]]],
    ['cuadriceps', [[850, 500, 925, 660]]],
    ['gemelos', [[860, 700, 950, 885]]],
  ] },
  { clave: 'mujer.trasera', x0: 1150, x1: 1536, eje: 1335, zonas: [
    ['hombros', [[1210, 225, 1265, 265]]],
    ['triceps', [[1200, 285, 1265, 385]]],
    ['antebrazo', [[1170, 395, 1240, 470]]],
    ['core', [[1270, 400, 1300, 425]]],
    ['espalda', [[1260, 220, 1336, 425]]],
    ['gluteos', [[1260, 440, 1336, 510]]],
    ['aductores', [[1320, 505, 1350, 545]]],
    ['isquiotibiales', [[1260, 550, 1336, 660]]],
    ['gemelos', [[1250, 700, 1336, 860]]],
  ] },
]

const { data, info } = await sharp(readFileSync(IMAGEN)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, N = W * H
const blanco = new Uint8Array(N), separador = new Uint8Array(N), naranja = new Uint8Array(N)
for (let i = 0; i < N; i++) {
  const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2], mn = Math.min(r, g, b), mx = Math.max(r, g, b)
  blanco[i] = mn >= 236 ? 1 : 0
  // Líneas blancas (también las grises claras dentro del gris) y el contorno gris oscuro; el melocotón no es gris.
  separador[i] = blanco[i] || (mx - mn < 20 && (mn >= 212 || mx < 150)) ? 1 : 0
  naranja[i] = r - b > 35 ? 1 : 0
}
for (const f of FIGURAS) for (const [xa, ya, xb, yb] of f.cortes ?? []) {
  const pasos = Math.max(Math.abs(xb - xa), Math.abs(yb - ya))
  for (let k = 0; k <= pasos; k++) {
    const x = Math.round(xa + (xb - xa) * k / pasos), y = Math.round(ya + (yb - ya) * k / pasos)
    for (let d = -1; d <= 1; d++) separador[(y + d) * W + x] = 1
  }
}

// Fondo: blanco conectado al borde de la imagen. Se inunda solo por el blanco «ancho» (el que sigue siéndolo al erosionar
// RADIO px), para no colarse en el cuerpo por las líneas blancas que tocan el borde, y luego se recupera el margen.
const RADIO = 3
const ancho = new Uint8Array(N)
for (let y = RADIO; y < H - RADIO; y++) for (let x = RADIO; x < W - RADIO; x++) {
  let ok = 1
  for (let dy = -RADIO; dy <= RADIO && ok; dy++) for (let dx = -RADIO; dx <= RADIO; dx++) if (!blanco[(y + dy) * W + x + dx]) { ok = 0; break }
  ancho[y * W + x] = ok
}
for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if ((x < RADIO || y < RADIO || x >= W - RADIO || y >= H - RADIO) && blanco[y * W + x]) ancho[y * W + x] = 1
const fondo = new Uint8Array(N)
const pila: number[] = []
for (let x = 0; x < W; x++) pila.push(x, (H - 1) * W + x)
for (let y = 0; y < H; y++) pila.push(y * W, y * W + W - 1)
while (pila.length) {
  const i = pila.pop()!
  if (fondo[i] || !ancho[i]) continue
  fondo[i] = 1
  const x = i % W
  if (x > 0) pila.push(i - 1)
  if (x < W - 1) pila.push(i + 1)
  if (i >= W) pila.push(i - W)
  if (i < N - W) pila.push(i + W)
}
for (let paso = 0; paso < RADIO; paso++) {
  const borde: number[] = []
  for (let i = 0; i < N; i++) if (!fondo[i] && blanco[i]) { const x = i % W; if ((x > 0 && fondo[i - 1]) || (x < W - 1 && fondo[i + 1]) || (i >= W && fondo[i - W]) || (i < N - W && fondo[i + W])) borde.push(i) }
  for (const i of borde) fondo[i] = 1
}
const vecinos = (i: number) => { const x = i % W; return [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i >= W ? i - W : -1, i < N - W ? i + W : -1] }

// Formas: componentes conexas de relleno del mismo tipo.
const etiqueta = new Int32Array(N).fill(-1)
type Forma = { id: number; area: number; cx: number; cy: number }
const formas: Forma[] = []
for (let s = 0; s < N; s++) {
  if (fondo[s] || separador[s] || etiqueta[s] !== -1) continue
  const id = formas.length, cola = [s]
  let area = 0, sx = 0, sy = 0
  etiqueta[s] = id
  while (cola.length) {
    const i = cola.pop()!
    area++; sx += i % W; sy += Math.floor(i / W)
    for (const j of vecinos(i)) if (j >= 0 && etiqueta[j] === -1 && !fondo[j] && !separador[j] && naranja[j] === naranja[s]) { etiqueta[j] = id; cola.push(j) }
  }
  formas.push({ id, area, cx: sx / area, cy: sy / area })
}
const validas = new Set(formas.filter(f => f.area >= AREA_MINIMA).map(f => f.id))

// Cada píxel del cuerpo, a la forma válida más cercana (BFS multifuente).
const dueno = new Int32Array(N).fill(-1)
let frente: number[] = []
for (let i = 0; i < N; i++) if (validas.has(etiqueta[i])) { dueno[i] = etiqueta[i]; frente.push(i) }
while (frente.length) {
  const siguiente: number[] = []
  for (const i of frente) for (const j of vecinos(i)) if (j >= 0 && !fondo[j] && dueno[j] === -1) { dueno[j] = dueno[i]; siguiente.push(j) }
  frente = siguiente
}

type Punto = [number, number]
/** Contornos de la máscara siguiendo las aristas de los píxeles (interior a la derecha); devuelve los lazos cerrados. */
function contornos(dentro: (x: number, y: number) => boolean, x0: number, y0: number, x1: number, y1: number): Punto[][] {
  const aristas = new Map<string, Punto[]>()
  const anadir = (a: Punto, b: Punto) => { const k = `${a[0]},${a[1]}`; const l = aristas.get(k); if (l) l.push(b); else aristas.set(k, [b]) }
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (!dentro(x, y)) continue
    if (!dentro(x, y - 1)) anadir([x, y], [x + 1, y])
    if (!dentro(x + 1, y)) anadir([x + 1, y], [x + 1, y + 1])
    if (!dentro(x, y + 1)) anadir([x + 1, y + 1], [x, y + 1])
    if (!dentro(x - 1, y)) anadir([x, y + 1], [x, y])
  }
  const lazos: Punto[][] = []
  for (const [k, salidas] of aristas) {
    while (salidas.length) {
      const inicio = k.split(',').map(Number) as Punto
      const lazo: Punto[] = [inicio]
      let actual = salidas.pop()!
      while (`${actual[0]},${actual[1]}` !== k) {
        lazo.push(actual)
        const l = aristas.get(`${actual[0]},${actual[1]}`)
        if (!l?.length) break
        actual = l.pop()!
      }
      if (lazo.length >= 4) lazos.push(lazo)
    }
  }
  return lazos
}

function rdp(p: Punto[], eps: number): Punto[] {
  if (p.length < 3) return p
  const [a, b] = [p[0], p[p.length - 1]]
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1
  let max = 0, k = 0
  for (let i = 1; i < p.length - 1; i++) {
    const d = Math.abs(dy * (p[i][0] - a[0]) - dx * (p[i][1] - a[1])) / len
    if (d > max) { max = d; k = i }
  }
  return max <= eps ? [a, b] : [...rdp(p.slice(0, k + 1), eps).slice(0, -1), ...rdp(p.slice(k), eps)]
}
function simplificarLazo(p: Punto[]): Punto[] {
  // Se parte por el punto más lejano al primero para que el cierre no fije un vértice arbitrario.
  let k = 0, max = -1
  p.forEach((q, i) => { const d = Math.hypot(q[0] - p[0][0], q[1] - p[0][1]); if (d > max) { max = d; k = i } })
  const ida = rdp(p.slice(0, k + 1), EPSILON), vuelta = rdp([...p.slice(k), p[0]], EPSILON)
  return [...ida.slice(0, -1), ...vuelta.slice(0, -1)]
}

/** Números de un comando SVG: el signo menos ya separa, así que solo se pone espacio delante de los positivos. */
const numeros = (ns: number[]) => ns.map((n, i) => (i && n >= 0 ? ' ' : '') + n).join('')
/** Curva cerrada suave: los vértices son puntos de control y los puntos medios, los de paso. Comandos relativos y enteros. */
function trazo(lazos: Punto[][], aVista: (p: Punto) => Punto): string {
  return lazos.map(l => {
    const p = simplificarLazo(l).map(aVista)
    if (p.length < 3) return ''
    const entero = (q: Punto): Punto => [Math.round(q[0]), Math.round(q[1])]
    const medio = (a: Punto, b: Punto): Punto => entero([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])
    let actual = medio(p[p.length - 1], p[0])
    let d = `M${numeros(actual)}q`
    const tramos: number[] = []
    for (let i = 0; i < p.length; i++) {
      const c = entero(p[i]), m = medio(p[i], p[(i + 1) % p.length])
      tramos.push(c[0] - actual[0], c[1] - actual[1], m[0] - actual[0], m[1] - actual[1])
      actual = m
    }
    return d + numeros(tramos) + 'z'
  }).join('')
}

// Caja de cada figura para normalizar la altura; el viewBox es común y cada figura se centra en su eje.
const cajas = FIGURAS.map(f => {
  let y0 = H, y1 = 0, izq = W, der = 0
  for (let y = 0; y < H; y++) for (let x = f.x0; x < f.x1; x++) if (!fondo[y * W + x]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1); izq = Math.min(izq, x); der = Math.max(der, x + 1) }
  const escala = ALTO_CUERPO / (y1 - y0)
  return { y0, y1, izq, der, escala, semiancho: Math.max(f.eje - izq, der - f.eje) * escala }
})
const ANCHO = Math.ceil(2 * (Math.max(...cajas.map(c => c.semiancho)) + MARGEN))
const ALTO = ALTO_CUERPO + 2 * MARGEN

const dentroDeRect = (x: number, y: number, [x0, y0, x1, y1]: Rect) => x >= x0 && x <= x1 && y >= y0 && y <= y1
const zonaDe = (f: Figura, forma: Forma): Zona | null => {
  for (const [zona, rects] of f.zonas) for (const r of rects) {
    if (dentroDeRect(forma.cx, forma.cy, r) || dentroDeRect(2 * f.eje - forma.cx, forma.cy, r)) return zona
  }
  return null
}

const salida: Record<string, { silueta: string; detalles: string; zonas: Partial<Record<Zona, string>> }> = {}
const colorDepuracion = new Map<number, [number, number, number]>()
const PALETA: Record<Zona, [number, number, number]> = {
  pecho: [220, 40, 40], espalda: [40, 90, 220], hombros: [240, 150, 0], biceps: [0, 170, 80], triceps: [140, 60, 200], antebrazo: [0, 190, 190],
  cuadriceps: [200, 0, 120], isquiotibiales: [120, 90, 20], gluteos: [250, 90, 160], aductores: [90, 200, 0], gemelos: [255, 220, 0], core: [100, 100, 255],
}
for (const [n, f] of FIGURAS.entries()) {
  const c = cajas[n]
  const aVista = ([x, y]: Punto): Punto => [(x - f.eje) * c.escala + ANCHO / 2, (y - c.y0) * c.escala + MARGEN]
  const enFigura = (x: number, y: number) => x >= f.x0 && x < f.x1 && y >= 0 && y < H
  const silueta = trazo(contornos((x, y) => enFigura(x, y) && !fondo[y * W + x], f.x0, c.y0, f.x1, c.y1), aVista)
  const propias = formas.filter(o => validas.has(o.id) && o.cx >= f.x0 && o.cx < f.x1)
  const zonas: Partial<Record<Zona, string>> = {}
  let detalles = ''
  for (const o of propias) {
    let x0 = W, x1 = 0, y0 = H, y1 = 0
    for (let y = c.y0; y < c.y1; y++) for (let x = f.x0; x < f.x1; x++) if (dueno[y * W + x] === o.id) { x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1) }
    const d = trazo(contornos((x, y) => enFigura(x, y) && dueno[y * W + x] === o.id, x0, y0, x1, y1), aVista)
    const zona = zonaDe(f, o)
    if (zona) { zonas[zona] = (zonas[zona] ?? '') + d; colorDepuracion.set(o.id, PALETA[zona]) } else detalles += d
  }
  salida[f.clave] = { silueta, detalles, zonas }
}

if (process.argv.includes('--depurar')) {
  const img = Buffer.alloc(N * 3, 255)
  for (let i = 0; i < N; i++) {
    if (fondo[i]) continue
    const col = colorDepuracion.get(dueno[i]) ?? [190, 190, 190]
    const borde = (i % W < W - 1 && dueno[i + 1] !== dueno[i]) || (i + W < N && dueno[i + W] !== dueno[i])
    img.set(borde ? [255, 255, 255] : col, i * 3)
  }
  await sharp(img, { raw: { width: W, height: H, channels: 3 } }).png().toFile(fileURLToPath(new URL('ia/mapa-muscular-depuracion.png', aqui)))
}

const vista = (v: typeof salida[string]) => [
  '{',
  `    silueta: '${v.silueta}',`,
  `    detalles: '${v.detalles}',`,
  '    zonas: {',
  ...Object.entries(v.zonas).map(([z, d]) => `      ${z}: '${d}',`),
  '    },',
  '  }',
].join('\n')
writeFileSync(SALIDA, `/** Generado por scripts/ejercicios/mapa-muscular.ts a partir de la imagen de referencia: no editar a mano. */
import type { ZonaMuscular } from '../lib/musculos'

export type FiguraMapa = 'hombre' | 'mujer'
/** Silueta (contorno), detalles neutros (cabeza, manos, rodillas…) y una forma por zona muscular; coordenadas SVG. */
export interface VistaCuerpo { silueta: string; detalles: string; zonas: Partial<Record<ZonaMuscular, string>> }

export const VIEWBOX_CUERPO = '0 0 ${ANCHO} ${ALTO}'
export const CUERPOS: Record<FiguraMapa, { frontal: VistaCuerpo; trasera: VistaCuerpo }> = {
  hombre: {
    frontal: ${vista(salida['hombre.frontal']).replace(/\n/g, '\n  ')},
    trasera: ${vista(salida['hombre.trasera']).replace(/\n/g, '\n  ')},
  },
  mujer: {
    frontal: ${vista(salida['mujer.frontal']).replace(/\n/g, '\n  ')},
    trasera: ${vista(salida['mujer.trasera']).replace(/\n/g, '\n  ')},
  },
}
`)
const kb = (readFileSync(SALIDA).length / 1024).toFixed(1)
console.log(`mapaMuscularGeometria.ts: ${kb} KB, viewBox 0 0 ${ANCHO} ${ALTO}`)
for (const [k, v] of Object.entries(salida)) console.log(`${k}: ${Object.keys(v.zonas).join(', ')}`)
