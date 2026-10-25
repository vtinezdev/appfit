// Registro de citas de la estimación energética. Es la fuente que pinta Referencias › Energía y objetivo.
// DOI y títulos cotejados con Crossref al implementar; los coeficientes de las ecuaciones, con una fuente secundaria
// (no con los artículos originales). Lo que no se pudo comprobar lo dice `nota`.

export interface FuenteEnergia {
  id: string
  autores: string
  anio: number
  titulo: string
  publicacion: string
  /** DOI sin prefijo URL. */
  doi?: string
  url?: string
  /** Qué toma AppFit de esta fuente. */
  uso: string
  /** Limitación o verificación pendiente. */
  nota?: string
}

export const FUENTES_ENERGIA = [
  { id: 'harrisBenedict1918', autores: 'Harris JA, Benedict FG', anio: 1918, titulo: 'A Biometric Study of Human Basal Metabolism',
    publicacion: 'Proc Natl Acad Sci USA 4(12):370–373', doi: '10.1073/pnas.4.12.370',
    uso: 'Origen histórico de la ecuación (239 personas, Boston 1909–1914; ampliada en Carnegie Inst. Publ. 279, 1919). AppFit no la implementa: sobreestima en población actual.' },
  { id: 'rozaShizgal1984', autores: 'Roza AM, Shizgal HM', anio: 1984, titulo: 'The Harris Benedict equation reevaluated: resting energy requirements and the body cell mass',
    publicacion: 'Am J Clin Nutr 40(1):168–182', doi: '10.1093/ajcn/40.1.168',
    uso: 'Coeficientes de la ecuación de Harris-Benedict revisada que AppFit promedia con Mifflin-St Jeor.' },
  { id: 'mifflin1990', autores: 'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO', anio: 1990, titulo: 'A new predictive equation for resting energy expenditure in healthy individuals',
    publicacion: 'Am J Clin Nutr 51(2):241–247', doi: '10.1093/ajcn/51.2.241',
    uso: 'Ecuación de gasto en reposo (498 adultos sanos de 19–78 años, calorimetría indirecta) que AppFit promedia con la de Roza-Shizgal.' },
  { id: 'frankenfield2005', autores: 'Frankenfield D, Roth-Yousey L, Compher C', anio: 2005, titulo: 'Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults: a systematic review',
    publicacion: 'J Am Diet Assoc 105(5):775–789', doi: '10.1016/j.jada.2005.02.005',
    uso: 'Contexto: señala a Mifflin-St Jeor como la ecuación más fiable de las comparadas (cerca del 80 % dentro del ±10 % de lo medido en no obesos).' },
  { id: 'henry2005', autores: 'Henry CJK', anio: 2005, titulo: 'Basal metabolic rate studies in humans: measurement and development of new equations',
    publicacion: 'Public Health Nutr 8(7A):1133–1152', doi: '10.1079/PHN2005801',
    uso: 'Contexto: ecuación que usa EFSA para valores poblacionales; menos validada para estimar a una persona. AppFit no la usa.' },
  { id: 'tenHaaf2014', autores: 'ten Haaf T, Weijs PJM', anio: 2014, titulo: 'Resting energy expenditure prediction in recreational athletes of 18–35 years: confirmation of Cunningham equation and an improved weight-based alternative',
    publicacion: 'PLoS One 9(10):e108460', doi: '10.1371/journal.pone.0108460',
    uso: 'Limitación: en deportistas con mucha masa magra las ecuaciones por peso y talla pueden quedarse cortas.' },
  { id: 'mcArdle1996', autores: 'McArdle WD, Katch FI, Katch VL', anio: 1996, titulo: 'Exercise Physiology: Energy, Nutrition, and Human Performance (4.ª ed.)',
    publicacion: 'Williams & Wilkins',
    uso: 'Atribución de los multiplicadores de actividad 1,2 · 1,375 · 1,55 · 1,725 · 1,9: convención de uso extendido.',
    nota: 'No verificado: no se ha podido comprobar la edición ni la página del manual, ni localizar una derivación experimental publicada de los factores. Se presentan como convención, no como método validado.' },
  { id: 'fao2004', autores: 'FAO/OMS/UNU', anio: 2004, titulo: 'Human energy requirements: report of a Joint FAO/WHO/UNU Expert Consultation',
    publicacion: 'FAO Food and Nutrition Technical Report Series 1', url: 'https://www.fao.org/4/y5686e/y5686e00.htm',
    uso: 'Contexto: niveles de actividad física (PAL) 1,40–1,69 · 1,70–1,99 · 2,00–2,40; un PAL inferior a 1,40 solo es propio de personas encamadas.' },
  { id: 'efsa2013', autores: 'EFSA NDA Panel', anio: 2013, titulo: 'Scientific Opinion on Dietary Reference Values for energy',
    publicacion: 'EFSA Journal 11(1):3005', doi: '10.2903/j.efsa.2013.3005',
    uso: 'Contexto: PAL de referencia 1,4 · 1,6 · 1,8 · 2,0.' },
  { id: 'helms2014', autores: 'Helms ER, Aragon AA, Fitschen PJ', anio: 2014, titulo: 'Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation',
    publicacion: 'J Int Soc Sports Nutr 11:20', doi: '10.1186/1550-2783-11-20',
    uso: 'Contexto del rango de definición: perder 0,5–1 % del peso por semana para conservar músculo (de ahí el aviso por encima del 1 %).' },
  { id: 'garthe2011', autores: 'Garthe I, Raastad T, Refsnes PE, Koivisto A, Sundgot-Borgen J', anio: 2011, titulo: 'Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes',
    publicacion: 'Int J Sport Nutr Exerc Metab 21(2):97–104', doi: '10.1123/ijsnem.21.2.97',
    uso: 'Contexto: en deportistas, perder 0,7 % del peso por semana conservó mejor la masa magra que 1,4 %.' },
  { id: 'iraki2019', autores: 'Iraki J, Fitschen P, Espinar S, Helms E', anio: 2019, titulo: 'Nutrition recommendations for bodybuilders in the off-season: a narrative review',
    publicacion: 'Sports 7(7):154', doi: '10.3390/sports7070154',
    uso: 'Contexto del rango de volumen: superávit de +10–20 % y ganancia de 0,25–0,5 % del peso por semana.' },
  { id: 'slater2019', autores: 'Slater GJ, Dieter BP, Marsh DJ, Helms ER, Shaw G, Iraki J', anio: 2019, titulo: 'Is an energy surplus required to maximize skeletal muscle hypertrophy associated with resistance training?',
    publicacion: 'Front Nutr 6:131', doi: '10.3389/fnut.2019.00131',
    uso: 'Contexto del rango de volumen: empezar con +1.500–2.000 kJ/día (unas 360–480 kcal).' },
  { id: 'hall2008', autores: 'Hall KD', anio: 2008, titulo: 'What is the required energy deficit per unit weight loss?',
    publicacion: 'Int J Obes 32(3):573–576', doi: '10.1038/sj.ijo.0803720',
    uso: 'Advertencia: 7.700 kcal por kg es una aproximación que pierde validez con el tiempo; el ritmo mostrado es orientativo.' },
  { id: 'nice', autores: 'NICE', anio: 2025, titulo: 'Overweight and obesity management (NG246; sustituye a CG189)',
    publicacion: 'National Institute for Health and Care Excellence', url: 'https://www.nice.org.uk/guidance/ng246',
    uso: 'Contexto: déficit de unas 600 kcal/día ≈ 0,5 kg/semana y dietas de muy bajo valor calórico solo con supervisión (suelo de 800 kcal).',
    nota: 'La cifra de 600 kcal/día procede de la guía CG189 (anterior); no se ha podido cotejar en el texto de NG246.' },
  { id: 'oms894', autores: 'OMS', anio: 2000, titulo: 'Obesity: preventing and managing the global epidemic (TRS 894)',
    publicacion: 'WHO Technical Report Series 894', url: 'https://iris.who.int/handle/10665/42330',
    uso: 'Clasificación del IMC: por debajo de 18,5 es bajo peso (AppFit no calcula déficit).' },
] as const satisfies readonly FuenteEnergia[]

export type IdFuenteEnergia = (typeof FUENTES_ENERGIA)[number]['id']

export function fuenteEnergia(id: IdFuenteEnergia): FuenteEnergia {
  return FUENTES_ENERGIA.find((f) => f.id === id)!
}

/** DOI o URL de la fuente; `undefined` si no tiene enlace verificable. */
export function enlaceFuente(f: FuenteEnergia): string | undefined {
  return f.doi ? `https://doi.org/${f.doi}` : f.url
}
