import type { InputHTMLAttributes, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useCampoDecimal } from '../hooks/useCampoDecimal'
import Icon from './Icon'

interface FieldProps {
  /** `muted` (por defecto) dentro de sheets y cards; `surface` cuando el campo va directamente sobre el fondo de pantalla. */
  tone?: 'muted' | 'surface'
}

/** Campos de 16 px, controles de al menos 44 px, foco visible y borde de error. */
function field({ tone = 'muted' }: FieldProps, tall: boolean, className: string) {
  const bg = tone === 'surface' ? 'bg-surface' : 'bg-surface-muted'
  const size = `px-3 ${tall ? 'min-h-touch' : 'py-2.5'}`
  const width = /(^|\s)w-/.test(className) ? '' : 'w-full' // un `w-24` explícito sustituye al ancho completo
  return `app-field ${width} min-w-0 border border-line-strong rounded-md ${bg} ${size} text-body text-fg transition-colors duration-short placeholder:text-fg-subtle aria-invalid:border-destructive disabled:opacity-50`
}

export function Input({ tone, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  return <input className={`${field({ tone }, true, className)} ${className}`} {...rest} />
}

/** Cifra con decimales (coma o punto). `onChange` recibe `undefined` mientras el campo no tenga número. */
export function DecimalInput({ value, onChange, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'value' | 'onChange' | 'onFocus' | 'onBlur'> & FieldProps & {
  value: number | undefined
  onChange: (valor: number | undefined) => void
}) {
  return <Input {...rest} {...useCampoDecimal(value, onChange)} />
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

export function Textarea({ tone, className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  return <textarea className={`${field({ tone }, false, className)} ${className}`} {...rest} />
}

/** React 19: `ref` apunta al select real (p. ej. para devolverle el foco). */
export function Select({ tone, className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement> & FieldProps & { ref?: Ref<HTMLSelectElement> }) {
  return <select className={`${field({ tone }, true, className)} ${className}`} {...rest} />
}
