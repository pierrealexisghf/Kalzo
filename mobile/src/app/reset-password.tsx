import { useState } from 'react'
import { View } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/state/session'
import { Button, Card, Field, Input, Screen } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/Toast'

export default function ResetPassword() {
  const { clearRecovery } = useSession()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.')
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) return setError('Impossible de changer le mot de passe. Redemande un lien.')
    toast.show('Mot de passe modifié', 'success')
    clearRecovery()
  }
  return (
    <Screen style={{ paddingTop: 60 }}>
      <Card style={{ padding: 20, gap: 14 }}>
        <Text size={24} weight={800}>Nouveau mot de passe</Text>
        <Text color="muted">Choisis un mot de passe d’au moins 8 caractères.</Text>
        <Field label="Mot de passe" error={error}>
          <Input value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
        </Field>
        <View><Button label="Enregistrer" onPress={submit} loading={loading} size="lg" /></View>
      </Card>
    </Screen>
  )
}
