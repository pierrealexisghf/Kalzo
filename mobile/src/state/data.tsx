import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getCalendars } from 'expo-localization'
import { supabase } from '@/lib/supabase'
import { useSession } from './session'
import { useToast } from '@/components/ui/Toast'
import { addDays, localTimestamp, todayKey, weekKey } from '@/lib/logic/dates'
import {
  suggestWaterGoal, type Macros, type Meal, type MealTypeId, type Profile, type Sport, type WeightEntry, type WeightGoal,
} from '@/lib/logic/nutrition'
import { mealStars } from '@/lib/logic/score'
import { prepareMealPhoto, prepareThumb, removePhotos, uploadMealPhotos, type PreparedImage } from '@/lib/photos'

const HISTORY_DAYS = 60

// weight_goal / weight_entries / current_plan sont du texte JSON (héritage de la première version).
function parseJsonField<T>(value: unknown): T | null {
  if (value == null) return null
  if (typeof value !== 'string') return value as T
  try { return JSON.parse(value) as T } catch { return null }
}

const toMeal = (m: any): Meal => ({
  id: m.id, name: m.name, emoji: m.emoji || '🍽️', macros: m.macros || { kcal: 0, prot: 0, gluc: 0, lip: 0 },
  mealType: m.meal_type, mainIngredients: m.main_ingredients || [], source: m.source, time: m.consumed_at,
  stars: m.stars ?? null, shared: !!m.shared, photoPath: m.photo_path, thumbPath: m.thumb_path, photoExpiresAt: m.photo_expires_at,
})
const toSport = (s: any): Sport => ({
  id: s.id, name: s.name, kcal: s.kcal_burned || 0, duration: s.duration || 0, emoji: s.emoji || '🏃', intensity: s.intensity,
})

export type NewMeal = {
  name: string; emoji?: string; macros: Macros; mealType: MealTypeId; ingredients?: string[]
  source: 'ai' | 'manual' | 'quick' | 'recent'; shared?: boolean; photo?: { full: PreparedImage; thumb: PreparedImage } | null
}

type Ctx = {
  ready: boolean; profile: Profile | null
  dailyMeals: Record<string, Meal[]>; dailySport: Record<string, Sport[]>; dailyWater: Record<string, { total: number }>
  waterGoal: number; weightEntries: WeightEntry[]; weightGoal: WeightGoal | null; currentPlan: any
  reload: () => Promise<void>; loadRange: (fromKey: string, toKeyExclusive: string) => Promise<void>
  addMeal: (m: NewMeal, day?: string) => Promise<Meal | null>
  setMealShared: (id: string, day: string, shared: boolean) => Promise<void>
  removeMeal: (id: string, day: string) => Promise<void>
  addSport: (s: { name: string; emoji?: string; kcal: number; duration: number; intensity?: string }, day?: string) => Promise<Sport | null>
  removeSport: (id: string, day: string) => Promise<void>
  setWater: (ml: number, day?: string, goal?: number) => Promise<void>
  addWater: (ml: number, day?: string) => Promise<number>
  setWaterGoal: (g: number) => Promise<void>
  saveProfile: (p: Profile) => Promise<boolean>
  saveWeightGoal: (g: WeightGoal | null) => Promise<void>
  addWeight: (w: number, day?: string) => Promise<void>
  removeWeight: (day: string) => Promise<void>
  savePlan: (plan: unknown) => Promise<void>
  clear: () => void
}
const DataContext = createContext<Ctx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const toast = useToast()
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [dailyMeals, setDailyMeals] = useState<Record<string, Meal[]>>({})
  const [dailySport, setDailySport] = useState<Record<string, Sport[]>>({})
  const [dailyWater, setDailyWater] = useState<Record<string, { total: number }>>({})
  const [waterGoal, setWaterGoalState] = useState(2000)
  const [weightEntries, setWeightEntriesState] = useState<WeightEntry[]>([])
  const [weightGoal, setWeightGoalState] = useState<WeightGoal | null>(null)
  const [currentPlan, setCurrentPlan] = useState<any>(null)
  const waterRef = useRef(dailyWater)
  useEffect(() => { waterRef.current = dailyWater }, [dailyWater])

  const clear = useCallback(() => {
    setReady(false); setProfile(null); setDailyMeals({}); setDailySport({}); setDailyWater({})
    setWeightEntriesState([]); setWeightGoalState(null); setCurrentPlan(null)
  }, [])

  const load = useCallback(async (uid: string) => {
    const since = addDays(todayKey(), -HISTORY_DAYS)
    const [p, meals, sport, water] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('consumed_meals').select('*').eq('user_id', uid).gte('consumed_at', `${since}T00:00:00`).order('consumed_at'),
      supabase.from('sport_activities').select('*').eq('user_id', uid).gte('activity_date', since),
      supabase.from('hydration').select('*').eq('user_id', uid).gte('date', since),
    ])
    const row = p.data
    if (row) {
      setProfile(row.kcal ? {
        weight: row.weight, height: row.height, age: row.age, gender: row.gender, activity: row.activity,
        goal: row.goal, kcal: row.kcal, prot: row.prot, lip: row.lip, gluc: row.gluc,
      } : null)
      setWeightGoalState(parseJsonField<WeightGoal>(row.weight_goal))
      setWeightEntriesState(parseJsonField<WeightEntry[]>(row.weight_entries) || [])
      const saved = parseJsonField<{ plan: unknown; week: string }>(row.current_plan)
      setCurrentPlan(saved && saved.week === weekKey() ? saved.plan : null)
      // Le fuseau sert à la remise à zéro du quota (lundi 00:00) : on garde celui de l'appareil.
      const tz = getCalendars()[0]?.timeZone
      if (tz && tz !== row.timezone) supabase.from('profiles').update({ timezone: tz }).eq('id', uid).then(() => {})
    }
    const byDay: Record<string, Meal[]> = {}
    ;(meals.data || []).forEach(m => { (byDay[m.consumed_at.slice(0, 10)] ||= []).push(toMeal(m)) })
    setDailyMeals(byDay)
    const bySport: Record<string, Sport[]> = {}
    ;(sport.data || []).forEach(s => { (bySport[s.activity_date] ||= []).push(toSport(s)) })
    setDailySport(bySport)
    const w: Record<string, { total: number }> = {}
    let latestGoal: number | null = null
    ;(water.data || []).sort((a, b) => a.date.localeCompare(b.date)).forEach(h => { w[h.date] = { total: h.ml || 0 }; if (h.goal) latestGoal = h.goal })
    setDailyWater(w)
    if (latestGoal) setWaterGoalState(latestGoal)
    else if (row?.weight) setWaterGoalState(suggestWaterGoal(row.weight))
    setReady(true)
  }, [])

  const uid = user?.id
  // Le fournisseur est recréé à chaque changement de compte (voir _layout) : pas de remise à zéro à gérer ici.
  useEffect(() => {
    if (!uid) return
    let alive = true
    Promise.resolve().then(() => { if (alive) load(uid) })
    return () => { alive = false }
  }, [uid, load])

  // Charge un intervalle plus ancien (navigation par mois dans le Journal).
  const loadRange = useCallback(async (fromKey: string, toKeyExclusive: string) => {
    if (!uid) return
    const { data } = await supabase.from('consumed_meals').select('*').eq('user_id', uid)
      .gte('consumed_at', `${fromKey}T00:00:00`).lt('consumed_at', `${toKeyExclusive}T00:00:00`).order('consumed_at')
    const byDay: Record<string, Meal[]> = {}
    ;(data || []).forEach(m => { (byDay[m.consumed_at.slice(0, 10)] ||= []).push(toMeal(m)) })
    setDailyMeals(prev => ({ ...prev, ...byDay }))
  }, [uid])

  // ------------------------------------------------------------------ repas
  const addMeal = useCallback<Ctx['addMeal']>(async (entry, day = todayKey()) => {
    if (!uid) return null
    let paths: { photoPath: string; thumbPath: string } | null = null
    try {
      if (entry.photo) paths = await uploadMealPhotos(uid, entry.photo.full, entry.photo.thumb)
      const stars = profile ? mealStars({ macros: entry.macros, mealType: entry.mealType, dailyKcal: profile.kcal }) : null
      const { data, error } = await supabase.from('consumed_meals').insert({
        user_id: uid, name: entry.name.slice(0, 120), emoji: entry.emoji || '🍽️', main_ingredients: entry.ingredients || [],
        macros: entry.macros, meal_type: entry.mealType, source: entry.source,
        consumed_at: day === todayKey() ? localTimestamp() : `${day}T12:00:00`,
        stars, shared: !!entry.shared, photo_path: paths?.photoPath ?? null, thumb_path: paths?.thumbPath ?? null,
      }).select().single()
      if (error) throw error
      const meal = toMeal(data)
      setDailyMeals(prev => ({ ...prev, [day]: [...(prev[day] || []), meal] }))
      return meal
    } catch {
      if (paths) removePhotos([paths.photoPath, paths.thumbPath]).catch(() => {})
      toast.show("Impossible d'enregistrer le repas", 'error')
      return null
    }
  }, [uid, profile, toast])

  const setMealShared = useCallback<Ctx['setMealShared']>(async (id, day, shared) => {
    const { error } = await supabase.from('consumed_meals').update({ shared }).eq('id', id)
    if (error) return toast.show('Modification impossible', 'error')
    setDailyMeals(prev => ({ ...prev, [day]: (prev[day] || []).map(m => (m.id === id ? { ...m, shared } : m)) }))
  }, [toast])

  const removeMeal = useCallback<Ctx['removeMeal']>(async (id, day) => {
    const meal = (dailyMeals[day] || []).find(m => m.id === id)
    // Les photos partent avec le repas (promesse faite à l'utilisateur).
    if (meal) await removePhotos([meal.photoPath, meal.thumbPath]).catch(() => {})
    const { error } = await supabase.from('consumed_meals').delete().eq('id', id)
    if (error) return toast.show('Suppression impossible', 'error')
    setDailyMeals(prev => ({ ...prev, [day]: (prev[day] || []).filter(m => m.id !== id) }))
  }, [dailyMeals, toast])

  // ------------------------------------------------------------------ sport
  const addSport = useCallback<Ctx['addSport']>(async (entry, day = todayKey()) => {
    if (!uid) return null
    const { data, error } = await supabase.from('sport_activities').insert({
      user_id: uid, name: entry.name.slice(0, 120), emoji: entry.emoji || '🏃',
      kcal_burned: Math.min(10000, Math.max(0, Math.round(entry.kcal || 0))),
      duration: Math.min(1440, Math.max(0, Math.round(entry.duration || 0))),
      intensity: entry.intensity || 'modérée', activity_date: day,
    }).select().single()
    if (error) { toast.show("Impossible d'enregistrer l'activité", 'error'); return null }
    const s = toSport(data)
    setDailySport(prev => ({ ...prev, [day]: [...(prev[day] || []), s] }))
    return s
  }, [uid, toast])

  const removeSport = useCallback<Ctx['removeSport']>(async (id, day) => {
    const { error } = await supabase.from('sport_activities').delete().eq('id', id)
    if (error) return toast.show('Suppression impossible', 'error')
    setDailySport(prev => ({ ...prev, [day]: (prev[day] || []).filter(s => s.id !== id) }))
  }, [toast])

  // -------------------------------------------------------------------- eau
  const setWater = useCallback<Ctx['setWater']>(async (ml, day = todayKey(), goal = waterGoal) => {
    if (!uid) return
    const total = Math.min(20000, Math.max(0, Math.round(ml)))
    setDailyWater(prev => ({ ...prev, [day]: { total } }))
    const { error } = await supabase.from('hydration').upsert(
      { user_id: uid, date: day, ml: total, goal, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' })
    if (error) toast.show("L'hydratation n'a pas pu être enregistrée", 'error')
  }, [uid, waterGoal, toast])

  // Renvoie le nouveau total (le total précédent permet d'annuler).
  const addWater = useCallback<Ctx['addWater']>(async (ml, day = todayKey()) => {
    const next = (waterRef.current[day]?.total || 0) + ml
    await setWater(next, day)
    return next
  }, [setWater])

  const setWaterGoal = useCallback<Ctx['setWaterGoal']>(async (goal) => {
    const g = Math.min(10000, Math.max(500, Math.round(goal)))
    setWaterGoalState(g)
    await setWater(waterRef.current[todayKey()]?.total || 0, todayKey(), g)
  }, [setWater])

  // ----------------------------------------------------------------- profil
  const saveProfile = useCallback<Ctx['saveProfile']>(async (p) => {
    if (!uid) return false
    const { error } = await supabase.from('profiles').upsert({
      id: uid, email: user?.email, weight: p.weight, height: p.height, age: p.age, gender: p.gender,
      activity: p.activity, goal: p.goal, kcal: p.kcal, prot: p.prot, lip: p.lip, gluc: p.gluc,
    })
    if (error) { toast.show('Profil non enregistré, réessaie', 'error'); return false }
    setProfile({ weight: p.weight, height: p.height, age: p.age, gender: p.gender, activity: p.activity, goal: p.goal, kcal: p.kcal, prot: p.prot, lip: p.lip, gluc: p.gluc })
    return true
  }, [uid, user?.email, toast])

  const saveWeightGoal = useCallback<Ctx['saveWeightGoal']>(async (goal) => {
    if (!uid) return
    setWeightGoalState(goal)
    await supabase.from('profiles').update({ weight_goal: goal ? JSON.stringify(goal) : null }).eq('id', uid)
  }, [uid])

  const saveEntries = useCallback(async (entries: WeightEntry[]) => {
    if (!uid) return
    setWeightEntriesState(entries)
    await supabase.from('profiles').update({ weight_entries: JSON.stringify(entries) }).eq('id', uid)
  }, [uid])
  const addWeight = useCallback<Ctx['addWeight']>(async (weight, day = todayKey()) => {
    const rest = weightEntries.filter(e => e.date !== day)
    await saveEntries([...rest, { date: day, weight }].sort((a, b) => a.date.localeCompare(b.date)))
  }, [weightEntries, saveEntries])
  const removeWeight = useCallback<Ctx['removeWeight']>(async (day) => { await saveEntries(weightEntries.filter(e => e.date !== day)) }, [weightEntries, saveEntries])

  const savePlan = useCallback<Ctx['savePlan']>(async (plan) => {
    if (!uid) return
    setCurrentPlan(plan)
    await supabase.from('profiles').update({ current_plan: JSON.stringify({ plan, week: weekKey() }) }).eq('id', uid)
  }, [uid])

  const value = useMemo<Ctx>(() => ({
    ready, profile, dailyMeals, dailySport, dailyWater, waterGoal, weightEntries, weightGoal, currentPlan,
    reload: async () => { if (uid) await load(uid) }, loadRange, addMeal, setMealShared, removeMeal, addSport, removeSport,
    setWater, addWater, setWaterGoal, saveProfile, saveWeightGoal, addWeight, removeWeight, savePlan, clear,
  }), [ready, profile, dailyMeals, dailySport, dailyWater, waterGoal, weightEntries, weightGoal, currentPlan, uid, load, loadRange,
    addMeal, setMealShared, removeMeal, addSport, removeSport, setWater, addWater, setWaterGoal, saveProfile, saveWeightGoal, addWeight, removeWeight, savePlan, clear])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const c = useContext(DataContext)
  if (!c) throw new Error('useData doit être utilisé dans DataProvider')
  return c
}
export { prepareMealPhoto, prepareThumb }
