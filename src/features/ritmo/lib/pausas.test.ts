import { describe, expect, it } from 'vitest'
import type { Pausa } from '../../../shared/db/types'
import { anadirPausa, describirPausa, pausaActiva, pausaDeSemana, quitarPausa, terminarPausa, validarPausa } from './pausas'

const pausa = (id: string, desde: string, hasta?: string, tipo: Pausa['tipo'] = 'total'): Pausa => ({ id, desde, ...(hasta ? { hasta } : {}), tipo, motivo: 'vacaciones' })

describe('pausaDeSemana', () => {
  it('rige si cubre al menos 4 días de la semana', () => {
    expect(pausaDeSemana([pausa('a', '2026-10-08', '2026-10-20')], '2026-10-05')?.id).toBe('a') // jueves a domingo: 4 días
    expect(pausaDeSemana([pausa('a', '2026-10-09', '2026-10-20')], '2026-10-05')).toBeNull() // viernes a domingo: 3
    expect(pausaDeSemana([pausa('a', '2026-10-01')], '2026-12-07')?.id).toBe('a') // en curso, sin fin
  })

  it('manda la que cubre más días y, a igualdad, la total', () => {
    expect(pausaDeSemana([pausa('e', '2026-10-05', '2026-10-08', 'entreno'), pausa('t', '2026-10-09', '2026-10-12')], '2026-10-05')?.id).toBe('e')
    expect(pausaDeSemana([pausa('e', '2026-09-28', '2026-10-08', 'entreno'), pausa('t', '2026-10-08', '2026-10-11')], '2026-10-05')?.id).toBe('t')
  })
})

describe('anadir, terminar y quitar', () => {
  it('una pausa nueva recorta las que se solapan', () => {
    const r = anadirPausa([pausa('a', '2026-10-01')], { desde: '2026-10-10', tipo: 'entreno', motivo: 'lesion' }, 'b')
    expect(r).toEqual([pausa('a', '2026-10-01', '2026-10-09'), { id: 'b', desde: '2026-10-10', tipo: 'entreno', motivo: 'lesion' }])
    expect(anadirPausa([pausa('a', '2026-10-10')], { desde: '2026-10-10', tipo: 'total', motivo: 'viaje' }, 'b').map((p) => p.id)).toEqual(['b'])
  })

  it('reanudar hoy cierra la pausa ayer; si empezó hoy, desaparece', () => {
    expect(terminarPausa([pausa('a', '2026-10-01')], 'a', '2026-10-10')).toEqual([pausa('a', '2026-10-01', '2026-10-09')])
    expect(terminarPausa([pausa('a', '2026-10-10')], 'a', '2026-10-10')).toEqual([])
    expect(quitarPausa([pausa('a', '2026-10-01'), pausa('b', '2026-11-01')], 'a').map((p) => p.id)).toEqual(['b'])
  })

  it('pausaActiva, validación y descripción', () => {
    expect(pausaActiva([pausa('a', '2026-10-01', '2026-10-09')], '2026-10-10')).toBeNull()
    expect(pausaActiva([pausa('a', '2026-10-01')], '2026-10-10')?.id).toBe('a')
    expect(validarPausa({ desde: '2026-10-10', hasta: '2026-10-01', tipo: 'total', motivo: 'otro' })).toMatch(/anterior/)
    expect(validarPausa({ desde: '2026-10-10', tipo: 'total', motivo: 'otro' })).toBeNull()
    expect(describirPausa({ ...pausa('a', '2026-09-01', '2026-09-14', 'entreno'), motivo: 'lesion' })).toMatch(/^Lesión \(solo entreno\) · /)
  })
})
