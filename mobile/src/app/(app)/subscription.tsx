import { Linking, Platform, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/state/session'
import { Button, Card, Header, Screen } from '@/components/ui/kit'
import { Text } from '@/components/ui/Text'
import { ScanBalance } from '@/components/ScanBalance'
import { manageSubscriptions, purchasesAvailable, redeemCode } from '@/lib/purchases'
import { PLAN_LABEL, type PlanId } from '@/lib/logic/quota'
import { dateKey, formatDay } from '@/lib/logic/dates'

export default function Subscription() {
  const router = useRouter()
  const { account } = useSession()
  const ai = account?.ai
  const plan = (ai?.plan ?? 'free') as PlanId | 'trial'
  const reset = ai?.resets_at ? formatDay(dateKey(new Date(ai.resets_at)), true) : null
  const trialEnd = ai?.trial_ends_at ? formatDay(dateKey(new Date(ai.trial_ends_at)), false) : null

  return (
    <Screen>
      <Header title="Abonnement" onBack />
      <Card style={{ gap: 8 }}>
        <Text size={13} weight={700} color="muted">OFFRE ACTUELLE</Text>
        <Text size={26} weight={800}>{PLAN_LABEL[plan]}</Text>
        {plan === 'trial' && trialEnd ? <Text color="muted">Ton essai gratuit se termine le {trialEnd}. Ensuite, tu repasses automatiquement au plan gratuit (5 scans par semaine, sans coach), sans aucun prélèvement.</Text> : null}
        <View style={{ height: 4 }} />
        <ScanBalance compact />
        {ai?.remaining != null && reset ? <Text size={12.5} color="muted">Prochaine remise à zéro : {reset} à minuit.</Text> : null}
        <Text size={14}>{ai?.coach_access ? '✓ Coach IA inclus' : '🔒 Coach IA non inclus'}</Text>
      </Card>
      <Button label={plan === 'free' || plan === 'trial' ? 'Voir les offres' : 'Changer d’offre'} size="lg" onPress={() => router.push('/paywall')} />
      {Platform.OS === 'ios' ? <Button label="Gérer mon abonnement" variant="outline" onPress={() => { manageSubscriptions() }} /> : null}
      {Platform.OS === 'ios' && purchasesAvailable() ? <Button label="J’ai un code promo" variant="ghost" onPress={() => { redeemCode().catch(() => {}) }} /> : null}
      <Text size={12} color="muted" center>Le feed, les amis, les étoiles, le journal, la saisie manuelle, l’eau, le sport, le poids et les rappels sont gratuits et illimités.</Text>
    </Screen>
  )
}
