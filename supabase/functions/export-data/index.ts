import { adminClient, jsonError, PHOTO_BUCKET, requireUser } from '../_shared/lib.ts'

// Droit d'accès et à la portabilité (RGPD, art. 15 et 20) : toutes les données de l'utilisateur.
Deno.serve(async (req) => {
  if (!['GET', 'POST'].includes(req.method)) return jsonError('Méthode non autorisée.', 405, 'method_not_allowed')
  const admin = adminClient()
  const user = await requireUser(req, admin)
  if (!user) return jsonError('Connexion requise.', 401, 'unauthenticated')
  const uid = user.id
  const q = (table: string, col = 'user_id') => admin.from(table).select('*').eq(col, uid)

  const [profile, meals, sports, water, credits, transactions, reactions, comments, hides, reports, blocks, sentF, recvF, tokens] =
    await Promise.all([
      admin.from('profiles').select('*').eq('id', uid).maybeSingle(),
      q('consumed_meals').order('consumed_at'), q('sport_activities').order('activity_date'), q('hydration').order('date'),
      admin.from('credits').select('balance,updated_at').eq('user_id', uid).maybeSingle(),
      q('transactions').order('created_at'), q('meal_reactions'), q('meal_comments'), q('meal_hides'),
      q('reports', 'reporter_id'), q('blocks', 'blocker_id'),
      q('friendships', 'requester_id'), q('friendships', 'addressee_id'), q('push_tokens'),
    ])

  // Photos encore conservées (30 jours) : liens temporaires valables 24 h.
  const paths = (meals.data ?? []).flatMap((m) => [m.photo_path, m.thumb_path]).filter(Boolean) as string[]
  const signed = paths.length ? (await admin.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 86400)).data ?? [] : []

  // Les amis ne sont identifiés que par leur pseudo ; aucun identifiant ni e-mail d'un tiers.
  const friendIds = [...(sentF.data ?? []).map((f) => f.addressee_id), ...(recvF.data ?? []).map((f) => f.requester_id)]
  const { data: friendProfiles } = friendIds.length
    ? await admin.from('profiles').select('id, username').in('id', friendIds) : { data: [] }
  const nameOf = new Map((friendProfiles ?? []).map((p) => [p.id, p.username]))
  const relations = [
    ...(sentF.data ?? []).map((f) => ({ ami: nameOf.get(f.addressee_id) ?? null, statut: f.status, demande_envoyee_par_moi: true, le: f.created_at })),
    ...(recvF.data ?? []).map((f) => ({ ami: nameOf.get(f.requester_id) ?? null, statut: f.status, demande_envoyee_par_moi: false, le: f.created_at })),
  ]

  const { subscription_id: _s, ...profileData } = profile.data ?? ({} as Record<string, unknown>)
  const body = {
    exporte_le: new Date().toISOString(),
    compte: {
      id: uid, email: user.email, cree_le: user.created_at,
      prenom: user.user_metadata?.first_name ?? null,
      conditions_acceptees_le: user.user_metadata?.accepted_terms_at ?? null,
      version_conditions: user.user_metadata?.terms_version ?? null,
    },
    profil: profileData,
    repas: meals.data ?? [],
    photos_conservees: signed.map((s) => ({ fichier: s.path, lien_24h: s.signedUrl })),
    activites_sportives: sports.data ?? [],
    hydratation: water.data ?? [],
    amis: relations,
    utilisateurs_bloques: (blocks.data ?? []).length,
    reactions: reactions.data ?? [],
    commentaires: comments.data ?? [],
    signalements_envoyes: reports.data ?? [],
    repas_masques: (hides.data ?? []).length,
    appareils_notifications: (tokens.data ?? []).map((t) => ({ plateforme: t.platform, mis_a_jour_le: t.updated_at })),
    credits: credits.data ?? null,
    paiements: transactions.data ?? [],
  }
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
})
