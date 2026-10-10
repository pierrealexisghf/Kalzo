'use client'

import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/AppContext'
import { Button, Field, Input } from '@/components/ui/primitives'

// Affiché quand l'utilisateur arrive depuis le lien « mot de passe oublié ».
export default function UpdatePassword() {
  const { setRecovery, showToast } = useApp()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Au moins 8 caractères.')
    if (password !== confirm) return setError('Les deux mots de passe sont différents.')
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) return setError("Impossible de changer le mot de passe. Le lien a peut-être expiré, recommencez la procédure.")
    setRecovery(false)
    showToast('Mot de passe mis à jour', 'success')
  }

  return (
    <div className="fixed inset-0 flex items-center overflow-y-auto bg-background px-5">
      <form onSubmit={submit} className="k-card tone-nutri mx-auto w-full max-w-md p-6">
        <div className="mb-5 flex size-14 items-center justify-center rounded-3xl bg-tone-soft text-tone"><KeyRound className="size-7" /></div>
        <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">Choisissez un mot de passe d'au moins 8 caractères.</p>
        <div className="flex flex-col gap-4">
          <Field label="Nouveau mot de passe"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /></Field>
          <Field label="Confirmation"><Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" /></Field>
          {error && <div role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</div>}
          <Button type="submit" size="lg" full loading={loading}>Enregistrer</Button>
        </div>
      </form>
    </div>
  )
}
