// Données d'exemple pour contrôler le rendu des écrans SANS base de données.
// Activé uniquement par NEXT_PUBLIC_DEMO=1 au démarrage du serveur de développement.
// Variable absente en production : ce code n'est alors jamais atteint.
import { todayKey, addDays } from './nutrition'

export function demoData() {
  const today = todayKey()
  const meal = (id, name, emoji, kcal, prot, gluc, lip, mealType, h, day = today) => ({
    id, name, emoji, mealType, time: `${day}T${String(h).padStart(2, '0')}:15:00`, macros: { kcal, prot, gluc, lip }, mainIngredients: [],
  })
  const dailyMeals = {
    [today]: [
      meal('m1', 'Porridge banane & amandes', '🥣', 420, 16, 62, 12, 'petit-dejeuner', 8),
      meal('m2', 'Bowl poulet & riz basmati', '🍚', 640, 46, 72, 14, 'dejeuner', 12),
      meal('m3', 'Yaourt grec & miel', '🍯', 180, 14, 20, 4, 'collation', 16),
    ],
  }
  const kcals = [1850, 2010, 1720, 2240, 1930, 1680]
  kcals.forEach((k, i) => {
    const day = addDays(today, -(i + 1))
    dailyMeals[day] = [meal(`h${i}a`, 'Repas du jour', '🍽️', Math.round(k * 0.45), 40, 100, 30, 'dejeuner', 12, day), meal(`h${i}b`, 'Dîner', '🌙', Math.round(k * 0.55), 50, 120, 35, 'diner', 20, day)]
  })
  const dailySport = {
    [today]: [{ id: 's1', name: 'Course à pied', emoji: '🏃', kcal: 410, duration: 40, intensity: 'modérée' }],
    [addDays(today, -2)]: [{ id: 's2', name: 'Musculation', emoji: '💪', kcal: 300, duration: 60, intensity: 'intense' }],
  }
  const dailyWater = { [today]: { total: 1250 }, [addDays(today, -1)]: { total: 2000 }, [addDays(today, -2)]: { total: 1750 } }
  const weightEntries = [74.2, 73.9, 73.8, 73.1, 72.9, 72.6].map((w, i) => ({ date: addDays(today, -(5 - i) * 6), weight: w }))
  return {
    profile: { weight: 72.6, height: 172, age: 31, gender: 'female', activity: 1.55, goal: 'seche', kcal: 1950, prot: 145, lip: 58, gluc: 215 },
    dailyMeals, dailySport, dailyWater, weightEntries,
    weightGoal: { v: 2, targetWeight: 68, weeks: 12, startDate: addDays(today, -30), startWeight: 74.2, adaptCalories: true, dailyDelta: -420 },
  }
}
