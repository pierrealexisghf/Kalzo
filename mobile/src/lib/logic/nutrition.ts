import { addDays, parseKey, todayKey } from './dates.ts'

export type Gender = 'male' | 'female'
export type GoalId = 'seche' | 'maintenance' | 'masse'
export type Macros = { kcal: number; prot: number; gluc: number; lip: number; sucres?: number; fibres?: number }

export const GOALS = [
  { id: 'seche', label: 'Perdre du poids', short: 'Perte de poids', desc: 'Déficit modéré (−400 kcal/jour)', modifier: -400 },
  { id: 'maintenance', label: 'Me maintenir', short: 'Maintien', desc: 'Équilibre énergétique', modifier: 0 },
  { id: 'masse', label: 'Prendre de la masse', short: 'Prise de masse', desc: 'Surplus léger (+300 kcal/jour)', modifier: 300 },
] as const

// Niveau d'activité du QUOTIDIEN, sport exclu (les séances saisies sont ajoutées à part).
export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Plutôt assis', desc: 'Bureau, études, télétravail, peu de déplacements' },
  { value: 1.3, label: 'Souvent debout', desc: 'Commerce, enseignement, parent actif, beaucoup de marche' },
  { value: 1.4, label: 'Travail physique', desc: 'Manutention, chantier, soins, agriculture' },
] as const

export function nearestActivity(value: unknown): number {
  const v = Number(value) || 1.3
  return ACTIVITY_LEVELS.reduce((best, l) => (Math.abs(l.value - v) < Math.abs(best.value - v) ? l : best)).value
}

export type MealTypeId = 'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation'
export const MEAL_TYPES: { id: MealTypeId; label: string; emoji: string }[] = [
  { id: 'petit-dejeuner', label: 'Petit-déjeuner', emoji: '🥐' },
  { id: 'dejeuner', label: 'Déjeuner', emoji: '🍽️' },
  { id: 'diner', label: 'Dîner', emoji: '🌙' },
  { id: 'collation', label: 'Collation', emoji: '🍎' },
]

// Type de repas présélectionné selon l'heure.
export function defaultMealType(now: Date = new Date()): MealTypeId {
  const h = now.getHours()
  if (h < 10) return 'petit-dejeuner'
  if (h < 15) return 'dejeuner'
  if (h < 18) return 'collation'
  return 'diner'
}

export function mealTypeOf(meal: { mealType?: string | null; time?: string | null }): MealTypeId {
  const known = MEAL_TYPES.find(t => t.id === meal.mealType)
  if (known) return known.id
  const hour = meal.time ? parseInt(String(meal.time).slice(11, 13), 10) : NaN
  if (Number.isNaN(hour)) return 'dejeuner'
  if (hour < 10) return 'petit-dejeuner'
  if (hour < 15) return 'dejeuner'
  if (hour < 18) return 'collation'
  return 'diner'
}

export type Profile = {
  weight: number; height: number; age: number; gender: Gender; activity: number; goal: GoalId
  kcal: number; prot: number; gluc: number; lip: number
}

// Mifflin-St Jeor avec plancher calorique et protection des mineurs.
export function calculateProfile(p: {
  weight: number | string; height: number | string; age: number | string; gender: Gender
  activity: number | string; goal: GoalId; kcalOverride?: number | null
}): Profile & { tdee: number } {
  const weight = Number(p.weight), height = Number(p.height), age = Number(p.age)
  const factor = Number(p.activity)
  const bmr = 10 * weight + 6.25 * height - 5 * age + (p.gender === 'male' ? 5 : -161)
  const tdee = Math.round(bmr * factor)
  let modifier: number = GOALS.find(g => g.id === p.goal)?.modifier ?? 0
  if (age < 18 && modifier < 0) modifier = 0
  const floor = p.gender === 'male' ? 1500 : 1200
  let kcal = Math.max(floor, tdee + modifier)
  if (p.kcalOverride != null) kcal = Math.max(floor, Math.round(p.kcalOverride))

  const protPerKg = p.goal === 'seche' ? 2.0 : p.goal === 'masse' ? 1.8 : 1.6
  const prot = Math.round(weight * protPerKg)
  const lip = Math.round((kcal * 0.27) / 9)
  const gluc = Math.max(0, Math.round((kcal - prot * 4 - lip * 9) / 4))
  return { weight, height, age, gender: p.gender, activity: factor, goal: p.goal, kcal, tdee, prot, lip, gluc }
}

// ----------------------------------------------------------------- poids
export const KCAL_PER_KG = 7700
export const GOAL_DURATIONS = [4, 8, 12, 16, 24]

export type WeightPlan =
  | { status: 'invalid' | 'minor'; direction?: string }
  | {
      status: 'ok' | 'too_fast' | 'floor'; direction: 'seche' | 'masse' | 'maintenance'
      delta: number; weeks: number; weeklyRate: number; maxRate?: number; dailyDelta: number; end: string
      tdee?: number; kcalTarget?: number; suggestWeeks?: number | null
    }

export function planWeightGoal(p: {
  current: number; target: number; weeks: number; gender: Gender; age: number; activity: number; height: number; startDate?: string
}): WeightPlan {
  const cur = Number(p.current), tgt = Number(p.target), w = Math.round(Number(p.weeks))
  if (!(cur > 0) || !(tgt > 0) || !(w >= 1)) return { status: 'invalid' }
  const startDate = p.startDate ?? todayKey()
  const delta = tgt - cur
  const direction = Math.abs(delta) < 0.1 ? 'maintenance' : delta < 0 ? 'seche' : 'masse'
  const end = addDays(startDate, w * 7)
  if (direction === 'maintenance') return { status: 'ok', direction, delta: 0, weeks: w, weeklyRate: 0, dailyDelta: 0, end }
  if (direction === 'seche' && Number(p.age) < 18) return { status: 'minor', direction }

  const abs = Math.abs(delta)
  const weeklyRate = abs / w
  const maxRate = direction === 'seche' ? Math.min(cur * 0.01, 1) : 0.5
  const minWeeks = Math.ceil(abs / maxRate)
  const base = calculateProfile({ weight: cur, height: p.height, age: p.age, gender: p.gender, activity: p.activity, goal: 'maintenance' })
  const floor = p.gender === 'male' ? 1500 : 1200
  const sign = direction === 'seche' ? -1 : 1
  const dailyDelta = Math.round(((weeklyRate * KCAL_PER_KG) / 7) * sign)
  const rawKcal = base.tdee + dailyDelta
  const maxDeficit = Math.max(0, base.tdee - floor)
  const weeksForFloor = direction === 'seche' ? (maxDeficit > 0 ? Math.ceil((abs * KCAL_PER_KG) / (maxDeficit * 7)) : null) : 0

  let status: 'ok' | 'too_fast' | 'floor' = 'ok'
  if (weeklyRate > maxRate + 1e-9) status = 'too_fast'
  else if (rawKcal < floor) status = 'floor'
  return {
    status, direction, delta, weeks: w, weeklyRate, maxRate, dailyDelta, end,
    tdee: base.tdee, kcalTarget: Math.max(floor, rawKcal),
    suggestWeeks: weeksForFloor == null ? null : Math.max(minWeeks, weeksForFloor),
  }
}

export type WeightEntry = { date: string; weight: number }
export type WeightGoal = { startWeight?: number; targetWeight: number; weeks?: number; startDate?: string }

export function goalProgress(goal: WeightGoal, entries: WeightEntry[] | null, fallbackWeight: number) {
  const sorted = [...(entries || [])].sort((a, b) => a.date.localeCompare(b.date))
  const last = sorted[sorted.length - 1]
  const current = last?.weight ?? fallbackWeight
  const start = goal.startWeight ?? current
  const target = goal.targetWeight
  const total = Math.max(1, (goal.weeks || 8) * 7)
  const startDate = goal.startDate || todayKey()
  const endDate = addDays(startDate, total)
  const elapsed = Math.min(total, Math.max(0, Math.round((parseKey(todayKey()).getTime() - parseKey(startDate).getTime()) / 86400000)))
  const ideal = start + (target - start) * (elapsed / total)
  const diff = current - ideal
  const losing = target < start
  const ahead = losing ? -diff : diff
  const daysLeft = Math.max(0, total - elapsed)
  const pct = start === target ? 100 : Math.min(100, Math.max(0, ((start - current) / (start - target)) * 100))
  const reached = losing ? current <= target + 0.05 : current >= target - 0.05
  const state = reached ? 'reached' : ahead > 0.3 ? 'ahead' : ahead < -0.3 ? 'behind' : 'on_track'
  const daysSinceWeigh = last ? Math.round((parseKey(todayKey()).getTime() - parseKey(last.date).getTime()) / 86400000) : null
  return { current, start, target, ideal, diff, ahead, state, pct, endDate, daysLeft, weeksLeft: Math.ceil(daysLeft / 7), daysSinceWeigh, losing }
}

// ~35 ml par kg, arrondi aux 250 ml, entre 1,5 et 4 L.
export function suggestWaterGoal(weight: number | string): number {
  const ml = Math.round((Number(weight) * 35) / 250) * 250
  return Math.min(4000, Math.max(1500, ml || 2000))
}

// -------------------------------------------------------------- agrégats
export type Meal = {
  id: string; name: string; emoji: string; macros: Macros; mealType: string | null; time: string
  mainIngredients?: string[]; source?: string | null; stars?: number | null
  shared?: boolean; photoPath?: string | null; thumbPath?: string | null; photoExpiresAt?: string | null
}
export type Sport = { id: string; name: string; kcal: number; duration: number; emoji: string; intensity?: string | null }

export function sumMacros(meals: { macros?: Partial<Macros> }[] = []) {
  return meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (m.macros?.kcal || 0), prot: acc.prot + (m.macros?.prot || 0),
      gluc: acc.gluc + (m.macros?.gluc || 0), lip: acc.lip + (m.macros?.lip || 0),
    }),
    { kcal: 0, prot: 0, gluc: 0, lip: 0 },
  )
}
export const sumBurned = (sports: { kcal?: number }[] = []) => sports.reduce((s, a) => s + (a.kcal || 0), 0)

export function dayTotals(
  d: { dailyMeals: Record<string, Meal[]>; dailySport: Record<string, Sport[]>; dailyWater: Record<string, { total: number }> },
  key: string,
) {
  const meals = d.dailyMeals[key] || []
  const sports = d.dailySport[key] || []
  const macros = sumMacros(meals)
  const burned = sumBurned(sports)
  return { meals, sports, macros, burned, eaten: macros.kcal, net: macros.kcal - burned, water: d.dailyWater[key]?.total || 0 }
}

// Série de jours consécutifs avec au moins un repas (celle d'hier reste valable).
export function computeStreak(dailyMeals: Record<string, unknown[]>, from: string = todayKey()): number {
  let key = from
  if (!dailyMeals[key]?.length) key = addDays(key, -1)
  let count = 0
  while (dailyMeals[key]?.length) { count += 1; key = addDays(key, -1) }
  return count
}

export function recentMeals(dailyMeals: Record<string, Meal[]>, limit = 8): Meal[] {
  const seen = new Set<string>()
  const out: Meal[] = []
  for (const day of Object.keys(dailyMeals).sort().reverse()) {
    for (const m of [...dailyMeals[day]].reverse()) {
      const id = m.name?.trim().toLowerCase()
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(m)
      if (out.length >= limit) return out
    }
  }
  return out
}

export const fmtMl = (ml: number) =>
  ml >= 1000 ? `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 2).replace(/0$/, '').replace('.', ',')} L` : `${ml} ml`
