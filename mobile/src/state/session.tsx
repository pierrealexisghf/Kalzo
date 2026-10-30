import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { AiStatus } from '@/lib/ai'

export type Account = {
  username: string | null; first_name: string | null; timezone: string
  username_changed_at: string | null; ai: AiStatus
}

type Ctx = {
  session: Session | null; user: User | null; loading: boolean
  account: Account | null; refreshAccount: () => Promise<void>; setUsername: (u: string) => void; setAi: (ai: AiStatus) => void
  recovery: boolean; clearRecovery: () => void; signOut: () => Promise<void>
}
const SessionContext = createContext<Ctx | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<Account | null>(null)
  const [recovery, setRecovery] = useState(false)

  const refreshAccount = useCallback(async () => {
    // Crée le profil si besoin, copie le prénom, démarre l'essai de 7 jours (une seule fois).
    const { data, error } = await supabase.rpc('ensure_account')
    if (!error && data) setAccount(data as Account)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') setAccount(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const uid = session?.user?.id
  useEffect(() => {
    if (!uid) return
    let alive = true
    supabase.rpc('ensure_account').then(({ data, error }) => { if (alive && !error && data) setAccount(data as Account) })
    return () => { alive = false }
  }, [uid])

  const value = useMemo<Ctx>(() => ({
    session, user: session?.user ?? null, loading, account, refreshAccount, recovery,
    setUsername: (username) => setAccount(a => (a ? { ...a, username, username_changed_at: new Date().toISOString() } : a)),
    setAi: (ai) => setAccount(a => (a ? { ...a, ai: { ...a.ai, ...ai } } : a)),
    clearRecovery: () => setRecovery(false),
    signOut: async () => { await supabase.auth.signOut() },
  }), [session, loading, account, refreshAccount, recovery])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const c = useContext(SessionContext)
  if (!c) throw new Error('useSession doit être utilisé dans SessionProvider')
  return c
}
