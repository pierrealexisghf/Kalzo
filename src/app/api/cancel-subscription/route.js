const SUPABASE_URL = 'https://yqvyguyxjnktajbnmavw.supabase.co'

export async function POST(request) {
  try {
    const { userId } = await request.json()
    if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 })

    const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY

    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=subscription_id`,
      { headers: { 'apikey': SUPABASE_SERVICE, 'Authorization': `Bearer ${SUPABASE_SERVICE}` } }
    )
    const profiles = await profileRes.json()
    const subscriptionId = profiles?.[0]?.subscription_id
    if (!subscriptionId) return Response.json({ error: 'Aucun abonnement actif' }, { status: 400 })

    const stripeRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'cancel_at_period_end=true',
    })
    const subscription = await stripeRes.json()
    if (subscription.error) throw new Error(subscription.error.message)

    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE,
        'Authorization': `Bearer ${SUPABASE_SERVICE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription_status: 'cancelling' }),
    })

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
