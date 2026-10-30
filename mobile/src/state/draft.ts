import { useSyncExternalStore } from 'react'
import type { Macros } from '@/lib/logic/nutrition'
import type { PreparedImage } from '@/lib/photos'

// Brouillon de repas partagé entre les écrans de saisie (la photo est trop lourde pour passer en paramètre de route).
export type Draft = {
  photo: { full: PreparedImage; thumb: PreparedImage } | null
  prefill: { name: string; emoji: string; macros: Macros; ingredients?: string[]; source: 'ai' | 'manual' | 'quick' | 'recent' } | null
}
const EMPTY: Draft = { photo: null, prefill: null }
let draft: Draft = EMPTY
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

export const getDraft = () => draft
export function setDraft(patch: Partial<Draft>) { draft = { ...draft, ...patch }; emit() }
export function resetDraft() { draft = EMPTY; emit() }
export function useDraft() {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb) } }, getDraft, getDraft)
}
