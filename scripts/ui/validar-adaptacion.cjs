/* Android emulado y tamaños de lectura; solo contextos desechables y datos sintéticos. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium, devices } = require('playwright')
const { navegar } = require('./navegar.cjs')
const ORIGEN = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-adaptacion'
const fixture = fs.readFileSync('src/test/fixtures/backup-v1.json', 'utf8')

async function backup(page) {
  return page.evaluate(async () => {
    const { exportarBackup } = await import('/src/shared/lib/backup.ts')
    const value = await exportarBackup()
    delete value.exportedAt
    return value
  })
}

async function geometria(page, selector = 'main') {
  const resultado = await page.locator(selector).evaluate(root => {
    const overflow = [root, ...root.querySelectorAll('*')].filter(el => el instanceof HTMLElement && el.clientWidth > 0 &&
      getComputedStyle(el).overflowX === 'visible' && el.scrollWidth > el.clientWidth + 2).map(el => `${el.tagName}.${el.className}`)
    return { overflow, pagina: document.documentElement.scrollWidth <= innerWidth + 1 }
  })
  assert.equal(resultado.pagina, true, 'página sin scroll horizontal')
  assert.deepEqual(resultado.overflow, [], `${selector}: contenido sin desbordar sus contenedores`)
}

async function main() {
  fs.mkdirSync(salida, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const informe = []
  try {
    const tamanos = [[320, 568], [375, 812], [430, 932], [768, 1024], [1440, 900], [812, 375], [375, 812, true]]
    for (const [width, height, grande = false] of tamanos) for (const colorScheme of ['light', 'dark']) {
      const nombre = `${width}x${height}-${colorScheme}${grande ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== nombre) continue
      const perfil = width === 1440 ? { isMobile: false, hasTouch: false, deviceScaleFactor: 1 } : devices['Pixel 7']
      const context = await browser.newContext({ ...perfil, viewport: { width, height }, colorScheme, reducedMotion: 'reduce' })
      const resultado = { nombre, correcto: false }
      try {
        await context.route('**/world.openfoodfacts.org/**', r => r.abort())
        const page = await context.newPage()
        page.setDefaultTimeout(10000)
        const errores = []
        page.on('pageerror', e => errores.push(e.message))
        await page.goto(ORIGEN)
        await page.getByRole('heading', { name: 'Hoy', exact: true }).waitFor()
        await page.evaluate(async json => {
          const { ensureSettings } = await import('/src/shared/db/settings.ts')
          await ensureSettings()
          const { importarBackup } = await import('/src/shared/lib/backup.ts')
          await importarBackup(json)
          const { todayISO } = await import('/src/shared/lib/dates.ts')
          const entries = await import('/src/features/nutricion/data/entriesRepo.ts')
          await entries.anadirRapida({ fecha: todayISO(), comida: 'desayuno', nombre: 'Comida sintética con un nombre muy largo para comprobar que las etiquetas se pueden leer completas en todas las pantallas', kcal: 999999, prot: 9999, carb: 9999, grasa: 9999 })
          const routines = await import('/src/features/gym/data/routinesRepo.ts')
          const [primera] = await routines.listar()
          if (primera) await routines.guardar({ ...primera, nombre: 'Entrenamiento de fuerza y movilidad con un nombre muy largo que debe poder leerse completo' })
        }, fixture)
        await page.reload()
        await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
        if (grande) await page.addStyleTag({ content: 'html { font-size: 200%; }' })
        await page.evaluate(() => document.fonts.ready)
        const antes = await backup(page)
        await geometria(page)
        await page.screenshot({ path: `${salida}/${nombre}-inicio.png` })
        const ancho = await page.locator('.app-view').evaluate(e => e.clientWidth)
        if (width >= 768 && !grande) assert.ok(ancho > 512 && ancho <= 768, 'columna de tablet/escritorio aprovecha el ancho con límite de lectura')

        await page.getByRole('button', { name: 'Secciones', exact: true }).click()
        const arco = page.getByRole('dialog', { name: 'Secciones', exact: true })
        const destinos = arco.locator('.arco-destino')
        for (const destino of await destinos.all()) {
          await destino.scrollIntoViewIfNeeded()
          const rect = await destino.boundingBox()
          assert.ok(rect.x >= -1 && rect.x + rect.width <= width + 1 && rect.y >= -1 && rect.y + rect.height <= height + 1, 'destinos accesibles dentro de la pantalla')
        }
        const circulos = await arco.locator('.arco-circulo').evaluateAll(items => items.map(el => {
          const r = el.getBoundingClientRect()
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, radio: r.width / 2 }
        }))
        for (let i = 0; i < circulos.length; i++) for (let j = i + 1; j < circulos.length; j++) {
          const a = circulos[i], b = circulos[j]
          assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.radio + b.radio, 'secciones sin solaparse')
        }
        await page.goBack()
        await arco.waitFor({ state: 'detached' })

        // Atrás de Android cierra la capa; una altura reducida simula el espacio que deja el teclado.
        await page.getByRole('button', { name: 'Registrar peso', exact: true }).click()
        const peso = page.getByRole('dialog', { name: 'Registrar peso', exact: true })
        await peso.getByRole('textbox', { name: 'Peso', exact: true }).focus()
        await page.setViewportSize({ width, height: 320 })
        await page.waitForFunction(() => Math.abs(visualViewport.height - 320) < 1 &&
          Math.abs(parseFloat(document.documentElement.style.getPropertyValue('--viewport-height')) - 320) < 1)
        await geometria(page, '[role="dialog"]')
        const guardar = await peso.getByRole('button', { name: 'Guardar', exact: true }).boundingBox()
        assert.ok(guardar.y >= 0 && guardar.y + guardar.height <= 321, `Guardar queda sobre el teclado: ${JSON.stringify(guardar)}`)
        await page.goBack()
        await peso.waitFor({ state: 'detached' })
        await page.setViewportSize({ width, height })
        assert.equal(await page.locator('[data-app-shell]').evaluate(e => e.inert), false)

        for (const destino of ['Nutrición', 'Entreno', 'Perfil', 'Cumbres', 'Caminos', 'Ritmo', 'Vitrina', 'Referencias', 'Ajustes']) {
          await navegar(page, destino)
          await page.getByRole('main').getByRole('heading').first().waitFor()
          await page.evaluate(() => document.fonts.ready)
          await geometria(page)
          if (destino === 'Nutrición') {
            await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
            const tarea = page.getByRole('dialog', { name: 'Añadir comida', exact: true })
            await tarea.waitFor()
            await page.setViewportSize({ width, height: 360 })
            await page.waitForFunction(() => Math.abs(parseFloat(document.documentElement.style.getPropertyValue('--viewport-height')) - 360) < 1)
            await geometria(page, '.task-layer')
            const bounds = await tarea.boundingBox()
            assert.ok(bounds.y >= -1 && bounds.y + bounds.height <= 361, 'página modal se ajusta al teclado')
            await page.goBack()
            await tarea.waitFor({ state: 'detached' })
            await page.setViewportSize({ width, height })
          }
        }

        // Oferta recibida antes de abrir Primeros pasos; nunca instala nada realmente.
        await page.evaluate(() => {
          window.__instalacionesPrueba = 0
          const evento = new Event('beforeinstallprompt', { cancelable: true })
          evento.prompt = async () => { window.__instalacionesPrueba++ }
          evento.userChoice = Promise.resolve({ outcome: 'dismissed' })
          window.dispatchEvent(evento)
        })
        await page.getByRole('button', { name: /^Primeros pasos/ }).click()
        await page.getByRole('heading', { name: 'Android', exact: true }).waitFor()
        await geometria(page)
        await page.getByRole('button', { name: 'Instalar AppFit', exact: true }).click()
        assert.equal(await page.evaluate(() => window.__instalacionesPrueba), 1)
        assert.equal(await page.getByRole('button', { name: 'Instalar AppFit', exact: true }).count(), 0)
        assert.deepEqual(await backup(page), antes, 'lectura, capas e instalación conservan el backup')
        assert.deepEqual(errores, [])
        resultado.correcto = true
        console.log(`${nombre}: correcto`)
      } catch (error) {
        resultado.error = error.message
        throw error
      } finally {
        informe.push(resultado)
        fs.writeFileSync(`${salida}/informe.json`, JSON.stringify(informe, null, 2))
        await context.close()
      }
    }
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
