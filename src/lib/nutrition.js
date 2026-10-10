// ---------------------------------------------------------------------------
// Dates — toujours en heure LOCALE de l'utilisateur.
// (L'ancienne version utilisait toISOString(), donc l'heure UTC : entre minuit
// et 2 h du matin en France, un repas tombait sur la veille.)
// ---------------------------------------------------------------------------
const pad = n => String(n).padStart(2, '0')

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const todayKey = () => dateKey()

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key, n) {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

// Horodatage local sans fuseau ("2026-10-11T14:05:00"), au format de la colonne
// `consumed_at` (timestamp without time zone).
export function localTimestamp(d = new Date()) {
  return `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// Lundi → dimanche de la semaine contenant `key`.
export function weekDatesOf(key = todayKey()) {
  const d = parseKey(key)
  const offset = d.getDay() === 0 ? -6 : 1 - d.getDay()
  const monday = addDays(key, offset)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function weekKey(date) {
  const d = date ? new Date(date) : new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  const y = monday.getFullYear()
  const start = new Date(y, 0, 1)
  const weekNum = Math.ceil(((monday - start) / 86400000 + start.getDay() + 1) / 7)
  return `${y}-W${pad(weekNum)}`
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

export function formatDay(key, withWeekday = true) {
  const d = parseKey(key)
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return withWeekday ? `${cap(DAYS[d.getDay()])} ${base}` : base
}

export function relativeDay(key) {
  const today = todayKey()
  if (key === today) return "Aujourd'hui"
  if (key === addDays(today, -1)) return 'Hier'
  if (key === addDays(today, 1)) return 'Demain'
  return formatDay(key)
}

export function shortDay(key) {
  return cap(DAYS[parseKey(key).getDay()].slice(0, 3))
}

export function getGreeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Bonsoir'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

// ---------------------------------------------------------------------------
// Profil nutritionnel
// ---------------------------------------------------------------------------
export const GOALS = [
  { id: 'seche', label: 'Perdre du poids', short: 'Perte de poids', desc: 'Déficit modéré (−400 kcal/jour)', modifier: -400 },
  { id: 'maintenance', label: 'Me maintenir', short: 'Maintien', desc: 'Équilibre énergétique', modifier: 0 },
  { id: 'masse', label: 'Prendre de la masse', short: 'Prise de masse', desc: 'Surplus léger (+300 kcal/jour)', modifier: 300 },
]

// Niveau d'activité du QUOTIDIEN, sport exclu : les séances saisies dans l'app
// sont ajoutées à part (« calories brûlées »). Compter le sport ici ET le saisir
// reviendrait à le compter deux fois.
export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Plutôt assis', desc: 'Bureau, études, télétravail, peu de déplacements' },
  { value: 1.3, label: 'Souvent debout', desc: 'Commerce, enseignement, parent actif, beaucoup de marche' },
  { value: 1.4, label: 'Travail physique', desc: 'Manutention, chantier, soins, agriculture' },
]

// Les profils créés avant ce changement ont un ancien coefficient (1,375 à 1,9) :
// on les rattache au niveau le plus proche pour l'affichage.
export function nearestActivity(value) {
  const v = Number(value) || 1.3
  return ACTIVITY_LEVELS.reduce((best, l) => (Math.abs(l.value - v) < Math.abs(best.value - v) ? l : best)).value
}

export const MEAL_TYPES = [
  { id: 'petit-dejeuner', label: 'Petit-déjeuner', emoji: '🥐' },
  { id: 'dejeuner', label: 'Déjeuner', emoji: '🍽️' },
  { id: 'diner', label: 'Dîner', emoji: '🌙' },
  { id: 'collation', label: 'Collation', emoji: '🍎' },
]

// Repas enregistrés sans type (anciennes versions) : on les range selon l'heure.
export function mealTypeOf(meal) {
  const known = MEAL_TYPES.find(t => t.id === meal.mealType)
  if (known) return known.id
  const hour = meal.time ? parseInt(String(meal.time).slice(11, 13), 10) : NaN
  if (Number.isNaN(hour)) return 'dejeuner'
  if (hour < 10) return 'petit-dejeuner'
  if (hour < 15) return 'dejeuner'
  if (hour < 18) return 'collation'
  return 'diner'
}

// Mifflin-St Jeor (plus fiable que Harris-Benedict), avec garde-fous de sécurité :
// jamais sous un plancher calorique.
export function calculateProfile({ weight, height, age, gender, activity, goal }) {
  weight = Number(weight); height = Number(height); age = Number(age)
  const factor = Number(activity)
  const bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161)
  const tdee = Math.round(bmr * factor)
  let modifier = GOALS.find(g => g.id === goal)?.modifier ?? 0
  if (age < 18 && modifier < 0) modifier = 0 // jamais de déficit calorique pour un mineur
  const floor = gender === 'male' ? 1500 : 1200
  const kcal = Math.max(floor, tdee + modifier)

  const protPerKg = goal === 'seche' ? 2.0 : goal === 'masse' ? 1.8 : 1.6
  const prot = Math.round(weight * protPerKg)
  const lip = Math.round((kcal * 0.27) / 9)
  const gluc = Math.max(0, Math.round((kcal - prot * 4 - lip * 9) / 4))

  return { weight, height, age, gender, activity: factor, goal, kcal, tdee, prot, lip, gluc }
}

// ~35 ml par kg, arrondi aux 250 ml, entre 1,5 et 4 L.
export function suggestWaterGoal(weight) {
  const ml = Math.round((Number(weight) * 35) / 250) * 250
  return Math.min(4000, Math.max(1500, ml || 2000))
}

// ---------------------------------------------------------------------------
// Agrégats
// ---------------------------------------------------------------------------
export function sumMacros(meals = []) {
  return meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (m.macros?.kcal || 0),
      prot: acc.prot + (m.macros?.prot || 0),
      gluc: acc.gluc + (m.macros?.gluc || 0),
      lip: acc.lip + (m.macros?.lip || 0),
    }),
    { kcal: 0, prot: 0, gluc: 0, lip: 0 }
  )
}

export function sumBurned(sports = []) {
  return sports.reduce((s, a) => s + (a.kcal || 0), 0)
}

export function dayTotals({ dailyMeals, dailySport, dailyWater }, key) {
  const meals = dailyMeals[key] || []
  const sports = dailySport[key] || []
  const macros = sumMacros(meals)
  const burned = sumBurned(sports)
  return {
    meals, sports, macros, burned,
    eaten: macros.kcal,
    net: macros.kcal - burned,
    water: dailyWater[key]?.total || 0,
  }
}

// Série de jours consécutifs avec au moins un repas enregistré. Si rien n'est
// encore saisi aujourd'hui, la série d'hier reste valable.
export function computeStreak(dailyMeals) {
  let key = todayKey()
  if (!(dailyMeals[key]?.length)) key = addDays(key, -1)
  let count = 0
  while (dailyMeals[key]?.length) {
    count += 1
    key = addDays(key, -1)
  }
  return count
}

// Repas récents distincts, pour les ré-ajouter en un geste.
export function recentMeals(dailyMeals, limit = 8) {
  const seen = new Set()
  const out = []
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

export const fmtMl = ml => (ml >= 1000 ? `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 2).replace(/0$/, '')} L` : `${ml} ml`)
