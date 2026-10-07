import { useState } from 'react'
import { tokensConsulta } from '../../../shared/lib/text'
import { claveRef, refDeClave } from '../../../shared/db/foodRef'
import type { Porcion } from '../../../shared/db/types'
import * as catalogRepo from '../data/catalogRepo'
import * as foodsRepo from '../data/foodsRepo'
import * as porcionesRepo from '../data/porcionesRepo'
import { elegibleDeCatalogo, elegibleDeFood, itemDesdeElegible, itemSinCoincidencia, type AlimentoElegible, type ItemRevision } from '../lib/alimentos'
import { elegirPorcion, mapaFormasPorciones, type CandidataPorcion } from '../lib/interprete/porciones'
import { preferidoDe } from '../lib/catalogo/preferidos'
import { buscarCatalogo } from './buscarCatalogo'
import { emparejar } from '../lib/interprete/emparejar'
import { medidaAmbigua } from '../lib/interprete/medidas'
import { parsear, type ParteComida } from '../lib/interprete/parsear'
import { gramosDeParte, racionDe } from '../lib/interprete/raciones'

const PROPIOS = 10

/** Alimento y gramos de una ración propia si la parte la usa («2 rebanadas de pan bimbo»); prioridad sobre las raciones fijas. */
async function porcionPropia(parte: ParteComida, porciones: Porcion[]): Promise<{ elegible: AlimentoElegible; gramos: number } | undefined> {
  if (!parte.unidadPropia) return undefined
  const delNombre = porciones.filter((p) => p.nombreNorm === parte.unidadPropia)
  const refs = delNombre.map((p) => refDeClave(p.ref))
  const [propios, delCatalogo] = await Promise.all([
    foodsRepo.porIds(refs.flatMap((r) => (r?.tipo === 'user' ? [r.id] : []))),
    catalogRepo.porIds(refs.flatMap((r) => (r?.tipo === 'catalog' ? [r.id] : []))),
  ])
  const candidatas: (CandidataPorcion<Porcion> & { elegible: AlimentoElegible })[] = delNombre.flatMap((porcion, i) => {
    const ref = refs[i]
    if (!ref) return []
    const elegible = ref.tipo === 'user' ? (propios.get(ref.id) && elegibleDeFood(propios.get(ref.id)!)) : (delCatalogo.get(ref.id) && elegibleDeCatalogo(delCatalogo.get(ref.id)!))
    return elegible ? [{ porcion, nombreAlimento: elegible.nombre, elegible }] : []
  })
  const elegida = elegirPorcion(parte.unidadPropia, parte.consulta, candidatas)
  if (!elegida) return undefined
  const elegible = candidatas.find((c) => c.porcion.id === elegida.porcion.id)!.elegible
  return { elegible, gramos: Math.max(1, Math.round((parte.cantidad ?? 1) * elegida.porcion.gramos * 10) / 10) }
}

async function interpretarParte(parte: ParteComida, porciones: Porcion[]): Promise<ItemRevision> {
  const racion = racionDe(parte.consulta)
  // Como en el buscador: candidatos de sobra, ordenados, y si no hay ninguno se corrigen las erratas y se reintenta.
  const [propios, resultado] = await Promise.all([
    foodsRepo.buscar(parte.consulta, PROPIOS),
    // Conserva «con piel», que la consulta por tokens perdería, para ordenar según lo pedido.
    buscarCatalogo(parte.nombre),
  ])
  const consulta = tokensConsulta(resultado.consulta).join(' ')
  // Tus alimentos también se buscan con la consulta corregida si la original no encontró ninguno.
  const suyos = propios.length === 0 && consulta !== parte.consulta ? await foodsRepo.buscar(consulta, PROPIOS) : propios
  const { mejor, alternativas } = emparejar({
    consulta,
    propios: suyos,
    catalogo: resultado.foods,
    preferido: preferidoDe(consulta),
  })
  // Una medida ambigua («una cucharada») no lleva gramos hasta que se elija cuánto pesa en la revisión.
  const medida = medidaAmbigua(parte, racion)
  const { gramos, estimados } = medida ? { gramos: 0, estimados: false } : gramosDeParte(parte, racion)
  const extra = { gramosEstimados: estimados, alternativas, medida }
  const propia = await porcionPropia(parte, porciones)
  if (propia) {
    const otras = [...(mejor ? [mejor] : []), ...alternativas].filter((a) => claveRef(a.ref) !== claveRef(propia.elegible.ref)).slice(0, 5)
    return itemDesdeElegible(propia.elegible, propia.gramos, { gramosEstimados: false, alternativas: otras })
  }
  return mejor ? itemDesdeElegible(mejor, gramos, extra) : itemSinCoincidencia(parte.nombre, gramos, extra)
}

/** Interpreta una frase completa con tus raciones propias; vacío si no reconoce ningún alimento. */
export async function interpretarTexto(texto: string): Promise<ItemRevision[]> {
  const porciones = await porcionesRepo.todas().catch(() => [] as Porcion[])
  const partes = parsear(texto, mapaFormasPorciones(porciones))
  return Promise.all(partes.map((p) => interpretarParte(p, porciones)))
}

/**
 * Intérprete local (sin conexión): parte la frase, busca cada alimento en tus alimentos y en el catálogo y
 * lo prepara para la revisión. Sin useLiveQuery: es una acción puntual.
 */
export function useInterpretarLocal() {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function interpretar(texto: string): Promise<ItemRevision[] | null> {
    setError(null)
    setCargando(true)
    try {
      const items = await interpretarTexto(texto)
      if (items.length === 0) {
        setError('No he reconocido ningún alimento. Prueba con algo como «200 g de arroz, 2 huevos».')
        return null
      }
      return items
    } catch {
      setError('No se ha podido interpretar. Inténtalo de nuevo.')
      return null
    } finally {
      setCargando(false)
    }
  }

  return { interpretar, cargando, error }
}
