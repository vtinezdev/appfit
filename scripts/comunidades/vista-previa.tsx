import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import Button from '../../src/shared/components/Button'
import ListGroup from '../../src/shared/components/ListGroup'
import ListRow from '../../src/shared/components/ListRow'
import { formatInt } from '../../src/shared/lib/format'
import ElegirImagenComunidad from '../../src/features/social/components/ElegirImagenComunidad'
import ImagenComunidad from '../../src/features/social/components/ImagenComunidad'
import { CATALOGO_IMAGENES_COMUNIDAD, type ImagenComunidad as IdImagen } from '../../src/features/social/lib/imagenComunidad'

/** Solo componentes visuales y datos sintéticos. No importa la app, IndexedDB ni Supabase. */
function VistaPrevia() {
  const [imagen, setImagen] = useState<IdImagen | null>('lugar.campamento')
  const [oscuro, setOscuro] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  return <main className="app-content mx-auto space-y-section px-page py-6">
    <header className="space-y-2">
      <h1 className="text-heading">Imágenes de comunidades</h1>
      <p className="text-body-sm text-fg-muted">Preparación del catálogo. Datos de ejemplo, sin guardado.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => { document.documentElement.dataset.theme = oscuro ? 'light' : 'dark'; setOscuro(!oscuro) }}>{oscuro ? 'Ver en claro' : 'Ver en oscuro'}</Button>
        <Button variant="secondary" aria-pressed={ocupado} onClick={() => setOcupado(!ocupado)}>Simular guardado</Button>
      </div>
    </header>
    <section aria-label="Vista de lista" className="space-y-2">
      <h2 className="text-title">En la lista</h2>
      <ListGroup>{[CATALOGO_IMAGENES_COMUNIDAD[0], CATALOGO_IMAGENES_COMUNIDAD[19], CATALOGO_IMAGENES_COMUNIDAD[30]].map((e, i) => <li key={e.id}>
        <ListRow><span className="flex min-w-0 items-center gap-3"><ImagenComunidad nombre={e.nombre} imagen={i === 0 ? imagen : e.id} /><span className="min-w-0"><span className="block break-words text-body font-semibold">{e.nombre}</span><span className="block text-caption text-fg-muted">{formatInt(28 + i)} miembros</span></span></span></ListRow>
      </li>)}</ListGroup>
    </section>
    <section aria-label="Vista de cabecera" className="space-y-2">
      <h2 className="text-title">En la cabecera</h2>
      <div className="flex flex-wrap items-start gap-3"><ImagenComunidad nombre="Campamento" imagen={imagen} tamano="lg" /><div className="min-w-0 flex-1 basis-40 space-y-1"><h3 className="break-words text-heading">Campamento</h3><p className="text-caption text-fg-muted">28 miembros · Todos pueden publicar</p></div></div>
    </section>
    <section aria-label="Selector de imagen" className="space-y-stack">
      <ElegirImagenComunidad nombre="Campamento" imagen={imagen} onChange={setImagen} disabled={ocupado} />
      <output aria-label="Identificador seleccionado" className="block break-words text-caption text-fg-muted">{imagen ?? 'Iniciales'}</output>
    </section>
  </main>
}

createRoot(document.getElementById('root')!).render(<VistaPrevia />)
