import { describe, expect, it } from 'vitest'
import { cambiosBajada, cambiosLadoBajada, cambiosTipo, conBajadaRestaurada, conLado, etiquetasSerie, nuevaBajada, sinBajada, textoEjecucion, tipoSerie } from './serie'

const base = { reps: 8, peso: 80 }
const id = () => 'nueva'

describe('tipoSerie', () => {
  it('prioriza lo que cambia la lectura de la fila: dropset, negativas, calentamiento', () => {
    expect(tipoSerie(base)).toBe('normal')
    expect(tipoSerie({ ...base, tipo: 'calentamiento' })).toBe('calentamiento')
    expect(tipoSerie({ ...base, soloNegativas: true, tipo: 'calentamiento' })).toBe('negativas')
    expect(tipoSerie({ ...base, soloNegativas: true, bajadas: [{ id: 'a', reps: 5, peso: 60 }] })).toBe('dropset')
    expect(tipoSerie({ ...base, bajadas: [] })).toBe('normal')
  })
})

describe('cambiosTipo', () => {
  it('deja una sola técnica activa y borra las demás', () => {
    const s = { ...base, tipo: 'calentamiento' as const, soloNegativas: true, bajadas: [{ id: 'a', reps: 5, peso: 60 }] }
    expect(cambiosTipo(s, 'normal', id)).toEqual({ tipo: undefined, soloNegativas: undefined, bajadas: undefined })
    expect(cambiosTipo(s, 'calentamiento', id)).toEqual({ tipo: 'calentamiento', soloNegativas: undefined, bajadas: undefined })
    expect(cambiosTipo(s, 'negativas', id)).toEqual({ tipo: undefined, soloNegativas: true, bajadas: undefined })
  })
  it('pasar a dropset conserva las bajadas existentes o crea la primera copiando la carga', () => {
    const conBajadas = { ...base, bajadas: [{ id: 'a', reps: 5, peso: 60 }] }
    expect(cambiosTipo(conBajadas, 'dropset', id).bajadas).toBe(conBajadas.bajadas)
    expect(cambiosTipo(base, 'dropset', id).bajadas).toEqual([{ id: 'nueva', reps: 8, peso: 80 }])
  })
})

describe('bajadas', () => {
  it('una bajada nueva copia el último tramo; con lados copia también los lados', () => {
    const s = { ...base, bajadas: [{ id: 'a', reps: 5, peso: 60 }] }
    expect(nuevaBajada(s, 'b')).toEqual({ id: 'b', reps: 5, peso: 60 })
    const lados = { ...base, ejecucion: 'lados' as const, lados: { izquierda: { reps: 10, peso: 14 } } }
    const b = nuevaBajada(lados, 'c')
    expect(b.lados).toEqual({ izquierda: { reps: 10, peso: 14 } })
    expect(b.lados).not.toBe(lados.lados)
  })
  it('editar o quitar una bajada no toca las demás; sin bajadas el campo desaparece', () => {
    const s = { ...base, bajadas: [{ id: 'a', reps: 5, peso: 60 }, { id: 'b', reps: 6, peso: 40 }] }
    expect(cambiosBajada(s, 'b', { peso: 30 }).bajadas).toEqual([{ id: 'a', reps: 5, peso: 60 }, { id: 'b', reps: 6, peso: 30 }])
    expect(sinBajada(s, 'a').bajadas).toEqual([{ id: 'b', reps: 6, peso: 40 }])
    expect(sinBajada({ ...base, bajadas: [{ id: 'a', reps: 5, peso: 60 }] }, 'a')).toEqual({ bajadas: undefined })
  })
})

describe('conLado', () => {
  it('escribir en un lado ausente lo registra; vaciarlo lo quita', () => {
    expect(conLado(undefined, 'derecha', { reps: 9 })).toEqual({ derecha: { reps: 9, peso: 0 } })
    const lados = { izquierda: { reps: 10, peso: 14 }, derecha: { reps: 9, peso: 14 } }
    expect(conLado(lados, 'derecha', { reps: 0, peso: 0 })).toEqual({ izquierda: { reps: 10, peso: 14 } })
    expect(conLado({ izquierda: { reps: 10, peso: 0 } }, 'izquierda', { reps: 0 })).toBeUndefined()
  })
  it('el RIR de un lado se conserva aunque falten reps', () => {
    expect(conLado(undefined, 'izquierda', { rir: 2 })).toEqual({ izquierda: { reps: 0, peso: 0, rir: 2 } })
  })
})

describe('etiquetas', () => {
  const bilateral = { ejecucion: 'bilateral' as const }
  it('no repite lo que ya dicen la letra o la cabecera', () => {
    expect(etiquetasSerie({ soloNegativas: true }, bilateral)).toEqual([])
    expect(etiquetasSerie({ agarre: { orientacion: 'prono' } }, { ...bilateral, agarre: { orientacion: 'prono' } })).toEqual([])
  })
  it('señala bajada lenta, agarre o ejecución distintos de los del ejercicio', () => {
    expect(etiquetasSerie({ excentricaSeg: 4 }, bilateral)).toEqual(['Bajada 4 s'])
    expect(etiquetasSerie({ agarre: { orientacion: 'supino', anchura: 'estrecho' } }, { ...bilateral, agarre: { orientacion: 'prono' } })).toEqual(['Supino · Estrecho'])
    expect(etiquetasSerie({}, { ...bilateral, agarre: { orientacion: 'prono' } })).toEqual(['Agarre sin indicar'])
    expect(etiquetasSerie({ ejecucion: 'unilateral', kgUnilateral: 'total' }, bilateral)).toEqual(['Unilateral · kg totales'])
  })
  it('combinaciones antiguas siguen visibles', () => {
    expect(etiquetasSerie({ tipo: 'calentamiento', soloNegativas: true }, bilateral)).toEqual(['Calentamiento'])
    expect(etiquetasSerie({ soloNegativas: true, bajadas: [{ id: 'a', reps: 1, peso: 1 }] }, bilateral)).toEqual(['Solo negativas'])
  })
  it('textoEjecucion resume la variante', () => {
    expect(textoEjecucion({ ejecucion: 'bilateral' })).toBe('Bilateral')
    expect(textoEjecucion({ ejecucion: 'unilateral' })).toBe('Unilateral · kg por lado')
    expect(textoEjecucion({ ejecucion: 'lados' })).toBe('Unilateral · cada lado')
  })
})

describe('cambiosLadoBajada', () => {
  it('combina el lado de la bajada sin tocar el otro', () => {
    const s = { ...base, ejecucion: 'lados' as const, bajadas: [{ id: 'a', reps: 0, peso: 0, lados: { izquierda: { reps: 6, peso: 10 } } }] }
    expect(cambiosLadoBajada(s, 'a', 'derecha', { reps: 5 }).bajadas).toEqual([{ id: 'a', reps: 0, peso: 0, lados: { izquierda: { reps: 6, peso: 10 }, derecha: { reps: 5, peso: 0 } } }])
    expect(cambiosLadoBajada(s, 'otra', 'derecha', { reps: 5 })).toEqual({})
  })
})

describe('conBajadaRestaurada', () => {
  it('vuelve a su posición una sola vez', () => {
    const a = { id: 'a', reps: 5, peso: 60 }, b = { id: 'b', reps: 6, peso: 40 }
    expect(conBajadaRestaurada({ ...base, bajadas: [b] }, a, 0).bajadas).toEqual([a, b])
    expect(conBajadaRestaurada({ ...base }, a, 3).bajadas).toEqual([a])
    expect(conBajadaRestaurada({ ...base, bajadas: [a, b] }, a, 0)).toEqual({})
  })
})
