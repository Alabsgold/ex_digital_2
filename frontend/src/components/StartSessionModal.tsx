import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, QrCode, Users, Clock, StopCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useCourseStore } from '@/store/courseStore'
import { useSessionStore, Session } from '@/store/sessionStore'
import { useToast } from '@/components/Toast'
import Button from '@/components/Button'
import Select from '@/components/Select'
import Input from '@/components/Input'
import LiveAttendeesStream from './LiveAttendeesStream'
import ConfirmModal from './ConfirmModal'

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
    <div className={`text-2xl font-mono font-bold ${isUrgent ? 'text-soft-red animate-pulse' : 'text-neon-green'}`}>
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

  useEffect(() => { fetchCourses() }, [])
  useEffect(() => {
    if (defaultCourseId) setSelectedCourse(defaultCourseId)
  }, [defaultCourseId])

  useEffect(() => {
    if (!isOpen) {
      setPhase('form')
      setActiveSession(null)
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
        <motion.div
          className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-lg font-bold text-white-text">
              {phase === 'form' ? 'Start Attendance Session' : `${activeSession?.course_code} — Live Session`}
            </h2>
            <button onClick={onClose} className="text-muted hover:text-white-text p-1" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="px-6 pb-6">
            {phase === 'form' ? (
              <div className="space-y-4">
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
                    className="w-full accent-neon-green"
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
              <div className="space-y-5">
                {/* Timer */}
                <div className="text-center">
                  <p className="text-xs text-muted mb-1">Time Remaining</p>
                  <CountdownTimer startedAt={activeSession.started_at} durationMinutes={activeSession.duration_minutes} />
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 rounded-2xl" style={{ background: '#fff' }}>
                    <QRCodeSVG value={activeSession.qr_uuid} size={180} />
                  </div>
                </div>

                {/* Session code */}
                <div className="text-center">
                  <p className="text-xs text-muted mb-2">Or share this code manually</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-mono font-bold tracking-widest text-neon-green">
                      {activeSession.session_code}
                    </span>
                    <button
                      onClick={copyCode}
                      className="text-muted hover:text-neon-green transition-colors"
                      aria-label="Copy session code"
                    >
                      {copied ? <Check size={18} className="text-neon-green" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                {/* Live attendees */}
                <LiveAttendeesStream sessionId={activeSession.id} />

                <Button variant="danger" fullWidth onClick={() => setEndConfirmOpen(true)}>
                  <StopCircle size={16} /> End Session Early
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

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
