import { useState } from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/state/session'
import { Button, Field, Header, Input, Screen } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'

export default function ChangePassword() {
  const router = useRouter()
  const toast = useToast()
  const { user } = useSession()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setError('')
    if (!user?.email) return setError('Compte introuvable. Reconnecte-toi.')
    if (!current) return setError('Entre ton mot de passe actuel.')
    if (next.length < 8) return setError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
    if (next !== confirm) return setError('Les deux nouveaux mots de passe ne sont pas identiques.')
    if (next === current) return setError('Choisis un mot de passe différent de l’actuel.')
    setSaving(true)
    // On vérifie d'abord le mot de passe actuel : une session ouverte ne suffit pas à le changer.
    const check = await supabase.auth.signInWithPassword({ email: user.email, password: current })
    if (check.error) { setSaving(false); return setError('Mot de passe actuel incorrect.') }
    const { error: err } = await supabase.auth.updateUser({ password: next })
    setSaving(false)
    if (err) return setError('Impossible de changer le mot de passe pour le moment. Réessaie dans un instant.')
    toast.show('Mot de passe modifié', 'success')
    router.back()
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Header title="Mot de passe" onBack />
        <Field label="Mot de passe actuel">
          <Input value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" />
        </Field>
        <Field label="Nouveau mot de passe" hint="8 caractères minimum.">
          <Input value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
        </Field>
        <Field label="Confirmer le nouveau mot de passe" error={error || null}>
          <Input value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
        </Field>
        <Button label="Modifier le mot de passe" onPress={save} loading={saving} disabled={!current || !next || !confirm} size="lg" />
        <Text size={12.5} color="muted">Tu as oublié ton mot de passe actuel ? Déconnecte-toi, puis utilise « Mot de passe oublié ? » sur l’écran de connexion.</Text>
      </Screen>
    </KeyboardAvoidingView>
  )
}
