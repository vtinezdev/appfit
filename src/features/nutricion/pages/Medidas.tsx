import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import SectionHeader from '../../../shared/components/SectionHeader'
import { ErrorState } from '../../../shared/components/StateMessage'
import { useAviso } from '../../../shared/hooks/useAviso'
import * as notasMedidaRepo from '../data/notasMedidaRepo'
import { catalogoMedidas, textoValoresMedida, type MedidaCatalogo } from '../lib/interprete/medidas'

interface Props {
  onClose: () => void
}

const MEDIDAS = catalogoMedidas()

const GRUPOS: { tipo: MedidaCatalogo['tipo']; titulo: string; explicacion: string }[] = [
  { tipo: 'pregunta', titulo: 'Se pregunta cuánto es', explicacion: 'Al revisar, eliges cuánto pesa una entre estas opciones.' },
  { tipo: 'fija', titulo: 'Peso fijo', explicacion: 'Se usa este peso sin preguntar.' },
  { tipo: 'exacta', titulo: 'Peso y volumen', explicacion: 'Los volúmenes cuentan como gramos (1 ml ≈ 1 g).' },
]

function FilaMedida({ medida }: { medida: MedidaCatalogo }) {
  const [nombre, ...otras] = medida.formas
  return (
    <li className="space-y-0.5 px-1 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 text-body text-fg">{nombre}</p>
        <p className="tabular shrink-0 text-body-sm text-fg-muted">{textoValoresMedida(medida)}</p>
      </div>
      {otras.length > 0 && <p className="text-caption text-fg-subtle">También: {otras.join(', ')}</p>}
      {medida.condicion && <p className="text-caption text-fg-subtle">{medida.condicion}</p>}
      {medida.porAlimento.length > 0 && (
        <p className="text-caption text-fg-subtle">Peso propio: {medida.porAlimento.map((a) => `${a.alimento} ${textoValoresMedida(a)}`).join(', ')}</p>
      )}
    </li>
  )
}

/** Notas sobre medidas que el intérprete no entiende todavía, para añadirlas después a la tabla. */
function NotasMedida() {
  const notas = useLiveQuery(() => notasMedidaRepo.listar(), [])
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { avisar, avisarError, toast } = useAviso()

  async function apuntar(e: FormEvent) {
    e.preventDefault()
    if (!texto.trim() || guardando) return
    setGuardando(true)
    setError(null)
    try {
      await notasMedidaRepo.crear(texto)
      setTexto('')
    } catch {
      setError('No se ha podido guardar la nota. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function borrar(id: number) {
    try {
      const nota = await notasMedidaRepo.borrar(id)
      if (nota) avisar({ mensaje: 'Nota borrada', onDeshacer: () => notasMedidaRepo.restaurar(nota) })
    } catch {
      avisarError('No se ha podido borrar la nota.')
    }
  }

  return (
    <section aria-label="Medidas que faltan" className="space-y-stack">
      <SectionHeader variant="section">Medidas que faltan</SectionHeader>
      <p className="px-1 text-body-sm text-fg-muted">¿Has usado una medida que no está en la lista? Apúntala para añadirla más adelante.</p>
      <form onSubmit={apuntar} className="flex items-center gap-2">
        <Input tone="surface" aria-label="Medida que falta" placeholder="Ej.: tarrina de hummus ≈ 200 g" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <Button type="submit" loading={guardando} disabled={!texto.trim()}>
          Apuntar
        </Button>
      </form>
      {error && <ErrorState>{error}</ErrorState>}
      {notas && notas.length > 0 && (
        <ul className="divide-y divide-line">
          {notas.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-2 px-1 py-1">
              <p className="min-w-0 break-words text-body text-fg">{n.texto}</p>
              <IconButton icon="trash" label={`Borrar la nota «${n.texto}»`} variant="ghost" size="sm" onClick={() => borrar(n.id)} />
            </li>
          ))}
        </ul>
      )}
      {toast}
    </section>
  )
}

/** «Medidas»: qué medidas caseras entiende «Interpretar», cuánto vale cada una, y notas de las que faltan. */
export default function Medidas({ onClose }: Props) {
  const columna = 'mx-auto w-full max-w-lg px-page'
  return (
    <div className="fixed inset-0 z-50 flex animate-rise-in flex-col bg-bg">
      <header className="safe-top border-b border-line">
        <div className={`${columna} flex items-center justify-between py-3`}>
          <Button variant="ghost" onClick={onClose} className="-ml-4">
            <Icon name="arrow-left" size={18} />
            Volver
          </Button>
          <h1 className="text-title text-fg">Medidas</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className={`${columna} safe-bottom space-y-section py-6`}>
          <p className="px-1 text-body-sm text-fg-muted">Así convierte «Interpretar» las medidas caseras en gramos.</p>
          <NotasMedida />
          {GRUPOS.map((g) => (
            <section key={g.tipo} aria-label={g.titulo} className="space-y-1">
              <SectionHeader variant="section">{g.titulo}</SectionHeader>
              <p className="px-1 text-caption text-fg-subtle">{g.explicacion}</p>
              <ul className="divide-y divide-line">
                {MEDIDAS.filter((m) => m.tipo === g.tipo).map((m) => (
                  <FilaMedida key={m.unidad} medida={m} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
