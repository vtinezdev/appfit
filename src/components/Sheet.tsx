import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function Sheet({ open, onClose, title, children }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="safe-bottom max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-slate-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-700" />
        {title && <h2 className="mb-3 text-lg font-semibold text-slate-100">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
