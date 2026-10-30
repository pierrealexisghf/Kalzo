// Dépense = MET × poids (kg) × durée (h) — méthode standard, gratuite.
export const SPORTS = [
  { name: 'Course à pied', emoji: '🏃', met: 9.8 },
  { name: 'Marche', emoji: '🚶', met: 3.5 },
  { name: 'Vélo', emoji: '🚴', met: 7.5 },
  { name: 'Natation', emoji: '🏊', met: 8 },
  { name: 'Musculation', emoji: '💪', met: 5 },
  { name: 'Fitness / HIIT', emoji: '🔥', met: 8 },
  { name: 'Football', emoji: '⚽', met: 7 },
  { name: 'Basket', emoji: '🏀', met: 6.5 },
  { name: 'Tennis', emoji: '🎾', met: 7.3 },
  { name: 'Randonnée', emoji: '🥾', met: 6 },
  { name: 'Yoga', emoji: '🧘', met: 2.5 },
  { name: 'Danse', emoji: '💃', met: 5 },
] as const
export const SPORT_DURATIONS = [15, 30, 45, 60, 90]

export const kcalForMet = (met: number, weightKg: number, minutes: number) =>
  Math.round(met * weightKg * (minutes / 60))
