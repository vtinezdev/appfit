/* Genera public/images/fondos/curvas.svg: las curvas de nivel de un macizo visto desde arriba (fondo «Curvas» de Ajustes).
   Relieve = picos gaussianos + ondulación suave; marching squares por nivel y segmentos encadenados en trazos.
   Determinista: sin azar, el mismo archivo en cada ejecución. Uso: node scripts/fondos/curvas.cjs */
const fs = require('node:fs')
const path = require('node:path')

const W = 400, H = 900, PASO = 4
const PICOS = [ // x, y, radio, altura
  [330, 120, 150, 1.0], [250, 40, 90, 0.55], [60, 260, 120, 0.6], [380, 420, 110, 0.45], [120, 620, 160, 0.5], [320, 800, 120, 0.35],
]
const NIVELES = Array.from({ length: 22 }, (_, i) => 0.06 + i * 0.045)

function altura(x, y) {
  let v = 0
  for (const [px, py, r, h] of PICOS) v += h * Math.exp(-((x - px) ** 2 + (y - py) ** 2) / (2 * r * r))
  return v + 0.05 * Math.sin(x / 37 + y / 61) + 0.04 * Math.cos(x / 23 - y / 47) + 0.03 * Math.sin((x + y) / 19)
}

const nx = W / PASO + 1, ny = H / PASO + 1
const malla = Array.from({ length: ny }, (_, j) => Array.from({ length: nx }, (_, i) => altura(i * PASO, j * PASO)))
const r1 = (n) => Math.round(n * 10) / 10

/** Segmentos de un nivel; cada punto se identifica por la arista de la malla que corta, para poder encadenarlos. */
function segmentos(L) {
  const out = []
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = malla[j][i], b = malla[j][i + 1], c = malla[j + 1][i + 1], d = malla[j + 1][i]
    const x = i * PASO, y = j * PASO, t = (v0, v1) => (L - v0) / (v1 - v0)
    const pts = []
    if ((a < L) !== (b < L)) pts.push([`h${i},${j}`, x + PASO * t(a, b), y])
    if ((b < L) !== (c < L)) pts.push([`v${i + 1},${j}`, x + PASO, y + PASO * t(b, c)])
    if ((d < L) !== (c < L)) pts.push([`h${i},${j + 1}`, x + PASO * t(d, c), y + PASO])
    if ((a < L) !== (d < L)) pts.push([`v${i},${j}`, x, y + PASO * t(a, d)])
    for (let k = 0; k + 1 < pts.length; k += 2) out.push([pts[k], pts[k + 1]])
  }
  return out
}

/** Une segmentos que comparten extremo en polilíneas; reduce el tamaño del archivo a menos de la mitad. */
function encadenar(segs) {
  const porPunto = new Map()
  segs.forEach((s, n) => s.forEach(([id]) => porPunto.set(id, [...(porPunto.get(id) ?? []), n])))
  const usado = new Set()
  const trazos = []
  const siguiente = (id) => (porPunto.get(id) ?? []).find((n) => !usado.has(n))
  for (let n = 0; n < segs.length; n++) {
    if (usado.has(n)) continue
    usado.add(n)
    const linea = [segs[n][0], segs[n][1]]
    for (const alFinal of [true, false]) {
      for (;;) {
        const extremo = alFinal ? linea[linea.length - 1] : linea[0]
        const m = siguiente(extremo[0])
        if (m === undefined) break
        usado.add(m)
        const otro = segs[m][0][0] === extremo[0] ? segs[m][1] : segs[m][0]
        if (alFinal) linea.push(otro); else linea.unshift(otro)
      }
    }
    trazos.push(linea)
  }
  return trazos
}

let d = ''
for (const L of NIVELES) for (const linea of encadenar(segmentos(L))) {
  const [, x0, y0] = linea[0]
  d += `M${r1(x0)} ${r1(y0)}`
  let [px, py] = [r1(x0), r1(y0)]
  for (const [, x, y] of linea.slice(1)) {
    const [qx, qy] = [r1(x), r1(y)]
    d += `l${r1(qx - px)} ${r1(qy - py)}`.replace(/(^|[^\d])0\./g, '$1.').replace(/ -/g, '-')
    ;[px, py] = [qx, qy]
  }
}

// El color lo pone la app (se usa como máscara); el trazo solo marca la forma.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><path d="${d}" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`
const destino = path.join(__dirname, '../../public/images/fondos/curvas.svg')
fs.mkdirSync(path.dirname(destino), { recursive: true })
fs.writeFileSync(destino, svg)
console.log(`${destino}: ${svg.length} bytes`)
