import { useCallback } from 'react'
import { useRouter } from 'expo-router'
import { AiError, askAI } from './ai'
import { useSession } from '@/state/session'
import { useToast } from '@/components/ui/Toast'
import { useAiConsent } from '@/components/AiConsent'
import { warning } from './haptics'

// Appel IA avec gestion centralisée des refus du serveur : quota épuisé ou offre insuffisante → paywall.
export function useAiCall() {
  const { setAi } = useSession()
  const router = useRouter()
  const toast = useToast()
  const consent = useAiConsent()
  return useCallback(async (feature: 'scan' | 'coach', content: Parameters<typeof askAI>[1], maxTokens = 1000) => {
    if (!(await consent.ensure())) {
      toast.show('Sans ton accord, l’analyse par IA reste désactivée. Tu peux saisir ton repas à la main.', 'info')
      throw new AiError('Accord requis pour l’IA', 'consent_required')
    }
    try {
      const r = await askAI(feature, content, maxTokens)
      if (r.status) setAi(r.status)
      return r
    } catch (e) {
      if (e instanceof AiError) {
        if (e.status) setAi(e.status)
        if (e.code === 'quota_weekly' || e.code === 'subscription_required') {
          warning()
          router.push({ pathname: '/paywall', params: { reason: e.code } })
        } else {
          toast.show(e.message, 'error')
        }
      } else {
        toast.show("L'analyse a échoué, réessaie.", 'error')
      }
      throw e
    }
  }, [setAi, router, toast, consent])
}
