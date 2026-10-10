// Logo Kalzo — piste C (anneau 3 couleurs + K). Le choix définitif sera validé
// avec le propriétaire ; le reste de l'app n'utilise que ce composant.
export function LogoMark({ size = 48, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="Kalzo">
      <rect width="64" height="64" rx="15" fill="#0d3b2a" />
      <g fill="none" strokeWidth="7" strokeLinecap="round" transform="rotate(-90 32 32)">
        <circle cx="32" cy="32" r="18" stroke="#34d399" strokeDasharray="30 83" />
        <circle cx="32" cy="32" r="18" stroke="#fb923c" strokeDasharray="30 83" transform="rotate(120 32 32)" />
        <circle cx="32" cy="32" r="18" stroke="#38bdf8" strokeDasharray="30 83" transform="rotate(240 32 32)" />
      </g>
      <g fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M27.5 24.5V39.5" />
        <path d="M27.5 32L36 24.5" />
        <path d="M30.5 30.5L36.5 39.5" />
      </g>
    </svg>
  )
}

export function Wordmark({ className = '' }) {
  return <span className={`text-2xl font-extrabold tracking-tight ${className}`}>Kalzo</span>
}
