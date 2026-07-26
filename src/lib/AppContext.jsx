'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { todayKey, weekKey } from './nutrition'

const AppContext = createContext(null)

// weight_goal / weight_entries sont stockés en base sous forme de texte JSON
// (hérité de l'ancienne version de l'app) plutôt que jsonb.
function parseJsonField(value) {
  if (value == null) return null
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [userPlan, setUserPlan] = useState('free')
  const [subStatus, setSubStatus] = useState('inactive')
  const [credits, setCredits] = useState(0)
  const [trialEndsAt, setTrialEndsAt] = useState(null)
  const [periodEnd, setPeriodEnd] = useState(null)
  const [dailyMeals, setDailyMeals] = useState({})
  const [dailySport, setDailySport] = useState({})
  const [dailyWater, setDailyWater] = useState({})
  const [waterGoal, setWaterGoal] = useState(2000)
  const [weightEntries, setWeightEntries] = useState([])
  const [weightGoal, setWeightGoal] = useState(null)
  const [currentPlan, setCurrentPlan] = useState(null)
  const [consumedMeals, setConsumedMeals] = useState([])
  const [toast, setToastMsg] = useState(null)

  const showToast = useCallback((msg, duration = 3000) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), duration)
  }, [])

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) loadUserData(session.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadUserData(session.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = async (u) => {
    if (!u) return

    // Profil
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .single()

    if (profileData) {
      setProfile({
        weight: profileData.weight,
        height: profileData.height,
        age: profileData.age,
        gender: profileData.gender,
        activity: profileData.activity,
        goal: profileData.goal,
        kcal: profileData.kcal,
        prot: profileData.prot,
        lip: profileData.lip,
        gluc: profileData.gluc,
      })
      setUserPlan(profileData.plan || 'free')
      setSubStatus(profileData.subscription_status || 'inactive')
      setTrialEndsAt(profileData.trial_ends_at || null)
      setPeriodEnd(profileData.current_period_end || null)
      setWeightGoal(parseJsonField(profileData.weight_goal))
      setWeightEntries(parseJsonField(profileData.weight_entries) || [])
      const savedPlan = parseJsonField(profileData.current_plan)
      if (savedPlan && savedPlan.week === weekKey()) setCurrentPlan(savedPlan.plan)
    }

    // Crédits
    const { data: creditsData } = await supabase
      .from('credits')
      .select('balance')
      .eq('user_id', u.id)
      .single()
    if (creditsData) {
      setCredits(creditsData.balance)
    } else {
      // Pas encore de ligne credits (nouveau compte) — la créer.
      const { data: newCredits } = await supabase
        .from('credits')
        .upsert({ user_id: u.id, balance: 10 }, { onConflict: 'user_id' })
        .select('balance')
        .single()
      setCredits(newCredits?.balance ?? 0)
    }

    // Repas du mois
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: mealsData } = await supabase
      .from('consumed_meals')
      .select('*')
      .eq('user_id', u.id)
      .gte('consumed_at', thirtyDaysAgo.toISOString())
      .order('consumed_at', { ascending: false })

    if (mealsData) {
      setConsumedMeals(mealsData)
      const byDay = {}
      mealsData.forEach(m => {
        const day = m.consumed_at.slice(0, 10)
        if (!byDay[day]) byDay[day] = []
        byDay[day].push({
          id: m.id,
          supabaseId: m.id,
          name: m.name,
          emoji: m.emoji || '🍽️',
          macros: m.macros || { kcal: 0, prot: 0, gluc: 0, lip: 0 },
          mealType: m.meal_type,
          mainIngredients: m.main_ingredients || [],
          time: m.consumed_at,
        })
      })
      setDailyMeals(byDay)
    }

    // Sport (30 jours)
    const { data: sportData } = await supabase
      .from('sport_activities')
      .select('*')
      .eq('user_id', u.id)
      .gte('activity_date', thirtyDaysAgo.toISOString().slice(0, 10))

    if (sportData) {
      const bySportDay = {}
      sportData.forEach(s => {
        const day = s.activity_date
        if (!bySportDay[day]) bySportDay[day] = []
        bySportDay[day].push({
          id: s.id,
          supabaseId: s.id,
          name: s.name,
          kcal: s.kcal_burned || 0,
          duration: s.duration || 0,
          emoji: s.emoji || '🏃',
        })
      })
      setDailySport(bySportDay)
    }

    // Hydratation (7 jours)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const { data: hydrationData } = await supabase
      .from('hydration')
      .select('*')
      .eq('user_id', u.id)
      .gte('date', sevenDaysAgo.toISOString().slice(0, 10))

    if (hydrationData) {
      const waterByDay = {}
      hydrationData.forEach(h => {
        waterByDay[h.date] = { total: h.ml || 0 }
      })
      setDailyWater(waterByDay)
      if (hydrationData[0]?.goal) setWaterGoal(hydrationData[0].goal)
    }
  }

  // Debiter un crédit
  const debitCredit = useCallback(async () => {
    if (!user) return true
    const hasActiveSub = userPlan !== 'free' && ['active', 'trialing', 'cancelling'].includes(subStatus)
    if (!hasActiveSub) {
      showToast('❌ Abonnement requis. Essayez gratuitement 7 jours !')
      return false
    }
    if (userPlan === 'vip') return true

    const { data } = await supabase.from('credits').select('balance').eq('user_id', user.id).single()
    const balance = data?.balance ?? 0
    if (balance <= 0) {
      showToast('❌ Plus de crédits ! Renouvelez votre abonnement.')
      return false
    }
    const newBalance = balance - 1
    await supabase.from('credits').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    setCredits(newBalance)
    return true
  }, [user, userPlan, subStatus, showToast])

  // Ajouter un repas
  const addMeal = useCallback(async (entry) => {
    if (!user) return
    const today = todayKey()
    const { data, error } = await supabase.from('consumed_meals').insert({
      user_id: user.id,
      name: entry.name,
      emoji: entry.emoji || '🍽️',
      main_ingredients: entry.mainIngredients || entry.ingredients || [],
      macros: entry.macros || { kcal: 0, prot: 0, gluc: 0, lip: 0 },
      meal_type: entry.mealType || 'repas',
      source: entry.source || 'manual',
      consumed_at: new Date().toISOString(),
    }).select().single()

    if (error) {
      showToast('❌ Erreur lors de l\'enregistrement du repas')
      return
    }

    if (data) {
      const meal = { ...entry, id: data.id, supabaseId: data.id }
      setDailyMeals(prev => ({
        ...prev,
        [today]: [...(prev[today] || []), meal]
      }))
    }
  }, [user, showToast])

  // Supprimer un repas
  const removeMeal = useCallback(async (mealId, day) => {
    const mealDay = day || todayKey()
    await supabase.from('consumed_meals').delete().eq('id', mealId)
    setDailyMeals(prev => ({
      ...prev,
      [mealDay]: (prev[mealDay] || []).filter(m => m.id !== mealId)
    }))
  }, [])

  // Ajouter sport
  const addSport = useCallback(async (entry) => {
    if (!user) return
    const today = todayKey()
    const { data, error } = await supabase.from('sport_activities').insert({
      user_id: user.id,
      name: entry.name,
      emoji: entry.emoji || '🏃',
      kcal_burned: entry.kcal || 0,
      duration: entry.duration || 0,
      intensity: entry.intensity || 'moderate',
      activity_date: today,
    }).select().single()

    if (error) {
      showToast('❌ Erreur lors de l\'enregistrement de l\'activité')
      return
    }

    if (data) {
      const sport = { ...entry, id: data.id, supabaseId: data.id }
      setDailySport(prev => ({
        ...prev,
        [today]: [...(prev[today] || []), sport]
      }))
    }
  }, [user, showToast])

  // Supprimer sport
  const removeSport = useCallback(async (sportId, day) => {
    const sportDay = day || todayKey()
    await supabase.from('sport_activities').delete().eq('id', sportId)
    setDailySport(prev => ({
      ...prev,
      [sportDay]: (prev[sportDay] || []).filter(s => s.id !== sportId)
    }))
  }, [])

  // Eau
  const addWater = useCallback(async (ml) => {
    if (!user) return
    const today = todayKey()
    const current = dailyWater[today]?.total || 0
    const newTotal = current + ml
    await supabase.from('hydration').upsert({
      user_id: user.id,
      date: today,
      ml: newTotal,
      goal: waterGoal,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
    setDailyWater(prev => ({ ...prev, [today]: { total: newTotal } }))
  }, [user, dailyWater, waterGoal])

  const resetWater = useCallback(async () => {
    if (!user) return
    const today = todayKey()
    await supabase.from('hydration').upsert({
      user_id: user.id,
      date: today,
      ml: 0,
      goal: waterGoal,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
    setDailyWater(prev => ({ ...prev, [today]: { total: 0 } }))
  }, [user, waterGoal])

  // Sauvegarder profil
  const saveProfile = useCallback(async (p) => {
    if (!user) return
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      weight: p.weight,
      height: p.height,
      age: p.age,
      gender: p.gender,
      activity: p.activity,
      goal: p.goal,
      kcal: p.kcal,
      prot: p.prot,
      lip: p.lip,
      gluc: p.gluc,
    })
    setProfile(p)
  }, [user])

  // Sauvegarder plan 7j
  const savePlan = useCallback(async (plan) => {
    if (!user) return
    await supabase.from('profiles').update({
      current_plan: JSON.stringify({ plan, week: weekKey() }),
    }).eq('id', user.id)
    setCurrentPlan(plan)
  }, [user])

  // Logout
  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setUserPlan('free')
    setCredits(0)
    setDailyMeals({})
    setDailySport({})
    setDailyWater({})
    setCurrentPlan(null)
  }, [])

  // Subscribe
  const subscribe = useCallback(async (plan) => {
    if (!user) return
    const priceIds = {
      standard: 'price_1Tc6S51JEMfMTdulDYObGtXg',
      vip: 'price_1Tc6Sf1JEMfMTdulDT6umOCm',
    }
    showToast('⏳ Redirection vers le paiement...')
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: priceIds[plan], userId: user.id, userEmail: user.email }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else showToast('❌ Erreur lors de la redirection')
  }, [user, showToast])

  // Cancel subscription
  const cancelSubscription = useCallback(async () => {
    if (!user) return
    showToast('⏳ Résiliation en cours...')
    const res = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
    const data = await res.json()
    if (data.success) {
      setSubStatus('cancelling')
      showToast('✅ Abonnement résilié. Accès maintenu jusqu\'à la fin de la période.')
    } else {
      showToast('❌ Erreur lors de la résiliation')
    }
  }, [user, showToast])

  const value = {
    user, loading, profile, userPlan, subStatus, credits, trialEndsAt, periodEnd,
    dailyMeals, dailySport, dailyWater, waterGoal, weightEntries, weightGoal,
    currentPlan, consumedMeals, toast,
    setWaterGoal, setWeightGoal, setWeightEntries, setCurrentPlan, setCredits,
    showToast, debitCredit, addMeal, removeMeal, addSport, removeSport,
    addWater, resetWater, saveProfile, savePlan, logout, subscribe, cancelSubscription,
    reloadUser: () => user && loadUserData(user),
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
