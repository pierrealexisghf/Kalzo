import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      // Nécessaire pour les liens reçus par e-mail (confirmation du compte,
      // réinitialisation du mot de passe) qui arrivent avec le jeton dans l'URL.
      detectSessionInUrl: true,
    },
  }
)
