'use client'

import { useState } from 'react'
import { Sparkles, Check, Gift, Infinity as Inf, CalendarClock } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { Button, Card, ScreenHeader, SectionTitle, ConfirmDialog, cx } from '@/components/ui/primitives'

const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null

const USES = [
  ['Analyse de repas (photo ou texte)', '1 crédit'],
  ['Recette Frigo Vide', '1 crédit'],
  ['Analyse de carte de restaurant', '1 crédit'],
  ['Plan 7 jours · Batch cooking', '1 crédit'],
  ['Estimation d\'une séance de sport', '1 crédit'],
  ['Suivi, journal, recettes, scan, eau, poids', 'Gratuit'],
]

export default function Subscription() {
  const { user, userPlan, subStatus, credits, isVip, hasSubscription, trialEndsAt, periodEnd, subscribe, cancelSubscription } = useApp()
  const { back } = useNav()
  const [cgv, setCgv] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [busy, setBusy] = useState(false)
  const trialOffered = !user?.app_metadata?.trial_used
  const cta = trialOffered ? 'Essayer 7 jours gratuitement' : 'Souscrire'

  const statusText = { trialing: "Période d'essai", active: 'Actif', cancelling: 'Résilié, actif jusqu\'à la fin de la période', past_due: 'Paiement en échec' }[subStatus]

  const go = async (plan) => { setBusy(plan); await subscribe(plan); setBusy(false) }

  return (
    <div className="tone-coach">
      <ScreenHeader title="Abonnement" subtitle="Crédits IA et offres" onBack={back} />

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-3xl bg-tone-soft text-tone"><Sparkles className="size-7" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mes crédits IA</div>
            <div className="text-3xl font-extrabold leading-tight">{isVip ? 'Illimités' : credits}</div>
          </div>
          <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold">{userPlan === 'vip' ? 'VIP' : userPlan === 'standard' ? 'Standard' : 'Gratuit'}</span>
        </div>
        {hasSubscription && (
          <div className="mt-4 space-y-1.5 rounded-2xl bg-muted p-3.5 text-[13px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Statut</span><span className="font-semibold">{statusText}</span></div>
            {subStatus === 'trialing' && trialEndsAt && <div className="flex justify-between"><span className="text-muted-foreground">Fin de l'essai</span><span className="font-semibold">{fmtDate(trialEndsAt)}</span></div>}
            {periodEnd && subStatus !== 'trialing' && <div className="flex justify-between"><span className="text-muted-foreground">{subStatus === 'cancelling' ? "Fin d'accès" : 'Prochain paiement'}</span><span className="font-semibold">{fmtDate(periodEnd)}</span></div>}
          </div>
        )}
        {subStatus === 'past_due' && <p className="mt-3 text-[13px] font-medium text-destructive">Le dernier paiement a échoué. Mettez à jour votre moyen de paiement, sinon l'abonnement sera interrompu.</p>}
        {!hasSubscription && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-coach-soft p-3.5 text-[13px] text-coach"><Gift className="mt-0.5 size-4 shrink-0" />Le suivi (repas, sport, eau, poids) reste gratuit pour toujours. Seules les fonctions IA consomment des crédits.</div>
        )}
      </Card>

      {!hasSubscription && (
        <>
          <SectionTitle>Choisir une offre</SectionTitle>
          <label className="mt-3 flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-muted-foreground">
            <input type="checkbox" checked={cgv} onChange={e => setCgv(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[hsl(var(--primary))]" />
            <span>J'ai lu et j'accepte les <a href="/cgv" target="_blank" className="font-semibold text-primary underline">conditions générales de vente</a>, dont les modalités de rétractation et de résiliation.</span>
          </label>
          <div className="mt-4 space-y-3">
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div><div className="text-lg font-bold">Standard</div><div className="text-sm text-muted-foreground">120 crédits IA par mois</div></div>
                <div className="text-right"><div className="text-3xl font-extrabold leading-none">7 €</div><div className="text-xs text-muted-foreground">par mois</div></div>
              </div>
              <Button size="lg" variant="tone" full className="mt-4" disabled={!cgv} loading={busy === 'standard'} onClick={() => go('standard')}>{cta}</Button>
            </Card>
            <Card className="relative overflow-hidden p-5 ring-2 ring-tone/40">
              <span className="absolute right-4 top-0 rounded-b-xl bg-tone px-3 py-1 text-[11px] font-bold text-tone-fg">Le plus complet</span>
              <div className="flex items-start justify-between">
                <div><div className="flex items-center gap-1.5 text-lg font-bold">VIP <Inf className="size-5 text-tone" /></div><div className="text-sm text-muted-foreground">IA sans compteur de crédits*</div></div>
                <div className="text-right"><div className="text-3xl font-extrabold leading-none">10 €</div><div className="text-xs text-muted-foreground">par mois</div></div>
              </div>
              <Button size="lg" variant="tone" full className="mt-4" disabled={!cgv} loading={busy === 'vip'} onClick={() => go('vip')}>{cta}</Button>
            </Card>
          </div>
          {trialOffered && <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground"><CalendarClock className="mt-0.5 size-4 shrink-0" />7 jours d'essai offerts, carte bancaire demandée. Aucun prélèvement pendant l'essai, résiliable en un clic avant son terme.</p>}
          <p className="mt-2 text-xs text-muted-foreground">* Usage raisonnable : jusqu'à 100 demandes IA par jour.</p>
        </>
      )}

      {hasSubscription && subStatus !== 'cancelling' && (
        <Button variant="danger" full className="mt-5" onClick={() => setConfirmCancel(true)}>Résilier mon abonnement</Button>
      )}

      <SectionTitle>Ce que coûte chaque action</SectionTitle>
      <Card className="divide-y divide-border">
        {USES.map(([label, cost]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
            <span>{label}</span>
            <span className={cx('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold', cost === 'Gratuit' ? 'bg-nutri-soft text-nutri' : 'bg-coach-soft text-coach')}>{cost}</span>
          </div>
        ))}
      </Card>

      <ConfirmDialog open={confirmCancel} title="Résilier l'abonnement ?"
        text="Vous gardez l'accès à vos crédits jusqu'à la fin de la période en cours, puis le compte repasse en offre gratuite."
        confirmLabel="Résilier" danger onCancel={() => setConfirmCancel(false)}
        onConfirm={async () => { setConfirmCancel(false); await cancelSubscription() }} />
    </div>
  )
}
