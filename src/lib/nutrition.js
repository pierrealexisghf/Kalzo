// Calcul Harris-Benedict
export function calculateProfile({ weight, height, age, gender, activity, goal }) {
  let bmr
  if (gender === 'male') {
    bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
  } else {
    bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age
  }
  const tdee = Math.round(bmr * parseFloat(activity))

  const modifiers = { seche: -400, maintenance: 0, masse: 300 }
  const kcal = tdee + (modifiers[goal] || 0)

  const prot = Math.round(weight * 2.2)
  const lip = Math.round(kcal * 0.25 / 9)
  const gluc = Math.round((kcal - prot * 4 - lip * 9) / 4)

  return { weight, height, age, gender, activity: parseFloat(activity), goal, kcal, tdee, prot, lip, gluc }
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function weekKey(date) {
  const d = date ? new Date(date) : new Date()
  const day = d.getDay()
  const diff = (day === 0) ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  const y = monday.getFullYear()
  const start = new Date(y, 0, 1)
  const weekNum = Math.ceil(((monday - start) / 86400000 + start.getDay() + 1) / 7)
  return `${y}-W${String(weekNum).padStart(2, '0')}`
}

export function getTodayConsumedKcal(dailyMeals) {
  const today = todayKey()
  const meals = dailyMeals[today] || []
  return meals.reduce((sum, m) => sum + (m.macros?.kcal || 0), 0)
}

export function getTodayBurnedKcal(dailySport) {
  const today = todayKey()
  const sports = dailySport[today] || []
  return sports.reduce((sum, s) => sum + (s.kcal || 0), 0)
}

export function getTodayWater(dailyWater) {
  const today = todayKey()
  const dayData = dailyWater[today] || {}
  return Object.values(dayData).reduce((sum, v) => sum + (v || 0), 0)
}

export function getWeekDates() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + mondayOffset + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

export function getWeekData(dailyMeals, dailySport) {
  const dates = getWeekDates()
  const meals = []
  const sport = []
  dates.forEach(dk => {
    ;(dailyMeals[dk] || []).forEach(m => meals.push(m))
    ;(dailySport[dk] || []).forEach(a => sport.push(a))
  })
  const macros = meals.reduce((acc, m) => ({
    kcal: acc.kcal + (m.macros?.kcal || 0),
    prot: acc.prot + (m.macros?.prot || 0),
    gluc: acc.gluc + (m.macros?.gluc || 0),
    lip: acc.lip + (m.macros?.lip || 0),
  }), { kcal: 0, prot: 0, gluc: 0, lip: 0 })
  const burned = sport.reduce((s, a) => s + (a.kcal || 0), 0)
  return { macros, burned, mealCount: meals.length, sportCount: sport.length, meals }
}

export function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export function formatDate() {
  const now = new Date()
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`
}
