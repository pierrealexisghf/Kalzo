import { supabase } from './supabase'

export type AiStatus = { plan: string; remaining: number | null; resets_at: string; coach_access: boolean; weekly_scans?: number | null; trial_ends_at?: string | null }
export class AiError extends Error {
  constructor(message: string, public code: string, public status?: AiStatus) { super(message) }
}

type Block = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg'; data: string } }

// Le serveur (Edge Function `ai`) applique le quota ; ceci ne fait que relayer la demande.
export async function askAI(feature: 'scan' | 'coach', content: string | Block[], maxTokens = 1000) {
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { feature, max_tokens: maxTokens, messages: [{ role: 'user', content }] },
  })
  if (error) {
    let body: any = null
    try { body = await (error as any).context?.json?.() } catch { /* réponse non JSON */ }
    const e = body?.error
    throw new AiError(e?.message ?? "L'IA est indisponible pour le moment.", e?.code ?? 'ai_failed', e?.status)
  }
  return { text: (data?.content?.[0]?.text ?? '') as string, status: data?.status as AiStatus | undefined }
}

// Le modèle ajoute parfois du texte ou des ``` autour du JSON : on isole l'objet.
export function parseAiJson<T = any>(text: string): T {
  const raw = String(text || '')
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}')
  if (a === -1 || b <= a) throw new Error('Réponse illisible')
  return JSON.parse(raw.slice(a, b + 1))
}

export const imageBlock = (base64: string): Block => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } })
