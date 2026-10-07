// Acceso a la tabla `objetivosDia`: el objetivo de cada día, congelado por acciones del usuario (nunca en lecturas).
// Hoy y Resumen leen el snapshot del día si existe; si no, los objetivos vigentes de hoy.
import { db } from '../../../shared/db/db'
import type { Objetivos } from '../../../shared/db/types'
import { objetivosDelDia, objetivosMedios } from '../lib/objetivosDia'
import { todayISO } from '../../../shared/lib/dates'
import { calcularVigentes } from './perfilRepo'

/** Qué acción del usuario escribió el snapshot (informativo). */
export type OrigenObjetivoDia = 'entradas' | 'peso' | 'perfil' | 'ajustes'

function soloObjetivos(o: Objetivos): Objetivos {
  return { kcal: o.kcal, prot: o.prot, carb: o.carb, grasa: o.grasa }
}

/** Objetivos de un día: hoy, los vigentes en vivo; fechas pasadas, su snapshot o los vigentes. Solo lectura. */
export function objetivosDe(fecha: string, hoy: string): Promise<Objetivos & { congelado: boolean }> {
  return db.transaction('r', db.objetivosDia, db.settings, db.pesos, db.entries, async () => {
    // Hoy se calcula siempre en vivo: el snapshot solo manda para fechas pasadas.
    const snap = fecha === hoy ? undefined : await db.objetivosDia.where('fecha').equals(fecha).first()
    if (snap) return { ...objetivosDelDia(snap.objetivos, snap.objetivos), congelado: true }
    return { ...objetivosDelDia(undefined, await calcularVigentes(hoy)), congelado: false }
  })
}

/** Objetivo medio de varias fechas (cada una con su snapshot o los vigentes de `hoy`). Solo lectura. */
export function objetivosMediosDe(fechas: string[], hoy: string): Promise<Objetivos> {
  return db.transaction('r', db.objetivosDia, db.settings, db.pesos, db.entries, async () => {
    const filas = fechas.length ? (await db.objetivosDia.where('fecha').anyOf(fechas).toArray()).filter((f) => f.fecha !== hoy) : []
    return objetivosMedios(fechas, new Map(filas.map((f) => [f.fecha, f.objetivos])), soloObjetivos(await calcularVigentes(hoy)))
  })
}

/** Objetivos de cada fecha (snapshot o, sin él, los vigentes de `hoy`). Solo lectura. */
export function objetivosPorFecha(fechas: string[], hoy: string): Promise<Map<string, Objetivos>> {
  return db.transaction('r', db.objetivosDia, db.settings, db.pesos, db.entries, async () => {
    const filas = fechas.length ? (await db.objetivosDia.where('fecha').anyOf(fechas).toArray()).filter((f) => f.fecha !== hoy) : []
    const snaps = new Map(filas.map((f) => [f.fecha, f.objetivos]))
    const vigentes = soloObjetivos(await calcularVigentes(hoy))
    return new Map(fechas.map((f) => [f, objetivosDelDia(snaps.get(f), vigentes)]))
  })
}

/**
 * Congela el objetivo de `fecha` si todavía no hay uno (se llama al guardar comidas de esa fecha); para hoy hace upsert. El objetivo
 * es el vigente en ese momento. Acción del usuario: nunca se llama desde una lectura.
 */
export function congelar(fecha: string, hoy: string, origen: OrigenObjetivoDia = 'entradas'): Promise<void> {
  return db.transaction('rw', db.objetivosDia, db.settings, db.pesos, db.entries, async () => {
    const existente = await db.objetivosDia.where('fecha').equals(fecha).first()
    // Hoy se actualiza siempre (refleja la última acción del día); una fecha pasada solo se congela una vez.
    if (existente && fecha !== hoy) return
    if (fecha === hoy) {
      const v = soloObjetivos(await calcularVigentes(hoy))
      if (existente) await db.objetivosDia.update(existente.id, { objetivos: v, origen })
      else await db.objetivosDia.add({ fecha, objetivos: v, origen })
      return
    }
    const vigentes = soloObjetivos(await calcularVigentes(fecha <= hoy ? hoy : fecha))
    await db.objetivosDia.add({ fecha, objetivos: vigentes, origen })
  })
}

/** Actualiza (o crea) el objetivo de hoy con los vigentes actuales: registrar peso, editar perfil, ajustes u objetivos. */
export function actualizarHoy(hoy: string, origen: OrigenObjetivoDia): Promise<void> {
  return db.transaction('rw', db.objetivosDia, db.settings, db.pesos, db.entries, async () => {
    const vigentes = soloObjetivos(await calcularVigentes(hoy))
    const existente = await db.objetivosDia.where('fecha').equals(hoy).first()
    if (existente) await db.objetivosDia.update(existente.id, { objetivos: vigentes, origen })
    else await db.objetivosDia.add({ fecha: hoy, objetivos: vigentes, origen })
  })
}

/** `congelar` para usar tras una acción del usuario: un fallo aquí nunca debe estropear la acción principal. */
export function congelarObjetivoDia(fecha: string, hoy: string = todayISO()): Promise<void> {
  return congelar(fecha, hoy, 'entradas').catch(() => undefined)
}

/** `actualizarHoy` con la misma garantía. */
export function actualizarObjetivoHoy(hoy: string, origen: OrigenObjetivoDia): Promise<void> {
  return actualizarHoy(hoy, origen).catch(() => undefined)
}
