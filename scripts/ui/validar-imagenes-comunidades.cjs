/* Integración real de UI con Supabase falso: nunca cuentas ni comunidades reales. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const BASE = process.env.APPFIT_UI_URL || 'http://appfit-test.localhost:5174'
assert.equal(new URL(BASE).hostname, 'appfit-test.localhost')
const API = 'http://127.0.0.1:54329/rest/v1/rpc/'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-comunidades-integradas'
fs.mkdirSync(salida, { recursive: true })
const jwt = p => [JSON.stringify({ alg: 'HS256', typ: 'JWT' }), JSON.stringify(p)].map(s => Buffer.from(s).toString('base64url')).join('.') + '.firma'

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const informe = []
  try {
    for (const c of [...[320,375,430].flatMap(width => ['light','dark'].map(theme => ({ width,theme }))), ...['light','dark'].map(theme => ({ width:375,theme,grande:true }))]) {
      const caso = `${c.width}-${c.theme}${c.grande ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== caso) continue
      const context = await browser.newContext({ viewport:{width:c.width,height:932},timezoneId:'Europe/Madrid',colorScheme:c.theme,serviceWorkers:'block',reducedMotion:'reduce' })
      try {
        const page = await context.newPage(), errores = [], creaciones = []
        page.on('pageerror',e=>errores.push(e.message))
        page.on('request',r=>{if(r.url().endsWith('/crear_comunidad_con_imagen'))creaciones.push(JSON.parse(r.postData()))})
        const post = async (fn,data={}) => { const r=await page.request.post(API+fn,{data}); assert.ok(r.ok(),await r.text()); return r.json() }
        await post('simular_reinicio'); await post('crear_perfil',{p_alias:'yo_prueba',p_nombre:'Persona de prueba',p_acepto:true})
        const exp=Math.floor(Date.now()/1000)+86400
        const user={id:'yo',email:'prueba@appfit.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}
        await context.addInitScript(({session,theme})=>{localStorage.setItem('appfit-cuenta',JSON.stringify(session));localStorage.setItem('appfit:theme',theme)},{session:{access_token:jwt({sub:user.id,email:user.email,role:'authenticated',aud:'authenticated',exp}),token_type:'bearer',expires_in:86400,expires_at:exp,refresh_token:'falsa',user},theme:c.theme})
        await page.goto(BASE)
        await page.getByRole('navigation',{name:'Navegación principal'}).waitFor()
        await page.evaluate(async()=>{const {updateSettings}=await import('/src/shared/db/settings.ts');await updateSettings({gamificacionVisible:false})})
        if(c.grande)await page.addStyleTag({content:'html {font-size:200% !important}'})
        await navegar(page,'Social')
        await page.getByRole('tab',{name:'Comunidades',exact:true}).click()
        const principal=page.locator('main')
        const captura=async nombre=>{
          await page.evaluate(()=>document.fonts.ready)
          const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)
          assert.equal(overflow,false,`${caso} ${nombre}: sin desbordamiento`)
          const visibles=await page.locator('[role="dialog"]:visible').count()
          assert.ok(visibles<=1,`${caso}: no hay hojas superpuestas`)
          await page.screenshot({path:`${salida}/${caso}-${nombre}.png`,animations:'disabled'})
        }
        await principal.getByRole('button',{name:'Crear comunidad',exact:true}).click()
        const crear=page.getByRole('dialog',{name:'Crear comunidad',exact:true})
        await crear.getByLabel('Nombre de la comunidad',{exact:true}).fill('Rutas en compañía')
        await crear.getByLabel('Descripción',{exact:true}).fill('Un lugar para compartir deporte.')
        await crear.getByRole('button',{name:'Elegir imagen',exact:true}).click()
        const selector=page.getByRole('dialog',{name:'Imagen de la comunidad',exact:true})
        await selector.getByRole('list',{name:'Catálogo de imágenes de comunidades'}).waitFor()
        assert.equal(await selector.getByRole('list',{name:'Catálogo de imágenes de comunidades'}).getByRole('button').count(),36)
        await captura('selector')
        await selector.getByRole('searchbox',{name:'Buscar imagen de comunidad'}).fill('campamento')
        await selector.getByRole('button',{name:'Campamento · Senderismo',exact:true}).click()
        await selector.getByRole('button',{name:'Hecho',exact:true}).click()
        await crear.waitFor()
        await captura('crear')
        // Un fallo conserva todo el borrador, incluido el ID para reintentar.
        let primera=true
        await page.route('**/rest/v1/rpc/crear_comunidad_con_imagen',async route=>{
          if(!primera)return route.continue();primera=false
          await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Fallo temporal simulado'})})
        })
        await crear.getByRole('button',{name:'Crear comunidad',exact:true}).click()
        await crear.getByRole('alert').waitFor()
        assert.equal(await crear.getByLabel('Nombre de la comunidad',{exact:true}).inputValue(),'Rutas en compañía')
        await crear.getByRole('button',{name:'Crear comunidad',exact:true}).click()
        await crear.waitFor({state:'detached'})
        assert.equal(creaciones.length,2);assert.deepEqual(creaciones[0],creaciones[1])
        const id=creaciones[0].p_id
        const region=principal.getByRole('region',{name:'Comunidad',exact:true})
        await region.getByRole('heading',{name:'Rutas en compañía',exact:true}).waitFor()
        await page.waitForFunction(()=>document.querySelector('main [aria-label="Comunidad"] .app-avatar-lg img')?.naturalWidth===256)
        await captura('portada')
        const abrirImagen=async()=>{
          await region.getByRole('button',{name:'Más acciones de la comunidad',exact:true}).click()
          await page.getByRole('dialog').getByRole('button',{name:'Cambiar imagen',exact:true}).click()
          await selector.waitFor()
          assert.equal(await page.getByRole('dialog').count(),1)
        }
        await abrirImagen()
        await selector.getByRole('searchbox',{name:'Buscar imagen de comunidad'}).fill('refugio')
        await selector.getByRole('button',{name:'El refugio · Montaña',exact:true}).click()
        await page.keyboard.press('Escape')
        await selector.waitFor({state:'detached'})
        assert.equal((await post('comunidades',{p_busqueda:'Rutas en compañía',p_solo_mias:true}))[0].imagen,'lugar.campamento','Cancelar no escribe')
        await abrirImagen()
        await selector.getByRole('searchbox',{name:'Buscar imagen de comunidad'}).fill('refugio')
        await selector.getByRole('button',{name:'El refugio · Montaña',exact:true}).click()
        let fallo=true
        await page.route('**/rest/v1/rpc/editar_imagen_comunidad',async route=>{
          if(!fallo)return route.continue();fallo=false
          await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Fallo temporal simulado'})})
        })
        await selector.getByRole('button',{name:'Guardar imagen',exact:true}).click()
        await selector.getByRole('alert').waitFor()
        assert.equal(await selector.getByRole('button',{name:'El refugio · Montaña',exact:true}).getAttribute('aria-pressed'),'true')
        await selector.getByRole('button',{name:'Guardar imagen',exact:true}).click()
        await selector.waitFor({state:'detached'})
        assert.equal((await post('comunidades',{p_busqueda:'Rutas en compañía',p_solo_mias:true}))[0].imagen,'lugar.refugio')
        await region.getByRole('button',{name:'Comunidades',exact:true}).click()
        const lista=principal.getByRole('list',{name:'Lista de comunidades'})
        await lista.getByRole('button',{name:/Rutas en compañía/}).waitFor()
        await captura('lista')
        await page.reload();if(c.grande)await page.addStyleTag({content:'html {font-size:200% !important}'})
        await navegar(page,'Social');await page.getByRole('tab',{name:'Comunidades',exact:true}).click()
        await principal.getByRole('list',{name:'Lista de comunidades'}).getByRole('button',{name:/Rutas en compañía/}).click()
        await region.getByRole('heading',{name:'Rutas en compañía',exact:true}).waitFor()
        const portadaSrc=await region.locator('.app-avatar-lg img').getAttribute('src');assert.match(portadaSrc,/refugio/)
        await abrirImagen();await selector.getByRole('button',{name:'Usar las iniciales',exact:true}).click();await selector.getByRole('button',{name:'Guardar imagen',exact:true}).click();await selector.waitFor({state:'detached'})
        assert.equal(await region.locator('.app-avatar-lg img').count(),0)
        assert.equal((await post('comunidades',{p_busqueda:'Rutas en compañía',p_solo_mias:true}))[0].imagen,null)
        await region.getByRole('button',{name:'Comunidades',exact:true}).click()
        await page.getByRole('tab',{name:'Descubrir',exact:true}).click()
        await principal.getByRole('button',{name:/Running en compañía/}).first().click()
        await region.getByRole('button',{name:'Más acciones de la comunidad',exact:true}).click()
        assert.equal(await page.getByRole('dialog').getByRole('button',{name:'Cambiar imagen',exact:true}).count(),0,'Un miembro o visitante no recibe edición')
        await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'})
        await region.getByRole('button',{name:'Comunidades',exact:true}).click()
        await post('simular_imagenes_comunidades',{p_disponibles:false})
        await principal.getByRole('button',{name:'Crear comunidad',exact:true}).click()
        await crear.waitFor();await crear.getByLabel('Nombre de la comunidad',{exact:true}).fill('Comunidad anterior')
        await crear.getByLabel('Descripción',{exact:true}).fill('Sin la migración nueva.')
        assert.equal(await crear.getByRole('button',{name:'Elegir imagen',exact:true}).count(),0)
        await crear.getByRole('button',{name:'Crear comunidad',exact:true}).click();await crear.waitFor({state:'detached'})
        await region.getByRole('heading',{name:'Comunidad anterior',exact:true}).waitFor()
        assert.equal(await region.locator('.app-avatar-lg img').count(),0)
        await region.getByRole('button',{name:'Más acciones de la comunidad',exact:true}).click()
        assert.equal(await page.getByRole('dialog').getByRole('button',{name:'Cambiar imagen',exact:true}).count(),0,'Sin 0028 no ofrece una escritura incompatible')
        assert.deepEqual(errores,[])
        informe.push({caso,id,resultado:'OK'})
      } finally {await context.close()}
    }
    fs.writeFileSync(`${salida}/informe.json`,JSON.stringify(informe,null,2)+'\n')
    console.log(JSON.stringify(informe))
  } finally {await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
