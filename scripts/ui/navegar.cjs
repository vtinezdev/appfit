/* Recorrido de la navegación pública; evita que cada regresión conozca el interior de la barra. */
const EN_MAS = ['Perfil', 'Referencias', 'Ajustes']
async function navegar(page, nombre) {
  const barra = page.getByRole('navigation', { name: 'Navegación principal' })
  if (!EN_MAS.includes(nombre)) return barra.getByRole('button', { name: nombre, exact: true }).click()
  await barra.getByRole('button', { name: 'Más', exact: true }).click()
  await page.getByRole('dialog', { name: 'Más', exact: true }).getByRole('button', { name: nombre, exact: true }).click()
  await page.getByRole('dialog', { name: 'Más', exact: true }).waitFor({ state: 'detached' })
}
module.exports = { navegar }
