import { Wifi, WifiOff } from 'lucide-react'
import { useNetworkStatus } from '@/lib/useNetworkStatus'
import { motion, AnimatePresence } from 'framer-motion'

export default function NetworkStatusPill() {
  const { isOnline } = useNetworkStatus()

  return (
    <AnimatePresence mode="wait">
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: 'rgba(255,68,114,0.12)',
            border: '1px solid rgba(255,68,114,0.3)',
            color: '#FF4472',
          }}
          role="status"
          aria-label="You are currently offline"
          title="You are offline. Scans will be queued and synced when you reconnect."
        >
          <WifiOff size={12} />
          <span>Offline</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
