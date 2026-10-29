import type { BackupV3 } from '../../shared/lib/backup'
import { BackupCambiadoError } from '../../shared/lib/contenidoBackup'
import { toISODate } from '../../shared/lib/dates'
import { crearClaves, cifrarCopia, desenvolver, descifrarCopia, envolver, generarCodigoRecuperacion, normalizarCodigo, sinExportar, type ClavesNube } from './lib/cifrado'
import { decidirCopia, decidirVinculo, type Vinculo } from './lib/decision'
import { huellaBackup } from './lib/huella'
import { NubeError, type CopiaRemota, type Nube } from './data/nube'
import type { VinculoDispositivo } from './data/dispositivoRepo'

/**
 * Cuenta y copia automática en la nube (plan: docs/cuentas.md; la cuenta sin copia, ADR 040). Orquesta la nube, el estado del dispositivo y el backup; las
 * decisiones están en `lib/decision.ts` y el cifrado en `lib/cifrado.ts`. Todo llega inyectado para poder probarlo
 * con dos «dispositivos» en memoria.
 */

export type FaseCuenta =
  | 'cargando'
  | 'sin-sesion'
  /**
   * Hay sesión pero este dispositivo no guarda copia: no la activó (la cuenta sirve sin ella, ADR 040) o se cerró la
   * app a mitad de entrar. Nunca sube nada; la copia se activa o se abre con `prepararVinculo`.
   */
  | 'sin-copia'
  | 'al-dia'
  | 'pendiente'
  | 'subiendo'
  | 'sin-conexion'
  | 'error'
  | 'conflicto'
  | 'perdida'

export interface EstadoCuenta {
  fase: FaseCuenta
  email?: string
  /** ms de la última vez que la nube quedó igual que este dispositivo. */
  ultimaCopia?: number
  error?: string
}

export interface AlmacenDispositivo {
  leer(): Promise<VinculoDispositivo | undefined>
  guardar(v: Omit<VinculoDispositivo, 'id'>): Promise<void>
  actualizar(cambios: Partial<Omit<VinculoDispositivo, 'id'>>): Promise<void>
  borrar(): Promise<void>
}

export interface Dependencias {
  nube: () => Promise<Nube>
  dispositivo: AlmacenDispositivo
  exportar: () => Promise<BackupV3>
  /** Compara `esperado` y sustituye en la misma transacción; devuelve la foto importada, no una lectura posterior. */
  importar: (json: string, esperado?: BackupV3) => Promise<BackupV3>
  hayDatos: () => Promise<boolean>
  borrarDatos: () => Promise<void>
  /** Sin sesión guardada no se carga la nube (supabase-js) al arrancar. */
  haySesionGuardada?: () => boolean
  ahora?: () => number
  /** Iteraciones de PBKDF2 al crear claves (los tests usan pocas). */
  iteraciones?: number
}

/** Lo que se sabe de la nube entre «verificar el código» y «elegir qué copia vale». */
interface Pendiente {
  userId: string
  email: string
  copia: CopiaRemota | null
  dek?: CryptoKey
  /** Se abrió con la clave de recuperación: falta elegir contraseña nueva. */
  porRecuperacion?: boolean
}

export interface ResumenCopia {
  actualizada: string
  comidas: number
  entrenos: number
}

const resumen = (b: BackupV3, actualizada: string): ResumenCopia => ({ actualizada, comidas: b.entries.length, entrenos: b.workouts.length })

export class CopiaNube {
  private estado: EstadoCuenta = { fase: 'cargando' }
  private oyentes = new Set<() => void>()
  private pendiente: Pendiente | null = null
  private cola: Promise<unknown> = Promise.resolve()
  /** Día (local) en que ya se anotó la actividad en la nube. */
  private actividadMarcada?: string
  private readonly d: Dependencias

  constructor(dependencias: Dependencias) {
    this.d = dependencias
  }

  // --- Estado para la UI (useSyncExternalStore) ---

  suscribir = (fn: () => void) => {
    this.oyentes.add(fn)
    return () => this.oyentes.delete(fn)
  }

  leerEstado = () => this.estado

  /** El error solo dura hasta el siguiente cambio de estado que no lo traiga. */
  private poner(cambios: Partial<EstadoCuenta>, reemplazar = false) {
    this.estado = reemplazar ? { fase: 'cargando', ...cambios } : { ...this.estado, error: undefined, ...cambios }
    this.oyentes.forEach((fn) => fn())
  }

  private ahora() {
    return this.d.ahora?.() ?? Date.now()
  }

  /** Una sola operación con la nube a la vez (también entre pestañas, si el navegador tiene Web Locks). */
  private enCola<T>(fn: () => Promise<T>): Promise<T> {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
    const ejecutar = locks ? () => locks.request('appfit-copia-nube', fn) as Promise<T> : fn
    const resultado = this.cola.then(ejecutar, ejecutar)
    this.cola = resultado.catch(() => undefined)
    return resultado
  }

  // --- Arranque y sincronización ---

  /** Lee la sesión y el vínculo y, si todo está en orden, sincroniza comprobando la nube. */
  async iniciar(): Promise<void> {
    const vinculo = await this.d.dispositivo.leer()
    let usuario: { id: string; email: string } | null = null
    if (this.d.haySesionGuardada?.() !== false) {
      try {
        usuario = await (await this.d.nube()).usuario()
      } catch {
        usuario = null
      }
    }
    if (!usuario) {
      // Vinculado y sin sesión: caducó mientras la app estaba cerrada. Los cambios no se guardan hasta volver a entrar.
      const error = vinculo ? 'Tu sesión ha caducado. Vuelve a entrar para seguir guardando la copia.' : undefined
      this.poner({ fase: 'sin-sesion', email: vinculo?.email, ultimaCopia: vinculo?.ultimaCopia, error }, true)
      return
    }
    if (!vinculo || vinculo.userId !== usuario.id) {
      this.poner({ fase: 'sin-copia', email: usuario.email }, true)
      void this.marcarActividad()
      return
    }
    this.poner({ fase: vinculo.conflicto ? 'conflicto' : 'al-dia', email: vinculo.email, ultimaCopia: vinculo.ultimaCopia }, true)
    void this.marcarActividad()
    await this.sincronizar({ comprobarNube: true })
  }

  /**
   * Anota en la nube que la cuenta se usa hoy, como mucho una vez al día: las cuentas sin actividad en 12 meses se
   * borran (ADR 040). Sin sesión no hace nada; si falla (sin red), lo intenta la próxima vez.
   */
  async marcarActividad(): Promise<void> {
    if (this.estado.fase === 'cargando' || this.estado.fase === 'sin-sesion') return
    const hoy = toISODate(new Date(this.ahora()))
    if (this.actividadMarcada === hoy) return
    this.actividadMarcada = hoy
    try {
      await (await this.d.nube()).marcarActividad()
    } catch {
      this.actividadMarcada = undefined
    }
  }

  /** Hubo una escritura: la subida llegará con la espera del disparador. */
  marcarPendiente() {
    if (this.estado.fase === 'al-dia') this.poner({ fase: 'pendiente' })
  }

  /**
   * Sube los cambios de este dispositivo o trae los de otro. Con `comprobarNube` consulta antes la revisión de la nube
   * (al arrancar y al volver a la app); sin ella, el conflicto lo detecta la propia subida.
   */
  sincronizar({ comprobarNube = false } = {}): Promise<void> {
    return this.enCola(async () => {
      const vinculo = await this.d.dispositivo.leer()
      if (!vinculo) return
      if (vinculo.conflicto) {
        this.poner({ fase: 'conflicto' })
        return
      }
      const backup = await this.d.exportar()
      const huella = await huellaBackup(backup)
      try {
        const nube = await this.d.nube()
        const revisionRemota = comprobarNube ? (await nube.leerEstado())?.revision ?? null : undefined
        const accion = decidirCopia({ revisionLocal: vinculo.revision, huellaGuardada: vinculo.huella, huellaActual: huella, revisionRemota })
        if (accion === 'nada') {
          this.poner({ fase: 'al-dia' })
        } else if (accion === 'subir') {
          this.poner({ fase: 'subiendo' })
          const nueva = await nube.subir(vinculo.revision, await cifrarCopia(JSON.stringify(backup), vinculo.dek))
          if (nueva === null) {
            await this.d.dispositivo.actualizar({ conflicto: true })
            this.poner({ fase: 'conflicto' })
          } else {
            const ultimaCopia = this.ahora()
            await this.d.dispositivo.actualizar({ revision: nueva, huella, ultimaCopia })
            this.poner({ fase: 'al-dia', ultimaCopia })
          }
        } else if (accion === 'traer') {
          const copia = await nube.leerCopia()
          if (!copia) {
            this.poner({ fase: 'perdida' })
            return
          }
          await this.restaurar(copia, vinculo.dek, backup)
        } else if (accion === 'conflicto') {
          await this.d.dispositivo.actualizar({ conflicto: true })
          this.poner({ fase: 'conflicto' })
        } else {
          this.poner({ fase: 'perdida' })
        }
      } catch (e) {
        if (e instanceof BackupCambiadoError) {
          await this.d.dispositivo.actualizar({ conflicto: true })
          this.poner({ fase: 'conflicto' })
          return
        }
        this.fallo(e, huella !== vinculo.huella)
      }
    })
  }

  private fallo(e: unknown, hayCambios: boolean) {
    if (e instanceof NubeError && e.tipo === 'sin-conexion') {
      this.poner({ fase: hayCambios ? 'sin-conexion' : 'al-dia' })
    } else if (e instanceof NubeError && e.tipo === 'sesion') {
      this.poner({ fase: 'sin-sesion', error: e.message })
    } else {
      this.poner({ fase: 'error', error: e instanceof Error ? e.message : 'No se ha podido guardar la copia.' })
    }
  }

  /** Sustituye los datos de este dispositivo por la copia y devuelve la huella de lo que ha quedado. */
  private async importarCopia(copia: CopiaRemota, dek: CryptoKey, esperado?: BackupV3): Promise<string> {
    const importada = await this.d.importar(await descifrarCopia(copia.datos, dek), esperado)
    return huellaBackup(importada)
  }

  /** Con el dispositivo ya vinculado: trae la copia y deja anotado que ya están iguales. */
  private async restaurar(copia: CopiaRemota, dek: CryptoKey, esperado?: BackupV3) {
    const huella = await this.importarCopia(copia, dek, esperado)
    const ultimaCopia = this.ahora()
    await this.d.dispositivo.actualizar({ revision: copia.revision, huella, ultimaCopia, conflicto: undefined })
    this.poner({ fase: 'al-dia', ultimaCopia })
  }

  // --- Entrar ---

  async enviarCodigo(email: string): Promise<void> {
    await (await this.d.nube()).enviarCodigo(email.trim().toLowerCase())
  }

  /**
   * Comprueba el código. Si este dispositivo ya estaba vinculado a esa cuenta (la sesión había caducado), sigue sin
   * pedir la contraseña y devuelve `null`; si no, devuelve qué toca hacer.
   */
  async verificarCodigo(email: string, codigo: string): Promise<{ vinculo: Vinculo } | null> {
    const nube = await this.d.nube()
    await nube.verificarCodigo(email.trim().toLowerCase(), codigo.replace(/\s/g, ''))
    return this.prepararVinculo()
  }

  /** Tras verificar el código (o al reanudar con sesión y sin vincular): mira la nube y decide. */
  async prepararVinculo(): Promise<{ vinculo: Vinculo } | null> {
    const nube = await this.d.nube()
    const usuario = await nube.usuario()
    if (!usuario) throw new NubeError('Tu sesión ha caducado. Vuelve a entrar en tu cuenta.', 'sesion')
    const anterior = await this.d.dispositivo.leer()
    if (anterior && anterior.userId === usuario.id) {
      this.poner({ fase: anterior.conflicto ? 'conflicto' : 'al-dia', email: usuario.email, ultimaCopia: anterior.ultimaCopia }, true)
      void this.marcarActividad()
      void this.sincronizar({ comprobarNube: true })
      return null
    }
    // Otra cuenta: el vínculo anterior ya no vale (los datos del móvil se quedan).
    if (anterior) await this.d.dispositivo.borrar()
    const copia = await nube.leerCopia()
    this.pendiente = { userId: usuario.id, email: usuario.email, copia }
    this.poner({ fase: 'sin-copia', email: usuario.email }, true)
    void this.marcarActividad()
    return { vinculo: decidirVinculo(copia !== null, await this.d.hayDatos()) }
  }

  private exigirPendiente(): Pendiente {
    if (!this.pendiente) throw new NubeError('Vuelve a entrar en tu cuenta.', 'sesion')
    return this.pendiente
  }

  /** Cuenta sin copia: crea las claves, sube lo de este dispositivo y devuelve el código de recuperación. */
  crearCopia(contrasena: string): Promise<string> {
    return this.enCola(async () => {
      const p = this.exigirPendiente()
      const { dek, claves, codigo } = await crearClaves(contrasena, this.d.iteraciones)
      const revisionBase = p.copia?.revision ?? 0
      const backup = await this.d.exportar()
      const nueva = await (await this.d.nube()).subir(revisionBase, await cifrarCopia(JSON.stringify(backup), dek), claves)
      if (nueva === null) throw new NubeError('Otro dispositivo acaba de crear la copia de esta cuenta. Vuelve a entrar.')
      await this.vincular(p, dek, nueva, await huellaBackup(backup))
      return codigo
    })
  }

  /** Abre la copia de la nube con la contraseña o con la clave de recuperación. */
  async abrir(secreto: string, tipo: 'contrasena' | 'recuperacion'): Promise<void> {
    const p = this.exigirPendiente()
    if (!p.copia) throw new NubeError('Esta cuenta aún no tiene copia.')
    const envoltura = tipo === 'contrasena' ? p.copia.claves.contrasena : p.copia.claves.recuperacion
    p.dek = await desenvolver(envoltura, tipo === 'recuperacion' ? normalizarCodigo(secreto) : secreto, true)
    // Comprueba que la clave abre de verdad la copia antes de seguir.
    await descifrarCopia(p.copia.datos, p.dek)
    p.porRecuperacion = tipo === 'recuperacion'
  }

  /** Tras abrir con la clave de recuperación: nueva contraseña (la clave de recuperación sigue valiendo). */
  async nuevaContrasena(contrasena: string): Promise<void> {
    const p = this.exigirPendiente()
    if (!p.copia || !p.dek) throw new NubeError('Vuelve a escribir la clave de recuperación.')
    const claves: ClavesNube = { ...p.copia.claves, contrasena: await envolver(p.dek, contrasena, this.d.iteraciones) }
    await (await this.d.nube()).actualizarClaves(claves)
    p.copia = { ...p.copia, claves }
    p.porRecuperacion = false
  }

  /** Resúmenes para elegir entre la copia de la nube y los datos de este dispositivo. */
  async resumenes(): Promise<{ nube: ResumenCopia; local: ResumenCopia }> {
    const p = this.exigirPendiente()
    if (!p.copia || !p.dek) throw new NubeError('Vuelve a entrar en tu cuenta.')
    const remoto = JSON.parse(await descifrarCopia(p.copia.datos, p.dek)) as BackupV3
    return { nube: resumen(remoto, p.copia.actualizada), local: resumen(await this.d.exportar(), new Date(this.ahora()).toISOString()) }
  }

  /** Al entrar: la copia de la nube sustituye a los datos de este dispositivo. */
  traerCopia(): Promise<void> {
    return this.enCola(async () => {
      const p = this.exigirPendiente()
      if (!p.copia || !p.dek) throw new NubeError('Vuelve a entrar en tu cuenta.')
      // Primero se importa y después se vincula: si la importación falla, este dispositivo no queda vinculado con
      // datos que no son los de la nube (su siguiente subida los pisaría).
      const huella = await this.importarCopia(p.copia, p.dek)
      await this.vincular(p, p.dek, p.copia.revision, huella)
    })
  }

  /** Al entrar: los datos de este dispositivo sustituyen a la copia de la nube. */
  subirEstaCopia(): Promise<void> {
    return this.enCola(async () => {
      const p = this.exigirPendiente()
      if (!p.copia || !p.dek) throw new NubeError('Vuelve a entrar en tu cuenta.')
      const backup = await this.d.exportar()
      const nueva = await (await this.d.nube()).subir(p.copia.revision, await cifrarCopia(JSON.stringify(backup), p.dek))
      if (nueva === null) throw new NubeError('La copia de la nube acaba de cambiar desde otro dispositivo. Vuelve a entrar.')
      await this.vincular(p, p.dek, nueva, await huellaBackup(backup))
    })
  }

  /** Sin contraseña ni clave de recuperación: claves nuevas y la copia de este dispositivo pasa a ser la de la nube. */
  empezarDeCero(contrasena: string): Promise<string> {
    return this.enCola(async () => {
      const p = this.exigirPendiente()
      const { dek, claves, codigo } = await crearClaves(contrasena, this.d.iteraciones)
      const backup = await this.d.exportar()
      const nueva = await (await this.d.nube()).subir(p.copia?.revision ?? 0, await cifrarCopia(JSON.stringify(backup), dek), claves)
      if (nueva === null) throw new NubeError('La copia de la nube acaba de cambiar desde otro dispositivo. Vuelve a entrar.')
      await this.vincular(p, dek, nueva, await huellaBackup(backup))
      return codigo
    })
  }

  private async vincular(p: Pendiente, dek: CryptoKey, revision: number, huella: string) {
    const ultimaCopia = this.ahora()
    await this.d.dispositivo.guardar({ userId: p.userId, email: p.email, dek: await sinExportar(dek), revision, huella, ultimaCopia })
    this.pendiente = null
    this.poner({ fase: 'al-dia', email: p.email, ultimaCopia }, true)
  }

  // --- Con la cuenta abierta ---

  /** Conflicto: la persona elige qué copia se queda. */
  resolverConflicto(eleccion: 'traer' | 'subir'): Promise<void> {
    return this.enCola(async () => {
      const vinculo = await this.d.dispositivo.leer()
      if (!vinculo) return
      const nube = await this.d.nube()
      const copia = await nube.leerCopia()
      if (!copia) {
        this.poner({ fase: 'perdida' })
        return
      }
      if (eleccion === 'traer') {
        await this.restaurar(copia, vinculo.dek)
        return
      }
      const backup = await this.d.exportar()
      const huella = await huellaBackup(backup)
      const nueva = await nube.subir(copia.revision, await cifrarCopia(JSON.stringify(backup), vinculo.dek))
      if (nueva === null) throw new NubeError('La copia de la nube acaba de cambiar otra vez. Vuelve a intentarlo.')
      const ultimaCopia = this.ahora()
      await this.d.dispositivo.actualizar({ revision: nueva, huella, ultimaCopia, conflicto: undefined })
      this.poner({ fase: 'al-dia', ultimaCopia })
    })
  }

  /** Resumen de la copia de la nube frente a este dispositivo, para decidir un conflicto. */
  resumenesConflicto(): Promise<{ nube: ResumenCopia; local: ResumenCopia }> {
    return this.enCola(async () => {
      const vinculo = await this.d.dispositivo.leer()
      const copia = await (await this.d.nube()).leerCopia()
      if (!vinculo || !copia) throw new NubeError('La copia de la nube ya no está. Vuelve a entrar en tu cuenta.')
      const remoto = JSON.parse(await descifrarCopia(copia.datos, vinculo.dek)) as BackupV3
      return { nube: resumen(remoto, copia.actualizada), local: resumen(await this.d.exportar(), new Date(this.ahora()).toISOString()) }
    })
  }

  async cambiarContrasena(actual: string, nueva: string): Promise<void> {
    const nube = await this.d.nube()
    const copia = await nube.leerCopia()
    if (!copia) throw new NubeError('La copia de la nube ya no está. Vuelve a entrar en tu cuenta.')
    const dek = await desenvolver(copia.claves.contrasena, actual, true)
    await nube.actualizarClaves({ ...copia.claves, contrasena: await envolver(dek, nueva, this.d.iteraciones) })
  }

  /** Clave de recuperación nueva (la anterior deja de servir). Pide la contraseña. */
  async nuevaClaveRecuperacion(contrasena: string): Promise<string> {
    const nube = await this.d.nube()
    const copia = await nube.leerCopia()
    if (!copia) throw new NubeError('La copia de la nube ya no está. Vuelve a entrar en tu cuenta.')
    const dek = await desenvolver(copia.claves.contrasena, contrasena, true)
    const codigo = generarCodigoRecuperacion()
    await nube.actualizarClaves({ ...copia.claves, recuperacion: await envolver(dek, codigo, this.d.iteraciones) })
    return codigo
  }

  /** Cierra la sesión aquí. Los datos del dispositivo se quedan salvo que se pida borrarlos. */
  cerrarSesion(borrarDatos = false): Promise<void> {
    return this.enCola(async () => {
      await (await this.d.nube()).cerrarSesion()
      await this.d.dispositivo.borrar()
      this.pendiente = null
      if (borrarDatos) await this.d.borrarDatos()
      this.poner({ fase: 'sin-sesion' }, true)
    })
  }

  /** Borra la cuenta y su copia de la nube. Los datos de este dispositivo se quedan. */
  borrarCuenta(): Promise<void> {
    return this.enCola(async () => {
      await (await this.d.nube()).borrarCuenta()
      await this.d.dispositivo.borrar()
      this.pendiente = null
      this.poner({ fase: 'sin-sesion' }, true)
    })
  }
}
