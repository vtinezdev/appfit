// Claves de AppFit de cada ejercicio del catálogo (ENT-09): tres claves de ejecución y dos errores comunes. Aparte del
// catálogo para no engordar el arranque: solo se carga (con `import()`) al abrir una ficha. Clave = id del catálogo
// sin «appfit:». Textos redactados por AppFit; orientativos, no sustituyen a quien te entrena.
import { BRAZOS } from './fichas/brazos'
import { CADERA_GEMELOS } from './fichas/caderaGemelos'
import { CORE } from './fichas/core'
import { ESPALDA } from './fichas/espalda'
import { HOMBROS } from './fichas/hombros'
import { PECHO } from './fichas/pecho'
import { PIERNAS } from './fichas/piernas'
import type { FichaTecnica } from './fichas/tipos'

export type { FichaTecnica }

export const FICHAS: Record<string, FichaTecnica> = { ...PECHO, ...ESPALDA, ...HOMBROS, ...BRAZOS, ...PIERNAS, ...CADERA_GEMELOS, ...CORE }
