import { describe, expect, it } from 'vitest'
import { objetivosDelDia, objetivosMedios } from './objetivosDia'

const vigentes = { kcal: 2000, prot: 150, carb: 200, grasa: 67 }
const snap = { kcal: 2400, prot: 160, carb: 280, grasa: 70 }

describe('objetivosDelDia', () => {
  it('el snapshot manda; sin él, los vigentes', () => {
    expect(objetivosDelDia(snap, vigentes)).toEqual(snap)
    expect(objetivosDelDia(undefined, vigentes)).toEqual(vigentes)
  })
  it('ignora campos extra (origen, etc.)', () => {
    expect(objetivosDelDia(undefined, { ...vigentes, origen: 'perfil' } as typeof vigentes)).toEqual(vigentes)
  })
})

describe('objetivosMedios', () => {
  it('promedia snapshot y vigentes día a día', () => {
    expect(objetivosMedios(['a', 'b'], new Map([['a', snap]]), vigentes)).toEqual({ kcal: 2200, prot: 155, carb: 240, grasa: 69 })
  })
  it('sin días devuelve los vigentes', () => {
    expect(objetivosMedios([], new Map(), vigentes)).toEqual(vigentes)
  })
})
