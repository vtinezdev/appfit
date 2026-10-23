/** Ficha de técnica de un ejercicio (ENT-09): tres claves de ejecución y dos errores comunes, en una frase cada uno. */
export interface FichaTecnica {
  claves: readonly [string, string, string]
  errores: readonly [string, string]
}
