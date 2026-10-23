import { describe, expect, it } from 'vitest'
import { CATALOGO_EJERCICIOS, CATALOGO_POR_ID, PATRONES, SLUGS_POR_PATRON, type Patron } from './catalogoEjercicios'
import {
  DIAS_CREADOR, DURACIONES, MATERIALES, OBJETIVOS_POR_TIPO, REPARTOS, SERIES_GEMELOS, SUSTITUTOS, cambiarEjercicio, ejerciciosPorSesion, encajaMaterial, generarPlan, huecosDelDia,
  nombreLibre, otraSugerencia, rutinasDelPlan, sugerenciasCambio, type Material, type ObjetivoCreador, type RespuestasCreador,
} from './creadorRutinas'

const base: RespuestasCreador = { dias: 4, duracion: 60, material: 'gimnasio', objetivo: 'hipertrofia', prioridad: [] }
const MATERIALES_TODOS = Object.keys(MATERIALES) as Material[]
const OBJETIVOS = Object.keys(OBJETIVOS_POR_TIPO) as ObjetivoCreador[]

describe('catálogo: tipo y patrón', () => {
  it('cada ejercicio tiene un tipo y un único patrón, y la clasificación solo nombra ejercicios del catálogo', () => {
    const slugs = Object.values(SLUGS_POR_PATRON).flat()
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs.length).toBe(CATALOGO_EJERCICIOS.length)
    for (const slug of slugs) expect(CATALOGO_POR_ID.has(`appfit:${slug}`), slug).toBe(true)
    for (const e of CATALOGO_EJERCICIOS) {
      expect(e.patron in PATRONES, e.id).toBe(true)
      expect(['compuesto', 'aislamiento']).toContain(e.tipo)
    }
  })

  it('cada patrón que pide un reparto tiene, para cada material, ejercicios propios o un sustituto que los tiene', () => {
    const pedidos = new Set<Patron>(Object.values(REPARTOS).flatMap((r) => r.dias.flatMap((d) => d.huecos)))
    const hay = (p: Patron, m: Material) => CATALOGO_EJERCICIOS.some((e) => e.patron === p && encajaMaterial(e, m))
    const sinPropios: string[] = []
    for (const material of MATERIALES_TODOS) for (const patron of pedidos) {
      if (hay(patron, material)) continue
      sinPropios.push(`${material}:${patron}`)
      expect(SUSTITUTOS[patron].some((s) => hay(s, material)), `${material}: ${patron}`).toBe(true)
    }
    // Las flexiones pike cubren el empuje vertical; aperturas, curl y encogimientos siguen necesitando sustituto.
    expect(sinPropios.sort()).toEqual(['casa:biceps', 'casa:pecho-aislamiento', 'casa:trapecio'])
  })
})

describe('generarPlan', () => {
  it('de 2 a 6 días × materiales × objetivos × tiempos: planes completos, sin huecos ni repetidos en el día', () => {
    for (const dias of DIAS_CREADOR) for (const material of MATERIALES_TODOS) for (const objetivo of OBJETIVOS) for (const duracion of DURACIONES) {
      const r = { ...base, dias, material, objetivo, duracion }
      const plan = generarPlan(r, 0)
      const etiqueta = `${dias} días, ${material}, ${objetivo}, ${duracion} min`
      expect(plan.dias.map((d) => d.nombre), etiqueta).toEqual(REPARTOS[dias].dias.map((d) => d.nombre))
      for (const d of plan.dias) {
        // El de gemelos que se añade cuando el reparto no deja sitio (ENT-16) va de más.
        const extra = d.ejercicios.filter((e) => e.patron === 'gemelos' && e.objetivo.series === SERIES_GEMELOS && !REPARTOS[dias].dias.find((p) => p.nombre === d.nombre)!.huecos.slice(0, ejerciciosPorSesion(duracion, objetivo)).includes('gemelos'))
        expect(d.ejercicios.length - extra.length, `${etiqueta}: ${d.nombre}`).toBe(ejerciciosPorSesion(duracion, objetivo))
        expect(new Set(d.ejercicios.map((e) => e.catalogId)).size).toBe(d.ejercicios.length)
        for (const e of d.ejercicios) {
          const c = CATALOGO_POR_ID.get(e.catalogId!)!
          expect(encajaMaterial(c, material), `${etiqueta}: ${c.id}`).toBe(true)
          expect(e.objetivo).toEqual(extra.includes(e) ? { ...OBJETIVOS_POR_TIPO[objetivo][c.tipo], series: SERIES_GEMELOS } : OBJETIVOS_POR_TIPO[objetivo][c.tipo])
        }
        // Compuestos primero.
        const tipos = d.ejercicios.map((e) => e.tipo)
        expect(tipos.indexOf('aislamiento') === -1 || tipos.lastIndexOf('compuesto') < tipos.indexOf('aislamiento'), `${etiqueta}: ${d.nombre}`).toBe(true)
      }
    }
  })

  it('siempre hay gemelos: si el reparto no les deja sitio, uno de 3 series en el día de pierna o completo con menos series', () => {
    for (const dias of DIAS_CREADOR) for (const material of MATERIALES_TODOS) for (const objetivo of OBJETIVOS) for (const duracion of DURACIONES) {
      const plan = generarPlan({ ...base, dias, material, objetivo, duracion }, 0)
      const gemelos = plan.dias.flatMap((d) => d.ejercicios.filter((e) => CATALOGO_POR_ID.get(e.catalogId!)!.primaryMuscles.includes('gemelos')).map((e) => ({ d, e })))
      expect(gemelos.length, `${dias} días, ${material}, ${objetivo}, ${duracion} min`).toBeGreaterThan(0)
      expect(gemelos.reduce((n, g) => n + g.e.objetivo.series, 0)).toBeGreaterThanOrEqual(Math.min(SERIES_GEMELOS, OBJETIVOS_POR_TIPO[objetivo].aislamiento.series))
      for (const { d } of gemelos) expect(['pierna', 'completo']).toContain(d.enfoque)
    }
    // 3 días de 45 min: va al día completo con menos series, como aislamiento al final.
    const plan = generarPlan({ ...base, dias: 3, duracion: 45 }, 0)
    const dia = plan.dias.find((d) => d.ejercicios.some((e) => e.patron === 'gemelos'))!
    expect(dia.ejercicios.at(-1)).toMatchObject({ patron: 'gemelos', objetivo: { series: SERIES_GEMELOS } })
    expect(plan.dias.filter((d) => d.ejercicios.some((e) => e.patron === 'gemelos'))).toHaveLength(1)
  })

  it('número de ejercicios según el tiempo y el objetivo', () => {
    expect([45, 60, 75].map((d) => ejerciciosPorSesion(d as 45, 'hipertrofia'))).toEqual([5, 6, 7])
    expect(ejerciciosPorSesion(45, 'fuerza')).toBe(4)
  })

  it('semilla 0: los ejercicios más básicos; poca repetición entre días', () => {
    const plan = generarPlan(base, 0)
    expect(plan.reparto).toBe('Torso / pierna')
    expect(plan.dias[0].ejercicios.map((e) => e.catalogId).slice(0, 4)).toEqual(['appfit:press-banca', 'appfit:remo-barra', 'appfit:press-militar', 'appfit:dominadas'])
    expect(plan.dias[1].ejercicios[0]).toMatchObject({ catalogId: 'appfit:sentadilla', tipo: 'compuesto', objetivo: { series: 3, repsMin: 6, repsMax: 10, descansoSeg: 120 } })
    // Torso B no repite los de Torso A mientras haya alternativas.
    const a = new Set(plan.dias[0].ejercicios.map((e) => e.catalogId))
    expect(plan.dias[2].ejercicios.filter((e) => a.has(e.catalogId))).toEqual([])
  })

  it('es determinista con la misma semilla y cambia con otra', () => {
    expect(generarPlan(base, 7)).toEqual(generarPlan(base, 7))
    const distintos = [1, 2, 3, 4, 5].map((s) => JSON.stringify(generarPlan(base, s)))
    expect(new Set(distintos).size).toBeGreaterThan(1)
  })

  it('el material manda: en casa, solo peso corporal y bandas', () => {
    const plan = generarPlan({ ...base, material: 'casa' }, 0)
    for (const e of plan.dias.flatMap((d) => d.ejercicios)) expect(CATALOGO_POR_ID.get(e.catalogId!)!.equipment.every((q) => q === 'corporal' || q === 'bandas'), e.catalogId).toBe(true)
  })

  it('priorizar un músculo ocupa los huecos menos importantes de los días que lo trabajan, sin alargar la sesión', () => {
    const torso = REPARTOS[4].dias[0], pierna = REPARTOS[4].dias[1]
    expect(huecosDelDia(torso, base)).toEqual(['empuje-horizontal', 'tiron-horizontal', 'empuje-vertical', 'tiron-vertical', 'hombro-lateral', 'biceps'])
    expect(huecosDelDia(torso, { ...base, prioridad: ['biceps', 'gemelos'] })).toEqual(['empuje-horizontal', 'tiron-horizontal', 'empuje-vertical', 'tiron-vertical', 'biceps', 'biceps'])
    expect(huecosDelDia(pierna, { ...base, prioridad: ['biceps', 'gemelos'] })).toEqual(['sentadilla', 'bisagra', 'unilateral', 'cuadriceps-aislamiento', 'gemelos', 'gemelos'])
    // Con más de dos, solo los dos primeros; los tres primeros huecos no se tocan.
    expect(huecosDelDia(torso, { ...base, prioridad: ['pecho', 'hombros', 'triceps'] })).toEqual(['empuje-horizontal', 'tiron-horizontal', 'empuje-vertical', 'tiron-vertical', 'hombro-lateral', 'pecho-aislamiento'])
    expect(huecosDelDia(torso, { ...base, objetivo: 'fuerza', duracion: 45, prioridad: ['biceps'] })).toEqual(['empuje-horizontal', 'tiron-horizontal', 'empuje-vertical', 'biceps'])
    const plan = generarPlan({ ...base, prioridad: ['biceps'] }, 0)
    expect(plan.dias[0].ejercicios.filter((e) => CATALOGO_POR_ID.get(e.catalogId!)!.primaryMuscles.includes('biceps'))).toHaveLength(2)
    expect(plan.dias[0].ejercicios).toHaveLength(6)
  })

  it('respeta los ejercicios disponibles y los nombres propios', () => {
    const disponibles = new Set(CATALOGO_EJERCICIOS.map((e) => e.id).filter((id) => id !== 'appfit:press-banca'))
    const plan = generarPlan(base, 0, { disponibles, nombres: new Map([['appfit:remo-barra', 'Mi remo']]) })
    const torso = plan.dias[0].ejercicios
    expect(torso.some((e) => e.catalogId === 'appfit:press-banca')).toBe(false)
    expect(torso.find((e) => e.catalogId === 'appfit:remo-barra')?.nombre).toBe('Mi remo')
  })
})

describe('cambios en la vista previa', () => {
  const plan = generarPlan(base, 0)

  it('otra sugerencia: el siguiente del mismo patrón y material, sin repetir el día, y vuelta a empezar', () => {
    const otro = otraSugerencia(plan, 0, 0, base)
    expect(otro.dias[0].ejercicios[0]).toMatchObject({ catalogId: 'appfit:press-mancuernas', patron: 'empuje-horizontal' })
    expect(plan.dias[0].ejercicios[0].catalogId).toBe('appfit:press-banca')
    let p = plan
    const vistos = new Set<string>()
    for (let i = 0; i < CATALOGO_EJERCICIOS.length; i++) { p = otraSugerencia(p, 0, 0, base); vistos.add(p.dias[0].ejercicios[0].catalogId!) }
    expect(vistos.has('appfit:press-banca')).toBe(true)
    const enDia = p.dias[0].ejercicios.map((e) => e.catalogId)
    expect(new Set(enDia).size).toBe(enDia.length)
  })

  it('sugerencias para cambiar: mismo patrón y material, sin los del día y con los ya hechos primero', () => {
    const s = sugerenciasCambio(plan, 0, 0, 'gimnasio', new Set(['appfit:flexiones']))
    expect(s[0].id).toBe('appfit:flexiones')
    expect(s.every((e) => e.patron === 'empuje-horizontal')).toBe(true)
    expect(s.some((e) => e.id === 'appfit:press-banca')).toBe(false)
  })

  it('cambiar conserva el hueco; rehace el objetivo con el tipo del nuevo o conserva el anterior si es propio', () => {
    const conCatalogo = cambiarEjercicio(plan, 0, 0, { seleccion: { tipo: 'catalogo', catalogId: 'appfit:aperturas-mancuernas' }, nombre: 'Aperturas', catalogId: 'appfit:aperturas-mancuernas' }, 'hipertrofia')
    expect(conCatalogo.dias[0].ejercicios[0]).toMatchObject({ patron: 'empuje-horizontal', tipo: 'aislamiento', objetivo: OBJETIVOS_POR_TIPO.hipertrofia.aislamiento })
    const propio = cambiarEjercicio(plan, 0, 0, { seleccion: { tipo: 'local', id: 9 }, nombre: 'Mi press' }, 'hipertrofia')
    expect(propio.dias[0].ejercicios[0]).toMatchObject({ nombre: 'Mi press', catalogId: undefined, tipo: 'compuesto', objetivo: plan.dias[0].ejercicios[0].objetivo })
  })
})

describe('nombres al guardar', () => {
  it('añade un sufijo si el nombre ya existe, sin distinguir mayúsculas ni tildes', () => {
    expect(nombreLibre('Torso A', ['Pierna A'])).toBe('Torso A')
    expect(nombreLibre('Tirón A', ['tiron a', 'Tirón A (2)'])).toBe('Tirón A (3)')
  })
  it('rutinas del plan con nombres libres y solo selección y objetivo', () => {
    const rutinas = rutinasDelPlan(generarPlan({ ...base, dias: 2 }, 0), ['Cuerpo completo A'])
    expect(rutinas.map((r) => r.nombre)).toEqual(['Cuerpo completo A (2)', 'Cuerpo completo B'])
    expect(Object.keys(rutinas[0].ejercicios[0]).sort()).toEqual(['objetivo', 'seleccion'])
  })
})
