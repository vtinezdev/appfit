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
  ancho: number; alto: number; enLinea: boolean; modo: 'app-android' | 'instalada' | 'navegador'; error: ErrorDiagnostico | null
  /** Medidas de pantalla (`design/viewport.lineasMedidas`), para lo que se vea cortado. */
  medidas?: readonly (readonly [string, string])[]
}

const MODOS = { 'app-android': 'app de Google Play', instalada: 'app instalada desde la web', navegador: 'navegador' } as const

export function crearDiagnostico(e: EntornoDiagnostico, pasos: string): string {
  const tipos = { operacion: 'Error de operación', ejecucion: 'Error de ejecución', promesa: 'Operación no controlada' }
  return [
    'Diagnóstico de Cumbra Fit', `Versión: ${e.version}`, `Compilación: ${e.compilacion}`,
    `Sistema: ${e.navegador}`, `Idioma: ${e.idioma}`, `Pantalla de la app: ${e.ancho} × ${e.alto} px`,
    `Conexión: ${e.enLinea ? 'con conexión' : 'sin conexión'}`,
    `Abierta como: ${MODOS[e.modo]}`,
    ...(e.medidas?.length ? ['Medidas de pantalla (px):', ...e.medidas.map(([nombre, valor]) => `  ${nombre}: ${valor}`)] : []),
    `Último error de esta sesión: ${e.error ? `${tipos[e.error.tipo]} (${e.error.fecha})` : 'ninguno registrado'}`,
    '', 'Pasos y comportamiento esperado/observado:', pasos.trim() || '(pendiente de describir)',
  ].join('\n')
}
