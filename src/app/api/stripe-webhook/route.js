import crypto from 'crypto'
import { adminClient } from '@/lib/server/supabase-admin'
import { PLANS, planFromPriceId } from '@/lib/constants'

const TOLERANCE_SECONDS = 5 * 60

function verifyStripeSignature(payload, header, secret) {
  if (!header || !secret) return false
  const parts = Object.fromEntries(
    header.split(',').map(p => {
      const i = p.indexOf('=')
      return [p.slice(0, i), p.slice(i + 1)]
    })
  )
  if (!parts.t || !parts.v1) return false
  // Refuse les requêtes trop anciennes (rejeu d'un appel intercepté).
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > TOLERANCE_SECONDS) return false
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${payload}`).digest('hex')
  const a = Buffer.from(parts.v1, 'hex')
  const b = Buffer.from(expected, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

const iso = seconds => (seconds ? new Date(seconds * 1000).toISOString() : null)

async function updateProfile(admin, userId, data) {
  const { error } = await admin.from('profiles').update(data).eq('id', userId)
  if (error) throw new Error(`profiles: ${error.message}`)
}

async function setCredits(admin, userId, plan) {
  const balance = plan === 'free' ? 0 : PLANS[plan].credits
  const { error } = await admin
    .from('credits')
    .upsert({ user_id: userId, balance, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(`credits: ${error.message}`)
}

async function recordTransaction(admin, userId, invoice, plan) {
  if (!invoice.amount_paid) return // facture d'essai à 0 €
  const { data: existing } = await admin
    .from('transactions')
    .select('id')
    .eq('stripe_payment_id', invoice.id)
    .maybeSingle()
  if (existing) return
  const { error } = await admin.from('transactions').insert({
    user_id: userId,
    amount_euros: invoice.amount_paid / 100,
    credits_added: plan === 'free' ? 0 : PLANS[plan].credits,
    stripe_payment_id: invoice.id,
  })
  if (error) throw new Error(`transactions: ${error.message}`)
}

export async function POST(request) {
  const rawBody = await request.text()
  if (!verifyStripeSignature(rawBody, request.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET)) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody)
  const obj = event.data.object
  const admin = adminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        if (obj.mode !== 'subscription') break
        const userId = obj.metadata?.user_id
        const plan = obj.metadata?.plan
        if (!userId || !PLANS[plan]) break
        // Le vrai statut (essai ou actif) se lit sur l'abonnement, pas sur la session.
        const sub = await stripeGet(`/subscriptions/${obj.subscription}`)
        await updateProfile(admin, userId, {
          plan,
          subscription_id: obj.subscription,
          subscription_status: sub.status === 'trialing' ? 'trialing' : 'active',
          trial_ends_at: iso(sub.trial_end),
          current_period_end: iso(sub.current_period_end),
        })
        await setCredits(admin, userId, plan)
        // Marque l'essai comme consommé : il ne sera plus proposé à ce compte.
        const { error: metaErr } = await admin.auth.admin.updateUserById(userId, { app_metadata: { trial_used: true } })
        if (metaErr) throw new Error(`auth: ${metaErr.message}`)
        break
      }
      case 'invoice.payment_succeeded': {
        const priceId = obj.lines?.data?.[0]?.price?.id
        const userId = obj.subscription_details?.metadata?.user_id || obj.metadata?.user_id
        if (!userId || !priceId) break
        const plan = planFromPriceId(priceId)
        if (plan === 'free') break
        await updateProfile(admin, userId, {
          plan,
          subscription_id: obj.subscription,
          subscription_status: 'active',
          current_period_end: iso(obj.lines?.data?.[0]?.period?.end),
          trial_ends_at: null,
        })
        await setCredits(admin, userId, plan)
        await recordTransaction(admin, userId, obj, plan)
        break
      }
      case 'invoice.payment_failed': {
        const userId = obj.subscription_details?.metadata?.user_id || obj.metadata?.user_id
        if (!userId) break
        await updateProfile(admin, userId, { subscription_status: 'past_due' })
        break
      }
      case 'customer.subscription.deleted': {
        const userId = obj.metadata?.user_id
        if (!userId) break
        await updateProfile(admin, userId, {
          plan: 'free',
          subscription_id: null,
          subscription_status: 'inactive',
          current_period_end: null,
          trial_ends_at: null,
        })
        await setCredits(admin, userId, 'free')
        break
      }
    }
  } catch (err) {
    // Réponse en erreur => Stripe réessaie automatiquement plus tard.
    console.error('[stripe-webhook]', event.type, err.message)
    return Response.json({ error: 'Processing failed' }, { status: 500 })
  }

  return Response.json({ received: true })
}
