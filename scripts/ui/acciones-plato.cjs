/* Acceso público a acciones secundarias; no depende de que el diario las muestre siempre. */
async function ejecutarAccionPlato(page, nombre, accion, scope = page) {
  await scope.getByRole('button', { name: `Acciones del plato ${nombre}`, exact: true }).click()
  const menu = page.getByRole('dialog', { name: 'Acciones del plato', exact: true })
  await menu.getByRole('button', { name: `${accion} ${nombre}`, exact: true }).click()
  await page.getByRole('list', { name: 'Acciones disponibles del plato', exact: true }).waitFor({ state: 'detached' })
}
async function desplegarPlato(page, nombre, scope = page) {
  const fila = scope.locator('[data-plato-id]').filter({ has: page.getByRole('button', { name: `Acciones del plato ${nombre}`, exact: true }) })
  const boton = fila.locator('[data-registro="plato"] > div > button').first()
  if (await boton.getAttribute('aria-expanded') !== 'true') await boton.click()
}
module.exports = { ejecutarAccionPlato, desplegarPlato }
