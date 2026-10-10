import { adminClient, requireUser, jsonError } from '@/lib/server/supabase-admin'

// Droit à l'effacement (RGPD, art. 17) : résilie l'abonnement Stripe, efface les
// données puis supprime le compte. Les factures déjà émises restent conservées
// par Stripe pour la durée légale (obligation comptable).
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return jsonError('Connexion requise.', 401, 'unauthenticated')

  const admin = adminClient()
  try {
    const { data: profile } = await admin.from('profiles').select('subscription_id').eq('id', user.id).maybeSingle()

    if (profile?.subscription_id) {
      // Résiliation immédiate : on ne laisse pas un abonnement facturer un compte supprimé.
      const res = await fetch(`https://api.stripe.com/v1/subscriptions/${profile.subscription_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      })
      const sub = await res.json()
      // Déjà résilié côté Stripe : on peut poursuivre. Toute autre erreur bloque la suppression.
      if (sub.error && sub.error.code !== 'resource_missing') throw new Error(sub.error.message)
    }

    for (const table of ['consumed_meals', 'sport_activities', 'hydration', 'ai_usage', 'transactions', 'credits']) {
      const { error } = await admin.from(table).delete().eq('user_id', user.id)
      if (error) throw new Error(`${table}: ${error.message}`)
    }
    const { error: pErr } = await admin.from('profiles').delete().eq('id', user.id)
    if (pErr) throw new Error(`profiles: ${pErr.message}`)

    const { error: uErr } = await admin.auth.admin.deleteUser(user.id)
    if (uErr) throw new Error(`auth: ${uErr.message}`)

    return Response.json({ success: true })
  } catch (err) {
    console.error('[account/delete]', err.message)
    return jsonError('La suppression a échoué.', 500, 'server_error')
  }
}
