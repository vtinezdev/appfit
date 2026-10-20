import { describe, expect, it } from 'vitest'
import { seleccionarResumen, type SeleccionResumen } from './seleccion'
import { leerResumen, resumenEntreno } from './publicacion'
const resumen=resumenEntreno({ titulo:'Torso',inicio:0,fin:60000,series:3,volumenKg:100,ejercicios:['Press'],catalogIds:['appfit:press-banca'],records:[{ejercicio:'Press',texto:'50 kg'}],ligas:[{ejercicio:'Press',texto:'Plata'}],logros:['Constancia'],insignias:[{id:'semanas',grupo:'constancia',nivel:null}] })
const seleccion:SeleccionResumen={mapa:false,ejercicios:false,records:[],ligas:false,logros:false,duracion:false,volumen:false}
describe('selección explícita de publicación',()=>{
 it('quita los datos ocultos del envío y conserva intacto el original',()=>{
  const elegida=seleccionarResumen(resumen,seleccion)
  expect(elegida).not.toHaveProperty('volumenKg')
  expect(elegida).not.toHaveProperty('duracionSeg')
  expect(elegida).toMatchObject({ejercicios:[],records:[],ligas:[],logros:[],recordsTotal:0,recordsEjercicios:0})
  // Sin la lista, tampoco sus imágenes ni sus insignias.
  expect(elegida).not.toHaveProperty('catalogIds')
  expect(elegida).not.toHaveProperty('insignias')
  expect(resumen.volumenKg).toBe(100)
  expect(leerResumen(elegida)).toEqual(elegida)
 })
 it('conserva el cero real, que es distinto del omitido',()=>{
  const conCero={...resumen,volumenKg:0,duracionSeg:0}
  expect(leerResumen(conCero)).toMatchObject({volumenKg:0,duracionSeg:0})
  expect(seleccionarResumen(conCero,{...seleccion,volumen:true,duracion:true})).toMatchObject({volumenKg:0,duracionSeg:0})
 })
 it('con ejercicios y logros elegidos viajan sus imágenes e insignias',()=>{
  const elegida=seleccionarResumen(resumen,{...seleccion,ejercicios:true,logros:true})
  expect(elegida).toMatchObject({catalogIds:['appfit:press-banca'],insignias:[{id:'semanas',grupo:'constancia',nivel:null}]})
  expect(leerResumen(elegida)).toEqual(elegida)
 })
})
