// Lee las tablas del usuario y las descarga como CSV (misma descarga que el backup). Solo lectura.
import { db } from '../db/db'
import { csvAgua, csvComidas, csvMedidas, csvPesos, csvSeries } from './csv'

export type TablaCsv = 'comidas' | 'pesos' | 'series' | 'agua' | 'medidas'

export const TABLAS_CSV: { tabla: TablaCsv; etiqueta: string }[] = [
  { tabla: 'comidas', etiqueta: 'Comidas' },
  { tabla: 'pesos', etiqueta: 'Pesos' },
  { tabla: 'series', etiqueta: 'Series de entreno' },
  { tabla: 'agua', etiqueta: 'Agua' },
  { tabla: 'medidas', etiqueta: 'Medidas corporales' },
]

/** Contenido CSV de una tabla (lectura coherente en una transacción). */
export function generarCsv(tabla: TablaCsv): Promise<string> {
  switch (tabla) {
    case 'comidas': return db.entries.toArray().then(csvComidas)
    case 'pesos': return db.pesos.toArray().then(csvPesos)
    case 'agua': return db.agua.toArray().then(csvAgua)
    case 'medidas': return db.medidas.toArray().then(csvMedidas)
    case 'series':
      return db.transaction('r', db.sets, db.workouts, db.exercises, async () =>
        csvSeries(await db.sets.toArray(), await db.workouts.toArray(), await db.exercises.toArray()))
  }
}

/** Descarga un texto como archivo (como `descargarBackup`). */
export function descargarTexto(nombre: string, contenido: string, tipo: string): void {
  const blob = new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

/** Genera y descarga el CSV de una tabla: `appfit-comidas-2026-10-07.csv`. */
export async function descargarCsv(tabla: TablaCsv, hoy: string): Promise<void> {
  descargarTexto(`appfit-${tabla}-${hoy}.csv`, await generarCsv(tabla), 'text/csv;charset=utf-8')
}
