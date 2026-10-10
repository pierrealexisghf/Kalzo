import { adminClient, requireUser, jsonError } from '@/lib/server/supabase-admin'

// Droit d'accès et à la portabilité (RGPD, art. 15 et 20) : toutes les données
// de l'utilisateur connecté, dans un fichier lisible.
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return jsonError('Connexion requise.', 401, 'unauthenticated')

  const admin = adminClient()
  const [profile, meals, sports, water, credits, transactions] = await Promise.all([
    admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    admin.from('consumed_meals').select('*').eq('user_id', user.id).order('consumed_at'),
    admin.from('sport_activities').select('*').eq('user_id', user.id).order('activity_date'),
    admin.from('hydration').select('*').eq('user_id', user.id).order('date'),
    admin.from('credits').select('balance,updated_at').eq('user_id', user.id).maybeSingle(),
    admin.from('transactions').select('*').eq('user_id', user.id).order('created_at'),
  ])

  const { subscription_id, ...profileData } = profile.data || {}
  const body = {
    exporte_le: new Date().toISOString(),
    compte: {
      id: user.id, email: user.email, cree_le: user.created_at,
      prenom: user.user_metadata?.first_name || null,
      conditions_acceptees_le: user.user_metadata?.accepted_terms_at || null,
      version_conditions: user.user_metadata?.terms_version || null,
    },
    profil: profileData,
    repas: meals.data || [],
    activites_sportives: sports.data || [],
    hydratation: water.data || [],
    credits: credits.data || null,
    paiements: transactions.data || [],
  }
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
