import { adminClient, json, jsonError, requireUser } from '../_shared/lib.ts'

// Proxy Anthropic. L'application n'embarque jamais la clé ; le quota est appliqué ICI
// (fonction SQL consume_ai), avant tout appel au modèle.
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS_CAP = 2500
const MAX_MESSAGES = 4
const MAX_INPUT_CHARS = 8000
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_B64_CHARS = 3_000_000
const FEATURES = ['scan', 'coach'] as const
type Feature = (typeof FEATURES)[number]

type Block =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

// Du texte, ou une liste de blocs texte / image (une seule image). Le reste est refusé :
// la fonction ne doit pas servir de passerelle libre.
function cleanContent(content: unknown): { content: string | Block[]; chars: number } | null {
  if (typeof content === 'string') return { content, chars: content.length }
  if (!Array.isArray(content) || content.length === 0 || content.length > 3) return null
  let chars = 0, images = 0
  const out: Block[] = []
  for (const b of content) {
    if (b?.type === 'text' && typeof b.text === 'string') {
      chars += b.text.length
      out.push({ type: 'text', text: b.text })
    } else if (
      b?.type === 'image' && b.source?.type === 'base64' && IMAGE_TYPES.includes(b.source.media_type) &&
      typeof b.source.data === 'string' && b.source.data.length <= MAX_IMAGE_B64_CHARS
    ) {
      images += 1
      out.push({ type: 'image', source: { type: 'base64', media_type: b.source.media_type, data: b.source.data } })
    } else return null
  }
  return images > 1 ? null : { content: out, chars }
}

function validate(body: any): { messages: { role: string; content: string | Block[] }[] } | { error: string } {
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return { error: 'Requête invalide.' }
  }
  let total = 0
  const messages = []
  for (const m of body.messages) {
    const cleaned = m && ['user', 'assistant'].includes(m.role) ? cleanContent(m.content) : null
    if (!cleaned) return { error: 'Requête invalide.' }
    total += cleaned.chars
    messages.push({ role: m.role, content: cleaned.content })
  }
  return total > MAX_INPUT_CHARS ? { error: 'Votre demande est trop longue.' } : { messages }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonError('Méthode non autorisée.', 405, 'method_not_allowed')
  const admin = adminClient()
  const user = await requireUser(req, admin)
  if (!user) return jsonError('Connexion requise.', 401, 'unauthenticated')

  let body: any
  try { body = await req.json() } catch { return jsonError('Requête invalide.', 400, 'bad_request') }

  // Liste blanche : le client n'invente pas de fonctionnalité.
  const feature = body?.feature as Feature
  if (!FEATURES.includes(feature)) return jsonError('Requête invalide.', 400, 'bad_request')
  const checked = validate(body)
  if ('error' in checked) return jsonError(checked.error, 400, 'bad_request')
  const maxTokens = Math.min(Math.max(parseInt(body.max_tokens) || 1000, 100), MAX_TOKENS_CAP)

  const { data: debit, error: debitError } = await admin.rpc('consume_ai', { p_user: user.id, p_feature: feature })
  if (debitError || !debit) {
    console.error('[ai] consume_ai', debitError?.message)
    return jsonError('Service momentanément indisponible.', 500, 'server_error')
  }
  if (!debit.ok) {
    const status = { plan: debit.plan, remaining: debit.remaining, resets_at: debit.resets_at, coach_access: debit.coach_access }
    switch (debit.reason) {
      case 'subscription_required':
        return jsonError('Cette fonctionnalité nécessite une offre qui l’inclut.', 403, 'subscription_required', { status })
      case 'quota_weekly':
        return jsonError('Tu as utilisé tous tes scans de la semaine.', 402, 'quota_weekly', { status })
      case 'daily_cap':
        return jsonError('Limite quotidienne atteinte, réessaie demain.', 429, 'daily_cap', { status })
      default:
        return jsonError('Requête invalide.', 400, 'bad_request')
    }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: checked.messages }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message || `Anthropic ${response.status}`)
    return json({
      content: data.content,
      status: { plan: debit.plan, remaining: debit.remaining, resets_at: debit.resets_at, coach_access: debit.coach_access },
    })
  } catch (err) {
    // L'IA a échoué : on rend le scan, sans divulguer le détail technique.
    console.error('[ai]', (err as Error).message)
    await admin.rpc('refund_ai', { p_user: user.id, p_feature: feature, p_week_start: debit.week_start })
    return jsonError("L'IA n'a pas pu répondre, ton scan a été rendu.", 502, 'ai_failed')
  }
})
