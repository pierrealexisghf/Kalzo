import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, View } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/state/session'
import { Button, Field, Input, Screen } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/theme'

export const USERNAME_ERRORS: Record<string, string> = {
  invalid_format: '3 à 20 caractères : lettres minuscules, chiffres, « _ » et « . » (pas au début ni à la fin).',
  reserved: 'Ce pseudo est réservé.',
  taken: 'Ce pseudo est déjà pris.',
  cooldown: 'Tu ne peux changer de pseudo qu’une fois tous les 30 jours.',
}

// Vérification de disponibilité en direct, avec un délai pour ne pas interroger à chaque touche.
export function useUsernameCheck(value: string, current?: string | null) {
  const v = value.trim().toLowerCase()
  const [remote, setRemote] = useState<{ value: string; available: boolean; reason?: string } | null>(null)
  const local: 'idle' | 'format' | 'remote' = !v || v === current ? 'idle'
    : /^[a-z0-9][a-z0-9_.]{1,18}[a-z0-9]$/.test(v) ? 'remote' : 'format'
  useEffect(() => {
    if (local !== 'remote') return
    // Délai pour ne pas interroger le serveur à chaque touche.
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('username_available', { p_username: v })
      if (!error && data) setRemote({ value: v, available: data.available, reason: data.reason })
    }, 400)
    return () => clearTimeout(t)
  }, [v, local])
  if (local === 'idle') return { status: 'idle' as const }
  if (local === 'format') return { status: 'bad' as const, reason: 'invalid_format' }
  if (remote?.value !== v) return { status: 'checking' as const }
  return remote.available ? { status: 'ok' as const } : { status: 'bad' as const, reason: remote.reason }
}

export default function UsernameScreen() {
  const { colors } = useTheme()
  const { setUsername, signOut } = useSession()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const check = useUsernameCheck(value)

  const save = async () => {
    setSaving(true); setError('')
    const { data, error: err } = await supabase.rpc('set_username', { p_username: value.trim().toLowerCase() })
    setSaving(false)
    if (err) return setError('Impossible d’enregistrer pour le moment. Réessaie.')
    if (!data.ok) return setError(USERNAME_ERRORS[data.reason] ?? 'Pseudo refusé.')
    setUsername(data.username)
  }

  const hint = check.status === 'checking' ? 'Vérification…' : check.status === 'ok' ? '✓ Disponible' : undefined
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen style={{ paddingTop: 56 }}>
        <Text size={32} weight={800} style={{ letterSpacing: -0.8 }}>Choisis ton pseudo</Text>
        <Text color="muted" size={16}>C’est comme ça que tes amis te retrouveront.</Text>
        <View style={{ height: 8 }} />
        <Field label="Pseudo" hint={hint} error={check.status === 'bad' ? USERNAME_ERRORS[check.reason ?? ''] : error || null}>
          <Input value={value} onChangeText={t => setValue(t.toLowerCase())} autoCapitalize="none" autoCorrect={false} maxLength={20}
            placeholder="camille.fit" textContentType="username" invalid={check.status === 'bad'} />
        </Field>
        <Text size={12} color="muted">Ton pseudo est visible par les autres utilisateurs. Ton e-mail ne l’est jamais. Tu pourras le modifier une fois tous les 30 jours.</Text>
        <Button label="Continuer" onPress={save} loading={saving} disabled={check.status !== 'ok'} size="lg" style={{ marginTop: 8 }} />
        <Button label="Me déconnecter" variant="ghost" size="sm" onPress={signOut} />
        <View style={{ height: 1, backgroundColor: colors.background }} />
      </Screen>
    </KeyboardAvoidingView>
  )
}
