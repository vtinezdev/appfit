/* Artefacto de producción + offline, en un perfil efímero de datos sintéticos. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const origin = 'http://appfit-test.localhost:5174'
const fixture = JSON.parse(fs.readFileSync('src/test/fixtures/backup-v1.json', 'utf8'))
function normalize(value) { delete value.exportedAt; delete value.dbVersion; value.nombresAlimentos ??= []; return value }
async function exportData(page) {
  await navegar(page, 'Ajustes')
  const promise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar', exact: true }).click()
  return normalize(JSON.parse(fs.readFileSync(await (await promise).path(), 'utf8')))
}
async function main() {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' })
  try {
    await context.route('**/world.openfoodfacts.org/**', r => r.abort())
    const page = await context.newPage()
    const errors = []; page.on('pageerror', e => errors.push(e.message))
    await page.goto(origin)
    await page.getByRole('button', { name: 'Menú', exact: true }).waitFor()
    await navegar(page, 'Ajustes')
    await page.locator('input[type=file]').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) })
    await page.getByRole('group', { name: 'Confirmar importación', exact: true }).getByRole('button', { name: 'Importar copia', exact: true }).click()
    await page.getByText('Copia importada correctamente.', { exact: true }).waitFor()
    const before = await exportData(page)
    for (const tab of ['Inicio', 'Nutrición', 'Gym', 'Ajustes']) {
      await navegar(page, tab)
      if (tab === 'Nutrición') { await page.getByRole('tab', { name: 'Resumen', exact: true }).click(); await page.getByRole('radio', { name: 'Mes', exact: true }).waitFor() }
      if (tab === 'Gym') { await page.getByRole('tab', { name: 'Progreso', exact: true }).click(); await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption('1') }
    }
    await page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; await registration.update() })
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
    await context.setOffline(true)
    await page.reload()
    await page.getByRole('button', { name: 'Menú', exact: true }).waitFor()
    assert.deepEqual(await exportData(page), before, 'recarga offline conserva todas las tablas')
    for (const theme of ['Claro', 'Oscuro']) {
      await page.getByRole('radio', { name: theme, exact: true }).click()
      for (const tab of ['Inicio', 'Nutrición', 'Gym', 'Referencias', 'Ajustes']) {
        await navegar(page, tab)
        if (tab === 'Nutrición') { await page.getByRole('tab', { name: 'Resumen', exact: true }).click(); await page.getByRole('radio', { name: 'Mes', exact: true }).waitFor() }
        if (tab === 'Gym') { await page.getByRole('tab', { name: 'Progreso', exact: true }).click(); await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption('1') }
        if (tab === 'Referencias') {
          await page.getByRole('button', { name: /Objetivos nutricionales/ }).click()
          await page.locator('[data-referencia="fibra"] button').click()
          await page.getByText('≥ 25 g/día', { exact: true }).waitFor()
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      }
      assert.deepEqual(await exportData(page), before)
    }
    await page.evaluate(() => document.fonts.ready)
    assert.equal(await page.evaluate(() => Array.from(document.fonts).some(f => f.family === 'Manrope' && f.status === 'loaded')), true)
    assert.deepEqual(errors, [])
    console.log('Build: SW, recarga offline, Manrope local, todos los destinos, chunks diferidos y export íntegro en ambos temas: correcto.')
  } finally { await context.close(); await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
