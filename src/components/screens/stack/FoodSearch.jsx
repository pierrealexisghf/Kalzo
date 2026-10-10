'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ScanLine, X, Check, Package } from 'lucide-react'
import { useApp } from '@/lib/AppContext'
import { useNav } from '@/lib/nav'
import { todayKey } from '@/lib/nutrition'
import { Button, Card, Input, Spinner, ScreenHeader, EmptyState, MacroPills } from '@/components/ui/primitives'
import { MealTypeChips, defaultMealType } from './ToolKit'

const FIELDS = 'code,product_name,product_name_fr,brands,nutriments,serving_quantity,serving_size,image_small_url'

// Open Food Facts : base collaborative libre, sans clé. Valeurs pour 100 g.
function toFood(p) {
  const n = p.nutriments || {}
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : null)
  const name = (p.product_name_fr || p.product_name || '').trim()
  if (!name || kcal == null) return null
  return {
    code: p.code, name, brand: (p.brands || '').split(',')[0].trim(), image: p.image_small_url,
    per100: { kcal, prot: n.proteins_100g || 0, gluc: n.carbohydrates_100g || 0, lip: n.fat_100g || 0 },
    serving: Number(p.serving_quantity) > 0 ? Number(p.serving_quantity) : null,
  }
}

async function searchFoods(q) {
  const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&lc=fr&cc=fr&fields=${FIELDS}`)
  if (!res.ok) throw new Error('search')
  const data = await res.json()
  return (data.products || []).map(toFood).filter(Boolean)
}

async function fetchBarcode(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`)
  if (!res.ok) throw new Error('barcode')
  const data = await res.json()
  return data.status === 1 ? toFood({ ...data.product, code }) : null
}

function Scanner({ onCode, onClose }) {
  const video = useRef(null)
  useEffect(() => {
    let stream, raf, stopped = false
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        video.current.srcObject = stream
        await video.current.play()
        const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
        const loop = async () => {
          if (stopped) return
          try {
            const codes = await detector.detect(video.current)
            if (codes[0]?.rawValue) return onCode(codes[0].rawValue)
          } catch {}
          raf = requestAnimationFrame(loop)
        }
        loop()
      } catch { onClose('Caméra inaccessible. Autorisez-la ou saisissez le code à la main.') }
    })()
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()) }
  }, [onCode, onClose])
  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-black">
      <video ref={video} playsInline muted className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-40 w-72 rounded-3xl border-4 border-white/80" />
      </div>
      <p className="absolute inset-x-0 bottom-28 text-center text-sm font-medium text-white">Placez le code-barres dans le cadre</p>
      <button onClick={() => onClose()} aria-label="Fermer" className="k-press absolute right-4 flex size-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur" style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <X className="size-6" />
      </button>
    </div>
  )
}

export default function FoodSearch() {
  const { addMeal, showToast } = useApp()
  const { back, home, day } = useNav()
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState(null)
  const [grams, setGrams] = useState('100')
  const [mealType, setMealType] = useState(day === todayKey() ? defaultMealType() : 'dejeuner')
  const [scanning, setScanning] = useState(false)
  const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia

  const run = async (e) => {
    e?.preventDefault()
    const term = q.trim()
    if (term.length < 2) return
    setLoading(true); setResults(null)
    try {
      if (/^\d{8,14}$/.test(term)) {
        const f = await fetchBarcode(term)
        setResults(f ? [f] : [])
      } else setResults(await searchFoods(term))
    } catch { showToast('Recherche indisponible pour le moment.', 'error'); setResults([]) }
    setLoading(false)
  }

  const onCode = async (code) => {
    setScanning(false); setQ(code); setLoading(true); setResults(null)
    try { const f = await fetchBarcode(code); setResults(f ? [f] : []) }
    catch { showToast('Recherche indisponible pour le moment.', 'error'); setResults([]) }
    setLoading(false)
  }

  const pick = (f) => { setPicked(f); setGrams(String(f.serving || 100)) }
  const g = Math.max(0, parseFloat(grams.replace(',', '.')) || 0)
  const macros = picked ? {
    kcal: (picked.per100.kcal * g) / 100, prot: (picked.per100.prot * g) / 100,
    gluc: (picked.per100.gluc * g) / 100, lip: (picked.per100.lip * g) / 100,
  } : null

  const add = async () => {
    if (!g || g > 3000) return showToast('Indiquez une quantité valide en grammes.', 'error')
    const meal = await addMeal({
      name: `${picked.name}${picked.brand ? ` (${picked.brand})` : ''} · ${Math.round(g)} g`,
      emoji: '🛒',
      macros: { kcal: Math.round(macros.kcal), prot: Math.round(macros.prot), gluc: Math.round(macros.gluc), lip: Math.round(macros.lip) },
      mealType, source: 'openfoodfacts',
    }, day)
    if (meal) { showToast('Aliment ajouté', 'success'); home() }
  }

  if (picked) {
    return (
      <div className="tone-nutri">
        <ScreenHeader title={picked.name} subtitle={picked.brand || 'Produit'} onBack={() => setPicked(null)} />
        <Card className="p-5">
          <div className="k-label">Quantité (grammes)</div>
          <Input type="text" inputMode="decimal" value={grams} onChange={e => setGrams(e.target.value)} />
          <div className="mt-2 flex gap-2">
            {[50, 100, 150, 200].map(v => (
              <button key={v} onClick={() => setGrams(String(v))} className="k-press rounded-full bg-muted px-3.5 py-1.5 text-xs font-semibold">{v} g</button>
            ))}
            {picked.serving && <button onClick={() => setGrams(String(picked.serving))} className="k-press rounded-full bg-tone-soft px-3.5 py-1.5 text-xs font-semibold text-tone">1 portion</button>}
          </div>
          <MacroPills macros={macros} className="mt-5" />
          <p className="mt-3 text-xs text-muted-foreground">Pour 100 g : {Math.round(picked.per100.kcal)} kcal · P {picked.per100.prot.toFixed(1)} · G {picked.per100.gluc.toFixed(1)} · L {picked.per100.lip.toFixed(1)}. Source : Open Food Facts.</p>
        </Card>
        <div className="mt-4"><MealTypeChips value={mealType} onChange={setMealType} /></div>
        <Button size="lg" full className="mt-4" onClick={add}><Check className="size-5" />Ajouter au journal</Button>
      </div>
    )
  }

  return (
    <div className="tone-nutri">
      {scanning && <Scanner onCode={onCode} onClose={(msg) => { setScanning(false); if (msg) showToast(msg, 'error') }} />}
      <ScreenHeader title="Chercher un aliment" subtitle="Produits du commerce, par nom ou code-barres" onBack={back} />
      <form onSubmit={run} className="flex gap-2.5">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Yaourt grec, Nutella, 3017620422003…" enterKeyHint="search" autoFocus />
        {canScan && <Button type="button" variant="outline" onClick={() => setScanning(true)} aria-label="Scanner un code-barres"><ScanLine className="size-5" /></Button>}
        <Button type="submit" variant="tone" aria-label="Rechercher"><Search className="size-5" /></Button>
      </form>

      <div className="mt-5">
        {loading && <div className="flex justify-center py-10"><Spinner className="size-7 text-tone" /></div>}
        {results && results.length === 0 && (
          <EmptyState icon={Package} title="Aucun résultat" text="Essayez un autre mot, ou ajoutez le produit à la main avec la saisie rapide." />
        )}
        {results && results.length > 0 && (
          <ul className="space-y-2">
            {results.map(f => (
              <li key={f.code + f.name}>
                <button onClick={() => pick(f)} className="k-press k-card flex w-full items-center gap-3 p-3 text-left">
                  {f.image ? <img src={f.image} alt="" className="size-12 shrink-0 rounded-xl bg-muted object-cover" loading="lazy" /> : <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted"><Package className="size-5 text-muted-foreground" /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{f.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{f.brand || 'Sans marque'} · {Math.round(f.per100.kcal)} kcal / 100 g</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!results && !loading && <p className="px-2 text-center text-[13px] leading-relaxed text-muted-foreground">Les valeurs viennent d'Open Food Facts, une base collaborative : vérifiez-les sur l'emballage en cas de doute.</p>}
      </div>
    </div>
  )
}
