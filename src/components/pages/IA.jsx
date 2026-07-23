'use client'

export default function IA({ onNavigate }) {
  const tools = [
    { icon: '🧊', name: 'Frigo Vide', desc: 'Entrez vos ingrédients, l\'IA crée une recette sur mesure', page: 'frigo', full: true },
    { icon: '📸', name: 'Restaurant', desc: 'Photo de carte → analyse nutritionnelle complète', page: 'restaurant' },
    { icon: '🍳', name: 'Batch Cooking', desc: 'Plan de préparation hebdomadaire personnalisé', page: 'batch' },
    { icon: '📅', name: 'Plan 7 Jours', desc: 'Menu complet sur une semaine adapté à vos objectifs', page: 'plan' },
    { icon: '✍️', name: 'Saisie IA', desc: 'Décrivez ou photographiez un repas pour l\'analyser', page: 'saisie' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>
          Outils <span style={{ color: 'var(--green-light)' }}>IA</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Propulsé par l'intelligence artificielle</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tools.map(tool => (
          <button key={tool.page} onClick={() => onNavigate(tool.page)} style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
            padding: 16, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 52, height: 52, background: 'var(--green-dim)',
              border: '1px solid rgba(22,163,74,0.2)',
              borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, flexShrink: 0,
            }}>
              {tool.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{tool.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{tool.desc}</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)',
                borderRadius: 99, padding: '2px 8px', fontSize: 9, fontWeight: 700,
                color: 'var(--green-light)', marginTop: 6,
              }}>⚡ 1 crédit</div>
            </div>
            <span style={{ color: 'var(--dim)', fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
