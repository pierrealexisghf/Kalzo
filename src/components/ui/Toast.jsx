'use client'

import { useApp } from '@/lib/AppContext'

export default function Toast() {
  const { toast } = useApp()

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: `translateX(-50%) translateY(${toast ? '0' : '-80px'})`,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '10px 18px',
        fontSize: 13,
        fontWeight: 600,
        zIndex: 500,
        transition: 'transform 0.3s',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        pointerEvents: 'none',
      }}
    >
      {toast}
    </div>
  )
}
