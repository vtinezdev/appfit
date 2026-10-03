/* Prueba de desarrollo aislada. Requiere Playwright/Chromium disponibles en el entorno.
   Nunca usa el origen con los datos reales. No añade dependencias a la PWA. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const ORIGEN = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-ui'
fs.mkdirSync(salida, { recursive: true })
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/test/fixtures/backup-v1.json'), 'utf8'))
const resultados = []
let completado = false

async function preparar(page, estado) {
  if (estado === 'vacio') return
  await page.evaluate(async ({ fixture, estado }) => {
    const { importarBackup } = await import('/src/shared/lib/backup.ts')
    const { todayISO, addDays } = await import('/src/shared/lib/dates.ts')
    const { normalizeName } = await import('/src/shared/lib/text.ts')
    const hoy = todayISO()
    fixture.entries.forEach(e => { e.fecha = addDays(hoy, e.id <= 4 ? 0 : e.id <= 7 ? -1 : -2); if (e.id === 3 || e.id === 4) { e.platoId = 'fixture'; e.nombrePlato = 'Pollo con arroz' } })
    fixture.workouts[0].inicio = Date.now() - 5 * 86400000
    fixture.workouts[0].fin = fixture.workouts[0].inicio + 3600000
    if (estado === 'extremo') {
      const largo = 'Alimento con una descripción completa extremadamente larga, sin azúcares añadidos, preparado para consumir y con información adicional '
      fixture.foods.forEach(f => { f.nombre = largo + f.nombre; f.nombreNorm = normalizeName(f.nombre) })
      fixture.entries = Array.from({ length: 64 }, (_, i) => ({ ...fixture.entries[i % 4], id: i + 1, fecha: addDays(hoy, i < 24 ? 0 : -Math.floor(i / 4)), gramos: 999999, kcal: 1234567.8, prot: 99999.9, carb: 88888.8, grasa: 77777.7, nombre: largo + i, platoId: `plato-${Math.floor(i / 2)}`, nombrePlato: 'Plato con varios ingredientes y un título suficientemente largo para ocupar varias líneas ' + Math.floor(i / 2) }))
      fixture.routines = Array.from({ length: 25 }, (_, i) => ({ ...fixture.routines[0], id: i + 1, nombre: 'Rutina de entrenamiento de fuerza con un nombre largo y más contexto ' + i }))
      fixture.exercises[0].nombre = 'Press de banca con una descripción larga del ejercicio y de su variación'
      fixture.exercises[0].nombreNorm = normalizeName(fixture.exercises[0].nombre)
      fixture.workouts = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, inicio: Date.now() - i * 86400000 - 3600000, fin: Date.now() - i * 86400000, routineId: 1 }))
      fixture.sets = fixture.workouts.flatMap((w, i) => Array.from({ length: 5 }, (_, j) => ({ ...fixture.sets[j], id: i * 5 + j + 1, workoutId: w.id, peso: 900 + i, reps: 100, createdAt: w.inicio + j * 1000 })))
    }
    await importarBackup(JSON.stringify(fixture))
    const pesos = await import('/src/features/inicio/data/pesosRepo.ts')
    for (let i = 0; i < (estado === 'extremo' ? 40 : 10); i++) await pesos.registrar(addDays(hoy, -i * 2), 74 + i * 0.15)
  }, { fixture, estado })
}

async function validarLayout(page, nombre, captura = true) {
  await page.waitForTimeout(250)
  const diagnostico = await page.evaluate(() => {
    const visible = el => el.getClientRects().length && !el.closest('[hidden],[inert]')
    const contenedores = [...document.querySelectorAll('html,main,[role="dialog"],.modal-viewport')].filter(visible)
    const overflow = contenedores.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => `${el.tagName}:${el.className}`)
    const tacto = [...document.querySelectorAll('button,[role="tab"],[role="radio"]')].filter(visible).filter(el => el.getBoundingClientRect().height < 43.9).map(el => `${el.textContent}/${el.getAttribute('aria-label')}`)
    const rotulos = [...document.querySelectorAll('[role=radio]')].filter(visible).filter(el => el.getBoundingClientRect().height > 53).map(el => el.textContent)
    const campos = [...document.querySelectorAll('input:not([type="checkbox"]):not([type="file"]),select,textarea')].filter(visible).filter(el => parseFloat(getComputedStyle(el).fontSize) < 16).map(el => el.outerHTML)
    const dialogo = document.querySelector('[role="dialog"]:not([inert])')
    const nav = document.querySelector('nav[aria-label="Navegación principal"]')
    const pie = dialogo?.querySelector('footer')
    const fuera = pie && (pie.getBoundingClientRect().bottom > innerHeight + 1 || pie.getBoundingClientRect().top < 0)
    const navFuera = !dialogo && nav && Math.abs(nav.getBoundingClientRect().bottom - innerHeight) > 1
    return { overflow, tacto, rotulos, campos, fuera: !!fuera, navFuera: !!navFuera }
  })
  assert.deepEqual(diagnostico, { overflow: [], tacto: [], rotulos: [], campos: [], fuera: false, navFuera: false }, nombre)
  await page.mouse.move(0, 0)
  if (captura) await page.screenshot({ path: path.join(salida, nombre + '.png'), animations: 'disabled' })
  resultados.push(nombre)
}
const pestaña = (page, nombre) => page.getByRole('tab', { name: nombre, exact: true }).click()
async function cerrar(page) { await page.keyboard.press('Escape'); await page.waitForTimeout(250) }
async function entradas(page) { return page.evaluate(async () => { const r = await import('/src/features/nutricion/data/entriesRepo.ts'); const d = await import('/src/shared/lib/dates.ts'); return r.delDia(d.todayISO()) }) }
async function backup(page) { return page.evaluate(async () => { const b = await import('/src/shared/lib/backup.ts'); const value = await b.exportarBackup(); delete value.exportedAt; return JSON.parse(JSON.stringify(value)) }) }
async function falloEscritura(page, activo) {
  await page.evaluate(activo => {
    if (activo) {
      window.__appfitAddOriginal = IDBObjectStore.prototype.add
      IDBObjectStore.prototype.add = function () { throw new DOMException('Fallo de prueba', 'QuotaExceededError') }
    } else IDBObjectStore.prototype.add = window.__appfitAddOriginal
  }, activo)
}

async function matriz(browser) {
  for (const width of [320, 375, 430]) for (const colorScheme of ['light', 'dark']) for (const estado of ['vacio', 'normal', 'extremo']) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : width === 375 ? 812 : 932 }, colorScheme, reducedMotion: 'reduce' })
    await context.route('**/world.openfoodfacts.org/**', route => route.abort())
    // La matriz no necesita el catálogo. El recorrido funcional sí lo instala explícitamente.
    await context.route(ORIGEN + '/catalogo/**', route => route.abort())
    const page = await context.newPage()
    const errores = []
    page.on('pageerror', e => errores.push(e.message))
    await page.goto(ORIGEN)
    await page.getByRole('heading', { name: /Buenos|Buenas/ }).waitFor()
    await preparar(page, estado)
    const id = `${width}-${colorScheme}-${estado}`
    await validarLayout(page, id + '-inicio')
    await page.getByRole('button', { name: 'Registrar', exact: true }).click()
    await validarLayout(page, id + '-peso-form'); await cerrar(page)
    await page.getByRole('button', { name: 'Historial de peso', exact: true }).click()
    await validarLayout(page, id + '-peso-historial'); await cerrar(page)
    await navegar(page, 'Nutrición'); await validarLayout(page, id + '-nutricion')
    await page.locator('main').evaluate(el => el.scrollTo(0, el.scrollHeight)); await validarLayout(page, id + '-nutricion-final')
    await pestaña(page, 'Resumen'); await validarLayout(page, id + '-semana')
    await page.getByRole('radio', { name: 'Mes', exact: true }).click(); await validarLayout(page, id + '-mes')
    if (estado !== 'vacio') { await page.getByRole('radio', { name: 'Proteína', exact: true }).click(); await validarLayout(page, id + '-mes-proteina'); await page.getByRole('button', { name: 'Ver datos del periodo', exact: true }).scrollIntoViewIfNeeded(); await validarLayout(page, id + '-mes-grafica'); await page.getByRole('button', { name: 'Ver datos del periodo', exact: true }).click(); await validarLayout(page, id + '-mes-datos') }
    await pestaña(page, 'Alimentos'); await validarLayout(page, id + '-alimentos')
    await page.getByRole('button', { name: 'Nuevo', exact: true }).click(); await validarLayout(page, id + '-alimento-form'); await cerrar(page)
    await page.getByRole('radio', { name: 'Plantillas', exact: true }).click(); await validarLayout(page, id + '-plantillas')
    await page.getByRole('button', { name: 'Añadir comida', exact: true }).click(); await validarLayout(page, id + '-anadir')
    await pestaña(page, 'Buscar'); await validarLayout(page, id + '-buscar')
    await pestaña(page, 'Plantillas'); await validarLayout(page, id + '-aplicar-plantillas')
    await page.getByRole('button', { name: 'Solo registrar calorías', exact: true }).click(); await validarLayout(page, id + '-kcal'); await cerrar(page); await cerrar(page)
    await navegar(page, 'Gym'); await validarLayout(page, id + '-gym')
    for (const sub of ['Rutinas', 'Historial', 'Progreso']) {
      await pestaña(page, sub)
      if (sub === 'Progreso' && estado !== 'vacio') await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption('1')
      await validarLayout(page, id + '-' + sub); if (sub === 'Progreso' && estado === 'extremo') { await page.getByRole('button', { name: /^Ver .*sesiones$/ }).scrollIntoViewIfNeeded(); await validarLayout(page, id + '-gym-graficas') }
    }
    await pestaña(page, 'Rutinas'); await page.getByRole('button', { name: 'Nueva rutina', exact: true }).click(); await validarLayout(page, id + '-rutina-form'); await cerrar(page)
    await navegar(page, 'Ajustes'); await validarLayout(page, id + '-ajustes')
    for (const titulo of ['Dónde se guardan tus registros', 'Instalación y traslado de registros', 'Fuentes, licencias y mantenimiento']) { await page.getByRole('button', { name: titulo, exact: true }).click(); await validarLayout(page, id + '-' + titulo, false) }
    assert.deepEqual(errores, [], id)
    console.log('Matriz:', id)
    await context.close()
  }
}

async function flujos(browser, colorScheme) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, colorScheme, reducedMotion: 'reduce' })
  await context.addInitScript(() => {
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Cámara simulada', 'NotFoundError') }
  })
  await context.route('**/world.openfoodfacts.org/**', async route => { await new Promise(r => setTimeout(r, 250)); await route.fulfill({ status: 404, contentType: 'application/json', body: '{"status":0}' }) })
  const page = await context.newPage()
  const errores = []
  page.on('pageerror', e => errores.push(e.message))
  await page.goto(ORIGEN); await page.getByRole('heading', { name: /Buenos|Buenas/ }).waitFor()
  await preparar(page, 'normal')
  await page.evaluate(async () => { const c = await import('/src/features/nutricion/lib/catalogo/sincronizar.ts'); await c.sincronizarCatalogo() })
  const tag = 'flujo-' + colorScheme
  await page.getByRole('button', { name: 'Registrar', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Peso', exact: true }).fill('999')
  await page.locator('[role=dialog]:not([inert])').getByRole('button', { name: 'Guardar', exact: true }).click()
  await page.getByText(/Introduce un peso entre/).waitFor(); await validarLayout(page, tag + '-peso-error')
  await page.getByRole('spinbutton', { name: 'Peso', exact: true }).fill('75.2')
  await page.locator('[role=dialog]:not([inert])').getByRole('button', { name: 'Guardar', exact: true }).click()
  await page.waitForFunction(() => !document.querySelector('[role=dialog]'))
  assert.ok((await backup(page)).pesos.some(p => p.kg === 75.2))
  // Atajo de Inicio, aislamiento de capas y teclado.
  await page.getByRole('button', { name: 'Registrar comida', exact: true }).click()
  assert.equal(await page.locator('[data-app-shell]').getAttribute('inert'), '')
  await page.getByRole('button', { name: 'Medidas que se entienden', exact: true }).click()
  assert.equal(await page.locator('[role="dialog"][inert]').count(), 1)
  await validarLayout(page, tag + '-medidas'); await cerrar(page)
  assert.equal(await page.locator('[role="dialog"]:not([inert])').count(), 1)
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Medidas que se entienden')
  await page.getByRole('tab', { name: 'Describir', exact: true }).focus(); await page.keyboard.press('ArrowRight')
  assert.equal(await page.getByRole('tab', { name: 'Buscar', exact: true }).getAttribute('aria-selected'), 'true')
  await page.keyboard.press('Home')
  await page.getByRole('radio', { name: 'Cena', exact: true }).focus()
  await page.keyboard.press('Home'); assert.equal(await page.getByRole('radio', { name: 'Desayuno', exact: true }).getAttribute('aria-checked'), 'true')
  await page.keyboard.press('End'); await page.getByRole('radio', { name: 'Cena', exact: true }).click()
  const interpretar = async (texto, añadir = false) => { await page.getByRole('textbox', { name: 'Describe lo que has comido' }).fill(texto); await page.getByRole('button', { name: añadir ? 'Añadir a la revisión' : 'Interpretar', exact: true }).click(); await page.getByRole('button', { name: 'Detalles del alimento', exact: true }).first().waitFor() }
  await interpretar('150 g de pollo y 100 g de arroz')
  await page.getByRole('textbox', { name: 'Nombre del plato (opcional)' }).fill('Pollo con arroz · cena')
  assert.equal(await page.getByRole('textbox', { name: 'Nombre del alimento', exact: true }).count(), 0)
  await page.getByRole('button', { name: 'Añadir otro alimento', exact: true }).click(); await interpretar('una manzana', true)
  await validarLayout(page, tag + '-revision')
  await page.getByRole('button', { name: /^Guardar ·/ }).click(); await page.waitForFunction(() => !document.querySelector('[role=dialog]'))
  const guardadas = await entradas(page)
  assert.equal(guardadas.length, 7); assert.equal(new Set(guardadas.slice(-3).map(e => e.platoId)).size, 1)
  const cena = page.getByRole('region', { name: 'Cena', exact: true })
  await cena.getByRole('button', { name: /^Pollo con arroz · cena .*ingredientes/ }).click()
  await validarLayout(page, tag + '-plato-abierto')
  await cena.getByRole('button', { name: 'Borrar plato Pollo con arroz · cena', exact: true }).click()
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click(); assert.deepEqual(await entradas(page), guardadas)
  // Claves estables: borrar el primer ítem no desplaza el borrador del segundo.
  await page.getByRole('button', { name: 'Añadir comida', exact: true }).click(); await interpretar('150 g de pollo y 100 g de arroz')
  await page.getByRole('button', { name: 'Detalles del alimento', exact: true }).nth(1).click()
  await page.getByRole('button', { name: /Personalizar nombre en Nutrición/ }).click()
  await page.getByRole('textbox', { name: 'Nombre que se verá en Nutrición', exact: true }).fill('Arroz de casa')
  await page.getByRole('button', { name: /^Quitar / }).first().click()
  assert.equal(await page.getByRole('textbox', { name: 'Nombre que se verá en Nutrición', exact: true }).inputValue(), 'Arroz de casa')
  assert.equal(await page.getByRole('button', { name: /^Guardar ·/ }).isDisabled(), true)
  await page.getByRole('button', { name: 'Guardar nombre', exact: true }).click()
  await page.getByRole('button', { name: /^Guardar ·/ }).click(); await page.waitForFunction(() => !document.querySelector('[role=dialog]'))
  assert.ok((await backup(page)).nombresAlimentos.some(e => e.nombre === 'Arroz de casa'))
  // Validación de alimento desconocido, cantidades y errores locales.
  await page.getByRole('button', { name: 'Añadir comida', exact: true }).click(); await interpretar('100 g de comida inventada de prueba')
  await page.getByRole('textbox', { name: 'Nombre del alimento', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: /^Guardar ·/ }).isDisabled(), true)
  await validarLayout(page, tag + '-desconocido'); await cerrar(page)
  await page.getByRole('button', { name: 'Añadir comida', exact: true }).click(); await pestaña(page, 'Buscar')
  await page.getByRole('searchbox', { name: 'Buscar en tus alimentos y en el catálogo', exact: true }).fill('yogur natural')
  await page.getByRole('dialog', { name: 'Añadir comida', exact: true }).getByRole('button', { name: /^Yogur natural/ }).first().click()
  await page.getByRole('spinbutton', { name: 'gramos', exact: true }).fill('200')
  await validarLayout(page, tag + '-cantidad-busqueda')
  const antesFallo = await backup(page)
  await falloEscritura(page, true)
  await page.locator('[role=dialog]:not([inert])').getByRole('button', { name: 'Añadir', exact: true }).click()
  await page.getByText('No se ha podido guardar. Inténtalo de nuevo.', { exact: true }).waitFor()
  await validarLayout(page, tag + '-error-guardado'); assert.deepEqual(await backup(page), antesFallo)
  await falloEscritura(page, false)
  await page.locator('[role=dialog]:not([inert])').getByRole('button', { name: 'Añadir', exact: true }).click(); await page.waitForFunction(() => !document.querySelector('[role=dialog]'))
  await page.getByRole('button', { name: 'Añadir comida', exact: true }).click(); await pestaña(page, 'Buscar')
  await page.getByRole('button', { name: 'Escanear código de barras', exact: true }).click()
  await page.getByLabel('O escribe el código', { exact: true }).fill('1')
  await page.locator('[role=dialog]:not([inert])').getByRole('button', { name: 'Buscar', exact: true }).click()
  await page.getByText(/Ese código no es válido/).waitFor(); await validarLayout(page, tag + '-codigo-invalido')
  await page.getByLabel('O escribe el código', { exact: true }).fill('8410000000000')
  await page.locator('[role=dialog]:not([inert])').getByRole('button', { name: 'Buscar', exact: true }).click()
  await page.getByText('Buscando el producto…', { exact: true }).waitFor()
  await page.getByText(/no está en Open Food Facts/).waitFor(); await validarLayout(page, tag + '-codigo-no-encontrado')
  await cerrar(page); await cerrar(page)
  // Copia y plantillas por UI.
  await cena.getByRole('button', { name: /Acciones de cena/i }).click()
  await page.getByRole('button', { name: 'Guardar como plantilla…', exact: true }).click()
  await page.getByLabel('Nombre de la plantilla', { exact: true }).fill('Cena habitual')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click(); await page.waitForFunction(() => !document.querySelector('[role=dialog]'))
  await page.getByRole('button', { name: 'Añadir comida', exact: true }).click(); await pestaña(page, 'Plantillas')
  await page.getByRole('button', { name: /Cena habitual/ }).click(); await validarLayout(page, tag + '-plantilla-aplicar')
  await page.locator('[role=dialog]:not([inert])').getByRole('button', { name: /^Añadir a / }).click()
  await page.waitForFunction(() => !document.querySelector('[role=dialog]'))
  assert.ok((await entradas(page)).length > guardadas.length)
  await pestaña(page, 'Alimentos'); await page.getByRole('radio', { name: 'Plantillas', exact: true }).click()
  await page.getByRole('button', { name: /Cena habitual/ }).click(); await page.getByRole('button', { name: 'Borrar plantilla', exact: true }).click()
  await validarLayout(page, tag + '-plantilla-confirmar'); await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); await cerrar(page)
  await pestaña(page, 'Hoy'); await page.getByRole('button', { name: 'Copiar el día', exact: true }).click()
  const ayer = await page.evaluate(async () => { const d = await import('/src/shared/lib/dates.ts'); return d.addDays(d.todayISO(), -1) })
  await page.getByLabel('Fecha de destino', { exact: true }).fill(ayer)
  const antesCopia = await backup(page)
  await falloEscritura(page, true)
  await page.locator('[role=dialog]:not([inert])').getByRole('button', { name: 'Copiar', exact: true }).click()
  await page.getByText('No se ha podido copiar el día. Inténtalo de nuevo.', { exact: true }).waitFor()
  await validarLayout(page, tag + '-copiar-error'); assert.deepEqual(await backup(page), antesCopia)
  await falloEscritura(page, false)
  await page.locator('[role=dialog]:not([inert])').getByRole('button', { name: 'Copiar', exact: true }).click()
  await page.waitForFunction(() => !document.querySelector('[role=dialog]'))
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click(); assert.deepEqual(await backup(page), antesCopia)
  await validarLayout(page, tag + '-copiar')
  // Series directas, persistencia del entreno activo y finalizar.
  await navegar(page, 'Gym'); await page.getByRole('button', { name: 'Desde rutina', exact: true }).click(); await page.getByRole('button', { name: 'Full body', exact: true }).click()
  await page.getByRole('button', { name: 'Añadir serie', exact: true }).first().click()
  await page.getByRole('spinbutton', { name: 'Repeticiones, serie 1 de Press banca', exact: true }).fill('12')
  const pesoSerie = page.getByRole('spinbutton', { name: 'Peso en kg, serie 1 de Press banca', exact: true }); await pesoSerie.fill(''); await pesoSerie.pressSequentially('72.5', { delay: 80 }); await page.waitForTimeout(200); assert.equal(await pesoSerie.inputValue(), '72.5')
  await validarLayout(page, tag + '-entreno-activo')
  await page.getByRole('button', { name: 'Borrar serie 1', exact: true }).click(); await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
  await page.reload(); await navegar(page, 'Gym')
  assert.equal(await page.getByRole('spinbutton', { name: 'Peso en kg, serie 1 de Press banca', exact: true }).inputValue(), '72.5')
  await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click(); await validarLayout(page, tag + '-ejercicio'); await cerrar(page)
  await page.getByRole('button', { name: 'Terminar', exact: true }).click()
  await pestaña(page, 'Historial'); await page.getByRole('list', { name: 'Entrenos terminados' }).getByRole('button').first().click(); await validarLayout(page, tag + '-entreno-detalle'); await cerrar(page)
  await pestaña(page, 'Progreso'); await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption('1'); await validarLayout(page, tag + '-progreso')
  await pestaña(page, 'Rutinas'); await page.getByRole('button', { name: 'Full body', exact: false }).click(); await page.getByRole('button', { name: 'Borrar', exact: true }).click(); await validarLayout(page, tag + '-rutina-confirmar'); await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); await cerrar(page)
  // Tema persistente, importación inválida/cancelada y exportación real.
  await navegar(page, 'Ajustes'); await page.getByRole('radio', { name: colorScheme === 'light' ? 'Oscuro' : 'Claro', exact: true }).click()
  await page.reload(); await navegar(page, 'Ajustes')
  assert.equal(await page.locator('html').getAttribute('data-theme'), colorScheme === 'light' ? 'dark' : 'light')
  await page.getByRole('radio', { name: 'Sistema', exact: true }).click()
  const antes = await backup(page)
  await page.locator('input[type="file"]').setInputFiles({ name: 'invalido.json', mimeType: 'application/json', buffer: Buffer.from('{mal') })
  await page.getByText('El archivo no es un JSON válido.', { exact: true }).waitFor(); assert.deepEqual(await backup(page), antes)
  await page.locator('input[type="file"]').setInputFiles({ name: 'copia.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(antes)) })
  await page.getByRole('group', { name: 'Confirmar importación', exact: true }).getByRole('button', { name: 'Cancelar', exact: true }).click(); assert.deepEqual(await backup(page), antes)
  const descarga = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportar', exact: true }).click(); const archivo = await descarga
  const exportado = JSON.parse(fs.readFileSync(await archivo.path(), 'utf8')); delete exportado.exportedAt; assert.deepEqual(exportado, antes)
  // Teclado abierto simulado: tamaño visible, footer y scroll del formulario.
  await navegar(page, 'Nutrición'); await page.getByRole('button', { name: 'Añadir comida', exact: true }).click(); await interpretar('150 g de pollo')
  await page.setViewportSize({ width: 375, height: 430 }); await validarLayout(page, tag + '-teclado')
  await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]:not([inert])')), true)
  await cerrar(page); assert.equal(await page.locator('[data-app-shell]').getAttribute('inert'), null)
  assert.deepEqual(errores, [], tag)
  console.log('Flujos:', tag)
  await context.close()
}


async function estresModales(browser) {
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 320, height: 568 }, colorScheme, reducedMotion: 'reduce' })
    await context.route(ORIGEN + '/catalogo/**', r => r.abort())
    const page = await context.newPage(); await page.goto(ORIGEN); await page.getByRole('heading', { name: /Buenos|Buenas/ }).waitFor()
    await preparar(page, 'extremo')
    await page.evaluate(async () => {
      const e = await import('/src/features/nutricion/data/entriesRepo.ts')
      const m = await import('/src/features/nutricion/data/mealsRepo.ts')
      const d = await import('/src/shared/lib/dates.ts')
      await m.crearDesdeEntradas({ nombre: 'Mi plantilla habitual con todos los ingredientes de una comida completa y un nombre que necesita varias líneas para verse entero', comida: 'cena', entries: await e.delDia(d.todayISO()) })
    })
    const tag = 'modales-320-' + colorScheme
    await navegar(page, 'Nutrición'); await page.getByRole('button', { name: 'Añadir comida', exact: true }).click(); await pestaña(page, 'Buscar')
    await page.getByRole('dialog', { name: 'Añadir comida', exact: true }).getByRole('button', { name: /^Alimento con una descripción/ }).first().click()
    await validarLayout(page, tag + '-nombre-largo')
    await page.setViewportSize({ width: 320, height: 360 }); await page.getByRole('spinbutton', { name: 'gramos', exact: true }).focus(); await page.getByRole('spinbutton', { name: 'gramos', exact: true }).scrollIntoViewIfNeeded(); await validarLayout(page, tag + '-cantidad-teclado'); const campo = await page.getByRole('spinbutton', { name: 'gramos', exact: true }).boundingBox(); const pie = await page.locator('[role=dialog]:not([inert]) footer').boundingBox(); assert.ok(campo.y >= 0 && campo.y + campo.height <= pie.y)
    await cerrar(page); await page.setViewportSize({ width: 320, height: 568 }); await pestaña(page, 'Plantillas')
    await page.getByRole('button', { name: /^Mi plantilla habitual/ }).click(); await validarLayout(page, tag + '-plantilla-larga')
    await page.setViewportSize({ width: 320, height: 360 }); await validarLayout(page, tag + '-plantilla-teclado')
    await cerrar(page); await cerrar(page); await page.setViewportSize({ width: 320, height: 568 })
    await pestaña(page, 'Alimentos'); await page.getByRole('radio', { name: 'Plantillas', exact: true }).click()
    await page.getByRole('button', { name: /^Mi plantilla habitual/ }).click(); await validarLayout(page, tag + '-plantilla-editor')
    await page.getByRole('button', { name: 'Borrar plantilla', exact: true }).click(); await validarLayout(page, tag + '-plantilla-borrado'); await cerrar(page)
    await navegar(page, 'Gym'); await page.getByRole('button', { name: 'Desde rutina', exact: true }).click()
    await page.getByRole('button', { name: /^Rutina de entrenamiento/ }).first().click()
    for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Añadir serie', exact: true }).first().click()
    await validarLayout(page, tag + '-muchas-series'); await page.locator('main').evaluate(el => el.scrollTo(0, el.scrollHeight)); await validarLayout(page, tag + '-muchas-series-final')
    await page.setViewportSize({ width: 768, height: 1024 }); await validarLayout(page, tag + '-tablet')
    await context.close()
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  try { if (!process.env.APPFIT_UI_SOLO_FLUJOS && !process.env.APPFIT_UI_SOLO_MODALES) await matriz(browser); if (!process.env.APPFIT_UI_SOLO_MODALES) for (const tema of ['light', 'dark']) await flujos(browser, tema); if (!process.env.APPFIT_UI_SOLO_FLUJOS) await estresModales(browser); completado = true }
  finally { await browser.close(); fs.writeFileSync(path.join(salida, 'resultado.json'), JSON.stringify({ origen: ORIGEN, completado, casos: resultados }, null, 2)) }
  console.log(`${resultados.length} estados comprobados; capturas en ${salida}`)
}
main().catch(e => { console.error(e); process.exitCode = 1 })
