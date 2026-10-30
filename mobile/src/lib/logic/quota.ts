// Miroir côté app des règles d'offre. La source de vérité reste la base
// (table plan_limits + fonction consume_ai) : ceci ne sert qu'à l'affichage.

export type PlanId = 'free' | 'essentiel' | 'plus' | 'illimite'
export type PlanLimit = { plan: PlanId | 'trial'; weekly_scans: number | null; coach_access: boolean; daily_cap: number }

export const PLAN_LABEL: Record<PlanId | 'trial', string> = {
  trial: 'Essai gratuit', free: 'Gratuit', essentiel: 'Essentiel', plus: 'Plus', illimite: 'Illimité',
}

const ACTIVE = ['active', 'trialing', 'cancelling', 'past_due']

/** Offre effective : essai en cours, sinon abonnement actif, sinon gratuit. */
export function effectivePlan(p: {
  plan?: string | null; status?: string | null; trialEndsAt?: string | null; periodEnd?: string | null; now?: Date
}): PlanId | 'trial' {
  const now = p.now ?? new Date()
  if (p.trialEndsAt && new Date(p.trialEndsAt) > now) return 'trial'
  const plan = p.plan as PlanId | undefined
  const paid = plan === 'essentiel' || plan === 'plus' || plan === 'illimite'
  if (paid && p.status && ACTIVE.includes(p.status)) {
    if (p.status === 'cancelling' && p.periodEnd && new Date(p.periodEnd) <= now) return 'free'
    return plan as PlanId
  }
  return 'free'
}

// Composantes (année, mois, jour, jour de semaine, h, m, s) d'un instant dans un fuseau.
function zonedParts(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => parts.find(p => p.type === t)!.value
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { y: +get('year'), m: +get('month'), d: +get('day'), wd, h: +get('hour'), mi: +get('minute'), s: +get('second') }
}

// Décalage (ms) du fuseau par rapport à UTC à cet instant.
function tzOffsetMs(date: Date, tz: string): number {
  const p = zonedParts(date, tz)
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000
}

/** Instant (UTC) du prochain lundi 00:00 dans le fuseau donné : date de remise à zéro du quota. */
export function nextWeeklyReset(now: Date = new Date(), tz = 'Europe/Paris'): Date {
  const p = zonedParts(now, tz)
  const daysToMonday = ((8 - p.wd) % 7) || 7
  // Lundi 00:00 « mur » dans le fuseau, converti en UTC (deux passes pour absorber le changement d'heure).
  const wall = Date.UTC(p.y, p.m - 1, p.d + daysToMonday, 0, 0, 0)
  let utc = wall - tzOffsetMs(new Date(wall), tz)
  utc = wall - tzOffsetMs(new Date(utc), tz)
  return new Date(utc)
}

export function resetLabel(now: Date = new Date(), tz = 'Europe/Paris'): string {
  const r = nextWeeklyReset(now, tz)
  const days = Math.round((r.getTime() - now.getTime()) / 86400000)
  return days <= 1 ? 'demain à minuit' : `lundi (dans ${days} jours)`
}

export function scansLeftLabel(left: number | null, now: Date = new Date()): string {
  if (left == null) return 'Scans illimités'
  const n = Math.max(0, left)
  return `${n} scan${n > 1 ? 's' : ''} restant${n > 1 ? 's' : ''} cette semaine · remise à zéro lundi`
}
