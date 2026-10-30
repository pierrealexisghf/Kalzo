import { adminClient, json, jsonError, safeEqual } from '../_shared/lib.ts'

// Webhook RevenueCat. Réglage côté RevenueCat : Authorization = « Bearer <REVENUECAT_WEBHOOK_SECRET> ».
// La base reste la source de vérité : l'app ne lit jamais ses droits depuis RevenueCat seul.
type Plan = 'essentiel' | 'plus' | 'illimite'
const RANK: Record<Plan, number> = { essentiel: 1, plus: 2, illimite: 3 }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// La plus haute offre gagne parmi les entitlements ; sinon on déduit du produit
// (fr.kalzo.essentiel.monthly, fr.kalzo.plus.annual…).
function planFromEvent(ev: any): Plan | null {
  const names: string[] = [...(ev.entitlement_ids ?? []), ev.entitlement_id, ev.product_id].filter(Boolean)
  let best: Plan | null = null
  for (const n of names) {
    const s = String(n).toLowerCase()
    const p: Plan | null = s.includes('illimite') ? 'illimite' : s.includes('plus') ? 'plus' : s.includes('essentiel') ? 'essentiel' : null
    if (p && (!best || RANK[p] > RANK[best])) best = p
  }
  return best
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonError('Méthode non autorisée.', 405, 'method_not_allowed')
  const expected = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? ''
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (expected.length < 16 || !safeEqual(expected, got)) return jsonError('Non autorisé.', 401, 'unauthorized')

  let ev: any
  try { ev = (await req.json())?.event } catch { return jsonError('Requête invalide.', 400, 'bad_request') }
  if (!ev?.type) return jsonError('Requête invalide.', 400, 'bad_request')

  const userId: string | undefined = [ev.app_user_id, ...(ev.aliases ?? [])].find((id: string) => UUID.test(id ?? ''))
  if (!userId) return json({ ignored: 'anonymous_user' })

  const admin = adminClient()
  const { data: profile } = await admin.from('profiles').select('id, rc_event_at, plan_source').eq('id', userId).maybeSingle()
  if (!profile) return json({ ignored: 'unknown_user' })

  // Événements dans le désordre : on n'applique jamais un événement plus ancien que le dernier.
  const at = new Date(ev.event_timestamp_ms ?? Date.now()).toISOString()
  if (profile.rc_event_at && new Date(profile.rc_event_at) >= new Date(at)) return json({ ignored: 'stale' })

  const expiration = ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null
  let update: Record<string, unknown> | null = null
  const plan = planFromEvent(ev)

  switch (ev.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION':
    case 'NON_RENEWING_PURCHASE':
      if (plan) update = { plan, subscription_status: 'active', current_period_end: expiration, plan_source: 'apple' }
      break
    case 'CANCELLATION': // résiliation : l'accès dure jusqu'à la fin de la période payée
      if (plan) update = { plan, subscription_status: 'cancelling', current_period_end: expiration, plan_source: 'apple' }
      break
    case 'BILLING_ISSUE':
      if (plan) update = { plan, subscription_status: 'past_due', current_period_end: expiration, plan_source: 'apple' }
      break
    case 'EXPIRATION':
      // Ne touche pas à l'accès d'un abonné Stripe historique.
      if (profile.plan_source !== 'stripe') {
        update = { plan: 'free', subscription_status: 'expired', current_period_end: expiration }
      }
      break
    default:
      return json({ ignored: ev.type })
  }

  const { error } = await admin.from('profiles').update({ ...(update ?? {}), rc_event_at: at }).eq('id', userId)
  if (error) {
    console.error('[revenuecat-webhook]', error.message)
    return jsonError('Échec de la mise à jour.', 500, 'server_error') // RevenueCat réessaie
  }
  return json({ ok: true, applied: update ? ev.type : 'noop' })
})
