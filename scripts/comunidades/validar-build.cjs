/* Verifica los recursos del build de la app y su precaché real, sin cuenta ni Supabase. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { chromium } = require('playwright')
const raiz = path.resolve(__dirname, '../..')
const base = process.env.APPFIT_COMUNIDADES_BUILD_URL || 'http://appfit-test.localhost:5175'
assert.equal(new URL(base).hostname, 'appfit-test.localhost')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const fuentes = JSON.parse(fs.readFileSync(path.join(__dirname, 'fuentes.json'), 'utf8'))
const emitidos = new Map(fs.readdirSync(path.join(raiz, 'dist/assets')).filter(f => f.endsWith('.webp')).map(f => [hash(fs.readFileSync(path.join(raiz, 'dist/assets', f))), f]))
const sw = fs.readFileSync(path.join(raiz, 'dist/sw.js'), 'utf8')
const urls = fuentes.lotes.flatMap(l => l.elementos).map(e => {
  const nombre = e.id.slice('lugar.'.length) + '.webp'
  const emitido = emitidos.get(hash(fs.readFileSync(path.join(raiz, 'src/features/social/assets/comunidades', nombre))))
  assert.ok(emitido, `${nombre}: emitido sin cambios`)
  assert.ok(sw.includes('assets/' + emitido), `${nombre}: incluido en precaché`)
  return '/assets/' + emitido
})
assert.equal(urls.length, 36)
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 932 } })
    const page = await context.newPage()
    await page.goto(base)
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
    const cacheadas = await page.evaluate(async urls => Promise.all(urls.map(async u => !!await caches.match(new URL(u, location.href).href))), urls)
    assert.ok(cacheadas.every(Boolean), 'Los 36 recursos están en CacheStorage')
    await context.setOffline(true)
    const offline = await page.evaluate(async urls => Promise.all(urls.map(u => new Promise(resolve => { const img = new Image(); img.onload = () => resolve(img.naturalWidth === 256 && img.naturalHeight === 256); img.onerror = () => resolve(false); img.src = u }))), urls)
    assert.ok(offline.every(Boolean), 'Las 36 imágenes se decodifican sin red desde el precaché')
    console.log('OK: 36 WebP emitidos, precacheados y decodificados sin conexión. Sin cuenta ni datos reales.')
    await context.close()
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
