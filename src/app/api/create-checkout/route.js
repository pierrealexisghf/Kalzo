import { adminClient, requireUser, jsonError } from '@/lib/server/supabase-admin'
import { PLANS, SITE_URL } from '@/lib/constants'

export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return jsonError('Connexion requise.', 401, 'unauthenticated')

  let plan
  try {
    ;({ plan } = await request.json())
  } catch {
    return jsonError('Requête invalide.', 400, 'bad_request')
  }
  if (!PLANS[plan]) return jsonError('Offre inconnue.', 400, 'bad_request')

  // Pas de second abonnement par-dessus un abonnement en cours.
  const { data: profile } = await adminClient()
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()
  if (['active', 'trialing', 'past_due'].includes(profile?.subscription_status)) {
    return jsonError('Vous avez déjà un abonnement en cours.', 409, 'already_subscribed')
  }

  const params = new URLSearchParams({
    'payment_method_types[]': 'card',
    mode: 'subscription',
    'line_items[0][price]': PLANS[plan].priceId,
    'line_items[0][quantity]': '1',
    success_url: `${SITE_URL}?payment=success&plan=${plan}`,
    cancel_url: `${SITE_URL}?payment=cancelled`,
    customer_email: user.email,
    'metadata[user_id]': user.id,
    'metadata[plan]': plan,
    'subscription_data[metadata][user_id]': user.id,
    'subscription_data[metadata][plan]': plan,
    allow_promotion_codes: 'true',
  })

  // L'essai gratuit n'est offert qu'une fois par compte (marqueur côté serveur).
  if (!user.app_metadata?.trial_used) params.set('subscription_data[trial_period_days]', '7')

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const session = await response.json()
    if (session.error) throw new Error(session.error.message)
    return Response.json({ url: session.url })
  } catch (err) {
    console.error('[checkout]', err.message)
    return jsonError('Impossible de lancer le paiement.', 500, 'server_error')
  }
}
