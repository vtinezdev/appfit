import { beforeEach, describe, expect, it } from 'vitest'
import { cifrarCopia, descifrarCopia, generarClaveDatos, sinExportar } from '../lib/cifrado'
import * as dispositivoRepo from './dispositivoRepo'

beforeEach(() => dispositivoRepo.borrar())

describe('dispositivoRepo', () => {
  it('guarda la clave no exportable y sigue sirviendo para descifrar', async () => {
    const dek = await generarClaveDatos()
    const copia = await cifrarCopia('mis datos', dek)
    await dispositivoRepo.guardar({ userId: 'u-1', email: 'a@b.es', dek: await sinExportar(dek), revision: 1, huella: 'h' })
    const leido = await dispositivoRepo.leer()
    expect(leido?.dek.extractable).toBe(false)
    expect(await descifrarCopia(copia, leido!.dek)).toBe('mis datos')
  })

  it('actualiza campos sueltos y quita el conflicto con undefined', async () => {
    await dispositivoRepo.guardar({ userId: 'u-1', email: 'a@b.es', dek: await generarClaveDatos(), revision: 1, huella: 'h', conflicto: true })
    await dispositivoRepo.actualizar({ revision: 2, conflicto: undefined })
    const leido = await dispositivoRepo.leer()
    expect(leido?.revision).toBe(2)
    expect(leido?.conflicto).toBeUndefined()
    await dispositivoRepo.borrar()
    expect(await dispositivoRepo.leer()).toBeUndefined()
  })
})
