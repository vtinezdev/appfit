import { preparacionAlimento } from '../lib/preparacionAlimento'

export default function PreparacionAlimento({ nombre, explicar = false }: { nombre: string; explicar?: boolean }) {
  const preparacion = preparacionAlimento(nombre)
  if (!preparacion) return null
  return <p className="text-body-sm text-fg"><strong className="font-semibold">{preparacion}</strong>{explicar && (preparacion === 'Preparación por comprobar' ? ' · El nombre menciona crudo y cocinado. Revisa el estado en que pesas el alimento o elige una variante más clara.' : ' · Indica los gramos pesados en ese estado. Si no coincide, cambia el alimento.')}</p>
}
