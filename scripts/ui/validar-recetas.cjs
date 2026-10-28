/* Prototipo de recetas con preparación: cuatro recetas sintéticas (corta, larga, muchas raciones, antigua sin preparación). */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const origen = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-recetas'

async function captura(page, nombre) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))))
  const problemas = await page.evaluate(() => {
    const visibles = [...document.querySelectorAll('button,input,textarea,[role="dialog"]')].filter(e => e.getClientRects().length && !e.closest('[inert]'))
    return {
      overflow: document.documentElement.scrollWidth > innerWidth || visibles.some(e => e.scrollWidth > e.clientWidth + 1 && !e.matches('input,textarea')),
      tacto: visibles.filter(e => e.matches('button') && (e.getBoundingClientRect().height < 43.9 || e.getBoundingClientRect().width < 43.9)).map(e => e.textContent || e.getAttribute('aria-label')),
      campos: visibles.filter(e => e.matches('input,textarea') && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.getAttribute('aria-label') || e.name || e.type),
    }
  })
  assert.deepEqual(problemas, { overflow: false, tacto: [], campos: [] }, nombre)
  await page.screenshot({ path: path.join(salida, `${nombre}.png`) })
}

/** Siembra las recetas con los repos reales (valida y crea su alimento como en la app). */
async function sembrar(page) {
  await page.evaluate(async () => {
    const recetas = await import('/src/features/nutricion/data/recetasRepo.ts')
    // gramos y aporte de esa cantidad
    const i = (nombre, gramos, kcal, prot, carb, grasa) => ({ nombre, gramos, kcal, prot, carb, grasa })
    const categoria = 'Platos preparados'
    await recetas.crear({
      nombre: 'Tortilla francesa', categoria, pesoCocinadoG: 120, raciones: 1, tiempoMin: 5,
      ingredientes: [i('Huevo', 120, 172, 15, 0.8, 12), i('Aceite de oliva virgen extra', 5, 45, 0, 0, 5), i('Sal', 1, 0, 0, 0, 0)],
      pasos: ['Bate los huevos con la sal hasta que espumen.', 'Calienta el aceite en una sartén pequeña a fuego medio, vierte el huevo y dobla la tortilla cuando cuaje por abajo.'],
    })
    await recetas.crear({
      nombre: 'Lentejas estofadas con chorizo y verduras de la abuela', categoria, pesoCocinadoG: 2400, raciones: 4, tiempoMin: 75,
      ingredientes: [
        i('Lentejas pardinas', 320, 1005, 76.8, 153.6, 5.8), i('Chorizo para guisar', 150, 683, 36, 3, 58), i('Patata', 300, 231, 6, 51, 0.3), i('Zanahoria', 150, 62, 1.4, 14, 0.4),
        i('Cebolla', 120, 48, 1.3, 11, 0.1), i('Ajo', 10, 15, 0.6, 3.3, 0), i('Aceite de oliva virgen extra', 30, 270, 0, 0, 30), i('Pimentón dulce de la Vera', 5, 14, 0.7, 2.7, 0.6),
      ],
      pasos: [
        'Lava las lentejas en un colador con agua fría y quita las piedrecitas o las que floten. Las pardinas no necesitan remojo.',
        'Pela y pica la cebolla y los ajos muy finos; pela la zanahoria y córtala en rodajas de medio centímetro.',
        'Calienta el aceite en una olla grande a fuego medio y sofríe la cebolla y el ajo unos ocho minutos, hasta que estén transparentes y blanditos, sin que lleguen a dorarse.',
        'Añade el chorizo en rodajas y rehógalo dos minutos para que suelte la grasa y el color.',
        'Aparta la olla del fuego, añade el pimentón y remueve rápido para que no se queme ni amargue.',
        'Incorpora las lentejas, la zanahoria y agua fría hasta cubrir dos dedos por encima. Lleva a ebullición y baja a fuego suave.',
        'A los veinticinco minutos añade la patata chascada (cortada a medias y rompiendo el último trozo, para que suelte almidón y espese el caldo) y cuece otros veinte o veinticinco minutos.',
        'Prueba de sal, apaga el fuego y deja reposar tapado diez minutos antes de servir.',
      ],
      notas: 'Están más ricas al día siguiente. En la nevera aguantan tres o cuatro días en un táper cerrado, y se pueden congelar sin la patata.',
    })
    await recetas.crear({
      nombre: 'Bizcocho de yogur', categoria: 'Galletas, bollería y pasteles', pesoCocinadoG: 800, raciones: 12, tiempoMin: 45,
      ingredientes: [
        i('Yogur natural', 125, 77, 4.4, 5.9, 4), i('Azúcar', 180, 720, 0, 180, 0), i('Harina de trigo', 240, 874, 24, 183, 2.4), i('Huevo', 180, 258, 22.6, 1.3, 17.8),
        i('Aceite de girasol', 60, 530, 0, 0, 60), i('Levadura química', 16, 8, 0, 4, 0), i('Ralladura de limón', 5, 2, 0, 0.5, 0),
      ],
      pasos: ['Precalienta el horno a 180 °C con calor arriba y abajo.', 'Bate los huevos con el azúcar hasta que doblen su volumen.', 'Añade el yogur, el aceite y la ralladura y mezcla.', 'Incorpora la harina y la levadura tamizadas, con movimientos envolventes.', 'Hornea 35 minutos en un molde engrasado; está hecho cuando un palillo sale limpio.'],
    })
    // Como las recetas de antes de la preparación: sin raciones, pasos, tiempo ni notas.
    await recetas.crear({
      nombre: 'Arroz con pollo', categoria, pesoCocinadoG: 800,
      ingredientes: [i('Arroz', 200, 700, 14, 156, 2), i('Pechuga de pollo', 300, 330, 69, 0, 4)],
    })
  })
}

async function abrirReceta(page, nombre) {
  await page.getByRole('list', { name: 'Tus recetas' }).getByRole('button', { name: new RegExp(`^${nombre}`) }).click()
  const ficha = page.getByRole('dialog', { name: 'Receta', exact: true })
  await ficha.getByRole('heading', { name: nombre }).waitFor()
  return ficha
}
async function cerrar(page, dialogo) {
  await dialogo.getByRole('button', { name: 'Volver', exact: true }).click()
  await dialogo.waitFor({ state: 'detached' })
}

async function main() {
  fs.mkdirSync(salida, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const vistas = [320, 375, 430].flatMap(width => ['light', 'dark'].map(colorScheme => ({ width, colorScheme })))
  try {
    for (const vista of vistas) {
      const etiqueta = `${vista.width}-${vista.colorScheme}`
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== etiqueta) continue
      const height = { 320: 568, 375: 812, 430: 932 }[vista.width]
      const context = await browser.newContext({ viewport: { width: vista.width, height }, colorScheme: vista.colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block', locale: 'es-ES', timezoneId: 'Europe/Madrid' })
      try {
        await context.route('**/world.openfoodfacts.org/**', r => r.abort())
        const page = await context.newPage()
        const errores = []
        page.on('pageerror', e => errores.push(e.message))
        await page.goto(origen)
        await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
        // Sin recetas tuyas: estado vacío con sus dos salidas.
        await navegar(page, 'Recetas')
        await page.getByText('Aún no tienes recetas', { exact: true }).waitFor()
        await page.getByRole('button', { name: 'Ver las de AppFit', exact: true }).waitFor()
        await captura(page, `${etiqueta}-vacio`)
        await sembrar(page)

        // Rejilla de secciones con Recetas: ocho secciones, dos filas de cuatro.
        await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Secciones', exact: true }).click()
        const rejilla = page.getByRole('dialog', { name: 'Secciones', exact: true })
        await rejilla.getByRole('button', { name: 'Recetas', exact: true }).waitFor()
        await captura(page, `${etiqueta}-rejilla`)
        await page.keyboard.press('Escape')
        await rejilla.waitFor({ state: 'detached' })

        // Acceso desde la cabecera de Nutrición.
        await navegar(page, 'Nutrición')
        const acceso = page.getByRole('main').getByRole('button', { name: 'Recetas', exact: true })
        await acceso.waitFor()
        await page.getByRole('main').getByText('Cargando…').waitFor({ state: 'detached' })
        await captura(page, `${etiqueta}-nutricion-cabecera`)
        await acceso.click()
        await page.getByRole('heading', { name: 'Recetas', level: 1 }).waitFor()
        await page.getByRole('list', { name: 'Tus recetas' }).getByRole('button').nth(3).waitFor()
        await captura(page, `${etiqueta}-lista`)
        // Pestaña AppFit: buscador con «Filtrar» y el total encima de la lista; se vuelve a Tuyas.
        await page.getByRole('tab', { name: 'AppFit', exact: true }).click()
        await page.getByRole('searchbox', { name: 'Buscar en el recetario AppFit' }).or(page.getByText('El recetario aún no está descargado')).waitFor()
        await captura(page, `${etiqueta}-appfit`)
        await page.getByRole('tab', { name: 'Tuyas', exact: true }).click()
        await page.getByRole('list', { name: 'Tus recetas' }).waitFor()

        // Larga: arriba y abajo.
        let ficha = await abrirReceta(page, 'Lentejas estofadas')
        await captura(page, `${etiqueta}-ficha-larga-arriba`)
        // Recalcular para 2 raciones: la mitad.
        await ficha.getByRole('button', { name: 'Reducir raciones', exact: true }).click()
        await ficha.getByRole('button', { name: 'Reducir raciones', exact: true }).click()
        await ficha.getByText('para 4 raciones', { exact: true }).waitFor()
        assert.ok(await ficha.getByRole('list', { name: 'Ingredientes' }).getByRole('listitem').filter({ hasText: 'Lentejas pardinas' }).getByText('160 g').isVisible())
        await ficha.getByRole('list', { name: 'Ingredientes' }).getByRole('listitem').filter({ hasText: 'Pimentón' }).scrollIntoViewIfNeeded()
        await captura(page, `${etiqueta}-ficha-larga-ingredientes`)
        await ficha.getByText(/Están más ricas al día siguiente/).scrollIntoViewIfNeeded()
        await captura(page, `${etiqueta}-ficha-larga-abajo`)

        // Editor con pasos.
        await ficha.getByRole('button', { name: 'Editar', exact: true }).click()
        const editor = page.getByRole('dialog', { name: 'Editar receta', exact: true })
        await editor.getByRole('textbox', { name: 'Paso 1', exact: true }).waitFor()
        await editor.getByRole('region', { name: 'Preparación' }).evaluate(e => e.scrollIntoView({ block: 'start' }))
        await captura(page, `${etiqueta}-editor-pasos`)
        await editor.getByRole('button', { name: 'Quitar el paso 2', exact: true }).click()
        await editor.getByRole('status').getByText('Paso 2 quitado').waitFor()
        await editor.getByRole('button', { name: 'Deshacer', exact: true }).click()
        assert.equal(await editor.getByRole('textbox', { name: /^Paso \d+$/ }).count(), 8)
        await editor.getByRole('button', { name: 'Cancelar', exact: true }).click()
        await editor.waitFor({ state: 'detached' })
        await cerrar(page, ficha)

        // Muchas raciones y cifras grandes.
        ficha = await abrirReceta(page, 'Bizcocho de yogur')
        await captura(page, `${etiqueta}-ficha-bizcocho`)
        await cerrar(page, ficha)

        // Antigua, sin preparación: estado vacío.
        ficha = await abrirReceta(page, 'Arroz con pollo')
        await ficha.getByRole('button', { name: 'Añadir preparación', exact: true }).scrollIntoViewIfNeeded()
        await captura(page, `${etiqueta}-ficha-antigua`)
        await cerrar(page, ficha)

        // Corta: registrar una ración (120 g) en el diario.
        ficha = await abrirReceta(page, 'Tortilla francesa')
        await captura(page, `${etiqueta}-ficha-corta`)
        await ficha.getByRole('button', { name: 'Registrar una ración', exact: true }).click()
        const hoja = page.getByRole('dialog', { name: 'Registrar', exact: true })
        await hoja.getByRole('radio', { name: 'Cena', exact: true }).click()
        await captura(page, `${etiqueta}-registrar`)
        await hoja.getByRole('button', { name: /^Registrar · \d+ kcal$/ }).click()
        await hoja.waitFor({ state: 'detached' })
        await ficha.getByRole('status').getByText(/Registrado · 1 ración · Cena · Hoy/).waitFor()
        const entrada = await page.evaluate(async () => {
          const { todayISO } = await import('/src/shared/lib/dates.ts')
          return (await (await import('/src/features/nutricion/data/entriesRepo.ts')).delDia(todayISO())).map(e => ({ nombre: e.nombre, comida: e.comida, gramos: e.gramos, kcal: e.kcal }))
        })
        assert.deepEqual(entrada, [{ nombre: 'Tortilla francesa', comida: 'cena', gramos: 120, kcal: 217 }])
        await cerrar(page, ficha)

        assert.deepEqual(errores, [])
        console.log(`ok ${etiqueta}`)
      } finally {
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
