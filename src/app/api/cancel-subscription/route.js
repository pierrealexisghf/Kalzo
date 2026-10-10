import { adminClient, requireUser, jsonError } from '@/lib/server/supabase-admin'

export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return jsonError('Connexion requise.', 401, 'unauthenticated')

  const admin = adminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_id')
    .eq('id', user.id)
    .single()
  const subscriptionId = profile?.subscription_id
  if (!subscriptionId) return jsonError('Aucun abonnement actif.', 400, 'no_subscription')

  try {
    const stripeRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'cancel_at_period_end=true',
    })
    const subscription = await stripeRes.json()
    if (subscription.error) throw new Error(subscription.error.message)

    const { error } = await admin
      .from('profiles')
      .update({ subscription_status: 'cancelling' })
      .eq('id', user.id)
    if (error) throw new Error(error.message)

    return Response.json({ success: true })
  } catch (err) {
    console.error('[cancel-subscription]', err.message)
    return jsonError('Impossible de résilier pour le moment.', 500, 'server_error')
  }
}
