/* La bienvenida de una instalación nueva (ADR 066) aparece en cada contexto efímero. Los recorridos que no la prueban la
   pasan como una persona con prisa: confirman la edad, «Empezar», «Continuar» y «Ahora no» en el perfil, así que quedan
   sin objetivo diario (`Settings.sinObjetivos`) salvo que importen un backup con sus ajustes. Se activa al cargar
   `navegar.cjs` (o este archivo): envuelve `launch` de Playwright para que cada página nueva tenga el manejador.
   `APPFIT_UI_CON_BIENVENIDA=1` lo desactiva, para los recorridos que prueban la propia bienvenida. */
const playwright = require('playwright')

async function pasarBienvenida(page) {
  const capa = page.locator('[data-paso-bienvenida]')
  for (let i = 0; i < 8 && await capa.isVisible().catch(() => false); i++) {
    const casilla = page.getByRole('checkbox', { name: /años o más/ })
    if (await casilla.isVisible().catch(() => false) && !(await casilla.isChecked())) await casilla.check()
    const ahoraNo = page.getByRole('dialog').getByRole('button', { name: 'Ahora no', exact: true })
    const boton = await ahoraNo.isVisible().catch(() => false) ? ahoraNo
      : page.getByRole('dialog').getByRole('button', { name: /^(Empezar|Continuar|Empezar a usar Cumbra Fit)$/ })
    await boton.click()
    await page.waitForTimeout(50)
  }
}

const capa = (page) => page.locator('[data-paso-bienvenida]').first()

function conManejador(page) {
  if (process.env.APPFIT_UI_CON_BIENVENIDA === '1') return
  page.__bienvenidaManejador = page.addLocatorHandler(capa(page), () => pasarBienvenida(page)).catch(() => undefined)
}

/**
 * Pasarla ya, sin esperar al primer clic del recorrido. El manejador se retira mientras tanto: si no, el primer clic de
 * aquí lo dispararía y los dos la pasarían a la vez (uno se quedaría esperando un botón que el otro ya pulsó).
 */
async function pasarBienvenidaAhora(page) {
  const conManejadorPuesto = page.__bienvenidaManejador !== undefined
  if (conManejadorPuesto) { await page.__bienvenidaManejador; await page.removeLocatorHandler(capa(page)) }
  try {
    await pasarBienvenida(page)
    await capa(page).waitFor({ state: 'detached' })
  } finally {
    if (conManejadorPuesto) conManejador(page)
  }
}

function envolverContexto(context) {
  if (context.__bienvenida) return context
  context.__bienvenida = true
  for (const p of context.pages()) conManejador(p)
  context.on('page', conManejador)
  return context
}

function envolverNavegador(browser) {
  if (browser.__bienvenida) return browser
  browser.__bienvenida = true
  const newContext = browser.newContext.bind(browser)
  browser.newContext = async (...args) => envolverContexto(await newContext(...args))
  const newPage = browser.newPage.bind(browser)
  browser.newPage = async (...args) => { const page = await newPage(...args); envolverContexto(page.context()); return page }
  return browser
}

for (const nombre of ['chromium', 'firefox', 'webkit']) {
  const tipo = playwright[nombre]
  if (!tipo || tipo.__bienvenida) continue
  tipo.__bienvenida = true
  const launch = tipo.launch.bind(tipo)
  tipo.launch = async (...args) => envolverNavegador(await launch(...args))
  const persistente = tipo.launchPersistentContext.bind(tipo)
  tipo.launchPersistentContext = async (...args) => envolverContexto(await persistente(...args))
}

module.exports = { pasarBienvenida, pasarBienvenidaAhora }
