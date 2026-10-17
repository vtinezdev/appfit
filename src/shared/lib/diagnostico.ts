export type TipoErrorDiagnostico = 'operacion' | 'ejecucion' | 'promesa'
export interface ErrorDiagnostico { tipo: TipoErrorDiagnostico; fecha: string }
let ultimo: ErrorDiagnostico | null = null
let iniciado = false

/** Solo categoría y momento, en memoria: nunca mensajes, stacks, URLs ni registros personales. */
export function registrarErrorDiagnostico(tipo: TipoErrorDiagnostico, fecha = new Date().toISOString()) { ultimo = { tipo, fecha } }
export function ultimoErrorDiagnostico(): ErrorDiagnostico | null { return ultimo ? { ...ultimo } : null }
export function iniciarDiagnostico() {
  if (iniciado) return
  iniciado = true
  window.addEventListener('error', () => registrarErrorDiagnostico('ejecucion'))
  window.addEventListener('unhandledrejection', () => registrarErrorDiagnostico('promesa'))
}

export interface EntornoDiagnostico {
  version: string; compilacion: string; navegador: string; idioma: string
  ancho: number; alto: number; enLinea: boolean; instalada: boolean; error: ErrorDiagnostico | null
}

export function crearDiagnostico(e: EntornoDiagnostico, pasos: string): string {
  const tipos = { operacion: 'Error de operación', ejecucion: 'Error de ejecución', promesa: 'Operación no controlada' }
  return [
    'Diagnóstico de AppFit', `Versión: ${e.version}`, `Compilación: ${e.compilacion}`,
    `Navegador: ${e.navegador}`, `Idioma: ${e.idioma}`, `Pantalla de la app: ${e.ancho} × ${e.alto} px`,
    `Conexión declarada por el navegador: ${e.enLinea ? 'con conexión' : 'sin conexión'}`,
    `Modo: ${e.instalada ? 'pantalla de inicio' : 'navegador'}`,
    `Último error de esta sesión: ${e.error ? `${tipos[e.error.tipo]} (${e.error.fecha})` : 'ninguno registrado'}`,
    '', 'Pasos y comportamiento esperado/observado:', pasos.trim() || '(pendiente de describir)',
  ].join('\n')
}
