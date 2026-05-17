import { motion } from 'framer-motion'
import Button from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export default function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center py-16 px-8 ${className}`}
    >
      {icon && (
        <div
          className="mb-4 p-4 rounded-2xl"
          style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.12)' }}
        >
          <div className="text-neon-green/60">{icon}</div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-white-text mb-2">{title}</h3>
      {description && <p className="text-sm text-muted max-w-sm leading-relaxed mb-6">{description}</p>}
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}
