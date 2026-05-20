import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Wifi, WifiOff } from 'lucide-react'
import { useSessionStore, Attendee } from '@/store/sessionStore'
import { StatusBadge } from '@/components/Badge'
import { useToast } from '@/components/Toast'
import { useRef } from 'react'

interface LiveAttendeesStreamProps {
  sessionId: string
  maxVisible?: number
}

function AttendeeRow({ attendee, index }: { attendee: Attendee; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-deep-black"
          style={{ background: 'linear-gradient(135deg, #00FF88, #00D4FF)' }}>
          {attendee.student_name[0]}
        </div>
        <div>
          <p className="text-sm font-medium text-white-text">{attendee.student_name}</p>
          {attendee.matric_number && (
            <p className="text-xs font-mono text-muted">{attendee.matric_number}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted">
          {new Date(attendee.marked_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <StatusBadge status={attendee.status} />
      </div>
    </motion.div>
  )
}

export default function LiveAttendeesStream({ sessionId, maxVisible = 20 }: LiveAttendeesStreamProps) {
  const { liveAttendees, sseSource, connectSSE, disconnectSSE } = useSessionStore()
  const { success } = useToast()
  const prevCount = useRef(liveAttendees.length)

  useEffect(() => {
    connectSSE(sessionId)
    return () => disconnectSSE()
  }, [sessionId])

  useEffect(() => {
    if (liveAttendees.length > prevCount.current && prevCount.current > 0) {
      // New attendee added (at the top of the array)
      const newAttendee = liveAttendees[0]
      success(`${newAttendee.student_name} marked as ${newAttendee.status}`)
    }
    prevCount.current = liveAttendees.length
  }, [liveAttendees, success])

  const isConnected = !!sseSource
  const visible = liveAttendees.slice(0, maxVisible)

  return (
    <div className="glass-card p-4" style={{ border: '1px solid rgba(0,255,136,0.1)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-muted" />
          <h3 className="text-sm font-semibold text-white-text">
            Live Attendance ({liveAttendees.length})
          </h3>
        </div>
        <div className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-neon-green' : 'text-muted'}`}>
          {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isConnected ? 'Live' : 'Disconnected'}
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-neon-green/30 mx-auto mb-2 animate-pulse" />
            <p className="text-xs text-muted">Waiting for students to scan in...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((a, i) => (
              <AttendeeRow key={`${a.student_name}-${a.marked_at}`} attendee={a} index={i} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
