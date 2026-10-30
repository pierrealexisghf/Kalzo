import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

// Client « service_role » : contourne la RLS. Les secrets ne quittent jamais les Edge Functions.
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })
}

export const jsonError = (message: string, status: number, code: string, extra: Record<string, unknown> = {}) =>
  json({ error: { message, code, ...extra } }, status)

// Identifie l'appelant à partir de son jeton de session.
export async function requireUser(req: Request, admin: SupabaseClient): Promise<User | null> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  return error || !data?.user ? null : data.user
}

// Comparaison à temps constant d'un secret partagé.
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b)
  if (ea.length !== eb.length) return false
  let diff = 0
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i]
  return diff === 0
}

// Appel serveur à serveur (base de données, cron) : en-tête x-webhook-secret.
export function hasWebhookSecret(req: Request): boolean {
  const expected = Deno.env.get('WEBHOOK_SECRET') ?? ''
  const got = req.headers.get('x-webhook-secret') ?? ''
  return expected.length >= 16 && safeEqual(expected, got)
}

export const PHOTO_BUCKET = 'meal-photos'
