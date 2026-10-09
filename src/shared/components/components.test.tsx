import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import BottomNav, { type Tab } from '../../app/BottomNav'
import Button, { IconButton } from './Button'
import Metric from './Metric'
import NumberStepper from './NumberStepper'
import ProgressBar from './ProgressBar'
import SegmentedControl from './SegmentedControl'
import ViewTabs from './ViewTabs'
import Disclosure from './Disclosure'

const opciones = [{ valor: 'hoy', label: 'Hoy' }, { valor: 'resumen', label: 'Resumen' }]
const noop = () => {}

describe('contratos del sistema visual', () => {
  it.each(['inicio', 'nutricion', 'gym', 'perfil', 'referencias', 'ajustes'] as Tab[])('barra de pestañas con «+» central y una sola sección actual en %s', tab => {
    const html = renderToStaticMarkup(<BottomNav tab={tab} onChange={noop} onAcciones={noop} />)
    expect(html.match(/<button/g)).toHaveLength(5)
    for (const label of ['Inicio', 'Nutrición', 'Entreno', 'Más']) expect(html).toContain(`>${label}</span>`)
    expect(html).toMatch(/aria-label="Registrar" aria-haspopup="dialog" aria-expanded="false" data-nav-trigger/)
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    if (['perfil', 'referencias', 'ajustes'].includes(tab)) expect(html).toMatch(/aria-current="page" aria-haspopup="dialog"/)
    expect(html).not.toContain('role="dialog"')
    expect(html).not.toContain('fixed')
    expect(html).not.toContain('data-surface')
  })
  it('pestañas con panel asociado y una sola parada de teclado', () => {
    const html = renderToStaticMarkup(<ViewTabs label="Vistas de nutrición" opciones={opciones} valor="hoy" onChange={noop}><p>Datos de hoy</p></ViewTabs>)
    const panelId = html.match(/aria-controls="([^"]+)"/)![1]
    expect(html).toContain(`id="${panelId}" role="tabpanel"`)
    expect(html).toContain('aria-label="Vistas de nutrición"')
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1)
    expect(html.match(/tabindex="-1"/g)).toHaveLength(1)
  })
  it('un selector expresa elección de valor, no navegación', () => {
    const html = renderToStaticMarkup(<SegmentedControl label="Periodo" opciones={opciones} valor="hoy" onChange={noop} />)
    expect(html).toContain('role="radiogroup" aria-label="Periodo"')
    expect(html.match(/role="radio"/g)).toHaveLength(2)
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1)
    expect(html).not.toContain('role="tab"')
  })
  it('el stepper no tiene variante táctil pequeña y sus campos tienen nombre', () => {
    const html = renderToStaticMarkup(<NumberStepper value={100} label="gramos" suffix="g" onChange={noop} />)
    expect(html).toContain('aria-label="Reducir gramos"')
    expect(html).toContain('aria-label="Aumentar gramos"')
    expect(html).toContain('aria-label="gramos"')
    expect(html.match(/h-touch w-touch/g)).toHaveLength(2)
    expect(html).toContain('min-h-touch')
    expect(html).toContain('text-body')
  })
  it('todos los tamaños de icono conservan un target real de 44 px o más', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const html = renderToStaticMarkup(<IconButton icon="plus" label="Añadir" size={size} />)
      expect(html).toMatch(/h-touch w-touch|h-12 w-12/)
      expect(html).not.toContain('before:')
    }
  })
  it('una acción en curso no puede repetirse y anuncia su estado', () => {
    const html = renderToStaticMarkup(<Button loading onClick={noop}>Guardar</Button>)
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-busy="true"')
  })
  it('el primario deshabilitado pasa a neutro; mientras carga conserva el acento', () => {
    expect(renderToStaticMarkup(<Button disabled onClick={noop}>Interpretar</Button>)).toContain('disabled:bg-surface-muted')
    expect(renderToStaticMarkup(<Button loading onClick={noop}>Guardar</Button>)).not.toContain('disabled:bg-surface-muted')
    expect(renderToStaticMarkup(<Button variant="secondary" disabled onClick={noop}>Cancelar</Button>)).toContain('disabled:opacity-40')
  })
  it('las métricas muestran el valor completo inmediato y con formato español', () => {
    const html = renderToStaticMarkup(<Metric valor={1234567} unidad="kg" label="Volumen" />)
    expect(html).toContain('1.234.567')
    expect(html).toContain('kg')
    expect(html).not.toContain('aria-hidden')
  })
  it('superar un objetivo amplía el dominio y conserva el dato accesible', () => {
    const html = renderToStaticMarkup(<ProgressBar value={300} goal={200} label="Proteína" valueText="300 de 200 g, 100 g sobre el objetivo" />)
    expect(html).toContain('aria-valuemax="300"')
    expect(html).toContain('aria-valuenow="300"')
    expect(html).toContain('aria-valuetext="300 de 200 g, 100 g sobre el objetivo"')
    expect(html).toContain('opacity-50')
    expect(html).not.toContain('destructive')
  })
  it('la marca del objetivo solo aparece al pasarse: por debajo, el final del carril ya es el objetivo', () => {
    expect(renderToStaticMarkup(<ProgressBar value={300} goal={200} label="Proteína" />)).toContain('bg-goal')
    expect(renderToStaticMarkup(<ProgressBar value={150} goal={200} label="Proteína" />)).not.toContain('bg-goal')
    expect(renderToStaticMarkup(<ProgressBar value={200} goal={200} label="Proteína" />)).not.toContain('bg-goal')
  })
  it('el desplegable conserva relación entre control y contenido', () => {
    const html = renderToStaticMarkup(<Disclosure title="Detalles" open><p>Valores nutricionales</p></Disclosure>)
    const id = html.match(/aria-controls="([^"]+)"/)![1]
    expect(html).toContain(`id="${id}"`)
    expect(html).toContain('aria-expanded="true"')
    expect(html).not.toContain('hidden=""')
  })
})
