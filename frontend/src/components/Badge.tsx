type BadgeVariant = 'green' | 'red' | 'amber' | 'cyan' | 'muted' | 'blue'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  className?: string
}

export default function Badge({ children, variant = 'muted', size = 'sm', className = '' }: BadgeProps) {
  const variantClass = {
    green: 'badge-green',
    red: 'badge-red',
    amber: 'badge-amber',
    cyan: 'badge-cyan',
    muted: 'badge-muted',
    blue: 'bg-blue-500/10 border border-blue-400/25 text-blue-300',
  }[variant]

  const sizeClass = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'

  return (
    <span className={`badge ${variantClass} ${sizeClass} ${className}`}>
      {children}
    </span>
  )
}

// Convenience helpers
export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, BadgeVariant> = {
    admin: 'red',
    lecturer: 'amber',
    student: 'green',
  }
  return <Badge variant={map[role] ?? 'muted'}>{role}</Badge>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    present: 'green',
    late: 'amber',
    absent: 'red',
    active: 'green',
    inactive: 'muted',
    completed: 'cyan',
    failed: 'red',
    pending: 'amber',
  }
  return <Badge variant={map[status] ?? 'muted'}>{status}</Badge>
}
