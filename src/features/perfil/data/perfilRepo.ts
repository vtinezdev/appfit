// Acceso al perfil energético: vive en `Settings.perfil` (registro único) y el peso sale del último pesaje.
// Las lecturas no escriben (se usan en useLiveQuery); lo derivado (edad, TMB, GET, objetivo) nunca se guarda.
import { db } from '../../../shared/db/db'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import type { Peso, Perfil } from '../../../shared/db/types'
import { ultimoHasta } from '../../inicio/data/pesosRepo'
import { addDays } from '../../../shared/lib/dates'
import { calcularEnergia, type ResultadoEnergia } from '../lib/energia'
import { calcularGastoObservado, DIAS_VENTANA, type GastoObservado } from '../lib/gastoObservado'
import { objetivosVigentes as derivarObjetivos, type ObjetivosVigentes } from '../lib/objetivosVigentes'
import { normalizarPerfil } from '../lib/validacionPerfil'
import { ajusteProteina } from '../lib/proteina'

export interface EstadoEnergetico {
  perfil: Perfil
  /** Último pesaje con fecha ≤ hoy. */
  peso: Peso | undefined
  energia: ResultadoEnergia
  /** Gasto observado (según lo comido y la tendencia del peso); puede ser insuficiente. */
  observado: GastoObservado
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
  return db.transaction('r', db.settings, db.pesos, db.entries, async () => {
    const [settings, peso, observado] = await Promise.all([getSettings(), ultimoHasta(hoy), leerGastoObservado(hoy)])
    const perfil = normalizarPerfil(settings.perfil)
    return { perfil, peso, observado, energia: calcularEnergia(perfil, peso?.kg, hoy, observado.estado === 'ok' ? observado.gastoExacto : null) }
  })
}

/** Gasto observado a fecha `hoy`: kcal registradas y pesajes de las últimas semanas. Solo lectura, sin transacción propia. */
export async function leerGastoObservado(hoy: string): Promise<GastoObservado> {
  const desde = addDays(hoy, -DIAS_VENTANA)
  const [entries, pesos] = await Promise.all([
    db.entries.where('fecha').between(desde, addDays(hoy, -1), true, true).toArray(),
    db.pesos.where('fecha').between(addDays(desde, -7), hoy, true, true).toArray(),
  ])
  const kcalPorDia = new Map<string, number>()
  for (const e of entries) kcalPorDia.set(e.fecha, (kcalPorDia.get(e.fecha) ?? 0) + e.kcal)
  return calcularGastoObservado({ hoy, kcalPorDia, pesos })
}

/** Objetivos que usa toda la app: los del perfil si manda, si no los manuales de Ajustes. Solo lectura. */
export function objetivosVigentes(hoy: string): Promise<ObjetivosVigentes> {
  return db.transaction('r', db.settings, db.pesos, db.entries, () => calcularVigentes(hoy))
}

/** Como `objetivosVigentes`, sin abrir transacción: para usarla dentro de otra (p. ej. al congelar el objetivo de un día). */
export async function calcularVigentes(fecha: string): Promise<ObjetivosVigentes> {
  const [settings, peso] = await Promise.all([getSettings(), ultimoHasta(fecha)])
  const perfil = normalizarPerfil(settings.perfil)
  // Solo se lee el historial de comidas si la persona ha activado el gasto observado.
  const observado = perfil.usarGastoObservado === true ? await leerGastoObservado(fecha) : null
  const energia = calcularEnergia(perfil, peso?.kg, fecha, observado?.estado === 'ok' ? observado.gastoExacto : null)
  return derivarObjetivos(settings.objetivos, energia, ajusteProteina(settings.perfil, peso?.kg))
}
