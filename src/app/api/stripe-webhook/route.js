import crypto from 'crypto'

const SUPABASE_URL = 'https://yqvyguyxjnktajbnmavw.supabase.co'
const PRICE_STANDARD = 'price_1Tc6S51JEMfMTdulDYObGtXg'
const PRICE_VIP = 'price_1Tc6Sf1JEMfMTdulDT6umOCm'
const CREDITS_STANDARD = 120

function verifyStripeSignature(payload, signature, secret) {
  const elements = signature.split(',')
  const timestamp = elements.find(e => e.startsWith('t=')).split('=')[1]
  const sig = elements.find(e => e.startsWith('v1=')).split('=')[1]
  const signedPayload = `${timestamp}.${payload}`
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
}

function getPlanFromPriceId(priceId) {
  if (priceId === PRICE_VIP) return 'vip'
  if (priceId === PRICE_STANDARD) return 'standard'
  return 'free'
}

async function updateProfile(userId, data) {
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE,
      'Authorization': `Bearer ${SUPABASE_SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
}

async function updateCredits(userId, plan) {
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY
  const newBalance = plan === 'vip' ? 999999 : plan === 'free' ? 0 : CREDITS_STANDARD
  const getRes = await fetch(`${SUPABASE_URL}/rest/v1/credits?user_id=eq.${userId}&select=balance`, {
    headers: { 'apikey': SUPABASE_SERVICE, 'Authorization': `Bearer ${SUPABASE_SERVICE}` }
  })
  const existing = await getRes.json()
  if (existing.length > 0) {
    await fetch(`${SUPABASE_URL}/rest/v1/credits?user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE,
        'Authorization': `Bearer ${SUPABASE_SERVICE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ balance: newBalance, updated_at: new Date().toISOString() }),
    })
  }
}

export async function POST(request) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  try {
    if (!verifyStripeSignature(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)) {
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }
  } catch {
    return Response.json({ error: 'Signature error' }, { status: 400 })
  }

  const event = JSON.parse(rawBody)
  const obj = event.data.object

  switch (event.type) {
    case 'checkout.session.completed': {
      if (obj.mode !== 'subscription') break
      const userId = obj.metadata?.user_id
      const plan = obj.metadata?.plan
      if (!userId || !plan) break
      const trialEnd = obj.subscription_data?.trial_end
        ? new Date(obj.subscription_data.trial_end * 1000).toISOString()
        : null
      await updateProfile(userId, {
        plan, subscription_id: obj.subscription,
        subscription_status: trialEnd ? 'trialing' : 'active',
        trial_ends_at: trialEnd, current_period_end: null,
      })
      await updateCredits(userId, plan)
      break
    }
    case 'invoice.payment_succeeded': {
      const subId = obj.subscription
      const priceId = obj.lines?.data?.[0]?.price?.id
      const userId = obj.subscription_details?.metadata?.user_id || obj.metadata?.user_id
      if (!userId || !priceId) break
      const plan = getPlanFromPriceId(priceId)
      const periodEnd = obj.lines?.data?.[0]?.period?.end
        ? new Date(obj.lines.data[0].period.end * 1000).toISOString() : null
      await updateProfile(userId, {
        plan, subscription_id: subId, subscription_status: 'active',
        current_period_end: periodEnd, trial_ends_at: null,
      })
      await updateCredits(userId, plan)
      break
    }
    case 'invoice.payment_failed': {
      const userId = obj.subscription_details?.metadata?.user_id || obj.metadata?.user_id
      if (!userId) break
      await updateProfile(userId, { subscription_status: 'past_due' })
      break
    }
    case 'customer.subscription.deleted': {
      const userId = obj.metadata?.user_id
      if (!userId) break
      await updateProfile(userId, {
        plan: 'free', subscription_id: null, subscription_status: 'inactive',
        current_period_end: null, trial_ends_at: null,
      })
      await updateCredits(userId, 'free')
      break
    }
  }

  return Response.json({ received: true })
}
