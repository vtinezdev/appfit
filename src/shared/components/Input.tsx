import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import Icon from './Icon'

interface FieldProps {
  /** `muted` (por defecto) dentro de sheets y cards; `surface` cuando el campo va directamente sobre el fondo de pantalla. */
  tone?: 'muted' | 'surface'
  /** Campo compacto (filas con varios números). Sigue a 16 px de texto: el CSS global lo garantiza. */
  dense?: boolean
}

/** Todos los campos comparten esta base: texto ≥16 px (sin zoom en iOS) y zona táctil de 44 px salvo `dense`. */
function field({ tone = 'muted', dense }: FieldProps, tall: boolean, className: string) {
  const bg = tone === 'surface' ? 'bg-surface' : 'bg-surface-muted'
  const size = dense ? 'px-2 py-1.5' : `px-3 ${tall ? 'min-h-touch' : 'py-2.5'}`
  const width = /(^|\s)w-/.test(className) ? '' : 'w-full' // un `w-24` explícito sustituye al ancho completo
  return `${width} min-w-0 rounded-md ${bg} ${size} text-body text-fg placeholder:text-fg-subtle`
}

export function Input({ tone, dense, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  return <input className={`${field({ tone, dense }, true, className)} ${className}`} {...rest} />
}

/** Buscador: mismo campo con una lupa a la izquierda. El nombre accesible es obligatorio (el placeholder no lo es). */
export function SearchInput({ tone, className = '', ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'aria-label'> & Pick<FieldProps, 'tone'> & { 'aria-label': string }) {
  return (
    <div className={`relative ${className}`}>
      <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
      <input type="search" enterKeyHint="search" className={`${field({ tone }, true, '')} pl-10`} {...rest} />
    </div>
  )
}

export function Textarea({ tone, dense, className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  return <textarea className={`${field({ tone, dense }, false, className)} ${className}`} {...rest} />
}

export function Select({ tone, dense, className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  return <select className={`${field({ tone, dense }, true, className)} ${className}`} {...rest} />
}
