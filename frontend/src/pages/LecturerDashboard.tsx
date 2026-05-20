import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Play, Users, TrendingUp, Activity, Download } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuthStore } from '@/store/authStore'
import { useCourseStore } from '@/store/courseStore'
import { useSessionStore } from '@/store/sessionStore'
import { useAttendanceStore } from '@/store/attendanceStore'
import Layout from '@/components/Layout'
import HelpOverlay from '@/components/HelpOverlay'
import StatsCard from '@/components/StatsCard'
import StartSessionModal from '@/components/StartSessionModal'
import { useToast } from '@/components/Toast'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-muted mb-1">{label}</p>
      <p className="text-neon-green font-bold">{payload[0].value} marked</p>
    </div>
  )
}

export default function LecturerDashboard() {
  const { user } = useAuthStore()
  const { courses, fetchCourses } = useCourseStore()
  const { activeSessions, fetchActiveSessions } = useSessionStore()
  const { lecturerStats, fetchLecturerStats } = useAttendanceStore()
  const { success } = useToast()
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>()

  useEffect(() => {
    fetchCourses()
    fetchActiveSessions()
    fetchLecturerStats()
    const interval = setInterval(() => {
      fetchActiveSessions()
      fetchLecturerStats()
    }, 30000)
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
          <StatsCard icon={<Users size={20} />} title="Students Taught" value={lecturerStats?.total_students_taught ?? 0} color="amber" />
          <StatsCard icon={<TrendingUp size={20} />} title="Today's Attendance" value={lecturerStats?.today_attendance_count ?? 0} color="green" />
        </div>

        {/* Attendance Trend Chart */}
        {(lecturerStats?.attendance_trend?.length ?? 0) > 0 && (
          <div className="glass-card p-5">
            <h2 className="section-title mb-4">7-Day Attendance Trend</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lecturerStats?.attendance_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#8888AA', fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: '#8888AA', fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" stroke="#00FF88" strokeWidth={2} dot={true} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Active sessions */}
        {activeSessions.length > 0 && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                Active Sessions ({activeSessions.length})
              </h2>
              <a
                href="/lecturer/sessions"
                className="text-xs text-electric-cyan hover:underline flex items-center gap-1"
              >
                Manage →
              </a>
            </div>
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => openSessionForCourse(c.id)}
                      className="btn-secondary text-xs px-3 py-2 min-h-[36px] flex-1"
                    >
                      <Play size={12} /> Start Session
                    </button>
                    <button
                      onClick={() => {
                        const token = localStorage.getItem('ex-digital-auth') ? JSON.parse(localStorage.getItem('ex-digital-auth')!).state.token : null
                        if (token) {
                          window.open(`${import.meta.env.VITE_API_URL}/courses/${c.id}/attendance/export?token=${token}`, '_blank')
                        }
                      }}
                      className="btn-secondary text-xs px-3 py-2 min-h-[36px]"
                      title="Download CSV"
                    >
                      <Download size={12} />
                    </button>
                  </div>
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
