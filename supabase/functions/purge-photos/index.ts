import { adminClient, hasWebhookSecret, json, jsonError, PHOTO_BUCKET } from '../_shared/lib.ts'

// Supprime les photos de plus de 30 jours (planifiée chaque nuit par pg_cron).
// Les fichiers sont supprimés via l'API Storage (pas par SQL, qui laisserait des fichiers orphelins),
// PUIS les colonnes sont vidées. Le repas, ses macros et ses étoiles restent dans le journal.
Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonError('Méthode non autorisée.', 405, 'method_not_allowed')
  if (!hasWebhookSecret(req)) return jsonError('Non autorisé.', 401, 'unauthorized')

  const admin = adminClient()
  let meals = 0, files = 0, failed = 0
  for (let round = 0; round < 20; round++) {
    const { data: rows, error } = await admin.from('consumed_meals')
      .select('id, photo_path, thumb_path')
      .lte('photo_expires_at', new Date().toISOString())
      .or('photo_path.not.is.null,thumb_path.not.is.null')
      .limit(200)
    if (error) { console.error('[purge-photos]', error.message); return jsonError('Échec.', 500, 'server_error') }
    if (!rows?.length) break

    const paths = rows.flatMap((r) => [r.photo_path, r.thumb_path]).filter(Boolean) as string[]
    const { error: rmError } = await admin.storage.from(PHOTO_BUCKET).remove(paths)
    if (rmError) { // on ne vide pas les colonnes si les fichiers sont encore là : nouvel essai demain
      console.error('[purge-photos] storage', rmError.message)
      failed += rows.length
      break
    }
    const { error: upError } = await admin.from('consumed_meals')
      .update({ photo_path: null, thumb_path: null }).in('id', rows.map((r) => r.id))
    if (upError) { console.error('[purge-photos] update', upError.message); failed += rows.length; break }
    meals += rows.length
    files += paths.length
  }
  return json({ meals, files, failed })
})
