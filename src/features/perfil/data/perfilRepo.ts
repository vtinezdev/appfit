// Acceso al perfil energético: vive en `Settings.perfil` (registro único) y el peso sale del último pesaje.
// Las lecturas no escriben (se usan en useLiveQuery); lo derivado (edad, TMB, GET, objetivo) nunca se guarda.
import { db } from '../../../shared/db/db'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import type { Peso, Perfil } from '../../../shared/db/types'
import { ultimoHasta } from '../../inicio/data/pesosRepo'
import { calcularEnergia, type ResultadoEnergia } from '../lib/energia'
import { objetivosVigentes as derivarObjetivos, type ObjetivosVigentes } from '../lib/objetivosVigentes'
import { normalizarPerfil } from '../lib/validacionPerfil'

export interface EstadoEnergetico {
  perfil: Perfil
  /** Último pesaje con fecha ≤ hoy. */
  peso: Peso | undefined
  energia: ResultadoEnergia
}

/** Perfil guardado, saneado al leer (campos inválidos de un backup se descartan sin escribir). */
export async function getPerfil(): Promise<Perfil> {
  return normalizarPerfil((await getSettings()).perfil)
}

/** Guarda por partes: un campo con valor `undefined` en el parche se borra. Un perfil que queda vacío se elimina. */
export function guardarPerfil(patch: Partial<Perfil>): Promise<Perfil> {
  return db.transaction('rw', db.settings, async () => {
    const actual = normalizarPerfil((await getSettings()).perfil)
    const siguiente = normalizarPerfil({ ...actual, ...patch })
    await updateSettings({ perfil: Object.keys(siguiente).length > 0 ? siguiente : undefined })
    return siguiente
  })
}

/** Borra solo los datos del perfil (no los pesajes). Devuelve lo que había para poder deshacer. */
export function borrarPerfil(): Promise<Perfil> {
  return db.transaction('rw', db.settings, async () => {
    const anterior = normalizarPerfil((await getSettings()).perfil)
    await updateSettings({ perfil: undefined })
    return anterior
  })
}

export async function restaurarPerfil(perfil: Perfil): Promise<void> {
  await guardarPerfil(perfil)
}

/** Foto coherente de perfil, peso y estimación a fecha `hoy`. Solo lectura. */
export function estadoEnergetico(hoy: string): Promise<EstadoEnergetico> {
  return db.transaction('r', db.settings, db.pesos, async () => {
    const [settings, peso] = await Promise.all([getSettings(), ultimoHasta(hoy)])
    const perfil = normalizarPerfil(settings.perfil)
    return { perfil, peso, energia: calcularEnergia(perfil, peso?.kg, hoy) }
  })
}

/** Objetivos que usa toda la app: los del perfil si manda, si no los manuales de Ajustes. Solo lectura. */
export function objetivosVigentes(hoy: string): Promise<ObjetivosVigentes> {
  return db.transaction('r', db.settings, db.pesos, async () => {
    const [settings, peso] = await Promise.all([getSettings(), ultimoHasta(hoy)])
    const energia = calcularEnergia(normalizarPerfil(settings.perfil), peso?.kg, hoy)
    return derivarObjetivos(settings.objetivos, energia)
  })
}
