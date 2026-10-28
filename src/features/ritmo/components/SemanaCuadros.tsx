import Icon from '../../../shared/components/Icon'

const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const NOMBRES_DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

export interface DiaCuadros {
  fecha: string
  entreno: boolean
  /** `null` si la nutrición no cuenta: sin fila de comidas. */
  comidas: boolean | null
  cheat?: boolean
}

/**
 * Los siete días de una semana en dos filas de cuadros, cada uno con su icono: arriba el entreno (mancuerna, en acento) y
 * debajo las comidas (cubiertos en tinta; destellos en un cheat day). Sin leyenda: la dicen los iconos. Con `hoy`, el
 * día de hoy va en negrita y los futuros, atenuados. Cada día se resume en texto para lectores de pantalla. Los cuadros
 * miden como mucho 2 rem y encogen con su columna (texto ampliado).
 */
export default function SemanaCuadros({ dias, hoy }: { dias: DiaCuadros[]; hoy?: string }) {
  return <ol className="grid grid-cols-7 gap-1" aria-label="Días de la semana">
    {dias.map((d, i) => {
      const futuro = hoy !== undefined && d.fecha > hoy
      return <li key={d.fecha} className={`flex min-w-0 flex-col items-center gap-1 ${futuro ? 'opacity-40' : ''}`}>
        <span aria-hidden className={`text-caption ${d.fecha === hoy ? 'font-bold text-fg' : 'text-fg-muted'}`}>{LETRAS[i]}</span>
        <span aria-hidden className={`flex aspect-square w-full max-w-8 items-center justify-center rounded-md ${d.entreno ? 'bg-accent text-accent-on' : 'bg-surface-muted'}`}>
          {d.entreno && <Icon name="dumbbell" size={16} />}
        </span>
        {d.comidas !== null && <span aria-hidden className={`flex aspect-square w-full max-w-8 items-center justify-center rounded-md ${d.comidas ? 'bg-fg text-bg' : 'bg-surface-muted'}`}>
          {d.comidas && <Icon name={d.cheat ? 'sparkles' : 'utensils'} size={16} />}
        </span>}
        <span className="sr-only">{NOMBRES_DIA[i]}{d.fecha === hoy ? ' (hoy)' : ''}: {[d.entreno ? 'entreno' : 'sin entreno', d.comidas === null ? null : d.comidas ? (d.cheat ? 'comidas (cheat day)' : 'comidas registradas') : 'sin comidas'].filter(Boolean).join(', ')}</span>
      </li>
    })}
  </ol>
}
