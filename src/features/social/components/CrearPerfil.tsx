import { useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import Campo from '../../../shared/components/Campo'
import { Input } from '../../../shared/components/Input'
import PageHeader from '../../../shared/components/PageHeader'
import { ErrorState } from '../../../shared/components/StateMessage'
import { limpiarNombre, NOMBRE_MAX, normalizarAlias, validarAlias, validarNombre } from '../lib/alias'
import { cargarSocial } from '../servicio'

/** Primera vez en Amigos: alias, nombre opcional y la confirmación de edad (ADR 040). */
export default function CrearPerfil({ onCreado, titulo = 'Amigos' }: { onCreado: () => void; titulo?: string }) {
  const [alias, setAlias] = useState('')
  const [nombre, setNombre] = useState('')
  const [acepto, setAcepto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function crear(e: FormEvent) {
    e.preventDefault()
    const invalido = validarAlias(alias) ?? validarNombre(nombre) ?? (acepto ? null : 'Confirma que tienes 16 años o más.')
    if (invalido) {
      setError(invalido)
      return
    }
    setOcupado(true)
    setError(null)
    try {
      await (await cargarSocial()).crearPerfil(normalizarAlias(alias), limpiarNombre(nombre), true)
      onCreado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido crear el perfil. Inténtalo de nuevo.')
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-section px-page pt-5">
      <PageHeader title={titulo} />
      <div className="space-y-2 text-body-sm text-fg-muted">
        <p>Elige qué publicar para tus seguidores aprobados o para los miembros de una comunidad.</p>
        <p>Tus comidas, tu peso corporal, tus medidas y los recorridos GPS no se publican.</p>
      </div>
      <form className="space-y-stack" onSubmit={(e) => void crear(e)} noValidate>
        <Campo etiqueta="Alias" ayuda="De 3 a 20 caracteres: letras sin tildes, números, punto o guion bajo. Te encontrarán por él.">
          <Input autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={21} value={alias} onChange={(e) => setAlias(e.target.value)} />
        </Campo>
        <Campo etiqueta="Nombre (opcional)" ayuda="Lo verán quienes te sigan, a quienes pidas seguir y los miembros de las comunidades donde publiques.">
          <Input autoComplete="nickname" maxLength={NOMBRE_MAX + 10} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <label className="flex min-h-touch items-center gap-3 text-body-sm text-fg">
          <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="h-5 w-5 shrink-0 accent-accent" />
          Tengo 16 años o más
        </label>
        {error && <ErrorState>{error}</ErrorState>}
        <Button type="submit" variant="primary" block loading={ocupado}>Crear mi perfil</Button>
      </form>
    </div>
  )
}
