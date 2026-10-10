'use client'

import { ChevronLeft } from 'lucide-react'

// Retour à la page précédente (l'app, si on en vient), sinon à l'accueil.
export default function BackLink() {
  return (
    <button
      onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = '/'))}
      className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
    >
      <ChevronLeft className="size-4" />Retour
    </button>
  )
}
