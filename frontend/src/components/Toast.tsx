import React, { createContext, useCallback, useContext, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, variant: ToastVariant = 'info', duration = 4000) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev.slice(-4), { id, message, variant, duration }])
    setTimeout(() => remove(id), duration)
  }, [remove])

  const success = useCallback((msg: string) => toast(msg, 'success'), [toast])
  const error = useCallback((msg: string) => toast(msg, 'error', 6000), [toast])
  const info = useCallback((msg: string) => toast(msg, 'info'), [toast])
  const warning = useCallback((msg: string) => toast(msg, 'warning'), [toast])

  const iconMap = {
    success: <CheckCircle size={18} className="text-neon-green flex-shrink-0" />,
    error: <AlertCircle size={18} className="text-soft-red flex-shrink-0" />,
    info: <Info size={18} className="text-electric-cyan flex-shrink-0" />,
    warning: <AlertTriangle size={18} className="text-amber-warning flex-shrink-0" />,
  }

  const borderMap = {
    success: 'border-neon-green/30',
    error: 'border-soft-red/30',
    info: 'border-electric-cyan/30',
    warning: 'border-amber-warning/30',
  }

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`glass-card border ${borderMap[t.variant]} flex items-start gap-3 p-4 cursor-pointer`}
              onClick={() => remove(t.id)}
              role="alert"
            >
              {iconMap[t.variant]}
              <p className="text-sm text-white-text flex-1 leading-relaxed">{t.message}</p>
              <button
                onClick={(e) => { e.stopPropagation(); remove(t.id) }}
                className="text-muted hover:text-white-text transition-colors"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
