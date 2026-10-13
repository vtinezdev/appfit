import type { ClavesNube } from '../lib/cifrado'

/**
 * Lo que la app necesita de la nube (Supabase en `nubeSupabase.ts`; en los tests, una nube en memoria). Nada de lo que
 * pasa por aquí va en claro: `datos` es la copia ya cifrada y `claves`, la clave de los datos envuelta.
 */
export interface Nube {
  enviarCodigo(email: string): Promise<void>
  verificarCodigo(email: string, codigo: string): Promise<void>
  /** Usuario con sesión en este dispositivo, sin pedir nada a la red. */
  usuario(): Promise<{ id: string; email: string } | null>
  /** Cierra la sesión solo en este dispositivo. */
  cerrarSesion(): Promise<void>
  /** Revisión de la copia de la nube, o null si la cuenta aún no tiene copia. */
  leerEstado(): Promise<EstadoRemoto | null>
  leerCopia(): Promise<CopiaRemota | null>
  /** Sube si la nube sigue en `revisionBase` (0 = primera copia). Devuelve la revisión nueva, o null si hay conflicto. */
  subir(revisionBase: number, datos: string, claves?: ClavesNube): Promise<number | null>
  actualizarClaves(claves: ClavesNube): Promise<void>
  borrarCuenta(): Promise<void>
}

export interface EstadoRemoto {
  revision: number
  /** ISO 8601. */
  actualizada: string
}

export interface CopiaRemota extends EstadoRemoto {
  datos: string
  claves: ClavesNube
}

/** Error de la nube con el mensaje ya pensado para la persona. */
export class NubeError extends Error {
  readonly tipo: 'sin-conexion' | 'sesion' | 'otro'
  constructor(mensaje: string, tipo: NubeError['tipo'] = 'otro') {
    super(mensaje)
    this.tipo = tipo
  }
}
