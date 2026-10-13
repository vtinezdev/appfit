import { describe, expect, it } from 'vitest'
import { decidirCopia, decidirVinculo } from './decision'

describe('decidirVinculo', () => {
  it('sin copia en la nube se crea, con copia se trae o se elige', () => {
    expect(decidirVinculo(false, false)).toBe('crear')
    expect(decidirVinculo(false, true)).toBe('crear')
    expect(decidirVinculo(true, false)).toBe('traer')
    expect(decidirVinculo(true, true)).toBe('elegir')
  })
})

describe('decidirCopia', () => {
  const base = { revisionLocal: 3, huellaGuardada: 'a', huellaActual: 'a' }

  it('sin cambios ni copia nueva no hace nada', () => {
    expect(decidirCopia({ ...base, revisionRemota: 3 })).toBe('nada')
    expect(decidirCopia({ ...base, revisionRemota: undefined })).toBe('nada')
  })

  it('con cambios aquí sube', () => {
    expect(decidirCopia({ ...base, huellaActual: 'b', revisionRemota: 3 })).toBe('subir')
    // Sin consultar la nube también: si otro subió antes, la subida da conflicto.
    expect(decidirCopia({ ...base, huellaActual: 'b', revisionRemota: undefined })).toBe('subir')
  })

  it('una copia más nueva de otro dispositivo se trae si aquí no hay nada sin subir', () => {
    expect(decidirCopia({ ...base, revisionRemota: 4 })).toBe('traer')
  })

  it('cambios aquí y copia nueva allí es un conflicto', () => {
    expect(decidirCopia({ ...base, huellaActual: 'b', revisionRemota: 4 })).toBe('conflicto')
  })

  it('sin huella guardada cuenta como cambios', () => {
    expect(decidirCopia({ ...base, huellaGuardada: null, revisionRemota: 3 })).toBe('subir')
  })

  it('si la nube ya no tiene copia, está perdida', () => {
    expect(decidirCopia({ ...base, revisionRemota: null })).toBe('perdida')
  })
})
