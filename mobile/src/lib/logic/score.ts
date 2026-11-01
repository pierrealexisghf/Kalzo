import { addDays, todayKey } from './dates.ts'
import type { Macros } from './nutrition.ts'

// Part de l'objectif journalier attendue pour chaque type de repas.
export const MEAL_SHARE: Record<string, number> = {
  'petit-dejeuner': 0.25, dejeuner: 0.35, diner: 0.3, collation: 0.1,
}

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))

// 1 dans la zone idéale [a, b], décroît linéairement jusqu'à 0 en `lo` et `hi`.
function band(x: number, lo: number, a: number, b: number, hi: number): number {
  if (x >= a && x <= b) return 1
  if (x < a) return clamp((x - lo) / (a - lo))
  return clamp((hi - x) / (hi - b))
}

export type ScoreInput = {
  macros: Macros
  mealType: string
  /** Objectif calorique journalier du profil. */
  dailyKcal: number
}

// Poids du score (total 100). Sucres et fibres : optionnels, neutres si absents.
const W = { energy: 30, protein: 25, fat: 15, carb: 15, sugar: 7.5, fibre: 7.5 }

export function mealScore({ macros, mealType, dailyKcal }: ScoreInput): number {
  const kcal = Math.max(0, macros.kcal || 0)
  if (kcal <= 0) return 0
  const share = MEAL_SHARE[mealType] ?? 0.3
  const target = Math.max(1, dailyKcal * share)

  // Énergie : ni trop, ni trop peu. Zone idéale 80–120 % de la part du repas.
  const energy = band(kcal / target, 0.25, 0.8, 1.2, 2.0)
  // Densité en protéines : 7 g / 100 kcal = excellent, 1 g = très faible.
  const protDensity = ((macros.prot || 0) / kcal) * 100
  const protein = clamp((protDensity - 1) / 6)
  // Répartition énergétique des lipides et glucides.
  const fatShare = ((macros.lip || 0) * 9) / kcal
  const carbShare = ((macros.gluc || 0) * 4) / kcal
  const fat = band(fatShare, 0.05, 0.2, 0.35, 0.6)
  const carb = band(carbShare, 0.15, 0.4, 0.6, 0.85)
  // Sucres (g / 100 kcal) : ≤ 4 idéal, ≥ 14 mauvais. Fibres : ≥ 2 g / 100 kcal idéal.
  const sugar = macros.sucres == null ? 0.6 : clamp((14 - ((macros.sucres / kcal) * 100)) / 10)
  const fibre = macros.fibres == null ? 0.6 : clamp(((macros.fibres / kcal) * 100) / 2)

  return Math.round(
    energy * W.energy + protein * W.protein + fat * W.fat + carb * W.carb + sugar * W.sugar + fibre * W.fibre,
  )
}

export function starsFromScore(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score >= 82) return 5
  if (score >= 65) return 4
  if (score >= 45) return 3
  if (score >= 25) return 2
  return 1
}

export const mealStars = (input: ScoreInput) => starsFromScore(mealScore(input))

type Rated = { stars?: number | null }

/** Moyenne des étoiles sur les 7 derniers jours (aujourd'hui inclus). null si aucun repas noté. */
export function averageStars7d(dailyMeals: Record<string, Rated[]>, today: string = todayKey()): number | null {
  let sum = 0, n = 0
  for (let i = 0; i < 7; i++) {
    for (const m of dailyMeals[addDays(today, -i)] || []) {
      if (m.stars) { sum += m.stars; n += 1 }
    }
  }
  return n ? Math.round((sum / n) * 10) / 10 : null
}

/** Moyenne d'étoiles d'un jour. */
export function dayStars(meals: Rated[]): number | null {
  const rated = meals.filter(m => m.stars)
  if (!rated.length) return null
  return Math.round((rated.reduce((s, m) => s + (m.stars as number), 0) / rated.length) * 10) / 10
}

/** Série de jours consécutifs avec au moins un repas posté (une flamme = un jour posté). Celle d'hier reste valable. */
export function postStreak(dailyMeals: Record<string, { shared?: boolean }[]>, today: string = todayKey()): number {
  const ok = (k: string) => (dailyMeals[k] || []).some(m => m.shared)
  let key = ok(today) ? today : addDays(today, -1)
  let count = 0
  while (ok(key)) { count += 1; key = addDays(key, -1) }
  return count
}
