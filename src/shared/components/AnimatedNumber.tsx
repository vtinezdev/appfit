import { useEffect, useRef, useState } from 'react'
import { motionMs } from '../design/motion'
import { formatInt } from '../lib/format'

interface Props {
  value: number
  className?: string
}

/**
 * Entero que se desliza hasta su nuevo valor (interpolación, no dígitos rodantes). Cuenta desde 0 al montarse.
 * Los lectores de pantalla leen solo el valor final; con prefers-reduced-motion cambia al instante.
 */
export default function AnimatedNumber({ value, className = '' }: Props) {
  const reduced = motionMs('--dur-long') === 0
  const [shown, setShown] = useState(reduced ? value : 0)
  const shownRef = useRef(shown)

  useEffect(() => {
    const ms = motionMs('--dur-long')
    if (ms === 0) return
    const from = shownRef.current
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      shownRef.current = from + (value - from) * (1 - Math.pow(1 - t, 3))
      setShown(shownRef.current)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])

  const text = formatInt(reduced ? value : shown)
  return (
    <span className={`tabular ${className}`}>
      <span aria-hidden>{text}</span>
      <span className="sr-only">{formatInt(value)}</span>
    </span>
  )
}
