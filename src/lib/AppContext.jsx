'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from './supabase'
import { authHeaders } from './ai'
import { todayKey, weekKey, addDays, localTimestamp, suggestWaterGoal } from './nutrition'
import { demoData } from './demo'

const AppContext = createContext(null)

// weight_goal / weight_entries / current_plan sont stockés sous forme de texte
// JSON (héritage de la première version de l'app).
function parseJsonField(value) {
  if (value == null) return null
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return null }
}

const HISTORY_DAYS = 60

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [profile, setProfile] = useState(null)
  const [userPlan, setUserPlan] = useState('free')
  const [subStatus, setSubStatus] = useState('inactive')
  const [credits, setCredits] = useState(0)
  const [trialEndsAt, setTrialEndsAt] = useState(null)
  const [periodEnd, setPeriodEnd] = useState(null)
  const [dailyMeals, setDailyMeals] = useState({})
  const [dailySport, setDailySport] = useState({})
  const [dailyWater, setDailyWater] = useState({})
  const [waterGoal, setWaterGoalState] = useState(2000)
  const [weightEntries, setWeightEntriesState] = useState([])
  const [weightGoal, setWeightGoalState] = useState(null)
  const [currentPlan, setCurrentPlan] = useState(null)
  const [toasts, setToasts] = useState([])
  const toastId = useRef(0)

  // ---------------------------------------------------------------- toasts
  const showToast = useCallback((message, type = 'info', duration = 3200) => {
    const id = ++toastId.current
    setToasts(t => [...t.slice(-2), { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }, [])
  const dismissToast = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), [])

  // ------------------------------------------------------------- chargement
  const loadUserData = useCallback(async (u) => {
    if (!u) return
    setDataLoading(true)
    const since = addDays(todayKey(), -HISTORY_DAYS)
    const sevenDaysAgo = addDays(todayKey(), -7)

    const [profileRes, creditsRes, mealsRes, sportRes, hydrationRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', u.id).maybeSingle(),
      supabase.from('credits').select('balance').eq('user_id', u.id).maybeSingle(),
      supabase.from('consumed_meals').select('*').eq('user_id', u.id)
        .gte('consumed_at', `${since}T00:00:00`).order('consumed_at', { ascending: true }),
      supabase.from('sport_activities').select('*').eq('user_id', u.id).gte('activity_date', since),
      supabase.from('hydration').select('*').eq('user_id', u.id).gte('date', since),
    ])

    const p = profileRes.data
    if (p) {
      setProfile(p.kcal ? {
        weight: p.weight, height: p.height, age: p.age, gender: p.gender,
        activity: p.activity, goal: p.goal, kcal: p.kcal, prot: p.prot, lip: p.lip, gluc: p.gluc,
      } : null)
      setUserPlan(p.plan || 'free')
      setSubStatus(p.subscription_status || 'inactive')
      setTrialEndsAt(p.trial_ends_at || null)
      setPeriodEnd(p.current_period_end || null)
      setWeightGoalState(parseJsonField(p.weight_goal))
      setWeightEntriesState(parseJsonField(p.weight_entries) || [])
      const saved = parseJsonField(p.current_plan)
      if (saved && saved.week === weekKey()) setCurrentPlan(saved.plan)
    } else {
      setProfile(null)
    }

    // La ligne de crédits est créée côté base à l'inscription ; seul le serveur la modifie.
    setCredits(creditsRes.data?.balance ?? 0)

    const byDay = {}
    ;(mealsRes.data || []).forEach(m => {
      const day = m.consumed_at.slice(0, 10)
      ;(byDay[day] ||= []).push({
        id: m.id, name: m.name, emoji: m.emoji || '🍽️',
        macros: m.macros || { kcal: 0, prot: 0, gluc: 0, lip: 0 },
        mealType: m.meal_type, mainIngredients: m.main_ingredients || [],
        source: m.source, time: m.consumed_at,
      })
    })
    setDailyMeals(byDay)

    const bySport = {}
    ;(sportRes.data || []).forEach(s => {
      ;(bySport[s.activity_date] ||= []).push({
        id: s.id, name: s.name, kcal: s.kcal_burned || 0,
        duration: s.duration || 0, emoji: s.emoji || '🏃', intensity: s.intensity,
      })
    })
    setDailySport(bySport)

    const water = {}
    let latestGoal = null
    ;(hydrationRes.data || [])
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(h => {
        water[h.date] = { total: h.ml || 0 }
        if (h.goal) latestGoal = h.goal
      })
    setDailyWater(water)
    if (latestGoal) setWaterGoalState(latestGoal)
    else if (p?.weight) setWaterGoalState(suggestWaterGoal(p.weight))

    setDataLoading(false)
    setDataReady(true)
  }, [])

  // ------------------------------------------------------------------- auth
  useEffect(() => {
    // Mode démo (développement uniquement) : données d'exemple, sans connexion.
    if (process.env.NEXT_PUBLIC_DEMO === '1') {
      const d = demoData()
      setUser({ id: 'demo', email: 'camille@exemple.fr', user_metadata: { first_name: 'Camille' }, app_metadata: {} })
      setProfile(process.env.NEXT_PUBLIC_DEMO_ONBOARDING === '1' ? null : d.profile); setDailyMeals(d.dailyMeals); setDailySport(d.dailySport); setDailyWater(d.dailyWater)
      setWeightEntriesState(d.weightEntries); setWeightGoalState(d.weightGoal)
      setUserPlan('free'); setCredits(7); setWaterGoalState(2200)
      setLoading(false); setDataReady(true)
      return
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') return
      if (u && ['INITIAL_SESSION', 'SIGNED_IN'].includes(event)) loadUserData(u)
    })
    return () => subscription.unsubscribe()
  }, [loadUserData])

  // ------------------------------------------------------------------ crédits
  const isVip = userPlan === 'vip' && ['active', 'trialing', 'cancelling'].includes(subStatus)
  const hasSubscription = userPlan !== 'free' && ['active', 'trialing', 'cancelling', 'past_due'].includes(subStatus)

  // Pré-vérification d'UX uniquement : le vrai débit est fait par le serveur
  // (/api/claude), impossible à contourner depuis le navigateur.
  const checkCredits = useCallback(() => {
    if (!user) return false
    if (!isVip && credits <= 0) {
      showToast('Plus de crédits IA. Passez à un abonnement pour continuer.', 'error')
      return false
    }
    return true
  }, [user, isVip, credits, showToast])

  useEffect(() => {
    const onAi = (e) => {
      const { balance, error } = e.detail || {}
      if (typeof balance === 'number') setCredits(balance)
      if (error) showToast(error, 'error')
    }
    window.addEventListener('kalzo:ai', onAi)
    return () => window.removeEventListener('kalzo:ai', onAi)
  }, [showToast])

  // ------------------------------------------------------------------- repas
  const addMeal = useCallback(async (entry, day = todayKey()) => {
    if (!user) return null
    const isToday = day === todayKey()
    const { data, error } = await supabase.from('consumed_meals').insert({
      user_id: user.id,
      name: String(entry.name || 'Repas').slice(0, 120),
      emoji: entry.emoji || '🍽️',
      main_ingredients: entry.mainIngredients || entry.ingredients || [],
      macros: entry.macros || { kcal: 0, prot: 0, gluc: 0, lip: 0 },
      meal_type: entry.mealType || 'dejeuner',
      source: entry.source || 'manual',
      consumed_at: isToday ? localTimestamp() : `${day}T12:00:00`,
    }).select().single()

    if (error) {
      showToast("Impossible d'enregistrer le repas", 'error')
      return null
    }
    const meal = {
      id: data.id, name: data.name, emoji: data.emoji || '🍽️', macros: data.macros,
      mealType: data.meal_type, mainIngredients: data.main_ingredients || [],
      source: data.source, time: data.consumed_at,
    }
    setDailyMeals(prev => ({ ...prev, [day]: [...(prev[day] || []), meal] }))
    return meal
  }, [user, showToast])

  const removeMeal = useCallback(async (id, day) => {
    const { error } = await supabase.from('consumed_meals').delete().eq('id', id)
    if (error) return showToast('Suppression impossible', 'error')
    setDailyMeals(prev => ({ ...prev, [day]: (prev[day] || []).filter(m => m.id !== id) }))
  }, [showToast])

  // ------------------------------------------------------------------- sport
  const addSport = useCallback(async (entry, day = todayKey()) => {
    if (!user) return null
    const { data, error } = await supabase.from('sport_activities').insert({
      user_id: user.id,
      name: String(entry.name || 'Activité').slice(0, 120),
      emoji: entry.emoji || '🏃',
      kcal_burned: Math.min(10000, Math.max(0, Math.round(entry.kcal || 0))),
      duration: Math.min(1440, Math.max(0, Math.round(entry.duration || 0))),
      intensity: entry.intensity || 'modérée',
      activity_date: day,
    }).select().single()

    if (error) {
      showToast("Impossible d'enregistrer l'activité", 'error')
      return null
    }
    const sport = {
      id: data.id, name: data.name, kcal: data.kcal_burned || 0,
      duration: data.duration || 0, emoji: data.emoji || '🏃', intensity: data.intensity,
    }
    setDailySport(prev => ({ ...prev, [day]: [...(prev[day] || []), sport] }))
    return sport
  }, [user, showToast])

  const removeSport = useCallback(async (id, day) => {
    const { error } = await supabase.from('sport_activities').delete().eq('id', id)
    if (error) return showToast('Suppression impossible', 'error')
    setDailySport(prev => ({ ...prev, [day]: (prev[day] || []).filter(s => s.id !== id) }))
  }, [showToast])

  // --------------------------------------------------------------------- eau
  const setWater = useCallback(async (ml, day = todayKey(), goal = waterGoal) => {
    if (!user) return
    const total = Math.min(20000, Math.max(0, Math.round(ml)))
    setDailyWater(prev => ({ ...prev, [day]: { total } }))
    const { error } = await supabase.from('hydration').upsert({
      user_id: user.id, date: day, ml: total, goal,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
    if (error) showToast("L'hydratation n'a pas pu être enregistrée", 'error')
  }, [user, waterGoal, showToast])

  const addWater = useCallback((ml, day = todayKey()) => {
    const current = dailyWater[day]?.total || 0
    return setWater(current + ml, day)
  }, [dailyWater, setWater])

  const setWaterGoal = useCallback(async (goal) => {
    const g = Math.min(10000, Math.max(500, Math.round(goal)))
    setWaterGoalState(g)
    await setWater(dailyWater[todayKey()]?.total || 0, todayKey(), g)
  }, [dailyWater, setWater])

  // ------------------------------------------------------------------ profil
  const saveProfile = useCallback(async (p) => {
    if (!user) return false
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, email: user.email,
      weight: p.weight, height: p.height, age: p.age, gender: p.gender,
      activity: p.activity, goal: p.goal,
      kcal: p.kcal, prot: p.prot, lip: p.lip, gluc: p.gluc,
    })
    if (error) {
      showToast('Profil non enregistré, réessayez', 'error')
      return false
    }
    setProfile({
      weight: p.weight, height: p.height, age: p.age, gender: p.gender,
      activity: p.activity, goal: p.goal, kcal: p.kcal, prot: p.prot, lip: p.lip, gluc: p.gluc,
    })
    return true
  }, [user, showToast])

  const saveWeightGoal = useCallback(async (goal) => {
    if (!user) return
    setWeightGoalState(goal)
    await supabase.from('profiles').update({ weight_goal: JSON.stringify(goal) }).eq('id', user.id)
  }, [user])

  const saveWeightEntries = useCallback(async (entries) => {
    if (!user) return
    setWeightEntriesState(entries)
    await supabase.from('profiles').update({ weight_entries: JSON.stringify(entries) }).eq('id', user.id)
  }, [user])

  const addWeight = useCallback(async (weight, day = todayKey()) => {
    const rest = (weightEntries || []).filter(e => e.date !== day)
    const entries = [...rest, { date: day, weight }].sort((a, b) => a.date.localeCompare(b.date))
    await saveWeightEntries(entries)
  }, [weightEntries, saveWeightEntries])

  const removeWeight = useCallback(async (day) => {
    await saveWeightEntries((weightEntries || []).filter(e => e.date !== day))
  }, [weightEntries, saveWeightEntries])

  const savePlan = useCallback(async (plan) => {
    if (!user) return
    setCurrentPlan(plan)
    await supabase.from('profiles').update({
      current_plan: JSON.stringify({ plan, week: weekKey() }),
    }).eq('id', user.id)
  }, [user])

  // --------------------------------------------------------------- compte
  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setUserPlan('free'); setSubStatus('inactive'); setCredits(0)
    setDailyMeals({}); setDailySport({}); setDailyWater({}); setCurrentPlan(null)
    setWeightEntriesState([]); setWeightGoalState(null); setDataReady(false); setRecovery(false)
  }, [])

  const subscribe = useCallback(async (plan) => {
    if (!user) return
    showToast('Redirection vers le paiement…')
    const res = await fetch('/api/create-checkout', {
      method: 'POST', headers: await authHeaders(), body: JSON.stringify({ plan }),
    })
    const data = await res.json().catch(() => ({}))
    if (data.url) window.location.href = data.url
    else showToast(data?.error?.message || 'Erreur lors de la redirection', 'error')
  }, [user, showToast])

  const cancelSubscription = useCallback(async () => {
    if (!user) return
    const res = await fetch('/api/cancel-subscription', { method: 'POST', headers: await authHeaders() })
    const data = await res.json().catch(() => ({}))
    if (data.success) {
      setSubStatus('cancelling')
      showToast("Abonnement résilié. Accès maintenu jusqu'à la fin de la période.", 'success')
    } else {
      showToast(data?.error?.message || 'Erreur lors de la résiliation', 'error')
    }
  }, [user, showToast])

  const firstName = useMemo(() => {
    const meta = user?.user_metadata?.first_name
    if (meta) return meta
    const local = user?.email?.split('@')[0] || ''
    const word = local.split(/[._-]/)[0] || ''
    return word ? word.charAt(0).toUpperCase() + word.slice(1) : ''
  }, [user])

  const value = {
    user, loading, dataLoading, dataReady, recovery, setRecovery, firstName, profile,
    userPlan, subStatus, credits, trialEndsAt, periodEnd, isVip, hasSubscription,
    dailyMeals, dailySport, dailyWater, waterGoal, weightEntries, weightGoal, currentPlan,
    toasts, showToast, dismissToast, checkCredits,
    addMeal, removeMeal, addSport, removeSport,
    addWater, setWater, setWaterGoal,
    saveProfile, saveWeightGoal, addWeight, removeWeight, savePlan,
    logout, subscribe, cancelSubscription,
    reload: () => user && loadUserData(user),
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
