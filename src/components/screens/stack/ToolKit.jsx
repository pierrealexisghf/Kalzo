'use client'

import { useRef, useState } from 'react'
import { Camera, X, Sparkles } from 'lucide-react'
import { compressImage } from '@/lib/ai'
import { useApp } from '@/lib/AppContext'
import { MEAL_TYPES } from '@/lib/nutrition'
import { Chip, Spinner, cx } from '@/components/ui/primitives'

export function defaultMealType() {
  const h = new Date().getHours()
  if (h < 10) return 'petit-dejeuner'
  if (h < 15) return 'dejeuner'
  if (h < 18) return 'collation'
  return 'diner'
}

export function MealTypeChips({ value, onChange }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {MEAL_TYPES.map(t => (
        <Chip key={t.id} active={value === t.id} onClick={() => onChange(t.id)}>{t.emoji} {t.label}</Chip>
      ))}
    </div>
  )
}

// Rappel du coût d'une action IA, avec le solde restant.
export function CreditNote({ cost = 1 }) {
  const { credits, isVip } = useApp()
  return (
    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
      <Sparkles className="size-3.5 text-coach" />
      {cost} crédit IA · {isVip ? 'illimité avec votre offre' : `il vous en reste ${credits}`}
    </p>
  )
}

// Choix / prise de photo, compressée avant envoi.
export function PhotoPicker({ photo, onPhoto, label = 'Prendre ou choisir une photo', height = 'h-44' }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const { showToast } = useApp()

  const pick = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return showToast('Ce fichier n\'est pas une image.', 'error')
    setBusy(true)
    try { onPhoto(await compressImage(file)) }
    catch { showToast("Impossible de lire cette photo.", 'error') }
    setBusy(false)
  }

  return (
    <>
      {photo ? (
        <div className="relative overflow-hidden rounded-3xl">
          <img src={photo.dataUrl} alt="Photo à analyser" className={cx('w-full object-cover', height)} />
          <button onClick={() => onPhoto(null)} aria-label="Retirer la photo" className="k-press absolute right-2.5 top-2.5 flex size-9 items-center justify-center rounded-full bg-black/55 text-white">
            <X className="size-[18px]" />
          </button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} className={cx('k-press flex w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border bg-card text-muted-foreground', height)}>
          {busy ? <Spinner /> : <Camera className="size-8 text-tone" strokeWidth={1.8} />}
          <span className="text-sm font-semibold">{label}</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
    </>
  )
}

export function Thinking({ text }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="relative flex size-16 items-center justify-center rounded-3xl bg-tone-soft text-tone">
        <Sparkles className="size-8 animate-pulse" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{text}</p>
    </div>
  )
}
