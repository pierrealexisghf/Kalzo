'use client'

import { useState, useEffect } from 'react'
import { Target, CreditCard, Sun, Moon, SunMoon, Mail, FileText, ShieldCheck, Scale, ScrollText, Download, Trash2, LogOut, ChevronRight, Sparkles } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { authHeaders } from '@/lib/ai'
import { GOALS } from '@/lib/nutrition'
import { Card, Segmented, SectionTitle, ConfirmDialog, Input, Button, cx } from '@/components/ui/primitives'

const CONTACT = 'contactkalzo.fr@gmail.com'

function Row({ icon: Icon, label, hint, onClick, href, danger, right }) {
  const cls = cx('k-press flex w-full items-center gap-3.5 px-4 py-3.5 text-left', danger && 'text-destructive')
  const body = (
    <>
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{label}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
      {right ?? <ChevronRight className="size-5 shrink-0 text-muted-foreground" />}
    </>
  )
  return href ? <a href={href} className={cls}>{body}</a> : <button onClick={onClick} className={cls}>{body}</button>
}

function applyTheme(mode) {
  try { localStorage.setItem('kalzo-theme', mode) } catch {}
  const dark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export default function Me() {
  const { user, firstName, profile, userPlan, credits, isVip, logout, showToast } = useApp()
  const { go } = useNav()
  const [theme, setTheme] = useState('auto')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { try { setTheme(localStorage.getItem('kalzo-theme') || 'auto') } catch {} }, [])
  const changeTheme = m => { setTheme(m); applyTheme(m) }

  const goal = GOALS.find(g => g.id === profile.goal)
  const planLabel = userPlan === 'vip' ? 'VIP' : userPlan === 'standard' ? 'Standard' : 'Gratuit'

  const exportData = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/account/export', { headers: await authHeaders() })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `kalzo-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      showToast('Vos données ont été téléchargées', 'success')
    } catch { showToast("L'export a échoué, réessayez.", 'error') }
    setBusy(false)
  }

  const deleteAccount = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST', headers: await authHeaders() })
      if (!res.ok) throw new Error()
      setConfirmDelete(false)
      await logout()
    } catch { showToast('La suppression a échoué. Contactez-nous si le problème persiste.', 'error') }
    setBusy(false)
  }

  return (
    <div>
      <h1 className="mb-5 text-[28px] font-bold leading-tight tracking-tight">Moi</h1>

      <Card className="tone-nutri flex items-center gap-4 p-5">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-3xl bg-tone text-[28px] font-extrabold text-tone-fg">{(firstName || user.email || '?').charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xl font-bold">{firstName || 'Mon compte'}</div>
          <div className="truncate text-[13px] text-muted-foreground">{user.email}</div>
          <div className="mt-2 flex gap-2">
            <span className="rounded-full bg-tone-soft px-2.5 py-1 text-[11px] font-bold text-tone">{goal?.short}</span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold">{profile.kcal} kcal/j</span>
          </div>
        </div>
      </Card>

      <button onClick={() => go('subscription')} className="tone-coach k-press mt-3 flex w-full items-center gap-4 rounded-3xl bg-tone-soft p-4 text-left">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-tone text-tone-fg"><Sparkles className="size-6" /></span>
        <span className="flex-1"><span className="block text-[15px] font-bold">Offre {planLabel}</span><span className="block text-[13px] text-muted-foreground">{isVip ? 'Crédits IA illimités' : `${credits} crédit${credits > 1 ? 's' : ''} IA restant${credits > 1 ? 's' : ''}`}</span></span>
        <ChevronRight className="size-5 text-muted-foreground" />
      </button>

      <SectionTitle>Mon suivi</SectionTitle>
      <Card className="divide-y divide-border overflow-hidden">
        <Row icon={Target} label="Mes objectifs" hint="Calories, macros, eau, profil" onClick={() => go('goals')} />
        <Row icon={CreditCard} label="Abonnement" hint="Crédits IA, offres, résiliation" onClick={() => go('subscription')} />
      </Card>

      <SectionTitle>Apparence</SectionTitle>
      <Segmented value={theme} onChange={changeTheme} options={[{ id: 'auto', label: 'Auto' }, { id: 'light', label: 'Clair' }, { id: 'dark', label: 'Sombre' }]} />

      <SectionTitle>Aide et informations</SectionTitle>
      <Card className="divide-y divide-border overflow-hidden">
        <Row icon={Mail} label="Nous contacter" hint={CONTACT} href={`mailto:${CONTACT}?subject=Kalzo`} />
        <Row icon={ScrollText} label="Conditions d'utilisation" href="/cgu" />
        <Row icon={Scale} label="Conditions de vente" href="/cgv" />
        <Row icon={ShieldCheck} label="Politique de confidentialité" href="/confidentialite" />
        <Row icon={FileText} label="Mentions légales" href="/mentions-legales" />
      </Card>

      <SectionTitle>Mes données</SectionTitle>
      <Card className="divide-y divide-border overflow-hidden">
        <Row icon={Download} label="Télécharger mes données" hint="Export complet au format JSON" onClick={exportData} />
        <Row icon={Trash2} label="Supprimer mon compte" hint="Définitif : données et abonnement" onClick={() => { setTyped(''); setConfirmDelete(true) }} danger />
      </Card>

      <Button variant="outline" full className="mt-6" onClick={logout}><LogOut className="size-4" />Se déconnecter</Button>
      <p className="mt-6 text-center text-xs text-muted-foreground">Kalzo · version 3.0</p>

      <ConfirmDialog
        open={confirmDelete} danger confirmLabel={busy ? 'Suppression…' : 'Supprimer définitivement'}
        title="Supprimer mon compte ?"
        text={<span>Vos repas, activités, mesures et votre abonnement seront effacés, sans retour possible. Tapez <strong>SUPPRIMER</strong> pour confirmer.</span>}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => typed === 'SUPPRIMER' ? deleteAccount() : showToast('Tapez SUPPRIMER pour confirmer.', 'error')}
        extra={<Input value={typed} onChange={e => setTyped(e.target.value)} placeholder="SUPPRIMER" autoCapitalize="characters" className="mt-4" />}
      />
    </div>
  )
}
