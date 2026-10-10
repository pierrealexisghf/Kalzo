'use client'

import { CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { useApp } from '@/lib/AppContext'

const STYLES = {
  success: { icon: CheckCircle2, cls: 'text-nutri' },
  error: { icon: AlertCircle, cls: 'text-destructive' },
  info: { icon: Info, cls: 'text-water' },
}

export default function Toast() {
  const { toasts, dismissToast } = useApp()
  if (!toasts.length) return null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 safe-top"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      role="status" aria-live="polite"
    >
      {toasts.map(t => {
        const { icon: Icon, cls } = STYLES[t.type] || STYLES.info
        return (
          <button
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className="k-pop pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm font-medium shadow-float"
          >
            <Icon className={`size-5 shrink-0 ${cls}`} />
            <span>{t.message}</span>
          </button>
        )
      })}
    </div>
  )
}
