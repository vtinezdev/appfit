import { describe, expect, it } from 'vitest'
import {
  aBase64, cifrarCopia, CopiaIlegibleError, crearClaves, deBase64, descifrarCopia, desenvolver, envolver, generarClaveDatos,
  generarCodigoRecuperacion, normalizarCodigo, SecretoIncorrectoError, sinExportar, validarContrasena,
} from './cifrado'

// Pocas iteraciones: PBKDF2 con las reales tarda medio segundo por clave.
const IT = 1000

describe('cifrado de la copia', () => {
  it('cifra y descifra el mismo texto, sin dejarlo legible', async () => {
    const dek = await generarClaveDatos()
    const texto = JSON.stringify({ entries: [{ nombre: 'Tortilla de patatas', kcal: 320 }], peso: 80.5 })
    const cifrado = await cifrarCopia(texto, dek)
    expect(cifrado.startsWith('1.')).toBe(true)
    expect(cifrado).not.toContain('Tortilla')
    expect(await descifrarCopia(cifrado, dek)).toBe(texto)
  })

  it('dos cifrados del mismo texto son distintos (IV aleatorio)', async () => {
    const dek = await generarClaveDatos()
    expect(await cifrarCopia('hola', dek)).not.toBe(await cifrarCopia('hola', dek))
  })

  it('con otra clave, o con la copia alterada, falla de forma limpia', async () => {
    const dek = await generarClaveDatos()
    const cifrado = await cifrarCopia('datos', dek)
    await expect(descifrarCopia(cifrado, await generarClaveDatos())).rejects.toBeInstanceOf(CopiaIlegibleError)
    await expect(descifrarCopia(cifrado.slice(0, -4) + 'AAAA', dek)).rejects.toBeInstanceOf(CopiaIlegibleError)
    await expect(descifrarCopia('2.x.y', dek)).rejects.toBeInstanceOf(CopiaIlegibleError)
  })

  it('comprime: una copia repetitiva ocupa mucho menos', async () => {
    const dek = await generarClaveDatos()
    const texto = JSON.stringify(Array.from({ length: 2000 }, (_, i) => ({ id: i, fecha: '2026-10-13', comida: 'cena' })))
    expect((await cifrarCopia(texto, dek)).length).toBeLessThan(texto.length / 5)
  })

  it('base64 de ida y vuelta, también con muchos bytes', () => {
    const bytes = Uint8Array.from({ length: 100_000 }, (_, i) => (i * 7919) % 256)
    expect(deBase64(aBase64(bytes))).toEqual(bytes)
  })
})

describe('claves', () => {
  it('la contraseña y el código de recuperación abren la misma clave de datos', async () => {
    const { dek, claves, codigo } = await crearClaves('contraseña larga', IT)
    const copia = await cifrarCopia('mis datos', dek)
    const conContrasena = await desenvolver(claves.contrasena, 'contraseña larga')
    const conCodigo = await desenvolver(claves.recuperacion, codigo)
    expect(await descifrarCopia(copia, conContrasena)).toBe('mis datos')
    expect(await descifrarCopia(copia, conCodigo)).toBe('mis datos')
    expect(claves.contrasena.iteraciones).toBe(IT)
  })

  it('una contraseña incorrecta da SecretoIncorrectoError', async () => {
    const { claves } = await crearClaves('contraseña larga', IT)
    await expect(desenvolver(claves.contrasena, 'otra contraseña')).rejects.toBeInstanceOf(SecretoIncorrectoError)
  })

  it('volver a envolver con otra contraseña sigue abriendo la copia', async () => {
    const { dek, claves } = await crearClaves('primera clave', IT)
    const copia = await cifrarCopia('x', dek)
    const extraible = await desenvolver(claves.contrasena, 'primera clave', true)
    const nueva = await envolver(extraible, 'segunda clave', IT)
    expect(await descifrarCopia(copia, await desenvolver(nueva, 'segunda clave'))).toBe('x')
  })

  it('la clave que se guarda en el dispositivo no se puede exportar', async () => {
    const dek = await generarClaveDatos()
    const local = await sinExportar(dek)
    expect(local.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', local)).rejects.toThrow()
    expect(await descifrarCopia(await cifrarCopia('y', dek), local)).toBe('y')
  })
})

describe('código de recuperación y contraseña', () => {
  it('genera cinco grupos de cuatro sin letras confundibles', () => {
    const codigo = generarCodigoRecuperacion()
    expect(codigo).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/)
    expect(generarCodigoRecuperacion()).not.toBe(codigo)
  })

  it('normaliza el código como lo escriba la persona', () => {
    expect(normalizarCodigo(' 7k2m-abcd efgh 0o1i-l9zz ')).toBe('7K2M-ABCD-EFGH-0011-19ZZ')
    expect(normalizarCodigo('7K2MABCDEFGH00111 9ZZ')).toBe('7K2M-ABCD-EFGH-0011-19ZZ')
  })

  it('valida la longitud y que las dos coincidan', () => {
    expect(validarContrasena('corta')).toMatch(/al menos 8/)
    expect(validarContrasena('suficiente', 'otra cosa')).toMatch(/no coinciden/)
    expect(validarContrasena('suficiente', 'suficiente')).toBeNull()
    expect(validarContrasena('suficiente')).toBeNull()
  })
})
