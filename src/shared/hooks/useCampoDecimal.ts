import { useState, type InputHTMLAttributes } from 'react'
import { decimalEditable, esDecimalParcial, leerDecimal } from '../lib/format'

type PropsCampo = Required<Pick<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'value' | 'onChange' | 'onFocus' | 'onBlur'>>

/**
 * Props de un campo numérico con decimales. Es de texto con teclado decimal: un `type="number"` da `''` con «12,» a
 * medio escribir y el valor controlado lo pisaba (se borraba el número). Mientras tiene el foco manda lo tecleado;
 * fuera, el valor. Emite `undefined` mientras no haya número.
 */
export function useCampoDecimal(valor: number | undefined, onChange: (valor: number | undefined) => void): PropsCampo {
  const [borrador, setBorrador] = useState<string | null>(null)
  return {
    type: 'text',
    inputMode: 'decimal',
    value: borrador ?? decimalEditable(valor),
    onFocus: () => setBorrador(decimalEditable(valor)),
    onChange: (e) => {
      const texto = e.target.value.trim()
      if (!esDecimalParcial(texto)) return
      setBorrador(texto)
      onChange(leerDecimal(texto))
    },
    onBlur: () => setBorrador(null),
  }
}
