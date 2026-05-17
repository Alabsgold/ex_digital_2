import { useEffect } from 'react'
import { BookOpen, Users } from 'lucide-react'
import { useCourseStore } from '@/store/courseStore'
import Layout from '@/components/Layout'
import HelpOverlay from '@/components/HelpOverlay'
import EmptyState from '@/components/EmptyState'
import { motion } from 'framer-motion'

export default function LecturerCourses() {
  const { courses, isLoading, fetchCourses } = useCourseStore()

  useEffect(() => { fetchCourses() }, [])

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="page-title">My Courses</h1>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="glass-card p-5 h-40 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={32} />}
            title="No courses assigned"
            description="Contact your administrator to get courses assigned to your account."
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass-card glass-card-hover p-5"
              >
                <div className="mb-4">
                  <p className="text-xs font-mono text-electric-cyan mb-1">{c.code}</p>
                  <h3 className="font-semibold text-white-text">{c.name}</h3>
                  <p className="text-xs text-muted mt-1">{c.department}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Users size={12} />
                  <span>{c.enrollment_count} students enrolled</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <HelpOverlay />
    </Layout>
  )
}
