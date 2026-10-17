/* Formularios y archivos: escrituras exclusivamente en el perfil sintético de pruebas. */
const { assert, lanzar, contexto, abrir, sembrar, datos, captura, informe, navegar } = require('./auditoria-comun.cjs')
async function main() {
  const browser=await lanzar('chromium'), ctx=await contexto(browser)
  const r={motor:'chromium',version:browser.version(),estado:'en-curso',pasos:[]}
  let page, paso='arranque'
  try {
    const abierto=await abrir(ctx);page=abierto.page
    await sembrar(page)
    await navegar(page,'Entreno')
    await page.getByRole('tab',{name:'Actividades',exact:true}).click()
    paso='actividad manual inválida y válida con coma decimal'
    await page.getByRole('button',{name:'Registrar a mano',exact:true}).click()
    let sheet=page.getByRole('dialog',{name:'Registrar actividad',exact:true})
    await sheet.getByRole('button',{name:'Guardar actividad',exact:true}).click()
    await sheet.getByRole('alert').waitFor()
    assert.equal((await datos(page)).actividades.length,0)
    await sheet.getByLabel('Minutos',{exact:true}).fill('30')
    await sheet.getByLabel('Distancia (km)',{exact:true}).fill('5,2')
    await sheet.getByLabel('Nombre (opcional)',{exact:true}).fill('Paseo sintético de auditoría')
    await sheet.getByRole('button',{name:'Guardar actividad',exact:true}).click()
    await sheet.waitFor({state:'detached'})
    const actividad=(await datos(page)).actividades[0]
    assert.equal(actividad.distanciaM,5200)
    r.pasos.push(paso)

    paso='GPX inválido no modifica datos; GPX válido importa recorrido'
    const antesGpx=(await datos(page)).actividades
    await page.locator('input[type=file]').setInputFiles({name:'invalido.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from('<gpx>sin recorrido</gpx>')})
    await page.getByRole('alert').waitFor()
    assert.deepEqual((await datos(page)).actividades,antesGpx)
    const gpx='<?xml version="1.0"?><gpx version="1.1"><trk><name>Recorrido sintético</name><trkseg><trkpt lat="41.38" lon="2.17"><ele>10</ele><time>2026-10-16T08:00:00Z</time></trkpt><trkpt lat="41.39" lon="2.18"><ele>20</ele><time>2026-10-16T08:10:00Z</time></trkpt></trkseg></trk></gpx>'
    await page.locator('input[type=file]').setInputFiles({name:'auditoria.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from(gpx)})
    sheet=page.getByRole('dialog',{name:'Importar GPX',exact:true})
    await sheet.getByRole('button',{name:'Guardar actividad',exact:true}).click()
    await sheet.waitFor({state:'detached'})
    assert.equal((await datos(page)).actividades.length,2)
    assert.ok((await datos(page)).actividades.find(a=>a.origen==='gpx').recorrido.length)
    r.pasos.push(paso)

    paso='descripción local, revisión y guardado de comida'
    await navegar(page,'Nutrición')
    const antes=(await datos(page)).entries.length
    await page.getByRole('button',{name:'Añadir comida',exact:true}).click()
    const tarea=page.getByRole('dialog',{name:'Añadir comida',exact:true})
    await tarea.getByRole('textbox',{name:'Describe lo que has comido',exact:true}).fill('100 g de arroz blanco cocido')
    await tarea.getByRole('button',{name:'Interpretar',exact:true}).click()
    await tarea.getByRole('button',{name:/^Guardar ·/}).click()
    await tarea.waitFor({state:'detached'})
    assert.equal((await datos(page)).entries.length,antes+1)
    r.pasos.push(paso)

    paso='backup inválido no sustituye datos; exportación recuperable'
    await navegar(page,'Ajustes')
    await page.getByRole('button',{name:/^Copias de seguridad/}).click()
    const antesCopia=await datos(page)
    await page.locator('input[type=file]').setInputFiles({name:'invalido.json',mimeType:'application/json',buffer:Buffer.from('{"version":999}')})
    await page.getByRole('alert').waitFor()
    assert.deepEqual(await datos(page),antesCopia)
    const descarga=page.waitForEvent('download')
    await page.getByRole('button',{name:'Exportar',exact:true}).click()
    const archivo=await(await descarga).path()
    const copia=JSON.parse(require('node:fs').readFileSync(archivo,'utf8'))
    assert.equal(copia.version,3)
    assert.deepEqual(copia.entries,antesCopia.entries)
    assert.deepEqual(copia.actividades,antesCopia.actividades)
    r.pasos.push(paso)
    assert.deepEqual(abierto.errores,[])
    r.estado='correcto'
  } catch(error) {
    r.estado='fallo';r.paso=paso;r.error=error.message
    if(page)r.captura=await captura(page,'datos-fallo').catch(()=>null)
    process.exitCode=1
  } finally {informe('datos',r);console.log(JSON.stringify(r));await ctx.close();await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1})
