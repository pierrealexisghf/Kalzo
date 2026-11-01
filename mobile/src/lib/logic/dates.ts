// Dates — toujours en heure LOCALE de l'utilisateur (même règle que le web).
const pad = (n: number) => String(n).padStart(2, '0')

export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const todayKey = () => dateKey()

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

// Horodatage local sans fuseau ("2026-10-11T14:05:00"), au format de `consumed_at`.
export function localTimestamp(d: Date = new Date()): string {
  return `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// Lundi → dimanche de la semaine contenant `key`.
export function weekDatesOf(key: string = todayKey()): string[] {
  const d = parseKey(key)
  const offset = d.getDay() === 0 ? -6 : 1 - d.getDay()
  const monday = addDays(key, offset)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function weekKey(date?: Date | string): string {
  const d = date ? new Date(date) : new Date()
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  const y = monday.getFullYear()
  const start = new Date(y, 0, 1)
  const weekNum = Math.ceil(((monday.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return `${y}-W${pad(weekNum)}`
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function formatDay(key: string, withWeekday = true): string {
  const d = parseKey(key)
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return withWeekday ? `${cap(DAYS[d.getDay()])} ${base}` : base
}
export const monthLabel = (year: number, month0: number) => `${cap(MONTHS[month0])} ${year}`

export function relativeDay(key: string): string {
  const today = todayKey()
  if (key === today) return "Aujourd'hui"
  if (key === addDays(today, -1)) return 'Hier'
  if (key === addDays(today, 1)) return 'Demain'
  return formatDay(key)
}

export const shortDay = (key: string) => cap(DAYS[parseKey(key).getDay()].slice(0, 3))

export function getGreeting(now: Date = new Date()): string {
  const h = now.getHours()
  if (h < 5) return 'Bonsoir'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

/** Quel repas rappeler dans le feed : le déjeuner entre les rappels de midi et du soir, le dîner du rappel du soir jusqu'au rappel de midi du lendemain. */
export function cardSlot(now: Date, lunch: string, dinner: string): { slot: 'dejeuner' | 'diner'; yesterday: boolean } {
  const mins = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0) }
  const t = now.getHours() * 60 + now.getMinutes()
  if (t >= mins(dinner)) return { slot: 'diner', yesterday: false }
  if (t >= mins(lunch)) return { slot: 'dejeuner', yesterday: false }
  return { slot: 'diner', yesterday: true }
}
