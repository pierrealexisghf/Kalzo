import { adminClient, requireUser, jsonError } from '@/lib/server/supabase-admin'

export const maxDuration = 60

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS_CAP = 2500
const MAX_MESSAGES = 4
const MAX_INPUT_CHARS = 8000
const DAILY_CAP = 100

function validate(body) {
  if (!body || !Array.isArray(body.messages)) return 'Requête invalide.'
  if (body.messages.length === 0 || body.messages.length > MAX_MESSAGES) return 'Requête invalide.'
  let total = 0
  for (const m of body.messages) {
    if (!m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string') {
      return 'Requête invalide.'
    }
    total += m.content.length
  }
  if (total > MAX_INPUT_CHARS) return 'Votre demande est trop longue.'
  return null
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
  const invalid = validate(body)
  if (invalid) return jsonError(invalid, 400, 'bad_request')

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
        messages: body.messages.map(m => ({ role: m.role, content: m.content })),
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
