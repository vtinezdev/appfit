import { useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Campo from '../../../shared/components/Campo'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import { EmptyState, ErrorState } from '../../../shared/components/StateMessage'
import { textoBusqueda } from '../lib/alias'
import { textoRelacion, type Persona } from '../lib/relacion'
import { cargarSocial } from '../servicio'
import AvatarPersona from './AvatarPersona'
import NombrePersona from './NombrePersona'

interface Props {
  codigo: string
  /** Abre la hoja de una persona encontrada. */
  onAbrir: (persona: Persona) => void
  /** Cambió algo (se pidió seguir): las listas se vuelven a leer. */
  onCambio: () => void
}

/** Tu código para compartirlo y buscar a alguien por su alias o su código. */
export default function Anadir({ codigo, onAbrir, onCambio }: Props) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<Persona[] | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const compartir = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const invitacion = `Sígueme en AppFit: en Amigos › Añadir, escribe mi código ${codigo}.`

  async function ejecutar(fn: () => Promise<void>) {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido completar. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  const buscar = (e: FormEvent) => {
    e.preventDefault()
    const busqueda = textoBusqueda(texto)
    if (!busqueda) {
      setError('Escribe un alias o un código.')
      return
    }
    void ejecutar(async () => setResultados(await (await cargarSocial()).buscar(busqueda)))
  }

  const pedir = (p: Persona) => ejecutar(async () => {
    const sigo = await (await cargarSocial()).pedirSeguir(p.alias)
    setResultados((rs) => rs?.map((r) => (r.alias === p.alias ? { ...r, sigo } : r)) ?? null)
    onCambio()
  })

  return (
    <div className="space-y-section">
      <Card className="space-y-3">
        <p className="text-rotulo text-fg-muted">Tu código</p>
        <p className="break-all font-numeric text-hero tabular text-fg">{codigo}</p>
        <p className="text-body-sm text-fg-muted">Pásalo a quien quieras que te siga: con él te encuentra aunque no sepa tu alias. Puedes cambiarlo en Tu perfil.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="flex-1 basis-32" onClick={() => {
            navigator.clipboard?.writeText(codigo).then(() => setCopiado(true), () => setError('No se ha podido copiar. Apúntalo a mano.'))
          }}><Icon name={copiado ? 'check' : 'copy'} size={18} />{copiado ? 'Copiado' : 'Copiar'}</Button>
          {compartir && <Button variant="secondary" size="sm" className="flex-1 basis-32" onClick={() => { navigator.share({ text: invitacion }).catch(() => undefined) }}><Icon name="compartir" size={18} />Compartir</Button>}
        </div>
        {copiado && <p role="status" className="sr-only">Código copiado.</p>}
      </Card>

      <form className="space-y-stack" onSubmit={buscar} noValidate aria-label="Buscar a alguien">
        <Campo etiqueta="Alias o código" ayuda="El alias tiene que ser exacto.">
          <Input autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="search" value={texto}
            onChange={(e) => { setTexto(e.target.value); setResultados(null) }} />
        </Campo>
        <Button type="submit" variant="primary" block loading={ocupado && resultados === null}>Buscar</Button>
      </form>

      {error && <ErrorState>{error}</ErrorState>}
      {resultados && (resultados.length === 0
        ? <EmptyState>No hay nadie con ese alias o código. Revisa que esté bien escrito.</EmptyState>
        : (
          <ListGroup aria-label="Resultado de la búsqueda">
            {resultados.map((p) => (
              <li key={p.alias} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
                <button type="button" className="app-button flex min-h-touch min-w-0 grow basis-48 items-center gap-3 rounded-md text-left" onClick={() => onAbrir(p)}>
                  <AvatarPersona persona={p} tamano="sm" />
                  <NombrePersona persona={p} detalle={textoRelacion(p)} />
                </button>
                {p.sigo === 'no' && <Button variant="primary" size="sm" className="ml-auto" disabled={ocupado} onClick={() => void pedir(p)}>Pedir seguir</Button>}
              </li>
            ))}
          </ListGroup>
        ))}
    </div>
  )
}
