// Playful geometry: overlapping circles, a spiral, a dot grid. Decorative only (aria-hidden).

export function Circles({ className = '' }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <circle cx="44" cy="60" r="36" fill="#00C65E" />
      <circle cx="76" cy="60" r="36" fill="#5C5FEF" style={{ mixBlendMode: 'multiply' }} />
      <circle cx="60" cy="32" r="14" fill="#FF5C00" />
    </svg>
  );
}

export function Spiral({ className = '' }) {
  return (
    <svg viewBox="0 0 100 100" className={`motion-safe:animate-spin-slow ${className}`} aria-hidden="true">
      <path
        d="M50 50 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 1 1 8 8 a12 12 0 1 1 -12 -12 a16 16 0 1 1 16 16 a20 20 0 1 1 -20 -20 a24 24 0 1 1 24 24 a28 28 0 1 1 -28 -28 a32 32 0 1 1 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Burst({ className = '' }) {
  return (
    <svg viewBox="0 0 100 100" className={`motion-safe:animate-spin-slow ${className}`} aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x="47" y="4" width="6" height="30" rx="3" fill="currentColor" transform={`rotate(${i * 30} 50 50)`} />
      ))}
    </svg>
  );
}

export function DotGrid({ className = '' }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      {Array.from({ length: 25 }, (_, i) => (
        <circle key={i} cx={8 + (i % 5) * 16} cy={8 + Math.floor(i / 5) * 16} r="2.5" fill="currentColor" />
      ))}
    </svg>
  );
}
