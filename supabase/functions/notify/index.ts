import { adminClient, hasWebhookSecret, json, jsonError } from '../_shared/lib.ts'

// Notifications sociales via Expo Push. Déclenchée par les triggers SQL (_call_edge).
// Événements : friend_request, friend_accepted, friend_meal. Jamais de kcal dans un message.
const EXPO_URL = 'https://exp.host/--/api/v2/push/send'
const MEAL_LABEL: Record<string, string> = { dejeuner: 'déjeuner', diner: 'dîner' }

type Push = { to: string; title: string; body: string; data: Record<string, unknown>; sound: 'default' }

async function send(admin: ReturnType<typeof adminClient>, messages: Push[]) {
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100)
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
    const access = Deno.env.get('EXPO_ACCESS_TOKEN')
    if (access) headers.Authorization = `Bearer ${access}`
    const res = await fetch(EXPO_URL, { method: 'POST', headers, body: JSON.stringify(batch) })
    const out = await res.json().catch(() => null)
    // Jetons morts (app désinstallée) : on les retire.
    const dead: string[] = []
    ;(out?.data ?? []).forEach((t: any, k: number) => {
      if (t?.status === 'error' && t?.details?.error === 'DeviceNotRegistered') dead.push(batch[k].to)
    })
    if (dead.length) await admin.from('push_tokens').delete().in('token', dead)
  }
}

async function tokensOf(admin: ReturnType<typeof adminClient>, userIds: string[]): Promise<string[]> {
  if (!userIds.length) return []
  const { data } = await admin.from('push_tokens').select('token').in('user_id', userIds)
  return (data ?? []).map((r) => r.token)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonError('Méthode non autorisée.', 405, 'method_not_allowed')
  if (!hasWebhookSecret(req)) return jsonError('Non autorisé.', 401, 'unauthorized')
  const payload = await req.json().catch(() => null)
  if (!payload?.event || !payload.from) return jsonError('Requête invalide.', 400, 'bad_request')

  const admin = adminClient()
  const { data: from } = await admin.from('profiles').select('username, first_name').eq('id', payload.from).maybeSingle()
  const name = from?.first_name || from?.username
  if (!name) return json({ skipped: 'no_name' })
  const msgs: Push[] = []

  if (payload.event === 'friend_request' || payload.event === 'friend_accepted') {
    const { data: to } = await admin.from('profiles').select('notif_friend_requests').eq('id', payload.to).maybeSingle()
    if (to && to.notif_friend_requests === false) return json({ skipped: 'disabled' })
    const request = payload.event === 'friend_request'
    for (const token of await tokensOf(admin, [payload.to])) {
      msgs.push({
        to: token, sound: 'default',
        title: request ? 'Nouvelle demande d’ami' : 'Demande acceptée',
        body: request ? `@${from?.username ?? name} veut être ton ami sur Kalzo.` : `${name} a accepté ta demande. Vous êtes amis !`,
        data: { type: payload.event, username: from?.username },
      })
    }
  } else if (payload.event === 'friend_meal') {
    const label = MEAL_LABEL[payload.meal_type]
    if (!label) return json({ skipped: 'slot' })
    const { data: friendships } = await admin.from('friendships').select('requester_id, addressee_id')
      .eq('status', 'accepted').or(`requester_id.eq.${payload.from},addressee_id.eq.${payload.from}`)
    const ids = (friendships ?? []).map((f) => (f.requester_id === payload.from ? f.addressee_id : f.requester_id))
    if (!ids.length) return json({ sent: 0 })
    const [{ data: prefs }, { data: blocks }] = await Promise.all([
      admin.from('profiles').select('id').in('id', ids).neq('notif_friend_meals', false),
      admin.from('blocks').select('blocker_id, blocked_id')
        .or(`and(blocker_id.eq.${payload.from},blocked_id.in.(${ids.join(',')})),and(blocked_id.eq.${payload.from},blocker_id.in.(${ids.join(',')}))`),
    ])
    const blocked = new Set((blocks ?? []).flatMap((b) => [b.blocker_id, b.blocked_id]))
    const recipients = (prefs ?? []).map((p) => p.id).filter((id) => !blocked.has(id))
    for (const token of await tokensOf(admin, recipients)) {
      msgs.push({
        to: token, sound: 'default', title: `${name} a posté son ${label}`, body: 'Viens voir ce qu’il y a dans l’assiette !',
        data: { type: 'friend_meal', mealId: payload.meal_id },
      })
    }
  } else {
    return json({ skipped: 'unknown_event' })
  }

  await send(admin, msgs)
  return json({ sent: msgs.length })
})
