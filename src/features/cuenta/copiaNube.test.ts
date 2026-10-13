import { beforeEach, describe, expect, it } from 'vitest'
import { migrarBackup, type BackupV3 } from '../../shared/lib/backup'
import type { Entry } from '../../shared/db/types'
import { ServidorFalso } from '../../test/fixtures/nubeFalsa'
import { CopiaNube, type AlmacenDispositivo } from './copiaNube'
import { SecretoIncorrectoError } from './lib/cifrado'
import type { VinculoDispositivo } from './data/dispositivoRepo'
import type { Nube } from './data/nube'

/** Un móvil en memoria: sus comidas (lo que va en la copia), su vínculo y su sesión en la nube falsa. */
class Movil {
  comidas: string[] = []
  vinculo: VinculoDispositivo | undefined
  copia: CopiaNube
  nube: Nube

  constructor(servidor: ServidorFalso) {
    const nube = servidor.nube()
    this.nube = nube
    const dispositivo: AlmacenDispositivo = {
      leer: async () => this.vinculo,
      guardar: async (v) => { this.vinculo = { ...v, id: 1 } },
      actualizar: async (c) => { if (this.vinculo) this.vinculo = { ...this.vinculo, ...c } },
      borrar: async () => { this.vinculo = undefined },
    }
    this.copia = new CopiaNube({
      nube: async () => nube,
      dispositivo,
      exportar: async () => this.backup(),
      importar: async (json) => { this.comidas = (JSON.parse(json) as BackupV3).entries.map((e) => e.nombre) },
      hayDatos: async () => this.comidas.length > 0,
      borrarDatos: async () => { this.comidas = [] },
      iteraciones: 1000,
    })
  }

  backup(): BackupV3 {
    return migrarBackup({
      version: 3, exportedAt: new Date().toISOString(), dbVersion: 11, foods: [], settings: [], exercises: [], routines: [], workouts: [], sets: [],
      entries: this.comidas.map((nombre, i) => ({ id: i + 1, nombre }) as unknown as Entry),
    })
  }

  get fase() {
    return this.copia.leerEstado().fase
  }

  async entrar(email = 'victor@example.com') {
    await this.copia.enviarCodigo(email)
    return this.copia.verificarCodigo(email, ServidorFalso.CODIGO)
  }
}

let servidor: ServidorFalso
beforeEach(() => {
  servidor = new ServidorFalso()
})

async function cuentaCreada(comidas: string[]) {
  const a = new Movil(servidor)
  a.comidas = comidas
  expect(await a.entrar()).toEqual({ vinculo: 'crear' })
  const codigo = await a.copia.crearCopia('contraseña larga')
  return { a, codigo }
}

describe('crear la cuenta', () => {
  it('sube la copia cifrada y deja el móvil vinculado y al día', async () => {
    const { a, codigo } = await cuentaCreada(['Tortilla'])
    expect(codigo).toMatch(/^\w{4}(-\w{4}){4}$/)
    expect(a.fase).toBe('al-dia')
    expect(a.copia.leerEstado().email).toBe('victor@example.com')
    const remota = [...servidor.copias.values()][0]
    expect(remota.revision).toBe(1)
    expect(remota.datos).not.toContain('Tortilla')
    expect(a.vinculo?.dek.extractable).toBe(false)
  })

  it('un código incorrecto no entra', async () => {
    const a = new Movil(servidor)
    await expect(a.copia.verificarCodigo('victor@example.com', '000000')).rejects.toThrow(/código/)
  })
})

describe('subir los cambios', () => {
  it('solo sube si los datos han cambiado', async () => {
    const { a } = await cuentaCreada(['Tortilla'])
    await a.copia.sincronizar()
    expect([...servidor.copias.values()][0].revision).toBe(1)
    a.comidas.push('Lentejas')
    a.copia.marcarPendiente()
    expect(a.fase).toBe('pendiente')
    await a.copia.sincronizar()
    expect([...servidor.copias.values()][0].revision).toBe(2)
    expect(a.fase).toBe('al-dia')
  })

  it('sin conexión queda pendiente y sube al volver', async () => {
    const { a } = await cuentaCreada(['Tortilla'])
    a.comidas.push('Lentejas')
    servidor.sinConexion = true
    await a.copia.sincronizar()
    expect(a.fase).toBe('sin-conexion')
    servidor.sinConexion = false
    await a.copia.sincronizar({ comprobarNube: true })
    expect(a.fase).toBe('al-dia')
    expect([...servidor.copias.values()][0].revision).toBe(2)
  })

  it('guarda la copia anterior como red de seguridad', async () => {
    const { a } = await cuentaCreada(['Tortilla'])
    const primera = [...servidor.copias.values()][0].datos
    a.comidas.push('Lentejas')
    await a.copia.sincronizar()
    expect([...servidor.copias.values()][0].anterior).toBe(primera)
  })
})

describe('entrar en otro móvil', () => {
  it('vacío: trae la copia con la contraseña', async () => {
    await cuentaCreada(['Tortilla', 'Lentejas'])
    const b = new Movil(servidor)
    expect(await b.entrar()).toEqual({ vinculo: 'traer' })
    await b.copia.abrir('contraseña larga', 'contrasena')
    await b.copia.traerCopia()
    expect(b.comidas).toEqual(['Tortilla', 'Lentejas'])
    expect(b.fase).toBe('al-dia')
    // Traerla no cuenta como un cambio que haya que volver a subir.
    await b.copia.sincronizar()
    expect([...servidor.copias.values()][0].revision).toBe(1)
  })

  it('con una contraseña incorrecta no abre nada', async () => {
    await cuentaCreada(['Tortilla'])
    const b = new Movil(servidor)
    await b.entrar()
    await expect(b.copia.abrir('otra contraseña', 'contrasena')).rejects.toBeInstanceOf(SecretoIncorrectoError)
    await expect(b.copia.traerCopia()).rejects.toThrow()
    expect(b.vinculo).toBeUndefined()
  })

  it('un móvil sin vincular nunca sube: su copia vacía no pisa la de la nube', async () => {
    await cuentaCreada(['Tortilla'])
    const b = new Movil(servidor)
    await b.entrar()
    await b.copia.sincronizar({ comprobarNube: true })
    expect(b.fase).toBe('sin-vincular')
    expect([...servidor.copias.values()][0].revision).toBe(1)
  })

  it('con datos: enseña los dos resúmenes y la persona elige', async () => {
    await cuentaCreada(['Tortilla', 'Lentejas'])
    const b = new Movil(servidor)
    b.comidas = ['Pizza']
    expect(await b.entrar()).toEqual({ vinculo: 'elegir' })
    await b.copia.abrir('contraseña larga', 'contrasena')
    const { nube, local } = await b.copia.resumenes()
    expect(nube.comidas).toBe(2)
    expect(local.comidas).toBe(1)
    await b.copia.subirEstaCopia()
    expect([...servidor.copias.values()][0].revision).toBe(2)
    expect(b.fase).toBe('al-dia')
  })

  it('con la clave de recuperación: trae la copia y pone contraseña nueva', async () => {
    const { codigo } = await cuentaCreada(['Tortilla'])
    const b = new Movil(servidor)
    await b.entrar()
    await b.copia.abrir(codigo.toLowerCase().replace(/-/g, ' '), 'recuperacion')
    await b.copia.nuevaContrasena('contraseña nueva')
    await b.copia.traerCopia()
    expect(b.comidas).toEqual(['Tortilla'])
    // La contraseña nueva abre en un tercer móvil; la antigua ya no.
    const c = new Movil(servidor)
    await c.entrar()
    await expect(c.copia.abrir('contraseña larga', 'contrasena')).rejects.toBeInstanceOf(SecretoIncorrectoError)
    await c.copia.abrir('contraseña nueva', 'contrasena')
  })

  it('sin contraseña ni clave: empezar de cero sube este móvil con claves nuevas', async () => {
    await cuentaCreada(['Tortilla'])
    const b = new Movil(servidor)
    b.comidas = ['Pizza']
    await b.entrar()
    const codigo = await b.copia.empezarDeCero('otra contraseña')
    expect(codigo).toBeTruthy()
    const c = new Movil(servidor)
    await c.entrar()
    await c.copia.abrir('otra contraseña', 'contrasena')
    await c.copia.traerCopia()
    expect(c.comidas).toEqual(['Pizza'])
  })

  it('si la sesión caducó y vuelve a entrar en la misma cuenta, sigue sin pedir la contraseña', async () => {
    const { a } = await cuentaCreada(['Tortilla'])
    await a.nube.cerrarSesion()
    expect(await a.entrar()).toBeNull()
    expect(a.fase).toBe('al-dia')
  })

  it('tras cerrar sesión a propósito, el vínculo se borra y vuelve a pedirla', async () => {
    const { a } = await cuentaCreada(['Tortilla'])
    await a.copia.cerrarSesion()
    expect(a.vinculo).toBeUndefined()
    expect(a.comidas).toEqual(['Tortilla'])
    expect(await a.entrar()).toEqual({ vinculo: 'elegir' })
  })
})

describe('dos móviles con la misma cuenta', () => {
  async function dosMoviles() {
    const { a } = await cuentaCreada(['Tortilla'])
    const b = new Movil(servidor)
    await b.entrar()
    await b.copia.abrir('contraseña larga', 'contrasena')
    await b.copia.traerCopia()
    return { a, b }
  }

  it('lo que sube uno lo trae el otro si no tiene cambios', async () => {
    const { a, b } = await dosMoviles()
    a.comidas.push('Lentejas')
    await a.copia.sincronizar()
    await b.copia.sincronizar({ comprobarNube: true })
    expect(b.comidas).toEqual(['Tortilla', 'Lentejas'])
    expect(b.fase).toBe('al-dia')
  })

  it('si los dos cambian, el segundo queda en conflicto y no pisa nada', async () => {
    const { a, b } = await dosMoviles()
    a.comidas.push('Lentejas')
    await a.copia.sincronizar()
    b.comidas.push('Pizza')
    await b.copia.sincronizar()
    expect(b.fase).toBe('conflicto')
    expect([...servidor.copias.values()][0].revision).toBe(2)
    // Mientras dura el conflicto no sube nada.
    b.comidas.push('Ensalada')
    await b.copia.sincronizar()
    expect([...servidor.copias.values()][0].revision).toBe(2)

    const { nube, local } = await b.copia.resumenesConflicto()
    expect([nube.comidas, local.comidas]).toEqual([2, 3])
    await b.copia.resolverConflicto('traer')
    expect(b.comidas).toEqual(['Tortilla', 'Lentejas'])
    expect(b.fase).toBe('al-dia')
  })

  it('en el conflicto también se puede quedar con lo de este móvil', async () => {
    const { a, b } = await dosMoviles()
    a.comidas.push('Lentejas')
    await a.copia.sincronizar()
    b.comidas.push('Pizza')
    await b.copia.sincronizar({ comprobarNube: true })
    expect(b.fase).toBe('conflicto')
    await b.copia.resolverConflicto('subir')
    expect(b.fase).toBe('al-dia')
    await a.copia.sincronizar({ comprobarNube: true })
    expect(a.comidas).toEqual(['Tortilla', 'Pizza'])
  })
})

describe('cuenta', () => {
  it('cambiar la contraseña exige la actual', async () => {
    const { a } = await cuentaCreada(['Tortilla'])
    await expect(a.copia.cambiarContrasena('mal', 'contraseña nueva')).rejects.toBeInstanceOf(SecretoIncorrectoError)
    await a.copia.cambiarContrasena('contraseña larga', 'contraseña nueva')
    const b = new Movil(servidor)
    await b.entrar()
    await b.copia.abrir('contraseña nueva', 'contrasena')
  })

  it('una clave de recuperación nueva sustituye a la anterior', async () => {
    const { a, codigo } = await cuentaCreada(['Tortilla'])
    const nuevo = await a.copia.nuevaClaveRecuperacion('contraseña larga')
    const b = new Movil(servidor)
    await b.entrar()
    await expect(b.copia.abrir(codigo, 'recuperacion')).rejects.toBeInstanceOf(SecretoIncorrectoError)
    await b.copia.abrir(nuevo, 'recuperacion')
  })

  it('cerrar sesión puede borrar también los datos del móvil', async () => {
    const { a } = await cuentaCreada(['Tortilla'])
    await a.copia.cerrarSesion(true)
    expect(a.comidas).toEqual([])
    expect(a.fase).toBe('sin-sesion')
  })

  it('borrar la cuenta borra la copia de la nube y deja los datos del móvil', async () => {
    const { a } = await cuentaCreada(['Tortilla'])
    await a.copia.borrarCuenta()
    expect(servidor.copias.size).toBe(0)
    expect(a.comidas).toEqual(['Tortilla'])
    expect(a.fase).toBe('sin-sesion')
  })

  it('al arrancar sin sesión guardada no carga la nube', async () => {
    let cargada = false
    const copia = new CopiaNube({
      nube: async () => { cargada = true; return servidor.nube() },
      dispositivo: { leer: async () => undefined, guardar: async () => {}, actualizar: async () => {}, borrar: async () => {} },
      exportar: async () => new Movil(servidor).backup(),
      importar: async () => {},
      hayDatos: async () => false,
      borrarDatos: async () => {},
      haySesionGuardada: () => false,
    })
    await copia.iniciar()
    expect(cargada).toBe(false)
    expect(copia.leerEstado().fase).toBe('sin-sesion')
  })
})
