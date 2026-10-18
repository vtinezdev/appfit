import Campo from '../../../shared/components/Campo'
import { Textarea } from '../../../shared/components/Input'
import { MAX_NOTA } from '../lib/publicacion'

export default function NotaPublicacion({ valor, onChange, disabled }: { valor: string; onChange: (valor: string) => void; disabled?: boolean }) {
  return <Campo etiqueta="¿Cómo ha ido? (opcional)" ayuda={`Hasta ${MAX_NOTA} caracteres. La nota de esta copia no se podrá editar después de publicar.`}>
    <Textarea rows={3} maxLength={MAX_NOTA} value={valor} disabled={disabled} onChange={e => onChange(e.target.value)} />
  </Campo>
}
