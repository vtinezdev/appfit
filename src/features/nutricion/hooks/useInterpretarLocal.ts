import { useState } from 'react'
import * as catalogRepo from '../data/catalogRepo'
import * as foodsRepo from '../data/foodsRepo'
import { itemDesdeElegible, itemSinCoincidencia, type ItemRevision } from '../lib/alimentos'
import { rankCatalogo } from '../lib/catalogo/ranking'
import { buscarCatalogo } from './buscarCatalogo'
import { emparejar } from '../lib/interprete/emparejar'
import { medidaAmbigua } from '../lib/interprete/medidas'
import { parsear, type ParteComida } from '../lib/interprete/parsear'
import { gramosDeParte, racionDe } from '../lib/interprete/raciones'

const PROPIOS = 10

async function interpretarParte(parte: ParteComida): Promise<ItemRevision> {
  const racion = racionDe(parte.consulta)
  // Como en el buscador: candidatos de sobra, ordenados, y si no hay ninguno se corrigen las erratas y se reintenta.
  const [propios, resultado, preferido] = await Promise.all([
    foodsRepo.buscar(parte.consulta, PROPIOS),
    buscarCatalogo(parte.consulta),
    racion?.preferido ? catalogRepo.obtener(racion.preferido) : undefined,
  ])
  const consulta = resultado.consulta
  // Tus alimentos también se buscan con la consulta corregida si la original no encontró ninguno.
  const suyos = propios.length === 0 && consulta !== parte.consulta ? await foodsRepo.buscar(consulta, PROPIOS) : propios
  // El preferido puede no estar entre los candidatos («macarrones» → pasta) o quedar fuera del tope.
  const candidatos = resultado.foods
  const conPreferido = preferido && !candidatos.some((f) => f.id === preferido.id) ? [preferido, ...candidatos] : candidatos
  const { mejor, alternativas } = emparejar({
    consulta,
    propios: suyos,
    catalogo: rankCatalogo(conPreferido, consulta),
    preferido: preferido?.id,
  })
  // Una medida ambigua («una cucharada») no lleva gramos hasta que se elija cuánto pesa en la revisión.
  const medida = medidaAmbigua(parte, racion)
  const { gramos, estimados } = medida ? { gramos: 0, estimados: false } : gramosDeParte(parte, racion)
  const extra = { gramosEstimados: estimados, alternativas, medida }
  return mejor ? itemDesdeElegible(mejor, gramos, extra) : itemSinCoincidencia(parte.nombre, gramos, extra)
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
    const partes = parsear(texto)
    if (partes.length === 0) {
      setError('No he reconocido ningún alimento. Prueba con algo como «200 g de arroz, 2 huevos».')
      return null
    }
    setCargando(true)
    try {
      return await Promise.all(partes.map(interpretarParte))
    } catch {
      setError('No se ha podido interpretar. Inténtalo de nuevo.')
      return null
    } finally {
      setCargando(false)
    }
  }

  return { interpretar, cargando, error }
}
