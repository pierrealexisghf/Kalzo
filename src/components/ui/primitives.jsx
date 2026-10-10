'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, X, Loader2 } from 'lucide-react'

export const cx = (...c) => c.filter(Boolean).join(' ')

// ------------------------------------------------------------------ Button
const VARIANTS = {
  primary: 'bg-primary text-primary-foreground shadow-soft hover:opacity-95',
  tone: 'bg-tone text-tone-fg shadow-soft hover:opacity-95',
  soft: 'bg-tone-soft text-tone hover:opacity-90',
  outline: 'border border-border bg-card text-foreground hover:bg-accent',
  ghost: 'text-muted-foreground hover:bg-accent',
  danger: 'bg-destructive/10 text-destructive hover:bg-destructive/15',
}
const SIZES = {
  sm: 'h-9 px-3.5 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-5 text-[15px] rounded-2xl gap-2',
  lg: 'h-13 px-6 text-base rounded-2xl gap-2.5 min-h-[52px]',
}

export function Button({ variant = 'primary', size = 'md', loading, full, className, children, disabled, ...rest }) {
  return (
    <button
      disabled={disabled || loading}
      className={cx(
        'k-press inline-flex items-center justify-center font-semibold select-none',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant], SIZES[size], full && 'w-full', className
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

// ------------------------------------------------------------------- Card
export function Card({ className, children, ...rest }) {
  return <div className={cx('k-card', className)} {...rest}>{children}</div>
}

export function TapCard({ className, children, ...rest }) {
  return (
    <button className={cx('k-card k-press text-left w-full', className)} {...rest}>{children}</button>
  )
}

// ------------------------------------------------------------ Form fields
export function Field({ label, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="k-label">{label}</span>}
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function Input({ className, ...rest }) {
  return <input className={cx('k-input', className)} {...rest} />
}

export function Textarea({ className, rows = 3, ...rest }) {
  return <textarea rows={rows} className={cx('k-input resize-none', className)} {...rest} />
}

// Sélecteur à segments (onglets internes d'un écran).
export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cx('flex rounded-2xl bg-muted p-1', className)} role="tablist">
      {options.map(o => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            'k-press flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
            value === o.id ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ active, onClick, children, className }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'k-press shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
        active ? 'border-transparent bg-tone text-tone-fg' : 'border-border bg-card text-muted-foreground',
        className
      )}
    >
      {children}
    </button>
  )
}

// --------------------------------------------------------------- Feedback
export function Spinner({ className }) {
  return <Loader2 className={cx('size-5 animate-spin', className)} />
}

export function Skeleton({ className }) {
  return <div className={cx('k-shimmer rounded-2xl', className)} />
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {Icon && (
        <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-tone-soft text-tone">
          <Icon className="size-8" strokeWidth={1.8} />
        </div>
      )}
      <div className="text-base font-semibold">{title}</div>
      {text && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// --------------------------------------------------------------- Headers
export function ScreenHeader({ title, subtitle, onBack, right, className }) {
  return (
    <header className={cx('mb-5 flex items-start gap-3', className)}>
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Retour"
          className="k-press -ml-1 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-card border border-border"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[26px] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

export function SectionTitle({ children, right, className }) {
  return (
    <div className={cx('mb-2.5 mt-6 flex items-center justify-between px-1', className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>
      {right}
    </div>
  )
}

export function IconBadge({ icon: Icon, className, size = 'md' }) {
  const dims = size === 'lg' ? 'size-14 rounded-3xl' : size === 'sm' ? 'size-9 rounded-xl' : 'size-11 rounded-2xl'
  const ico = size === 'lg' ? 'size-7' : size === 'sm' ? 'size-[18px]' : 'size-[22px]'
  return (
    <div className={cx('flex shrink-0 items-center justify-center bg-tone-soft text-tone', dims, className)}>
      <Icon className={ico} strokeWidth={2} />
    </div>
  )
}

// ----------------------------------------------------------------- Sheet
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="k-fade absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="k-sheet relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-[2rem] bg-background shadow-float">
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="k-press flex size-9 items-center justify-center rounded-full bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <div className="safe-bottom overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  )
}

// Boîte de confirmation (remplace window.confirm).
export function ConfirmDialog({ open, title, text, extra, confirmLabel = 'Confirmer', danger, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" role="alertdialog" aria-modal="true">
      <div className="k-fade absolute inset-0 bg-black/45" onClick={onCancel} />
      <div className="k-pop relative w-full max-w-sm rounded-[1.75rem] bg-background p-6 shadow-float">
        <h3 className="text-lg font-bold">{title}</h3>
        {text && <p className="mt-2 text-sm text-muted-foreground">{text}</p>}
        {extra}
        <div className="mt-6 flex gap-3">
          <Button variant="outline" full onClick={onCancel}>Annuler</Button>
          <Button variant={danger ? 'danger' : 'primary'} full onClick={onConfirm} className={danger ? '!bg-destructive !text-white' : ''}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// --------------------------------------------------------- Data display
export function CountUp({ value, duration = 700, className, format = v => Math.round(v).toLocaleString('fr-FR') }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setShown(value); from.current = value; return }
    const start = performance.now()
    const a = from.current
    let raf
    const tick = now => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(a + (value - a) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <span className={className}>{format(shown)}</span>
}

export function ProgressBar({ value, max, colorClass = 'bg-tone', className, height = 'h-2.5' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className={cx('w-full overflow-hidden rounded-full bg-muted', height, className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full transition-[width] duration-700 ease-out', colorClass)} style={{ width: `${pct}%` }} />
    </div>
  )
}

// Anneau à plusieurs arcs concentriques : le premier est l'anneau extérieur, les
// suivants des anneaux intérieurs plus fins. segments: [{ value, max, color }]
export function Ring({ size = 160, stroke = 14, segments, children, className }) {
  const rings = segments.map((s, i) => {
    const w = i === 0 ? stroke : Math.max(4, stroke * 0.45)
    const inset = i === 0 ? 0 : stroke / 2 + 6 + (i - 1) * (w + 4) + w / 2
    const r = (size - stroke) / 2 - inset
    return { ...s, w, r, c: 2 * Math.PI * r }
  })
  return (
    <div className={cx('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {rings.map((g, i) => {
          const ratio = g.max > 0 ? Math.min(1, Math.max(0, g.value / g.max)) : 0
          return (
            <g key={i}>
              <circle cx={size / 2} cy={size / 2} r={g.r} fill="none" strokeWidth={g.w} className="stroke-muted" />
              <circle
                cx={size / 2} cy={size / 2} r={g.r} fill="none"
                strokeWidth={g.w} strokeLinecap="round" stroke="currentColor"
                className={cx('transition-[stroke-dasharray] duration-1000 ease-out', g.color)}
                strokeDasharray={`${Math.max(ratio * g.c, ratio > 0 ? 0.01 : 0)} ${g.c}`}
              />
            </g>
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

export function MacroBar({ label, value, max, colorClass }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{Math.round(value)}</span>
          {max ? ` / ${Math.round(max)} g` : ' g'}
        </span>
      </div>
      <ProgressBar value={value} max={max || 1} colorClass={colorClass} height="h-2" />
    </div>
  )
}

export function MacroPills({ macros, className }) {
  const items = [
    { k: 'kcal', v: macros?.kcal || 0, u: 'kcal', c: 'text-foreground' },
    { k: 'P', v: macros?.prot || 0, u: 'g', c: 'text-prot' },
    { k: 'G', v: macros?.gluc || 0, u: 'g', c: 'text-gluc' },
    { k: 'L', v: macros?.lip || 0, u: 'g', c: 'text-lip' },
  ]
  return (
    <div className={cx('grid grid-cols-4 gap-2', className)}>
      {items.map(i => (
        <div key={i.k} className="rounded-2xl bg-muted px-2 py-2.5 text-center">
          <div className={cx('text-base font-bold leading-none', i.c)}>
            {Math.round(i.v)}<span className="ml-0.5 text-[10px] font-semibold text-muted-foreground">{i.u}</span>
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {i.k === 'kcal' ? 'Énergie' : i.k === 'P' ? 'Protéines' : i.k === 'G' ? 'Glucides' : 'Lipides'}
          </div>
        </div>
      ))}
    </div>
  )
}
