/* Recorrido de la navegación pública; evita que cada regresión conozca el interior de la rueda. */
async function navegar(page, nombre) {
  await page.getByRole('button', { name: 'Menú', exact: true }).click()
  await page.getByRole('dialog', { name: 'Menú', exact: true }).getByRole('button', { name: nombre, exact: true }).click()
  await page.getByRole('dialog', { name: 'Menú', exact: true }).waitFor({ state: 'detached' })
}
module.exports = { navegar }
