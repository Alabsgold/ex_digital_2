/**
 * RollCallModal — Lecturer marks attendance from a list of enrolled students.
 *
 * Features:
 *  • Fetches all enrolled students for the session's course
 *  • Shows already-marked students (greyed out with a green tick)
 *  • Search bar to filter by name or matric number
 *  • Tick to select / untick to deselect (bulk selection supported)
 *  • Single "Mark Present" submit marks all selected students via POST /attendance/manual
 *  • Live count of selected students shown in button
 */
import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, CheckCircle, Circle, Loader, Users, UserCheck } from 'lucide-react'
import apiClient from '@/lib/apiClient'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import { useToast } from '@/components/Toast'

interface Student {
  id: string
  full_name: string
  matric_number: string | null
  email: string
  level: string | null
}

interface RollCallModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  courseId: string
  courseName: string
}

export default function RollCallModal({
  isOpen,
  onClose,
  sessionId,
  courseId,
  courseName,
}: RollCallModalProps) {
  const { success, error: toastError } = useToast()

  const [students, setStudents] = useState<Student[]>([])
  const [alreadyMarked, setAlreadyMarked] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // ── Fetch enrolled students & already-marked students ───────────────────────
  const fetchData = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    setSelected(new Set())
    setSearch('')
    try {
      const [studentsRes, attendeesRes] = await Promise.all([
        apiClient.get(`/courses/${courseId}/students`),
        apiClient.get(`/sessions/${sessionId}/attendees?per_page=200`),
      ])
      setStudents(studentsRes.data.students ?? [])

      // Build set of student IDs already marked
      const markedIds = new Set<string>(
        (attendeesRes.data.items ?? []).map((a: any) => {
          // attendees endpoint returns student_name, not id — we match by matric
          return a.matric_number
        })
      )
      // Map matric → id for marked set
      const markedByMatric = new Set<string>()
      for (const s of (studentsRes.data.students ?? [])) {
        if (s.matric_number && markedIds.has(s.matric_number)) {
          markedByMatric.add(s.id)
        }
      }
      setAlreadyMarked(markedByMatric)
    } catch (err: any) {
      toastError('Failed to load student list')
    } finally {
      setLoading(false)
    }
  }, [isOpen, courseId, sessionId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Filter by search ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return students
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        (s.matric_number?.toLowerCase() ?? '').includes(q)
    )
  }, [students, search])

  // ── Selection helpers ───────────────────────────────────────────────────────
  const toggleStudent = (id: string) => {
    if (alreadyMarked.has(id)) return // cannot re-mark
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    const eligible = filtered.filter((s) => !alreadyMarked.has(s.id))
    setSelected(new Set(eligible.map((s) => s.id)))
  }

  const clearAll = () => setSelected(new Set())

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (selected.size === 0) return
    setSubmitting(true)
    let markedCount = 0
    let errorCount = 0

    for (const studentId of Array.from(selected)) {
      try {
        await apiClient.post('/attendance/manual', {
          session_id: sessionId,
          student_id: studentId,
          status: 'present',
        })
        markedCount++
        // Mark as already done so UI updates immediately
        setAlreadyMarked((prev) => new Set(prev).add(studentId))
        setSelected((prev) => { const n = new Set(prev); n.delete(studentId); return n })
      } catch (err: any) {
        const status = err?.response?.status
        if (status === 409) {
          // Already marked — treat as success silently
          setAlreadyMarked((prev) => new Set(prev).add(studentId))
          setSelected((prev) => { const n = new Set(prev); n.delete(studentId); return n })
        } else {
          errorCount++
        }
      }
    }

    setSubmitting(false)

    if (markedCount > 0) success(`${markedCount} student${markedCount > 1 ? 's' : ''} marked present`)
    if (errorCount > 0) toastError(`${errorCount} student(s) could not be marked`)
  }

  const unmarkedCount = students.length - alreadyMarked.size

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Roll Call" size="md">
      {/* Course name + summary */}
      <div className="mb-4">
        <p className="text-xs text-muted truncate">{courseName}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {students.length} enrolled
          </span>
          <span className="flex items-center gap-1 text-neon-green">
            <UserCheck size={12} />
            {alreadyMarked.size} already marked
          </span>
          <span className="flex items-center gap-1">
            <Circle size={12} />
            {unmarkedCount} remaining
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Search by name or matric number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-white-text bg-white/[0.04] border border-white/[0.08] focus:outline-none focus:border-neon-green/50 placeholder:text-muted"
        />
      </div>

      {/* Select / Clear All */}
      <div className="flex items-center justify-between mb-2 text-[11px]">
        <span className="text-muted">{filtered.length} student{filtered.length !== 1 ? 's' : ''} shown</span>
        <div className="flex gap-3">
          <button onClick={selectAll} className="text-electric-cyan hover:underline">Select all</button>
          <button onClick={clearAll} className="text-muted hover:text-white-text hover:underline">Clear</button>
        </div>
      </div>

      {/* Student list */}
      <div className="max-h-72 overflow-y-auto rounded-lg border border-white/[0.06] divide-y divide-white/[0.04]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={24} className="text-neon-green animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted">
            {search ? 'No students match your search.' : 'No students enrolled in this course.'}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((student) => {
              const marked = alreadyMarked.has(student.id)
              const isSelected = selected.has(student.id)
              return (
                <motion.button
                  key={student.id}
                  layout
                  onClick={() => toggleStudent(student.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    marked
                      ? 'opacity-50 cursor-default'
                      : isSelected
                      ? 'bg-neon-green/5'
                      : 'hover:bg-white/[0.03] cursor-pointer'
                  }`}
                >
                  {/* Checkbox indicator */}
                  <div className="flex-shrink-0">
                    {marked ? (
                      <CheckCircle size={18} className="text-neon-green" />
                    ) : isSelected ? (
                      <div className="w-[18px] h-[18px] rounded-full border-2 border-neon-green flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-neon-green" />
                      </div>
                    ) : (
                      <Circle size={18} className="text-muted/40" />
                    )}
                  </div>

                  {/* Avatar initial */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-deep-black flex-shrink-0"
                    style={{ background: marked ? 'rgba(0,255,136,0.3)' : 'linear-gradient(135deg, #3d3d5c, #5c5c8a)' }}
                  >
                    {student.full_name[0].toUpperCase()}
                  </div>

                  {/* Name & matric */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white-text truncate">{student.full_name}</p>
                    <p className="text-xs text-muted font-mono">{student.matric_number ?? '—'}</p>
                  </div>

                  {/* Already marked badge */}
                  {marked && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{ background: 'rgba(0,255,136,0.1)', color: '#00FF88' }}>
                      Marked
                    </span>
                  )}
                </motion.button>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 mt-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="flex-1"
        >
          Close
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          loading={submitting}
          disabled={selected.size === 0 || submitting}
          onClick={handleSubmit}
        >
          {selected.size > 0
            ? `Mark ${selected.size} Present`
            : 'Select Students'}
        </Button>
      </div>
    </Modal>
  )
}
