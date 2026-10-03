/* Solo para un perfil aislado en appfit-test.localhost, con preview en 5173. */
const fs = require('node:fs')
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const profile = process.argv[2]
if (!profile) throw new Error('Uso: node scripts/ui/validar-produccion.cjs <perfil-de-pruebas> [export-esperado.json]')
const origin = 'http://appfit-test.localhost:5173'
// dbVersion es metadato del esquema; una tabla opcional vacía equivale a su ausencia en backups antiguos.
const normalizar = b => { delete b.exportedAt; delete b.dbVersion; b.nombresAlimentos ??= []; return b }
const esperado = normalizar(JSON.parse(fs.readFileSync(process.argv[3] || profile + '/registros-esperados.json', 'utf8')))
async function abrir(browser) {
 const c = await browser.launchPersistentContext(profile, { executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', viewport: {width:375,height:812}, reducedMotion:'reduce', args:['--no-sandbox','--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
 const p = c.pages()[0]; await c.route('**/world.openfoodfacts.org/**',r=>r.abort()); await p.goto(origin); return {c,p}
}
async function exportar(p) { await navegar(p, 'Ajustes'); const promesa=p.waitForEvent('download');await p.getByRole('button',{name:'Exportar',exact:true}).click(); const d=await promesa;return normalizar(JSON.parse(fs.readFileSync(await d.path(),'utf8'))) }
async function main() {
 let {c,p}=await abrir(chromium)
 try {
  await p.evaluate(async()=>{const r=await navigator.serviceWorker.ready; await r.update()})
  await p.waitForTimeout(1500); await p.reload(); await navegar(p, 'Ajustes')
  await p.getByRole('radio',{name:'Sistema',exact:true}).waitFor()
  assert.deepEqual(await exportar(p),esperado)
  await c.close(); ({c,p}=await abrir(chromium)); assert.deepEqual(await exportar(p),esperado)
  await p.evaluate(()=>document.fonts.ready); assert.equal(await p.evaluate(()=>[...document.fonts].some(f=>f.family==='Manrope' && f.status==='loaded')),true)
  await c.setOffline(true); await p.reload(); await p.getByRole('button',{name:'Menú',exact:true}).waitFor()
  assert.deepEqual(await exportar(p),esperado)
  for (const theme of ['Claro','Oscuro']) {
   await p.getByRole('radio',{name:theme,exact:true}).click()
   for(const tab of ['Inicio','Nutrición','Gym','Ajustes']) {
    await navegar(p, tab)
    if(tab==='Nutrición') { await p.getByRole('tab',{name:'Resumen',exact:true}).click(); await p.getByRole('radio',{name:'Mes',exact:true}).waitFor() }
    if(tab==='Gym') { await p.getByRole('tab',{name:'Progreso',exact:true}).click(); await p.getByRole('combobox',{name:'Ejercicio',exact:true}).selectOption('1'); await p.getByText('Peso máximo · última sesión',{exact:true}).waitFor() }
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth),true)
    await p.screenshot({path:`/tmp/appfit-production-${theme}-${tab}.png`})
   }
  }
  await navegar(p, 'Nutrición'); await p.getByRole('button',{name:'Añadir comida',exact:true}).click()
  await p.getByRole('textbox',{name:'Describe lo que has comido'}).fill('un plátano y 125 g de yogur')
  await p.getByRole('button',{name:'Interpretar',exact:true}).click(); await p.getByRole('button',{name:'Detalles del alimento',exact:true}).nth(1).waitFor()
  await p.getByRole('button',{name:/^Guardar ·/}).click(); await p.waitForFunction(()=>!document.querySelector('[role=dialog]'))
  const registrados=await exportar(p); assert.equal(registrados.entries.length,esperado.entries.length+2)
  await p.reload(); assert.deepEqual(await exportar(p),registrados)
  assert.equal(await p.evaluate(()=>[...document.fonts].some(f=>f.family==='Manrope' && f.status==='loaded')),true)
  // Restaurar la referencia hace repetible el ensayo en este perfil aislado.
  await p.locator('input[type=file]').setInputFiles({name:'referencia.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(esperado))})
  await p.getByRole('group',{name:'Confirmar importación',exact:true}).getByRole('button',{name:'Importar copia',exact:true}).click()
  await p.getByText('Copia importada correctamente.',{exact:true}).waitFor(); assert.deepEqual(await exportar(p),esperado)
  console.log('Producción: actualización real del SW, reapertura del mismo perfil y export intacto de todas las tablas previas. Offline: recarga, fuente local, todos los destinos, chunks de gráficas, interpretación, guardado y nueva recarga correctos en ambos temas.')
 } finally { await c.close() }
}
main().catch(e=>{console.error(e);process.exitCode=1})
