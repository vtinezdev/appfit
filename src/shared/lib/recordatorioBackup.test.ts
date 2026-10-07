import { describe, expect, it } from 'vitest'
import { DIAS_POSPONER_BACKUP, necesitaRecordatorioBackup, posponerHasta } from './recordatorioBackup'

const DIA = 86_400_000
const AHORA = 100 * DIA

describe('necesitaRecordatorioBackup', () => {
  it('sin datos nunca recuerda', () => {
    expect(necesitaRecordatorioBackup(undefined, false, AHORA)).toBe(false)
  })
  it('nunca exportado con datos recuerda', () => {
    expect(necesitaRecordatorioBackup(undefined, true, AHORA)).toBe(true)
  })
  it('respeta el umbral (14 días por defecto, configurable)', () => {
    expect(necesitaRecordatorioBackup(AHORA - 13 * DIA, true, AHORA)).toBe(false)
    expect(necesitaRecordatorioBackup(AHORA - 14 * DIA, true, AHORA)).toBe(true)
    expect(necesitaRecordatorioBackup(AHORA - 5 * DIA, true, AHORA, 7)).toBe(false)
    expect(necesitaRecordatorioBackup(AHORA - 8 * DIA, true, AHORA, 7)).toBe(true)
  })
  it('«Más tarde» pospone 3 días y luego vuelve', () => {
    const hasta = posponerHasta(AHORA)
    expect(hasta - AHORA).toBe(DIAS_POSPONER_BACKUP * DIA)
    expect(necesitaRecordatorioBackup(undefined, true, AHORA + DIA, 14, hasta)).toBe(false)
    expect(necesitaRecordatorioBackup(undefined, true, hasta, 14, hasta)).toBe(true)
  })
})
