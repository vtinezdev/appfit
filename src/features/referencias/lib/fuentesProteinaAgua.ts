// Fuentes de la proteína por kg (Perfil) y del objetivo de agua (Inicio). Es el registro que pinta Referencias › Proteína y agua.
// DOI, título y año cotejados con Crossref al implementar (2026-10-07); las cifras, con el texto de cada fuente. Lo que no
// se pudo comprobar lo dice `noVerificado`.

export interface FuenteProteinaAgua {
  id: string
  autores: string
  anio: number
  titulo: string
  publicacion: string
  doi: string
  /** Qué toma AppFit de esta fuente. */
  uso: string
  /** Cómo se comprobó. */
  verificado: string
  /** Lo que no se pudo comprobar. */
  noVerificado?: string
}

export const FUENTES_PROTEINA_AGUA = [
  { id: 'morton2018', autores: 'Morton RW, Murphy KT, McKellar SR, Schoenfeld BJ, Henselmans M, Helms E, Aragon AA, Devries MC, Banfield L, Krieger JW, Phillips SM', anio: 2018,
    titulo: 'A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults',
    publicacion: 'Br J Sports Med 52(6):376–384', doi: '10.1136/bjsports-2017-097608',
    uso: 'Límite inferior del rango (1,6 g/kg/día) y su extremo superior (2,2 g/kg/día): el punto de corte estimado fue 1,62 g/kg/día con un IC 95 % de 1,03 a 2,20 g/kg/día, y los autores sugieren ~2,2 como cifra prudente.',
    verificado: 'DOI, título, revista y año con Crossref; 1,62 (1,03–2,20) g/kg/día con el texto completo del artículo (PubMed Central).',
    noVerificado: 'El punto de corte no fue estadísticamente significativo (p = 0,079) y procede de personas que entrenan fuerza con suplementación de proteína.' },
  { id: 'jager2017', autores: 'Jäger R, Kerksick CM, Campbell BI, Cribb PJ, Wells SD, Skwiat TM, Purpura M, Ziegenfuss TN, Ferrando AA, Arent SM, Smith-Ryan AE, Stout JR, Arciero PJ, Ormsbee MJ, Taylor LW, Wilborn CD, Kalman DS, Kreider RB, Willoughby DS, Hoffman JR, Krzykowski JL, Antonio J', anio: 2017,
    titulo: 'International Society of Sports Nutrition Position Stand: protein and exercise',
    publicacion: 'J Int Soc Sports Nutr 14:20', doi: '10.1186/s12970-017-0177-8',
    uso: 'Contexto: 1,4–2,0 g/kg/día de proteína es suficiente para la mayoría de las personas que hacen ejercicio, y cantidades mayores pueden hacer falta al restringir calorías.',
    verificado: 'DOI, título, revista y año con Crossref; 1,4–2,0 g/kg/día con el texto del artículo.' },
  { id: 'efsa2010agua', autores: 'EFSA NDA Panel (Panel on Dietetic Products, Nutrition and Allergies)', anio: 2010,
    titulo: 'Scientific Opinion on Dietary Reference Values for water',
    publicacion: 'EFSA Journal 8(3):1459', doi: '10.2903/j.efsa.2010.1459',
    uso: 'Ingesta adecuada de agua total para adultos: 2,0 L/día (mujeres) y 2,5 L/día (hombres), incluida el agua de los alimentos, para temperatura ambiente moderada y actividad física moderada (PAL 1,6).',
    verificado: 'DOI, título, revista y año con Crossref; 2,0 y 2,5 L/día y las condiciones de aplicación con el resumen de la página de EFSA (copia archivada: efsa.europa.eu rechazó la consulta directa desde el entorno de desarrollo).',
    noVerificado: 'Qué parte del agua total aportan los alimentos: el resumen no da un porcentaje. El 20 % que AppFit descuenta para llegar a 1,6 L y 2,0 L de bebida es un criterio propio, no una cifra de EFSA.' },
] as const satisfies readonly FuenteProteinaAgua[]
