import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Button from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center py-12 px-8 ${className}`}
      role="alert"
    >
      <div
        className="mb-4 p-4 rounded-2xl"
        style={{ background: 'rgba(255,68,114,0.06)', border: '1px solid rgba(255,68,114,0.15)' }}
      >
        <AlertTriangle size={32} className="text-soft-red/70" />
      </div>
      <h3 className="text-lg font-semibold text-white-text mb-2">{title}</h3>
      <p className="text-sm text-muted max-w-sm leading-relaxed mb-6">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} leftIcon={<RefreshCw size={14} />}>
          Try Again
        </Button>
      )}
    </motion.div>
  )
}
