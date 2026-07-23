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
