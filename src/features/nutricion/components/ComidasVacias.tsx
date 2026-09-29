import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { EmptyState } from '../../../shared/components/StateMessage'

interface Props {
  comidas: {
    clave: string
    titulo: string
    /** Entradas de esa misma comida el día anterior: si hay, se ofrece repetirlas. */
    disponiblesAyer: number
    onRepetir: () => void
  }[]
  /** Hay una repetición en curso: bloquea el resto. */
  ocupado: boolean
  repitiendo: string | null
}

/**
 * Día sin ningún registro: en vez de cuatro secciones idénticas, un único «Sin registros» y una lista compacta
 * de las comidas del día, con la opción de repetir la del día anterior donde la haya.
 */
export default function ComidasVacias({ comidas, ocupado, repitiendo }: Props) {
  return (
    <section aria-label="Comidas" className="space-y-1">
      <EmptyState>Sin registros</EmptyState>
      <ul className="divide-y divide-line border-y border-line">
        {comidas.map((c) => (
          <li key={c.clave} className="flex min-h-touch items-center justify-between gap-3 px-1">
            <span className="text-label uppercase text-fg-subtle">{c.titulo}</span>
            {c.disponiblesAyer > 0 && (
              <Button variant="ghost" size="sm" className="-mr-3" onClick={c.onRepetir} disabled={ocupado}>
                <Icon name="copy" size={16} />
                {repitiendo === c.clave ? 'Repitiendo…' : `Repetir del día anterior (${c.disponiblesAyer})`}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
