import { useLayoutEffect, useRef } from 'react'
import { motionEasing, motionMs, reduceMotion } from '../design/motion'

/** FLIP solo al cambiar la lista: no mide ni anima durante la escritura o el reloj. */
export function useListMotion<T extends HTMLElement = HTMLDivElement>(identity: string) {
  const ref = useRef<T>(null)
  const positions = useRef(new Map<string, number>())
  const animations = useRef(new Map<string, Animation>())
  useLayoutEffect(() => {
    const next = new Map<string, number>()
    ref.current?.querySelectorAll<HTMLElement>('[data-motion-id]').forEach(el => {
      const id = el.dataset.motionId!
      const top = el.getBoundingClientRect().top
      const previous = positions.current.get(id)
      next.set(id, top)
      animations.current.get(id)?.cancel()
      if (!reduceMotion() && previous !== undefined && Math.abs(previous - top) > 1) {
        const animation = el.animate([{ transform: `translateY(${previous - top}px)` }, { transform: 'translateY(0)' }], {
          duration: motionMs('--dur-normal'), easing: motionEasing(),
        })
        animations.current.set(id, animation)
      }
    })
    positions.current = next
    return () => { animations.current.forEach(animation => animation.cancel()); animations.current.clear() }
  }, [identity])
  return ref
}
