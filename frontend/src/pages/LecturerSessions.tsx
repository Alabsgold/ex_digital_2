import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, StopCircle, Camera, Clock, Users, Activity } from 'lucide-react'
import { useSessionStore, Session } from '@/store/sessionStore'
import Layout from '@/components/Layout'
import HelpOverlay from '@/components/HelpOverlay'
import StartSessionModal from '@/components/StartSessionModal'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'
import ConfirmModal from '@/components/ConfirmModal'
import { useToast } from '@/components/Toast'
import Button from '@/components/Button'

function SessionCountdown({ startedAt, durationMinutes }: { startedAt: string; durationMinutes: number }) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000
      setRemaining(Math.max(0, durationMinutes * 60 - elapsed))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt, durationMinutes])

  const mins = Math.floor(remaining / 60)
  const secs = Math.floor(remaining % 60)
  const isUrgent = remaining < 120
  const pct = Math.min(100, (remaining / (durationMinutes * 60)) * 100)

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle
            cx="20" cy="20" r="16" fill="none"
            stroke={isUrgent ? '#FF4444' : '#00FF88'}
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 16}`}
            strokeDashoffset={`${2 * Math.PI * 16 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <Clock
          size={14}
          className="absolute inset-0 m-auto"
          style={{ color: isUrgent ? '#FF4444' : '#00FF88' }}
        />
      </div>
      <div>
        <p className={`text-lg font-mono font-bold tabular-nums leading-none ${isUrgent ? 'text-soft-red' : 'text-neon-green'}`}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </p>
        <p className="text-xs text-muted mt-0.5">{isUrgent ? 'Ending soon' : 'remaining'}</p>
      </div>
    </div>
  )
}

interface ActiveSessionCardProps {
  session: Session
  onEnd: (session: Session) => void
  onScan: (session: Session) => void
}

function ActiveSessionCard({ session, onEnd, onScan }: ActiveSessionCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl p-5"
      style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.2)' }}
    >
      {/* Top row: course info + timer */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse flex-shrink-0" />
            <span className="text-xs font-mono text-electric-cyan font-semibold">{session.course_code}</span>
            <span className="badge badge-green text-[10px]">LIVE</span>
          </div>
          <h3 className="font-semibold text-white-text text-sm leading-snug">{session.course_name}</h3>
          {session.venue && (
            <p className="text-xs text-muted mt-1">📍 {session.venue}</p>
          )}
        </div>
        <SessionCountdown startedAt={session.started_at} durationMinutes={session.duration_minutes} />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-4 px-1">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Users size={12} />
          <span><strong className="text-white-text">{session.attendee_count}</strong> students marked</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Activity size={12} />
          <span>Code: <span className="font-mono font-bold text-neon-green tracking-wider">{session.session_code}</span></span>
        </div>
      </div>

      {/* Actions row */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="primary"
          size="sm"
          fullWidth
          leftIcon={<Camera size={14} />}
          onClick={() => onScan(session)}
        >
          Scan ID Card
        </Button>
        <Button
          variant="danger"
          size="sm"
          fullWidth
          leftIcon={<StopCircle size={14} />}
          onClick={() => onEnd(session)}
        >
          End Session
        </Button>
      </div>
    </motion.div>
  )
}

export default function LecturerSessions() {
  const { activeSessions, fetchActiveSessions, endSession } = useSessionStore()
  const { success, error: toastError } = useToast()

  const [startModalOpen, setStartModalOpen] = useState(false)
  const [endTarget, setEndTarget] = useState<Session | null>(null)
  const [scanTarget, setScanTarget] = useState<Session | null>(null)
  const [ending, setEnding] = useState(false)

  // Fetch active sessions on mount and poll every 15 s
  useEffect(() => {
    fetchActiveSessions()
    const id = setInterval(fetchActiveSessions, 15_000)
    return () => clearInterval(id)
  }, [])

  const handleConfirmEnd = async () => {
    if (!endTarget) return
    setEnding(true)
    try {
      await endSession(endTarget.id)
      success(`Session for ${endTarget.course_name} ended.`)
      setEndTarget(null)
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setEnding(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Sessions</h1>
            <p className="text-sm text-muted mt-1">
              {activeSessions.length === 0
                ? 'No active sessions right now.'
                : `${activeSessions.length} active session${activeSessions.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Play size={14} />}
            onClick={() => setStartModalOpen(true)}
          >
            Start Session
          </Button>
        </div>

        {/* Active sessions list */}
        <AnimatePresence mode="popLayout">
          {activeSessions.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-12 text-center"
            >
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.1)' }}>
                <Activity size={26} className="text-neon-green opacity-50" />
              </div>
              <p className="text-white-text font-medium mb-1">No active sessions</p>
              <p className="text-sm text-muted mb-5">Start a session to begin taking attendance from your students.</p>
              <Button variant="primary" leftIcon={<Play size={14} />} onClick={() => setStartModalOpen(true)}>
                Start First Session
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((s) => (
                <ActiveSessionCard
                  key={s.id}
                  session={s}
                  onEnd={(sess) => setEndTarget(sess)}
                  onScan={(sess) => setScanTarget(sess)}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Info card */}
        <div className="glass-card p-4 text-xs text-muted space-y-1"
          style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-medium text-white-text text-sm mb-2">How attendance works</p>
          <p>① Start a session for your course — a unique code and QR is generated.</p>
          <p>② Click <strong className="text-white-text">"Scan ID Card"</strong> to open the live camera scanner — point it at student barcodes/QR codes.</p>
          <p>③ Students can also open their app and enter the session code manually.</p>
          <p>④ Click <strong className="text-white-text">"End Session"</strong> when done — no further scans will be accepted.</p>
        </div>
      </div>

      {/* Start session modal */}
      <StartSessionModal
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
      />

      {/* Inline barcode scanner (from sessions page) */}
      {scanTarget && (
        <BarcodeScannerModal
          isOpen={!!scanTarget}
          onClose={() => setScanTarget(null)}
          sessionId={scanTarget.id}
          courseName={scanTarget.course_name}
        />
      )}

      {/* End session confirm */}
      <ConfirmModal
        isOpen={!!endTarget}
        onClose={() => setEndTarget(null)}
        onConfirm={handleConfirmEnd}
        title="End Session?"
        message={`This will stop accepting attendance for "${endTarget?.course_name}". Students who haven't scanned yet will be marked absent.`}
        confirmLabel="End Session"
        variant="danger"
        loading={ending}
      />

      <HelpOverlay />
    </Layout>
  )
}
