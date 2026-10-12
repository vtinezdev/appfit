import { describe, expect, it } from 'vitest'
import { diaCreatina, dosisManualValida, fechaCreatinaValida } from './creatina'

const config = { activa: true }
describe('dosis y fase de creatina', () => {
  it.each([[80, 4], [85, 4.5], [110, 5.5], [40, 3], [60, 3]])('mantenimiento para %s kg: %s g', (kg, dosisG) => {
    expect(diaCreatina('2026-10-12', config, kg).dosisG).toBe(dosisG)
  })
  it.each([undefined, 0, -70, NaN, Infinity])('sin peso válido (%s) usa 3 g', kg => {
    expect(diaCreatina('2026-10-12', config, kg).dosisG).toBe(3)
  })
  it('la manual sustituye al mantenimiento, incluso sin pesaje; inválidas vuelven a la automática', () => {
    expect(diaCreatina('2026-10-12', { ...config, dosisManualG: 2 }, 80).dosisG).toBe(2)
    expect(diaCreatina('2026-10-12', { ...config, dosisManualG: 4.5 }).dosisG).toBe(4.5)
    expect(diaCreatina('2026-10-12', { ...config, dosisManualG: -2 }, 80).dosisG).toBe(4)
    expect(dosisManualValida(Infinity)).toBe(false)
  })
  it('la carga dura cinco días inclusivos y pasa a mantenimiento manual al sexto', () => {
    const carga = { ...config, inicioCarga: '2026-10-12', dosisManualG: 5 }
    for (let i = 0; i < 5; i++) expect(diaCreatina(`2026-10-${12 + i}`, carga, 80)).toMatchObject({ carga: true, diaCarga: i + 1, dosisG: 24, finCarga: '2026-10-16' })
    expect(diaCreatina('2026-10-17', carga, 80)).toMatchObject({ carga: false, terminada: true, dosisG: 5 })
    expect(diaCreatina('2026-10-11', carga, 80)).toMatchObject({ carga: false, terminada: false, dosisG: 5 })
  })
  it('carga por kg, independiente de la manual, y no inventa masa si se pierde el pesaje', () => {
    const carga = { ...config, inicioCarga: '2026-10-12', dosisManualG: 10 }
    expect(diaCreatina('2026-10-12', carga, 76).dosisG).toBe(22.8)
    expect(diaCreatina('2026-10-12', carga).dosisG).toBeUndefined()
    expect(diaCreatina('2026-10-17', carga).dosisG).toBe(10)
  })
  it('las fechas inválidas no activan carga y los días son naturales', () => {
    expect(fechaCreatinaValida('2026-02-30')).toBe(false)
    expect(fechaCreatinaValida('2026-10-2')).toBe(false)
    expect(fechaCreatinaValida('2028-02-29')).toBe(true)
    expect(diaCreatina('2026-10-12', { ...config, inicioCarga: 'no' }, 80).carga).toBe(false)
    expect(diaCreatina('2026-10-28', { ...config, inicioCarga: '2026-10-24' }, 80).diaCarga).toBe(5)
    expect(diaCreatina('2026-10-29', { ...config, inicioCarga: '2026-10-24' }, 80).dosisG).toBe(4)
  })
})
