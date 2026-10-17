import { describe, expect, it } from 'vitest'
import { crearDiagnostico, registrarErrorDiagnostico, ultimoErrorDiagnostico } from './diagnostico'
describe('diagnóstico revisable y local', () => {
  it('solo incluye los campos técnicos permitidos y los pasos elegidos por la persona', () => {
    const texto = crearDiagnostico({ version: 'qa', compilacion: '2026-10-17', navegador: 'WebKit', idioma: 'es', ancho: 375, alto: 667, enLinea: false, instalada: true, error: { tipo: 'operacion', fecha: 'hoy' }, email: 'privado@example.com', registros: ['dato privado'], url: 'https://app/?token=secreto' } as Parameters<typeof crearDiagnostico>[0], 'Abrí el historial')
    expect(texto).toContain('375 × 667'); expect(texto).toContain('Abrí el historial'); expect(texto).toContain('Error de operación (hoy)')
    for (const secreto of ['privado@example.com', 'dato privado', 'secreto']) expect(texto).not.toContain(secreto)
  })
  it('conserva únicamente categoría y fecha del último error, devolviendo una copia', () => {
    registrarErrorDiagnostico('ejecucion', '2026-10-17T12:00:00Z')
    const error = ultimoErrorDiagnostico()!; error.tipo = 'promesa'
    expect(ultimoErrorDiagnostico()?.tipo).toBe('ejecucion')
  })
})
