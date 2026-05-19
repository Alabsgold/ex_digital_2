import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Copy, Check, StopCircle, Camera, QrCode } from 'lucide-react'
import { useCourseStore } from '@/store/courseStore'
import { useSessionStore, Session } from '@/store/sessionStore'
import { useToast } from '@/components/Toast'
import Button from '@/components/Button'
import Select from '@/components/Select'
import Input from '@/components/Input'
import LiveAttendeesStream from './LiveAttendeesStream'
import ConfirmModal from './ConfirmModal'
import BarcodeScannerModal from './BarcodeScannerModal'

interface StartSessionModalProps {
  isOpen: boolean
  onClose: () => void
  defaultCourseId?: string
}

function CountdownTimer({ startedAt, durationMinutes }: { startedAt: string; durationMinutes: number }) {
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

  return (
    <div className={`text-3xl font-mono font-bold tabular-nums ${isUrgent ? 'text-soft-red animate-pulse' : 'text-neon-green'}`}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  )
}

export default function StartSessionModal({ isOpen, onClose, defaultCourseId }: StartSessionModalProps) {
  const { courses, fetchCourses } = useCourseStore()
  const { startSession, endSession, connectSSE, disconnectSSE } = useSessionStore()
  const { success, error: toastError } = useToast()

  const [phase, setPhase] = useState<'form' | 'active'>('form')
  const [selectedCourse, setSelectedCourse] = useState(defaultCourseId ?? '')
  const [duration, setDuration] = useState(10)
  const [venue, setVenue] = useState('')
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [endConfirmOpen, setEndConfirmOpen] = useState(false)
  const [ending, setEnding] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  useEffect(() => { fetchCourses() }, [])
  useEffect(() => {
    if (defaultCourseId) setSelectedCourse(defaultCourseId)
  }, [defaultCourseId])

  useEffect(() => {
    if (!isOpen) {
      setPhase('form')
      setActiveSession(null)
      setScannerOpen(false)
      disconnectSSE()
    }
  }, [isOpen])

  const handleStart = async () => {
    if (!selectedCourse) { toastError('Please select a course.'); return }
    setLoading(true)
    try {
      const session = await startSession(selectedCourse, duration, venue || undefined)
      setActiveSession(session)
      setPhase('active')
      connectSSE(session.id)
      success(`Session started for ${session.course_name}`)
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEnd = async () => {
    if (!activeSession) return
    setEnding(true)
    try {
      await endSession(activeSession.id)
      success('Session ended successfully.')
      setEndConfirmOpen(false)
      setScannerOpen(false)
      onClose()
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setEnding(false)
    }
  }

  const copyCode = () => {
    if (activeSession?.session_code) {
      navigator.clipboard.writeText(activeSession.session_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen) return null

  const courseOptions = courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
      >
        <motion.div
          className="glass-card w-full max-w-lg max-h-[92vh] overflow-y-auto"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4 sticky top-0 z-10"
            style={{ background: 'inherit', backdropFilter: 'blur(12px)' }}>
            <div>
              <h2 className="text-lg font-bold text-white-text">
                {phase === 'form' ? 'Start Attendance Session' : `${activeSession?.course_code} — Live`}
              </h2>
              {phase === 'active' && activeSession && (
                <p className="text-xs text-muted mt-0.5">{activeSession.course_name}</p>
              )}
            </div>
            <button onClick={onClose} className="text-muted hover:text-white-text p-1" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="px-6 pb-6">
            {/* ── FORM PHASE ────────────────────────────────────────────────── */}
            {phase === 'form' ? (
              <div className="space-y-5">
                <Select
                  label="Course"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  options={courseOptions}
                  placeholder="Select course"
                  required
                />
                <div>
                  <label className="label">Duration: {duration} minutes</label>
                  <input
                    type="range"
                    min={1}
                    max={120}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-neon-green mt-1"
                  />
                  <div className="flex justify-between text-xs text-muted mt-1">
                    <span>1 min</span><span>120 min</span>
                  </div>
                </div>
                <Input
                  label="Venue (optional)"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. LT4, Room 201"
                />
                <Button variant="primary" fullWidth onClick={handleStart} loading={loading}>
                  Start Session
                </Button>
              </div>

            ) : activeSession && (

              /* ── ACTIVE PHASE ──────────────────────────────────────────── */
              <div className="space-y-5">

                {/* Timer + code */}
                <div className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)' }}>
                  <div>
                    <p className="text-xs text-muted mb-1">Time Remaining</p>
                    <CountdownTimer startedAt={activeSession.started_at} durationMinutes={activeSession.duration_minutes} />
                    {activeSession.venue && (
                      <p className="text-xs text-muted mt-1.5">📍 {activeSession.venue}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted mb-2">Session Code</p>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-2xl font-mono font-bold tracking-widest text-neon-green">
                        {activeSession.session_code}
                      </span>
                      <button
                        onClick={copyCode}
                        className="text-muted hover:text-neon-green transition-colors p-1"
                        aria-label="Copy session code"
                      >
                        {copied ? <Check size={16} className="text-neon-green" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Barcode Scanner button */}
                <button
                  onClick={() => setScannerOpen(true)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                  style={{ background: 'rgba(0,210,255,0.05)', border: '1px solid rgba(0,210,255,0.2)' }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,210,255,0.12)' }}>
                    <Camera size={22} style={{ color: '#00D2FF' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white-text">Scan Student ID Card</p>
                    <p className="text-xs text-muted mt-0.5">
                      Opens live camera — point at barcode or QR on student card
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(0,210,255,0.1)', color: '#00D2FF' }}>
                    Open
                  </span>
                </button>

                {/* QR code hint */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <QrCode size={16} className="text-muted flex-shrink-0" />
                  <span className="text-muted">
                    Students can also enter the code <span className="font-mono font-bold text-neon-green">{activeSession.session_code}</span> manually in their app.
                  </span>
                </div>

                {/* Live attendees list */}
                <LiveAttendeesStream sessionId={activeSession.id} />

                {/* End session */}
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => setEndConfirmOpen(true)}
                >
                  <StopCircle size={16} /> End Session
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Barcode camera scanner */}
      {activeSession && (
        <BarcodeScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          sessionId={activeSession.id}
          courseName={activeSession.course_name}
        />
      )}

      {/* End session confirm */}
      <ConfirmModal
        isOpen={endConfirmOpen}
        onClose={() => setEndConfirmOpen(false)}
        onConfirm={handleEnd}
        title="End Session?"
        message="This will stop accepting new attendance marks. This action cannot be undone."
        confirmLabel="End Session"
        loading={ending}
      />
    </>
  )
}
