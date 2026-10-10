'use client'

import { useState, useEffect } from 'react'
import { Utensils, Dumbbell, Droplets, Gift, Eye, EyeOff, MailCheck, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/constants'
import { LogoMark } from '@/components/ui/Logo'
import { Button, Field, Input, Segmented, cx } from '@/components/ui/primitives'

export const TERMS_VERSION = '2026-10'

function frenchError(message = '') {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'E-mail ou mot de passe incorrect.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'Un compte existe déjà avec cet e-mail. Connectez-vous.'
  if (m.includes('email not confirmed')) return "Votre e-mail n'est pas encore confirmé. Ouvrez le message reçu pour activer le compte."
  if (m.includes('password should be') || m.includes('weak')) return 'Mot de passe trop faible : 8 caractères minimum.'
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Trop de tentatives. Patientez une minute avant de réessayer.'
  if (m.includes('invalid email') || m.includes('unable to validate email')) return "Cette adresse e-mail n'est pas valide."
  if (m.includes('network') || m.includes('failed to fetch')) return 'Connexion impossible. Vérifiez votre réseau.'
  return "Une erreur est survenue. Réessayez dans un instant."
}

const FEATURES = [
  { icon: Utensils, label: 'Repas', tone: 'tone-nutri' },
  { icon: Dumbbell, label: 'Sport', tone: 'tone-sport' },
  { icon: Droplets, label: 'Hydratation', tone: 'tone-water' },
]

export default function AuthScreen() {
  const [mode, setMode] = useState('login') // login | signup | forgot | check-mail | reset-sent
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const switchMode = m => { setMode(m); setError('') }
  const cleanEmail = email.trim().toLowerCase()

  const submit = async (e) => {
    e?.preventDefault()
    setError('')
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) return setError("Entrez une adresse e-mail valide.")

    if (mode === 'forgot') {
      setLoading(true)
      const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: SITE_URL })
      setLoading(false)
      if (err) return setError(frenchError(err.message))
      setCooldown(60)
      return setMode('reset-sent')
    }

    if (!password) return setError('Entrez votre mot de passe.')

    if (mode === 'login') {
      setLoading(true)
      const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      setLoading(false)
      if (err) setError(frenchError(err.message))
      return
    }

    // Inscription
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.')
    if (!accepted) return setError("Vous devez accepter les CGU et la politique de confidentialité pour créer un compte.")
    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: SITE_URL,
        data: {
          first_name: firstName.trim().slice(0, 40) || undefined,
          accepted_terms_at: new Date().toISOString(),
          terms_version: TERMS_VERSION,
        },
      },
    })
    setLoading(false)
    if (err) return setError(frenchError(err.message))
    // Supabase renvoie un utilisateur sans identité quand l'adresse existe déjà.
    if (data.user && data.user.identities?.length === 0) return setError(frenchError('already registered'))
    if (!data.session) { setCooldown(60); setMode('check-mail') }
  }

  const resend = async () => {
    if (cooldown > 0) return
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: cleanEmail, options: { emailRedirectTo: SITE_URL } })
    if (err) return setError(frenchError(err.message))
    setCooldown(60)
  }

  // ---------------------------------------------------------------- écrans fixes
  if (mode === 'check-mail' || mode === 'reset-sent') {
    const isReset = mode === 'reset-sent'
    return (
      <Shell>
        <div className="k-card tone-nutri k-enter p-7 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-tone-soft text-tone">
            <MailCheck className="size-8" />
          </div>
          <h1 className="text-2xl font-bold">Vérifiez votre boîte mail</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isReset ? 'Si un compte existe pour ' : 'Nous avons envoyé un lien de confirmation à '}
            <strong className="text-foreground">{cleanEmail}</strong>
            {isReset ? ', vous y trouverez un lien pour choisir un nouveau mot de passe.' : '. Cliquez dessus pour activer votre compte, puis revenez ici.'}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Rien reçu ? Regardez dans les courriers indésirables.</p>
          <div className="mt-6 flex flex-col gap-2.5">
            {!isReset && (
              <Button variant="outline" full onClick={resend} disabled={cooldown > 0}>
                {cooldown > 0 ? `Renvoyer le message (${cooldown} s)` : 'Renvoyer le message'}
              </Button>
            )}
            <Button variant="ghost" full onClick={() => switchMode('login')}><ArrowLeft className="size-4" />Retour à la connexion</Button>
          </div>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </div>
      </Shell>
    )
  }

  const isSignup = mode === 'signup'
  return (
    <Shell>
      <div className="k-card tone-nutri k-enter p-6">
        {mode !== 'forgot' ? (
          <Segmented
            value={mode}
            onChange={switchMode}
            options={[{ id: 'login', label: 'Connexion' }, { id: 'signup', label: 'Créer un compte' }]}
            className="mb-5"
          />
        ) : (
          <div className="mb-5">
            <h1 className="text-xl font-bold">Mot de passe oublié</h1>
            <p className="mt-1 text-sm text-muted-foreground">Entrez votre e-mail, nous vous envoyons un lien pour en choisir un nouveau.</p>
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {isSignup && (
            <Field label="Prénom (facultatif)">
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" placeholder="Camille" maxLength={40} />
            </Field>
          )}
          <Field label="E-mail">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="vous@exemple.fr" />
          </Field>
          {mode !== 'forgot' && (
            <Field label="Mot de passe" hint={isSignup ? '8 caractères minimum.' : undefined}>
              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="••••••••" className="pr-12"
                />
                <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute right-1.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center text-muted-foreground">
                  {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </Field>
          )}

          {isSignup && (
            <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-muted-foreground">
              <input
                type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-[hsl(var(--primary))]"
              />
              <span>
                J'ai lu et j'accepte les <a href="/cgu" target="_blank" className="font-semibold text-primary underline">conditions d'utilisation</a> et
                la <a href="/confidentialite" target="_blank" className="font-semibold text-primary underline">politique de confidentialité</a>.
                Je consens au traitement de mes données de santé (poids, alimentation, activité) pour faire fonctionner Kalzo.
              </span>
            </label>
          )}

          {error && <div role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</div>}

          <Button type="submit" size="lg" variant="primary" full loading={loading}>
            {mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien'}
          </Button>
        </form>

        {mode === 'login' && (
          <button onClick={() => switchMode('forgot')} className="mt-4 w-full text-center text-sm font-medium text-muted-foreground underline">
            Mot de passe oublié ?
          </button>
        )}
        {mode === 'forgot' && (
          <button onClick={() => switchMode('login')} className="mt-4 flex w-full items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
            <ArrowLeft className="size-4" />Retour à la connexion
          </button>
        )}
      </div>

      {isSignup && (
        <div className="k-enter mt-4 flex items-center gap-3 rounded-3xl bg-coach-soft px-4 py-3.5 text-coach">
          <Gift className="size-6 shrink-0" />
          <p className="text-[13px] leading-snug">
            <strong>10 crédits IA offerts</strong> à l'inscription, sans carte bancaire. Le suivi de vos repas, du sport et de l'eau reste gratuit.
          </p>
        </div>
      )}
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-background" style={{ background: 'radial-gradient(120% 60% at 50% 0%, hsl(var(--nutri-soft)) 0%, hsl(var(--background)) 60%)' }}>
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-10" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 40px)' }}>
        <div className="mb-7 text-center">
          <LogoMark size={72} className="mx-auto rounded-[20px] shadow-float" />
          <div className="mt-4 text-[32px] font-extrabold tracking-tight">Kalzo</div>
          <p className="mt-1 text-[15px] text-muted-foreground">Votre coach nutrition, sport et hydratation</p>
          <div className="mt-4 flex justify-center gap-2">
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <span key={f.label} className={cx(f.tone, 'inline-flex items-center gap-1.5 rounded-full bg-tone-soft px-3 py-1.5 text-xs font-semibold text-tone')}>
                  <Icon className="size-3.5" />{f.label}
                </span>
              )
            })}
          </div>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <a href="/mentions-legales" className="underline">Mentions légales</a> · <a href="/confidentialite" className="underline">Confidentialité</a> · <a href="/cgu" className="underline">CGU</a>
        </p>
      </div>
    </div>
  )
}
