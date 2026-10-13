import type { ClavesNube } from '../../features/cuenta/lib/cifrado'
import { NubeError, type CopiaRemota, type Nube } from '../../features/cuenta/data/nube'

/** Supabase en memoria para los tests: cuentas por email, código fijo y la misma regla de revisión que `subir_copia`. */
export class ServidorFalso {
  static readonly CODIGO = '123456'
  usuarios = new Map<string, string>()
  copias = new Map<string, CopiaRemota & { anterior?: string }>()
  sinConexion = false
  private reloj = 0

  /** Cada dispositivo tiene su propia sesión. */
  nube(): Nube {
    let sesion: { id: string; email: string } | null = null
    const red = () => {
      if (this.sinConexion) throw new NubeError('Sin conexión', 'sin-conexion')
    }
    const exigir = () => {
      red()
      if (!sesion) throw new NubeError('Sin sesión', 'sesion')
      return sesion.id
    }
    return {
      enviarCodigo: async () => red(),
      verificarCodigo: async (email, codigo) => {
        red()
        if (codigo !== ServidorFalso.CODIGO) throw new NubeError('El código no es correcto o ha caducado.')
        if (!this.usuarios.has(email)) this.usuarios.set(email, `u-${this.usuarios.size + 1}`)
        sesion = { id: this.usuarios.get(email)!, email }
      },
      usuario: async () => sesion,
      cerrarSesion: async () => {
        sesion = null
      },
      leerEstado: async () => {
        const c = this.copias.get(exigir())
        return c ? { revision: c.revision, actualizada: c.actualizada } : null
      },
      leerCopia: async () => {
        const c = this.copias.get(exigir())
        return c ? { revision: c.revision, actualizada: c.actualizada, datos: c.datos, claves: c.claves } : null
      },
      subir: async (base, datos, claves?: ClavesNube) => {
        const id = exigir()
        const actual = this.copias.get(id)
        const actualizada = new Date(Date.UTC(2026, 9, 13, 10, this.reloj++)).toISOString()
        if (base === 0) {
          if (actual || !claves) return null
          this.copias.set(id, { revision: 1, actualizada, datos, claves })
          return 1
        }
        if (!actual || actual.revision !== base) return null
        this.copias.set(id, { revision: base + 1, actualizada, datos, claves: claves ?? actual.claves, anterior: actual.datos })
        return base + 1
      },
      actualizarClaves: async (claves) => {
        const c = this.copias.get(exigir())
        if (c) c.claves = claves
      },
      borrarCuenta: async () => {
        const id = exigir()
        this.copias.delete(id)
        for (const [email, uid] of this.usuarios) if (uid === id) this.usuarios.delete(email)
        sesion = null
      },
    }
  }
}
