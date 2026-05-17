import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div
          className="p-3 rounded-xl"
          style={{
            background: variant === 'danger' ? 'rgba(255,68,114,0.08)' : 'rgba(255,180,68,0.08)',
            border: `1px solid ${variant === 'danger' ? 'rgba(255,68,114,0.2)' : 'rgba(255,180,68,0.2)'}`,
          }}
        >
          <AlertTriangle
            size={28}
            className={variant === 'danger' ? 'text-soft-red' : 'text-amber-warning'}
          />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white-text mb-2">{title}</h3>
          <p className="text-sm text-muted leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 w-full">
          <Button variant="ghost" fullWidth onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'secondary'}
            fullWidth
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
