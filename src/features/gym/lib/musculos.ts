/** Identificadores compartidos por catálogo, cálculo, snapshots y mapa. Completo es una categoría, no una zona anatómica. */
export const MUSCULOS = {
  pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps',
  antebrazo: 'Antebrazo', cuadriceps: 'Cuádriceps', isquiotibiales: 'Isquiotibiales', gluteos: 'Glúteos',
  gemelos: 'Gemelos', core: 'Core', completo: 'Cuerpo completo',
} as const
export type Musculo = keyof typeof MUSCULOS
export type ZonaMuscular = Exclude<Musculo, 'completo'>
export const ZONAS_MUSCULARES = Object.keys(MUSCULOS).filter(m => m !== 'completo') as ZonaMuscular[]
