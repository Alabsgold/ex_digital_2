interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

export default function LoadingSpinner({ size = 'md', label = 'Loading...', className = '' }: LoadingSpinnerProps) {
  const sizeMap = { sm: 24, md: 40, lg: 64 }
  const px = sizeMap[size]

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status" aria-label={label}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 40 40"
        className="animate-spin-slow"
        aria-hidden="true"
      >
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke="rgba(0,255,136,0.12)"
          strokeWidth="3"
        />
        <path
          d="M20 4 A16 16 0 0 1 36 20"
          fill="none"
          stroke="#00FF88"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,136,0.6))' }}
        />
      </svg>
      {label && size !== 'sm' && (
        <p className="text-sm text-muted animate-pulse">{label}</p>
      )}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-deep-black flex items-center justify-center z-50">
      <LoadingSpinner size="lg" label="Loading EX-Digital..." />
    </div>
  )
}
