import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { supabase } from '@/lib/supabase'
import { AUTH_REDIRECT } from '@/lib/deeplinks'
import { Button, Card, Field, Input, Segmented } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/theme'

export const TERMS_VERSION = '2026-10'
const SITE = 'https://kalzo.vercel.app'

function frenchError(message = '') {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'E-mail ou mot de passe incorrect.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'Un compte existe déjà avec cet e-mail. Connecte-toi.'
  if (m.includes('email not confirmed')) return "Ton e-mail n'est pas encore confirmé. Ouvre le message reçu pour activer le compte."
  if (m.includes('password should be') || m.includes('weak')) return 'Mot de passe trop faible : 8 caractères minimum.'
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Trop de tentatives. Patiente une minute avant de réessayer.'
  if (m.includes('invalid email') || m.includes('unable to validate email')) return "Cette adresse e-mail n'est pas valide."
  if (m.includes('network') || m.includes('failed to fetch')) return 'Connexion impossible. Vérifie ton réseau.'
  return 'Une erreur est survenue. Réessaie dans un instant.'
}

export function Logo({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width="64" height="64" rx="15" fill="#0d3b2a" />
      <Circle cx="32" cy="32" r="18" stroke="#34d399" strokeWidth="7" strokeLinecap="round" fill="none" strokeDasharray="30 83" transform="rotate(-90 32 32)" />
      <Circle cx="32" cy="32" r="18" stroke="#fb923c" strokeWidth="7" strokeLinecap="round" fill="none" strokeDasharray="30 83" transform="rotate(30 32 32)" />
      <Circle cx="32" cy="32" r="18" stroke="#38bdf8" strokeWidth="7" strokeLinecap="round" fill="none" strokeDasharray="30 83" transform="rotate(150 32 32)" />
      <Path d="M27.5 24.5V39.5M27.5 32L36 24.5M30.5 30.5L36.5 39.5" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

type Mode = 'login' | 'signup' | 'forgot' | 'check-mail' | 'reset-sent'

export default function AuthScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [mode, setMode] = useState<Mode>('login')
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

  const switchMode = (m: Mode) => { setMode(m); setError('') }
  const cleanEmail = email.trim().toLowerCase()

  const submit = async () => {
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setError('Entre une adresse e-mail valide.')
    if (mode === 'forgot') {
      setLoading(true)
      const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: AUTH_REDIRECT })
      setLoading(false)
      if (err) return setError(frenchError(err.message))
      setCooldown(60); return setMode('reset-sent')
    }
    if (!password) return setError('Entre ton mot de passe.')
    if (mode === 'login') {
      setLoading(true)
      const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      setLoading(false)
      if (err) setError(frenchError(err.message))
      return
    }
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.')
    if (!accepted) return setError('Tu dois accepter les CGU et la politique de confidentialité pour créer un compte.')
    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({
      email: cleanEmail, password,
      options: { emailRedirectTo: AUTH_REDIRECT, data: {
        first_name: firstName.trim().slice(0, 30) || undefined, accepted_terms_at: new Date().toISOString(), terms_version: TERMS_VERSION } },
    })
    setLoading(false)
    if (err) return setError(frenchError(err.message))
    if (data.user && data.user.identities?.length === 0) return setError(frenchError('already registered'))
    if (!data.session) { setCooldown(60); setMode('check-mail') }
  }

  const resend = async () => {
    if (cooldown > 0) return
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: cleanEmail, options: { emailRedirectTo: AUTH_REDIRECT } })
    if (err) return setError(frenchError(err.message))
    setCooldown(60)
  }

  const shell = (children: React.ReactNode) => (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, gap: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Logo />
          <Text size={32} weight={800} style={{ letterSpacing: -0.8 }}>Kalzo</Text>
          <Text color="muted" center>Le BeReal du repas : partage tes déjeuners et dîners avec tes amis.</Text>
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )

  if (mode === 'check-mail' || mode === 'reset-sent') {
    const isReset = mode === 'reset-sent'
    return shell(
      <Card style={{ padding: 24, gap: 12, alignItems: 'center' }}>
        <Text size={44}>📬</Text>
        <Text size={22} weight={800} center>Vérifie ta boîte mail</Text>
        <Text color="muted" center>
          {isReset ? 'Si un compte existe pour ' : 'Nous avons envoyé un lien de confirmation à '}
          <Text weight={700}>{cleanEmail}</Text>
          {isReset ? ', tu y trouveras un lien pour choisir un nouveau mot de passe.' : '. Touche-le pour activer ton compte : l’app s’ouvrira toute seule.'}
        </Text>
        <Text size={12} color="muted" center>Rien reçu ? Regarde dans les courriers indésirables.</Text>
        <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 8 }}>
          {!isReset && <Button variant="outline" label={cooldown > 0 ? `Renvoyer le message (${cooldown} s)` : 'Renvoyer le message'} onPress={resend} disabled={cooldown > 0} />}
          <Button variant="ghost" label="Retour à la connexion" onPress={() => switchMode('login')} />
        </View>
        {error ? <Text color="destructive" size={13}>{error}</Text> : null}
      </Card>,
    )
  }

  const isSignup = mode === 'signup'
  return shell(
    <Card style={{ padding: 20, gap: 16 }}>
      {mode !== 'forgot' ? (
        <Segmented value={mode} onChange={switchMode} options={[{ id: 'login', label: 'Connexion' }, { id: 'signup', label: 'Créer un compte' }]} />
      ) : (
        <View style={{ gap: 4 }}>
          <Text size={22} weight={800}>Mot de passe oublié</Text>
          <Text color="muted" size={14}>Entre ton e-mail, nous t’envoyons un lien pour en choisir un nouveau.</Text>
        </View>
      )}
      {isSignup && (
        <Field label="Prénom (affiché à tes amis)">
          <Input value={firstName} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" placeholder="Camille" maxLength={30} />
        </Field>
      )}
      <Field label="E-mail">
        <Input value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="toi@exemple.fr" />
      </Field>
      {mode !== 'forgot' && (
        <Field label="Mot de passe" hint={isSignup ? '8 caractères minimum.' : undefined}>
          <View>
            <Input value={password} onChangeText={setPassword} secureTextEntry={!show} autoCapitalize="none"
              autoComplete={isSignup ? 'new-password' : 'current-password'} textContentType={isSignup ? 'newPassword' : 'password'} placeholder="••••••••" style={{ paddingRight: 80 }} />
            <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onPress={() => setShow(s => !s)}
              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, minWidth: 64, alignItems: 'center', justifyContent: 'center' }}>
              <Text size={13} weight={700} color="primary">{show ? 'Masquer' : 'Afficher'}</Text>
            </Pressable>
          </View>
        </Field>
      )}
      {isSignup && (
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} onPress={() => setAccepted(a => !a)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 44 }}>
          <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: accepted ? colors.primary : colors.border, backgroundColor: accepted ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
            {accepted ? <Text color="white" size={14} weight={800}>✓</Text> : null}
          </View>
          <Text size={13} color="muted" style={{ flex: 1 }}>
            J’accepte les <Text size={13} color="primary" weight={700} onPress={() => Linking.openURL(`${SITE}/cgu`)}>CGU</Text> et la{' '}
            <Text size={13} color="primary" weight={700} onPress={() => Linking.openURL(`${SITE}/confidentialite`)}>politique de confidentialité</Text>. Je comprends que mes photos partagées sont visibles par mes amis et supprimées après 30 jours.
          </Text>
        </Pressable>
      )}
      {error ? <Text color="destructive" size={13} accessibilityLiveRegion="polite">{error}</Text> : null}
      <Button label={mode === 'login' ? 'Se connecter' : isSignup ? 'Créer mon compte' : 'Envoyer le lien'} onPress={submit} loading={loading} size="lg" />
      {mode === 'login' && <Button variant="ghost" size="sm" label="Mot de passe oublié ?" onPress={() => switchMode('forgot')} />}
      {mode === 'forgot' && <Button variant="ghost" size="sm" label="Retour à la connexion" onPress={() => switchMode('login')} />}
      {isSignup && <Text size={12} color="muted" center>Tu démarres avec 7 jours d’essai gratuit, sans carte bancaire.</Text>}
    </Card>,
  )
}
