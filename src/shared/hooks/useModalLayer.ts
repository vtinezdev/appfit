import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
const layers: HTMLElement[] = []
let previousOverflow = ''
let previousInert = false
let layerSequence = 0
const historyLayers = new Map<HTMLElement, { id: number; close: () => void }>()
let historyListening = false
let historyBackPending = false
let historyPushQueue: (() => void)[] = []

function settleHistory() {
  if (historyBackPending) return
  const id = history.state?.appfitOverlay
  if (id && !Array.from(historyLayers.values()).some(layer => layer.id === id)) {
    historyBackPending = true
    history.back()
    return
  }
  const queue = historyPushQueue
  historyPushQueue = []
  queue.forEach(push => push())
}

function registerHistory(panel: HTMLElement, close: () => void) {
  if (!historyListening) {
    historyListening = true
    window.addEventListener('popstate', () => {
      if (historyBackPending) {
        historyBackPending = false
        settleHistory()
        return
      }
      const top = layers.at(-1)
      const layer = top && historyLayers.get(top)
      if (layer && history.state?.appfitOverlay !== layer.id) layer.close()
    })
  }
  const id = ++layerSequence
  historyLayers.set(panel, { id, close })
  const push = () => {
    if (!historyLayers.has(panel)) return
    try { history.pushState({ ...history.state, appfitOverlay: id }, '') } catch { /* History opcional. */ }
  }
  // history.back() es asíncrono. No colocar una capa nueva encima de una salida pendiente.
  if (historyBackPending) historyPushQueue.push(push)
  else push()
}

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
  useLayoutEffect(() => {
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
    // Una entrada efímera por capa: Atrás en Android/navegador cierra la capa superior,
    // no abandona la PWA. El estado previo y la URL se conservan.
    registerHistory(panel, () => closeRef.current())
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
      historyLayers.delete(panel)
      const index = layers.indexOf(panel)
      if (index !== -1) layers.splice(index, 1)
      settleHistory()
      syncLayers()
      if (!layers.length) document.body.style.overflow = previousOverflow
      const trigger = triggerRef.current
      triggerRef.current = null
      if (trigger?.isConnected && !trigger.closest('[inert]')) trigger.focus({ preventScroll: true })
      else layers.at(-1)?.focus({ preventScroll: true })
      if (!layers.length && !trigger?.isConnected) {
        document.querySelector<HTMLElement>('[data-app-shell] [aria-current="page"], [data-app-shell] [data-nav-trigger]')?.focus({ preventScroll: true })
      }
    }
  }, [open, panelRef])
}
