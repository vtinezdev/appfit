import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
const layers: HTMLElement[] = []
let previousOverflow = ''
let previousInert = false

function syncLayers() {
  const shell = document.querySelector<HTMLElement>('[data-app-shell]')
  if (shell) shell.inert = layers.length ? true : previousInert
  layers.forEach((panel, i) => { panel.inert = i !== layers.length - 1 })
}

/** Foco, Escape, aislamiento y retorno compartidos por sheets y páginas modales. */
export function useModalLayer(open: boolean, panelRef: RefObject<HTMLElement | null>, onClose: () => void) {
  const closeRef = useRef(onClose)
  const triggerRef = useRef<HTMLElement | null>(null)
  if (open && !triggerRef.current) triggerRef.current = document.activeElement as HTMLElement | null
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    const panel = panelRef.current
    if (!open || !panel) return
    if (!layers.length) {
      previousOverflow = document.body.style.overflow
      previousInert = document.querySelector<HTMLElement>('[data-app-shell]')?.inert ?? false
      document.body.style.overflow = 'hidden'
    }
    triggerRef.current ??= document.activeElement as HTMLElement | null
    layers.push(panel)
    syncLayers()
    if (!panel.contains(document.activeElement)) panel.focus()
    const onKey = (e: KeyboardEvent) => {
      if (layers.at(-1) !== panel) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeRef.current()
      } else if (e.key === 'Tab') {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.getClientRects().length && !el.closest('[hidden],[inert]'))
        if (!items.length) { e.preventDefault(); panel.focus(); return }
        const first = items[0], last = items[items.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === panel)) {
          e.preventDefault(); first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const index = layers.indexOf(panel)
      if (index !== -1) layers.splice(index, 1)
      syncLayers()
      if (!layers.length) document.body.style.overflow = previousOverflow
      const trigger = triggerRef.current
      triggerRef.current = null
      if (trigger?.isConnected && !trigger.closest('[inert]')) trigger.focus({ preventScroll: true })
      else layers.at(-1)?.focus({ preventScroll: true })
      if (!layers.length && !trigger?.isConnected) {
        document.querySelector<HTMLElement>('[data-app-shell] [aria-current="page"]')?.focus({ preventScroll: true })
      }
    }
  }, [open, panelRef])
}
