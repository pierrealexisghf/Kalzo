import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateProfile, planWeightGoal, computeStreak, defaultMealType, suggestWaterGoal, fmtMl, sumMacros } from '../src/lib/logic/nutrition.ts'
import { kcalForMet } from '../src/lib/logic/sport.ts'
import { mealStars, mealScore, averageStars7d, postStreak } from '../src/lib/logic/score.ts'
import { effectivePlan, nextWeeklyReset, scansLeftLabel } from '../src/lib/logic/quota.ts'
import { weekDatesOf, addDays, cardSlot } from '../src/lib/logic/dates.ts'

test('profil : Mifflin-St Jeor, macros cohérentes, plancher calorique', () => {
  const p = calculateProfile({ weight: 70, height: 175, age: 30, gender: 'male', activity: 1.3, goal: 'maintenance' })
  assert.equal(p.tdee, Math.round((10 * 70 + 6.25 * 175 - 150 + 5) * 1.3))
  assert.equal(p.prot, Math.round(70 * 1.6))
  const sum = p.prot * 4 + p.lip * 9 + p.gluc * 4
  assert.ok(Math.abs(sum - p.kcal) < 15)
  const low = calculateProfile({ weight: 45, height: 155, age: 25, gender: 'female', activity: 1.2, goal: 'seche' })
  assert.equal(low.kcal, 1200)
})

test('profil : jamais de déficit pour un mineur', () => {
  const a = calculateProfile({ weight: 60, height: 170, age: 16, gender: 'female', activity: 1.3, goal: 'seche' })
  const b = calculateProfile({ weight: 60, height: 170, age: 16, gender: 'female', activity: 1.3, goal: 'maintenance' })
  assert.equal(a.kcal, b.kcal)
})

test('objectif de poids : rythme trop rapide, plancher, mineur', () => {
  const base = { gender: 'male' as const, age: 30, activity: 1.3, height: 178, startDate: '2026-01-01' }
  assert.equal(planWeightGoal({ ...base, current: 80, target: 78, weeks: 12 }).status, 'ok')
  assert.equal(planWeightGoal({ ...base, current: 80, target: 70, weeks: 4 }).status, 'too_fast')
  assert.equal(planWeightGoal({ ...base, age: 15, current: 80, target: 70, weeks: 20 }).status, 'minor')
  const m = planWeightGoal({ ...base, current: 80, target: 80, weeks: 8 })
  assert.equal(m.status, 'ok')
})

test('séries de jours avec repas', () => {
  const meals = (n: string[]) => Object.fromEntries(n.map(k => [k, [{}]]))
  assert.equal(computeStreak(meals(['2026-10-10', '2026-10-09', '2026-10-08']), '2026-10-10'), 3)
  assert.equal(computeStreak(meals(['2026-10-09', '2026-10-08']), '2026-10-10'), 2) // hier compte
  assert.equal(computeStreak(meals(['2026-10-07']), '2026-10-10'), 0)
})

test('MET sport, eau, type de repas', () => {
  assert.equal(kcalForMet(9.8, 70, 30), Math.round(9.8 * 70 * 0.5))
  assert.equal(suggestWaterGoal(70), 2500)
  assert.equal(suggestWaterGoal(30), 1500)
  assert.equal(fmtMl(250), '250 ml')
  assert.equal(fmtMl(1250), '1,25 L')
  assert.equal(defaultMealType(new Date(2026, 9, 1, 12, 30)), 'dejeuner')
  assert.equal(defaultMealType(new Date(2026, 9, 1, 20, 0)), 'diner')
  assert.deepEqual(sumMacros([{ macros: { kcal: 10, prot: 1, gluc: 2, lip: 3 } }, { macros: { kcal: 5, prot: 1, gluc: 1, lip: 1 } }]), { kcal: 15, prot: 2, gluc: 3, lip: 4 })
})

// ------------------------------------------------------------------ étoiles
const DAILY = 2200
test('étoiles : repas équilibré = 4-5 étoiles', () => {
  const m = { kcal: 740, prot: 45, gluc: 80, lip: 25, sucres: 8, fibres: 10 }
  assert.ok(mealStars({ macros: m, mealType: 'dejeuner', dailyKcal: DAILY }) >= 4)
})
test('étoiles : fast-food gras et sucré = peu d’étoiles', () => {
  const m = { kcal: 1300, prot: 25, gluc: 120, lip: 80, sucres: 50, fibres: 3 }
  assert.ok(mealStars({ macros: m, mealType: 'dejeuner', dailyKcal: DAILY }) <= 2)
})
test('étoiles : moins de calories n’est PAS mieux (repas trop pauvre pénalisé)', () => {
  const balanced = { kcal: 740, prot: 45, gluc: 80, lip: 25 }
  const tiny = { kcal: 90, prot: 4, gluc: 15, lip: 1 }
  const sb = mealScore({ macros: balanced, mealType: 'dejeuner', dailyKcal: DAILY })
  const st = mealScore({ macros: tiny, mealType: 'dejeuner', dailyKcal: DAILY })
  assert.ok(st < sb)
  assert.ok(mealStars({ macros: tiny, mealType: 'dejeuner', dailyKcal: DAILY }) <= 2)
})
test('étoiles : une collation légère est jugée sur sa part (10 %)', () => {
  const snack = { kcal: 200, prot: 10, gluc: 25, lip: 7, fibres: 4, sucres: 8 }
  assert.ok(mealStars({ macros: snack, mealType: 'collation', dailyKcal: DAILY }) >= 3)
})
test('étoiles : sucres et fibres optionnels, résultat borné 1–5', () => {
  for (const kcal of [0, 50, 500, 3000]) {
    const s = mealStars({ macros: { kcal, prot: 20, gluc: 50, lip: 15 }, mealType: 'diner', dailyKcal: DAILY })
    assert.ok(s >= 1 && s <= 5)
  }
})
test('score de profil : moyenne 7 jours et série ≥ 4 étoiles', () => {
  const d: Record<string, { stars: number }[]> = {
    '2026-10-10': [{ stars: 5 }, { stars: 4 }], '2026-10-09': [{ stars: 4 }], '2026-10-08': [{ stars: 2 }],
    '2026-09-01': [{ stars: 1 }], // hors fenêtre
  }
  assert.equal(averageStars7d(d, '2026-10-10'), 3.8) // (5+4+4+2)/4 = 3,75 → 3,8
  assert.equal(averageStars7d({}, '2026-10-10'), null)
})
test('flammes : un jour posté = une flamme, peu importe la note', () => {
  const m = (shared: boolean) => ({ shared })
  const d = { '2026-10-10': [m(true)], '2026-10-09': [m(true), m(false)], '2026-10-08': [m(false)], '2026-10-07': [m(true)] }
  assert.equal(postStreak(d, '2026-10-10'), 2) // le 08 n'est pas posté : la série s'arrête
  assert.equal(postStreak(d, '2026-10-11'), 2) // aujourd'hui pas encore posté : la veille compte
  assert.equal(postStreak({ '2026-10-08': [m(true)] }, '2026-10-10'), 0) // avant-hier : série perdue
})

// ------------------------------------------------------------------- offres
test('offre effective : essai > abonnement > gratuit', () => {
  const now = new Date('2026-10-30T10:00:00Z')
  assert.equal(effectivePlan({ trialEndsAt: '2026-11-02T00:00:00Z', plan: 'free', now }), 'trial')
  assert.equal(effectivePlan({ trialEndsAt: '2026-10-01T00:00:00Z', plan: 'plus', status: 'active', now }), 'plus')
  assert.equal(effectivePlan({ trialEndsAt: null, plan: 'plus', status: 'expired', now }), 'free')
  assert.equal(effectivePlan({ plan: 'illimite', status: 'cancelling', periodEnd: '2026-10-29T00:00:00Z', now }), 'free')
  assert.equal(effectivePlan({ plan: 'essentiel', status: 'cancelling', periodEnd: '2026-11-29T00:00:00Z', now }), 'essentiel')
})
test('remise à zéro : prochain lundi 00:00 Europe/Paris (heure d’été et d’hiver)', () => {
  // Jeudi 29 oct 2026 : Paris est en UTC+1 (changement d'heure le 25 oct) → lundi 2 nov 00:00 = 2026-11-01T23:00Z
  assert.equal(nextWeeklyReset(new Date('2026-10-29T12:00:00Z'), 'Europe/Paris').toISOString(), '2026-11-01T23:00:00.000Z')
  // Mercredi 14 oct 2026 : Paris en UTC+2 → lundi 19 oct 00:00 = 2026-10-18T22:00Z
  assert.equal(nextWeeklyReset(new Date('2026-10-14T12:00:00Z'), 'Europe/Paris').toISOString(), '2026-10-18T22:00:00.000Z')
  // Dimanche 23h30 Paris → c'est 30 min avant la remise à zéro
  assert.equal(nextWeeklyReset(new Date('2026-11-01T22:30:00Z'), 'Europe/Paris').toISOString(), '2026-11-01T23:00:00.000Z')
  // Lundi 00:00 pile : la semaine suivante commence → le prochain reset est dans 7 jours
  assert.equal(nextWeeklyReset(new Date('2026-11-01T23:00:00Z'), 'Europe/Paris').toISOString(), '2026-11-08T23:00:00.000Z')
})
test('libellé du solde', () => {
  assert.equal(scansLeftLabel(3), '3 scans restants cette semaine · remise à zéro lundi')
  assert.equal(scansLeftLabel(1), '1 scan restant cette semaine · remise à zéro lundi')
  assert.equal(scansLeftLabel(null), 'Scans illimités')
})
test('semaine lundi → dimanche', () => {
  const w = weekDatesOf('2026-10-30')
  assert.equal(w[0], '2026-10-26')
  assert.equal(w[6], '2026-11-01')
  assert.equal(addDays('2026-10-31', 1), '2026-11-01')
})

test('cadre du feed : déjeuner entre les rappels, dîner du soir jusqu’au midi suivant', () => {
  const at = (h: number, m: number) => new Date(2026, 10, 2, h, m)
  assert.deepEqual(cardSlot(at(11, 0), '12:15', '19:30'), { slot: 'diner', yesterday: true })
  assert.deepEqual(cardSlot(at(12, 15), '12:15', '19:30'), { slot: 'dejeuner', yesterday: false })
  assert.deepEqual(cardSlot(at(19, 29), '12:15', '19:30'), { slot: 'dejeuner', yesterday: false })
  assert.deepEqual(cardSlot(at(19, 30), '12:15', '19:30'), { slot: 'diner', yesterday: false })
  assert.deepEqual(cardSlot(at(2, 0), '12:15', '19:30'), { slot: 'diner', yesterday: true })
})
