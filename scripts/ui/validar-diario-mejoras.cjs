/* Contextos desechables y datos sintéticos: nunca usa el origen de datos personales.
   APPFIT_UI_OUTPUT permite guardar la inspección visual en una carpeta independiente. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const ORIGEN = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-diario-mejoras'
const nombre = 'Arroz con pollo, verduras y salsa de tomate de la huerta'

async function registros(page) {
  return page.evaluate(async () => {
    const r = await import('/src/features/nutricion/data/entriesRepo.ts')
    const d = await import('/src/shared/lib/dates.ts')
    return r.delDia(d.todayISO())
  })
}
const asa = page => page.getByRole('button', { name: `Arrastrar plato ${nombre}`, exact: true })
const mover = page => page.getByRole('button', { name: `Mover plato ${nombre}`, exact: true })
const seccion = (page, comida) => page.locator(`[data-comida="${comida}"]`)

async function esperarComida(page, comida) {
  await seccion(page, comida).getByRole('button', { name: `Mover plato ${nombre}`, exact: true }).waitFor()
  assert.equal(await mover(page).count(), 1)
}
async function layout(page) {
  const resultado = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && !e.closest('[hidden],[inert]')
    const overflow = [...document.querySelectorAll('html,main,[role="dialog"]')].filter(visible).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.tagName)
    const tacto = [...document.querySelectorAll('button,[role="radio"],input')].filter(visible).filter(e => e.getBoundingClientRect().height < 43.9).map(e => e.getAttribute('aria-label') || e.textContent)
    const campos = [...document.querySelectorAll('input')].filter(visible).filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.getAttribute('aria-label'))
    return { overflow, tacto, campos }
  })
  assert.deepEqual(resultado, { overflow: [], tacto: [], campos: [] })
}
async function deshacer(page, antes) {
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
  await esperarComida(page, 'cena')
  assert.deepEqual(await registros(page), antes)
}
async function mouseStart(page) {
  await asa(page).scrollIntoViewIfNeeded()
  const b = await asa(page).boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 20, { steps: 3 })
}
async function target(page, comida) {
  const heading = seccion(page, comida).getByRole('heading')
  // Medir fuera del borde de autoscroll: una cabecera ya visible puede seguir
  // desplazándose entre touchMove y touchEnd si permanece junto al borde.
  await heading.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }))
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const b = await heading.boundingBox()
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}
async function main() {
  fs.mkdirSync(salida, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const casos = []
  try {
    const vistas = [320, 375, 430].flatMap(width => ['light', 'dark'].map(colorScheme => ({ width, colorScheme, reducedMotion: 'no-preference', grande: false })))
    vistas.push(...['light', 'dark'].map(colorScheme => ({ width: 375, colorScheme, reducedMotion: 'reduce', grande: true })))
    vistas.push({ width: 1440, colorScheme: 'light', reducedMotion: 'no-preference', grande: false })
    for (const vista of vistas) {
      const { width, colorScheme, reducedMotion, grande } = vista
      const etiqueta = `${width}-${colorScheme}-${reducedMotion}${grande ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== etiqueta) continue
      const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 812 }, colorScheme, reducedMotion, hasTouch: true })
      try {
        const page = await context.newPage()
        page.setDefaultTimeout(10000)
        const errores = []
        page.on('pageerror', e => errores.push(e.message))
        await context.route('**/world.openfoodfacts.org/**', route => route.abort())
        await page.goto(ORIGEN)
        await page.getByRole('heading', { name: /Buenos|Buenas/ }).waitFor()
        await page.evaluate(async nombre => {
          const r = await import('/src/features/nutricion/data/entriesRepo.ts')
          const d = await import('/src/shared/lib/dates.ts')
          const fecha = d.todayISO()
          await r.guardarComida({ fecha, comida: 'cena', nombrePlato: nombre, items: [
            { nombre: 'Arroz', gramos: 150, kcal100: 130, prot100: 3, carb100: 28, grasa100: 0.3, nutrientes: { fibra: 1, azucares: 2, sal: 0, agSat: 0.2 }, fuenteSiNuevo: 'manual' },
            { nombre: 'Pollo', gramos: 100, kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, nutrientes: { fibra: 0, azucares: 0, sal: 1.2, agSat: 1 }, fuenteSiNuevo: 'manual' },
          ] })
          await r.anadirRapida({ fecha, comida: 'desayuno', nombre: 'Alimento suelto sin datos adicionales', kcal: 80, prot: 0, carb: 0, grasa: 0 })
        }, nombre)
        const antes = await registros(page)
        const platoId = antes.find(e => e.platoId).platoId
        await navegar(page, 'Nutrición')
        await esperarComida(page, 'cena')
        if (grande) await page.addStyleTag({ content: 'html { font-size: 200%; }' })
        await layout(page)
        assert.ok(await page.evaluate(() => {
          const heading = document.querySelector('[data-comida="desayuno"] h2')
          const food = document.querySelector('[data-comida="desayuno"] li button span span')
          return parseFloat(getComputedStyle(heading).fontSize) > parseFloat(getComputedStyle(food).fontSize) && Number(getComputedStyle(heading).fontWeight) > Number(getComputedStyle(food).fontWeight)
        }), 'jerarquía de las comidas sobre alimentos sueltos')

        // Alternativa accesible; cancelar no escribe, guardar mueve el grupo y restaura foco.
        await mover(page).click()
        const sheet = page.getByRole('dialog', { name: 'Mover plato', exact: true })
        await sheet.waitFor()
        await page.waitForFunction(() => document.querySelector('.sheet-layer')?.dataset.visible === 'true')
        await sheet.evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {}))))
        assert.equal(await sheet.getByRole('button', { name: 'Mover a Cena', exact: true }).isDisabled(), true)
        await layout(page)
        await page.screenshot({ path: path.join(salida, `${etiqueta}-destino.png`) })
        await page.keyboard.press('Escape')
        await sheet.waitFor({ state: 'detached' })
        assert.deepEqual(await registros(page), antes)
        await mover(page).click()
        await sheet.getByRole('button', { name: 'Mover a Snack', exact: true }).click()
        await sheet.waitFor({ state: 'detached' })
        await esperarComida(page, 'snack')
        assert.deepEqual(await registros(page), antes.map(e => e.platoId === platoId ? { ...e, comida: 'snack' } : e))
        await page.waitForFunction(() => document.activeElement?.closest('[data-comida]')?.dataset.comida === 'snack')
        await deshacer(page, antes)

        // Enter + flechas mueven entre comidas reales, no en incrementos de píxeles.
        await asa(page).focus()
        await page.keyboard.press('Enter')
        await page.waitForFunction(() => document.querySelector('button[aria-label^="Arrastrar plato"]')?.getAttribute('aria-pressed') === 'true')
        await page.keyboard.press('ArrowDown')
        await page.waitForFunction(() => document.querySelector('[data-comida="snack"]').dataset.dropActive === 'true')
        await page.keyboard.press('Enter')
        await esperarComida(page, 'snack')
        await deshacer(page, antes)
        await asa(page).focus()
        await page.keyboard.press('Space')
        await page.waitForFunction(() => document.querySelector('button[aria-label^="Arrastrar plato"]')?.getAttribute('aria-pressed') === 'true')
        await page.keyboard.press('ArrowUp')
        await page.keyboard.press('Escape')
        assert.deepEqual(await registros(page), antes)

        // Puntero: cancelar, soltar fuera y después mover a otra comida.
        await asa(page).click() // Un toque sin arrastrar no bloquea el próximo gesto.
        await mouseStart(page)
        await page.keyboard.press('Escape')
        await page.mouse.up()
        assert.deepEqual(await registros(page), antes)
        await mouseStart(page)
        await page.mouse.move(1, 1)
        await page.mouse.up()
        assert.deepEqual(await registros(page), antes)
        await mouseStart(page)
        const dest = await target(page, 'snack')
        await page.mouse.move(dest.x, dest.y, { steps: 5 })
        await page.waitForFunction(() => document.querySelector('[data-comida="snack"]').dataset.dropActive === 'true')
        await page.screenshot({ path: path.join(salida, `${etiqueta}-arrastre.png`) })
        const copia = await page.locator('.dnd-overlay-copy').boundingBox()
        assert.ok(copia.x >= -1 && copia.x + copia.width <= width + 1, 'copia legible dentro del viewport')
        await page.mouse.up()
        await esperarComida(page, 'snack')
        await deshacer(page, antes)

        // Touch real de Chromium vía CDP; touchcancel seguido de un gesto válido.
        const cdp = await context.newCDPSession(page)
        const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points })
        async function tocarInicio() {
          await asa(page).scrollIntoViewIfNeeded()
          const b = await asa(page).boundingBox()
          const p = { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1 }
          await touch('touchStart', [p])
          await touch('touchMove', [{ ...p, y: p.y - 20 }])
          const copiaInicial = await page.locator('.dnd-overlay-copy').boundingBox()
        }
        if (!grande) {
          await tocarInicio()
          await touch('touchCancel', [])
          assert.deepEqual(await registros(page), antes)
          await tocarInicio()
          const to = await target(page, 'snack')
          await touch('touchMove', [{ ...to, id: 1 }])
          await page.waitForFunction(() => document.querySelector('[data-comida="snack"]').dataset.dropActive === 'true')
          await touch('touchEnd', [])
          await esperarComida(page, 'snack')
          await deshacer(page, antes)
        }

        if (width === 375 && colorScheme === 'light' && !grande) {
          // Un segundo dedo no roba la captura ni termina el arrastre del primero.
          await asa(page).scrollIntoViewIfNeeded()
          const b = await asa(page).boundingBox()
          const p = { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1 }
          const q = { x: p.x - 40, y: p.y, id: 2 }
          await touch('touchStart', [p])
          await touch('touchMove', [{ ...p, y: p.y - 20 }])
          const copiaInicial = await page.locator('.dnd-overlay-copy').boundingBox()
          await touch('touchStart', [{ ...p, y: p.y - 20 }, q])
          await touch('touchMove', [{ ...p, y: p.y - 20 }, { ...q, x: 10 }])
          await touch('touchEnd', [{ ...p, y: p.y - 20 }])
          // Chromium puede cancelar el primer puntero para iniciar un gesto de
          // dos dedos. Ambas salidas son válidas: conservarlo o cancelar sin salto.
          if (await asa(page).getAttribute('aria-pressed') === 'true') {
            const copiaActual = await page.locator('.dnd-overlay-copy').boundingBox()
            assert.ok(Math.abs(copiaActual.x - copiaInicial.x) <= 1, 'el segundo dedo no desplaza el plato')
          } else assert.equal(await page.locator('.dnd-overlay-copy').count(), 0, 'cancelación limpia del gesto multitáctil')
          assert.deepEqual(await registros(page), antes)
          await touch('touchCancel', [])

          // Pérdida de foco/captura: sin guardar, el próximo gesto funciona.
          await page.evaluate(() => document.addEventListener('pointerdown', e => { window.__appfitPointer = e.pointerId }, { once: true }))
          await mouseStart(page)
          await page.evaluate(() => document.querySelector('button[aria-label^="Arrastrar plato"]').releasePointerCapture(window.__appfitPointer))
          await page.mouse.move(2, 2)
          await page.mouse.up()
          await page.waitForFunction(() => document.querySelector('button[aria-label^="Arrastrar plato"]').getAttribute('aria-pressed') !== 'true')
          assert.deepEqual(await registros(page), antes)
          await mouseStart(page)
          await page.evaluate(() => window.dispatchEvent(new Event('blur')))
          await page.mouse.up()
          assert.deepEqual(await registros(page), antes)
          await mover(page).click()
          await sheet.getByRole('button', { name: 'Mover a Comida', exact: true }).click()
          await sheet.waitFor({ state: 'detached' })
          await esperarComida(page, 'comida')
          await deshacer(page, antes)

          // El autoscroll del contenedor permite llegar a comidas fuera del viewport.
          await tocarInicio()
          const scroll = await page.locator('main').evaluate(el => el.scrollTop)
          const main = await page.locator('main').boundingBox()
          await touch('touchMove', [{ x: main.x + main.width / 2, y: main.y + 5, id: 1 }])
          await page.waitForFunction(anterior => document.querySelector('main').scrollTop < anterior - 30, scroll)
          // Retirar el dedo del borde detiene el autoscroll antes de medir destino.
          await touch('touchMove', [{ x: main.x + main.width / 2, y: main.y + main.height / 2, id: 1 }])
          const desayuno = await target(page, 'desayuno')
          await touch('touchMove', [{ ...desayuno, id: 1 }])
          await page.waitForFunction(() => document.querySelector('[data-comida="desayuno"]').dataset.dropActive === 'true')
          await touch('touchEnd', [])
          await esperarComida(page, 'desayuno')
          await deshacer(page, antes)

          // Fallo de IndexedDB simulado: error en la capa, rollback y reintento.
          await mover(page).click()
          await page.evaluate(async () => {
            const { db } = await import('/src/shared/db/db.ts')
            window.__appfitFailMovement = changes => { if (changes.comida) throw new Error('Fallo de escritura de prueba') }
            db.entries.hook('updating', window.__appfitFailMovement)
          })
          await sheet.getByRole('button', { name: 'Mover a Snack', exact: true }).click()
          await sheet.getByText('No se ha podido mover el plato. Inténtalo de nuevo.', { exact: true }).waitFor()
          assert.deepEqual(await registros(page), antes)
          await layout(page)
          await page.evaluate(async () => {
            const { db } = await import('/src/shared/db/db.ts')
            db.entries.hook('updating').unsubscribe(window.__appfitFailMovement)
          })
          await sheet.getByRole('button', { name: 'Mover a Snack', exact: true }).click()
          await sheet.waitFor({ state: 'detached' })
          await esperarComida(page, 'snack')
          await deshacer(page, antes)
        }

        // Referencias explícitas, cobertura parcial; la revisión de alimento no las ofrece.
        await page.getByRole('radio', { name: 'Vista detallada', exact: true }).click()
        const desglose = page.getByRole('region', { name: 'Desglose del día', exact: true })
        assert.equal(await desglose.getByRole('progressbar').count(), 4)
        assert.match(await desglose.innerText(), /Mín\. 25 g.*sin máximo/s)
        assert.match(await desglose.innerText(), /Referencia 90 g.*totales/s)
        assert.match(await desglose.innerText(), /Límite < 5 g/s)
        assert.equal(await desglose.getByText('Parcial · 2 de 3 alimentos', { exact: true }).count(), 4)
        await desglose.getByRole('button', { name: 'Referencias diarias y fuentes', exact: true }).click()
        assert.match(await desglose.innerText(), /no un máximo recomendado/)
        await layout(page)
        // El scroll pertenece a main, no a body. Una captura de elemento mayor
        // que main inventaría franjas vacías bajo su clip; guardar el viewport real.
        await desglose.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }))
        await page.screenshot({ path: path.join(salida, `${etiqueta}-referencias.png`) })
        await desglose.getByRole('button', { name: 'Referencias diarias y fuentes', exact: true }).click()
        await seccion(page, 'cena').scrollIntoViewIfNeeded()
        await page.screenshot({ path: path.join(salida, `${etiqueta}-comidas.png`) })
        assert.equal(await page.getByRole('button', { name: `Añadir ingredientes a ${nombre}`, exact: true }).count(), 1)
        assert.deepEqual(errores, [])
        casos.push({ ...vista, correcto: true })
        console.log(`Diario: ${etiqueta}: correcto`)
      } finally { await context.close() }
    }
  } finally {
    await browser.close()
    fs.writeFileSync(path.join(salida, 'resultado.json'), JSON.stringify({ origen: ORIGEN, completo: casos.length === 9, casos }, null, 2))
  }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
