import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Play, Users, TrendingUp, Activity } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useCourseStore } from '@/store/courseStore'
import { useSessionStore } from '@/store/sessionStore'
import Layout from '@/components/Layout'
import HelpOverlay from '@/components/HelpOverlay'
import StatsCard from '@/components/StatsCard'
import StartSessionModal from '@/components/StartSessionModal'
import { useToast } from '@/components/Toast'

export default function LecturerDashboard() {
  const { user } = useAuthStore()
  const { courses, fetchCourses } = useCourseStore()
  const { activeSessions, fetchActiveSessions } = useSessionStore()
  const { success } = useToast()
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>()

  useEffect(() => {
    fetchCourses()
    fetchActiveSessions()
    const interval = setInterval(fetchActiveSessions, 30000)
    return () => clearInterval(interval)
  }, [])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const openSessionForCourse = (courseId: string) => {
    setSelectedCourseId(courseId)
    setSessionModalOpen(true)
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="page-title">{greeting}, {user?.full_name?.split(' ')[0]}!</h1>
          <p className="text-muted text-sm mt-1">Lecturer Dashboard</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={<BookOpen size={20} />} title="My Courses" value={courses.length} color="cyan" />
          <StatsCard icon={<Activity size={20} />} title="Active Sessions" value={activeSessions.length} color="green" />
          <StatsCard icon={<Users size={20} />} title="Live Students" value={activeSessions.reduce((a, s) => a + s.attendee_count, 0)} color="amber" />
          <StatsCard icon={<TrendingUp size={20} />} title="Total Attendees Today" value={activeSessions.reduce((a, s) => a + s.attendee_count, 0)} color="green" />
        </div>

        {/* Active sessions */}
        {activeSessions.length > 0 && (
          <div className="glass-card p-5">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              Active Sessions ({activeSessions.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {activeSessions.map((s) => (
                <div key={s.id} className="glass-card-active p-4 rounded-xl border border-neon-green/30">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-white-text text-sm">{s.course_name}</p>
                      <p className="text-xs font-mono text-electric-cyan">{s.course_code}</p>
                    </div>
                    <span className="badge badge-green">{s.attendee_count} students</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted font-mono">Code: <span className="text-neon-green font-bold tracking-widest">{s.session_code}</span></p>
                    <p className="text-xs text-muted">
                      {s.remaining_seconds ? `${Math.floor((s.remaining_seconds || 0) / 60)}m left` : 'Active'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Courses */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">My Courses</h2>
            <button
              onClick={() => setSessionModalOpen(true)}
              className="btn-primary text-sm px-4 py-2 min-h-[40px]"
            >
              <Play size={14} /> Start Session
            </button>
          </div>

          {courses.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">No courses assigned yet. Contact your administrator.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((c) => (
                <motion.div
                  key={c.id}
                  whileHover={{ scale: 1.01 }}
                  className="glass-card p-4 border-opacity-20"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-white-text text-sm">{c.name}</p>
                      <p className="text-xs font-mono text-electric-cyan mt-0.5">{c.code}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted mb-3">{c.department} · {c.enrollment_count} students</p>
                  <button
                    onClick={() => openSessionForCourse(c.id)}
                    className="btn-secondary text-xs px-3 py-2 min-h-[36px] w-full"
                  >
                    <Play size={12} /> Start Session
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <StartSessionModal
        isOpen={sessionModalOpen}
        onClose={() => { setSessionModalOpen(false); setSelectedCourseId(undefined) }}
        defaultCourseId={selectedCourseId}
      />
      <HelpOverlay />
    </Layout>
  )
}
