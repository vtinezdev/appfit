import { useLiveQuery } from 'dexie-react-hooks'
import { getPerfil } from '../../perfil/data/perfilRepo'
import type { FiguraMapa } from '../components/mapaMuscularGeometria'

/** Muñeco del mapa muscular según el sexo de Perfil; sin indicarlo, el de hombre. */
export function useFiguraMapa(): FiguraMapa {
  const sexo = useLiveQuery(async () => (await getPerfil()).sexo, [])
  return sexo === 'mujer' ? 'mujer' : 'hombre'
}
