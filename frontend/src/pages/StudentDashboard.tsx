import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { QrCode, BookOpen, CheckCircle, Wifi, TrendingUp, Clock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAttendanceStore } from '@/store/attendanceStore'
import { useCourseStore } from '@/store/courseStore'
import Layout from '@/components/Layout'
import StatsCard from '@/components/StatsCard'
import HelpOverlay from '@/components/HelpOverlay'
import { StatusBadge } from '@/components/Badge'
import { countPending } from '@/lib/offlineQueue'
import { useNetworkStatus } from '@/lib/useNetworkStatus'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const { stats, records, fetchStats, fetchMyAttendance, isLoading } = useAttendanceStore()
  const { courses, fetchCourses } = useCourseStore()
  const { isOnline } = useNetworkStatus()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    fetchStats()
    fetchMyAttendance({ per_page: 7 })
    fetchCourses()
    countPending().then(setPendingCount)
  }, [])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="page-title">
            {greeting}, {user?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted mt-1 text-sm">{today}</p>
        </motion.div>

        {/* Offline sync banner */}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-5 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(255,180,68,0.08)', border: '1px solid rgba(255,180,68,0.2)', color: '#FFB444' }}
          >
            <Wifi size={16} />
            <span>You're offline. Scans will be queued and synced automatically when you reconnect.</span>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={<BookOpen size={20} />} title="Enrolled Courses" value={courses.length} color="cyan" />
          <StatsCard
            icon={<TrendingUp size={20} />}
            title="Attendance Rate"
            value={stats?.percentage ?? 0}
            suffix="%"
            color="green"
          />
          <StatsCard icon={<CheckCircle size={20} />} title="Present This Term" value={stats?.present_count ?? 0} color="green" />
          <StatsCard icon={<Clock size={20} />} title="Pending Sync" value={pendingCount} color="amber" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Enrolled Courses */}
          <div className="glass-card p-5">
            <h2 className="section-title mb-4">My Courses</h2>
            {courses.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">You are not enrolled in any courses yet.</p>
            ) : (
              <div className="space-y-3">
                {courses.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white-text">{c.name}</p>
                      <p className="text-xs text-muted font-mono">{c.code} · {c.department}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Attendance */}
          <div className="glass-card p-5">
            <h2 className="section-title mb-4">Recent Attendance</h2>
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            ) : records.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No attendance records yet.</p>
            ) : (
              <div className="space-y-2">
                {records.slice(0, 6).map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white-text">{r.course_name}</p>
                      <p className="text-xs text-muted">{formatDate(r.marked_at)}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <HelpOverlay />
    </Layout>
  )
}
