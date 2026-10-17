/* Recorrido de la navegación pública; evita que cada regresión conozca el interior de la media luna. */
// Destinos que se abren desde su sección (ADR 043): sección y cómo se entra.
const DENTRO = {
  Amigos: ['Social', (page) => page.getByRole('main').getByRole('button', { name: 'Amigos', exact: true }).first()],
  Referencias: ['Ajustes', (page) => page.getByRole('main').getByRole('button', { name: /^Referencias/ })],
  Cumbres: ['Inicio', (page) => page.getByRole('list', { name: 'Tu progreso' }).getByRole('button', { name: /^Cumbres/ })],
  Caminos: ['Inicio', (page) => page.getByRole('list', { name: 'Tu progreso' }).getByRole('button', { name: /^Caminos/ })],
  Ritmo: ['Inicio', (page) => page.getByRole('list', { name: 'Tu progreso' }).getByRole('button', { name: /^Ritmo/ })],
  Vitrina: ['Inicio', (page) => page.getByRole('list', { name: 'Tu progreso' }).getByRole('button', { name: /^Vitrina/ })],
}
async function navegar(page, nombre) {
  const [seccion, entrar] = DENTRO[nombre] ?? [nombre]
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Secciones', exact: true }).click()
  const arco = page.getByRole('dialog', { name: 'Secciones', exact: true })
  await arco.getByRole('button', { name: seccion, exact: true }).click()
  await arco.waitFor({ state: 'detached' })
  if (entrar) await entrar(page).click()
}
module.exports = { navegar }
