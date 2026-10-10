import { adminClient, requireUser, jsonError } from '@/lib/server/supabase-admin'

export const maxDuration = 60

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS_CAP = 2500
const MAX_MESSAGES = 4
const MAX_INPUT_CHARS = 8000
const DAILY_CAP = 100

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_B64_CHARS = 3_000_000 // ~2,2 Mo : le navigateur compresse avant envoi

// Accepte du texte, ou une liste de blocs texte / image (une seule image).
// Tout le reste est refusé : la route ne doit pas servir de passerelle libre.
function cleanContent(content) {
  if (typeof content === 'string') return { content, chars: content.length }
  if (!Array.isArray(content) || content.length === 0 || content.length > 3) return null
  let chars = 0
  let images = 0
  const out = []
  for (const block of content) {
    if (block?.type === 'text' && typeof block.text === 'string') {
      chars += block.text.length
      out.push({ type: 'text', text: block.text })
    } else if (
      block?.type === 'image' &&
      block.source?.type === 'base64' &&
      IMAGE_TYPES.includes(block.source.media_type) &&
      typeof block.source.data === 'string' &&
      block.source.data.length <= MAX_IMAGE_B64_CHARS
    ) {
      images += 1
      out.push({
        type: 'image',
        source: { type: 'base64', media_type: block.source.media_type, data: block.source.data },
      })
    } else {
      return null
    }
  }
  if (images > 1) return null
  return { content: out, chars }
}

function validate(body) {
  if (!body || !Array.isArray(body.messages)) return { error: 'Requête invalide.' }
  if (body.messages.length === 0 || body.messages.length > MAX_MESSAGES) return { error: 'Requête invalide.' }
  let total = 0
  const messages = []
  for (const m of body.messages) {
    const cleaned = m && ['user', 'assistant'].includes(m.role) ? cleanContent(m.content) : null
    if (!cleaned) return { error: 'Requête invalide.' }
    total += cleaned.chars
    messages.push({ role: m.role, content: cleaned.content })
  }
  if (total > MAX_INPUT_CHARS) return { error: 'Votre demande est trop longue.' }
  return { messages }
}

export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return jsonError('Connexion requise.', 401, 'unauthenticated')

  let body
  try {
    body = await request.json()
  } catch {
    return jsonError('Requête invalide.', 400, 'bad_request')
  }
  const checked = validate(body)
  if (checked.error) return jsonError(checked.error, 400, 'bad_request')

  const maxTokens = Math.min(Math.max(parseInt(body.max_tokens) || 1000, 100), MAX_TOKENS_CAP)
  const admin = adminClient()

  // Débit atomique côté base : impossible à contourner depuis le navigateur.
  const { data: debit, error: debitError } = await admin.rpc('debit_credit', {
    p_user: user.id,
    p_daily_cap: DAILY_CAP,
  })
  if (debitError) {
    console.error('[claude] debit_credit', debitError.message)
    return jsonError('Service momentanément indisponible.', 500, 'server_error')
  }
  if (!debit?.ok) {
    if (debit?.reason === 'daily_cap') {
      return jsonError('Limite quotidienne atteinte, réessayez demain.', 429, 'daily_cap')
    }
    return jsonError('Plus de crédits IA. Passez à un abonnement pour continuer.', 402, 'no_credits')
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: checked.messages,
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message || `Anthropic ${response.status}`)

    return Response.json(
      { content: data.content },
      { headers: { 'x-credits-balance': debit.balance == null ? 'unlimited' : String(debit.balance) } }
    )
  } catch (err) {
    // L'IA a échoué : on rend le crédit, et on ne divulgue pas le détail technique.
    console.error('[claude]', err.message)
    await admin.rpc('refund_credit', { p_user: user.id })
    return jsonError("L'IA n'a pas pu répondre, votre crédit a été rendu.", 502, 'ai_failed')
  }
}
