import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Campo from '../../../shared/components/Campo'
import Icon from '../../../shared/components/Icon'
import { SearchInput, Select } from '../../../shared/components/Input'
import { EmptyState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import { filtrarImagenesComunidad, GRUPOS_IMAGEN_COMUNIDAD, nombreImagenComunidad, type GrupoImagenComunidad, type ImagenComunidad as IdImagenComunidad } from '../lib/imagenComunidad'
import { recursoImagenComunidad } from '../lib/recursoImagenComunidad'
import ImagenComunidad from './ImagenComunidad'
import './imagenesComunidad.css'

interface Props {
  nombre: string
  imagen: IdImagenComunidad | null
  onChange: (imagen: IdImagenComunidad | null) => void
  disabled?: boolean
}

/** Selector controlado, sin red ni guardado. Se aloja en la hoja del formulario, sin abrir otra capa encima. */
export default function ElegirImagenComunidad({ nombre, imagen, onChange, disabled = false }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [grupo, setGrupo] = useState<GrupoImagenComunidad | ''>('')
  const opciones = filtrarImagenesComunidad(busqueda, grupo || undefined).filter(e => recursoImagenComunidad(e.id))
  return <fieldset disabled={disabled} className="min-w-0 space-y-stack">
    <legend className="text-label text-fg-muted">Imagen de la comunidad</legend>
    <div className="flex items-center gap-3">
      <ImagenComunidad nombre={nombre} imagen={imagen} tamano="lg" />
      <p className="min-w-0 flex-1 break-words text-body font-semibold text-fg" aria-live="polite">{nombreImagenComunidad(imagen)}</p>
    </div>
    <Button variant="ghost" size="sm" aria-pressed={imagen === null} onClick={() => onChange(null)}>
      {imagen === null && <Icon name="check" size={18} />}Usar las iniciales
    </Button>
    <SearchInput aria-label="Buscar imagen de comunidad" placeholder="Deporte o lugar" maxLength={100} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
    <Campo etiqueta="Tipo de deporte"><Select aria-label="Tipo de deporte" value={grupo} onChange={e => setGrupo(e.target.value as GrupoImagenComunidad | '')}>
      <option value="">Todos los deportes</option>
      {GRUPOS_IMAGEN_COMUNIDAD.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
    </Select></Campo>
    <p role="status" className="text-caption text-fg-muted">{formatInt(opciones.length)} {opciones.length === 1 ? 'opción' : 'opciones'}</p>
    {opciones.length ? <ul aria-label="Catálogo de imágenes de comunidades" className="imagenes-comunidad-rejilla">
      {opciones.map(e => <li key={e.id} className="min-w-0">
        <button type="button" aria-label={`${e.nombre} · ${e.deporte}`} aria-pressed={imagen === e.id} onClick={() => onChange(e.id)}
          className={`app-button flex min-h-touch w-full min-w-0 flex-col items-center gap-1.5 rounded-md border-2 p-2 text-center ${imagen === e.id ? 'border-accent-strong bg-accent-subtle' : 'border-transparent hover:bg-surface-muted'}`}>
          <ImagenComunidad nombre={e.nombre} imagen={e.id} tamano="lg" />
          <span className="w-full break-words text-caption font-semibold leading-tight text-fg">{e.nombre}</span>
          <span className="w-full break-words text-caption leading-tight text-fg-muted">{e.deporte}</span>
        </button>
      </li>)}
    </ul> : <EmptyState>No hay imágenes con esa búsqueda.</EmptyState>}
  </fieldset>
}
