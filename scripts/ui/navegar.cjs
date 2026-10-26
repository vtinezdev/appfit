/* Recorrido de la navegación pública; evita que cada regresión conozca el interior de la rejilla de secciones. */
// Destinos que se abren desde su sección (ADR 043): sección y cómo se entra.
const DENTRO = {
  Amigos: ['Social', (page) => page.getByRole('main').getByRole('button', { name: 'Amigos', exact: true }).first()],
  Referencias: ['Ajustes', (page) => page.getByRole('main').getByRole('button', { name: /^Referencias/ })],
  // Progreso (B12): las cuatro son pestañas de un destino de la rejilla de secciones; Ritmo va en la pestaña Semana.
  Cumbres: ['Progreso', (page) => page.getByRole('main').getByRole('tab', { name: 'Cumbres', exact: true })],
  Caminos: ['Progreso', (page) => page.getByRole('main').getByRole('tab', { name: 'Caminos', exact: true })],
  Ritmo: ['Progreso', (page) => page.getByRole('main').getByRole('tab', { name: 'Semana', exact: true })],
  Vitrina: ['Progreso', (page) => page.getByRole('main').getByRole('tab', { name: 'Vitrina', exact: true })],
}
async function navegar(page, nombre) {
  const [seccion, entrar] = DENTRO[nombre] ?? [nombre]
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Secciones', exact: true }).click()
  const rejilla = page.getByRole('dialog', { name: 'Secciones', exact: true })
  await rejilla.getByRole('button', { name: seccion, exact: true }).click()
  await rejilla.waitFor({ state: 'detached' })
  if (entrar) await entrar(page).click()
}
module.exports = { navegar }
