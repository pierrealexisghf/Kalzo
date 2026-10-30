import { adminClient, json, jsonError, PHOTO_BUCKET, requireUser } from '../_shared/lib.ts'

// Droit à l'effacement (RGPD, art. 17) — suppression DANS l'app (obligatoire App Store).
// Ordre : abonnement Stripe hérité → photos → données → compte. En cas d'erreur, on s'arrête
// avant de supprimer le compte pour que l'utilisateur puisse réessayer.
async function removeFolder(admin: ReturnType<typeof adminClient>, folder: string) {
  for (;;) {
    const { data, error } = await admin.storage.from(PHOTO_BUCKET).list(folder, { limit: 1000 })
    if (error) throw new Error(`storage list: ${error.message}`)
    if (!data?.length) return
    const { error: rmError } = await admin.storage.from(PHOTO_BUCKET).remove(data.map((f) => `${folder}/${f.name}`))
    if (rmError) throw new Error(`storage remove: ${rmError.message}`)
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonError('Méthode non autorisée.', 405, 'method_not_allowed')
  const admin = adminClient()
  const user = await requireUser(req, admin)
  if (!user) return jsonError('Connexion requise.', 401, 'unauthenticated')

  try {
    const { data: profile } = await admin.from('profiles').select('subscription_id').eq('id', user.id).maybeSingle()
    if (profile?.subscription_id) {
      // Ancien abonnement Stripe : résilié immédiatement, on ne facture pas un compte supprimé.
      const res = await fetch(`https://api.stripe.com/v1/subscriptions/${profile.subscription_id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}` },
      })
      const sub = await res.json()
      if (sub.error && sub.error.code !== 'resource_missing') throw new Error(`stripe: ${sub.error.message}`)
    }

    await removeFolder(admin, user.id)

    // Les tables sociales (amitiés, réactions, commentaires, jetons push…) partent en cascade avec le compte.
    for (const table of ['consumed_meals', 'sport_activities', 'hydration', 'ai_usage', 'transactions', 'credits']) {
      const { error } = await admin.from(table).delete().eq('user_id', user.id)
      if (error) throw new Error(`${table}: ${error.message}`)
    }
    const { error: pErr } = await admin.from('profiles').delete().eq('id', user.id)
    if (pErr) throw new Error(`profiles: ${pErr.message}`)

    // Effacement côté RevenueCat (facultatif : nécessite REVENUECAT_SECRET_KEY). Un abonnement Apple actif
    // ne peut être résilié que par l'utilisateur dans les réglages Apple : l'app le lui rappelle.
    const rc = Deno.env.get('REVENUECAT_SECRET_KEY')
    if (rc) {
      await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${rc}` },
      }).catch(() => {})
    }

    const { error: uErr } = await admin.auth.admin.deleteUser(user.id)
    if (uErr) throw new Error(`auth: ${uErr.message}`)
    return json({ success: true })
  } catch (err) {
    console.error('[delete-account]', (err as Error).message)
    return jsonError('La suppression a échoué.', 500, 'server_error')
  }
})
