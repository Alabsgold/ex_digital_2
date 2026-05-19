import { useEffect, useState } from 'react'
import { BookOpen, PlusCircle, CheckCircle, Search } from 'lucide-react'
import { useCourseStore } from '@/store/courseStore'
import { useToast } from '@/components/Toast'
import Layout from '@/components/Layout'
import HelpOverlay from '@/components/HelpOverlay'
import EmptyState from '@/components/EmptyState'
import Button from '@/components/Button'
import SearchInput from '@/components/SearchInput'
import { motion, AnimatePresence } from 'framer-motion'

type Tab = 'enrolled' | 'available'

export default function StudentEnrollCourses() {
  const { courses, isLoading, fetchCourses, fetchAvailableCourses, selfEnroll } = useCourseStore()
  const { success, error: toastError } = useToast()

  const [tab, setTab] = useState<Tab>('enrolled')
  const [search, setSearch] = useState('')
  const [enrollingId, setEnrollingId] = useState<string | null>(null)

  useEffect(() => {
    if (tab === 'enrolled') {
      fetchCourses({ search })
    } else {
      fetchAvailableCourses({ search })
    }
  }, [tab, search])

  const handleEnroll = async (courseId: string, courseName: string) => {
    setEnrollingId(courseId)
    try {
      await selfEnroll(courseId)
      success(`Enrolled in "${courseName}" successfully!`)
      // Refresh available list (removes newly enrolled course)
      fetchAvailableCourses({ search })
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setEnrollingId(null)
    }
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="page-title">My Courses</h1>
          <p className="text-sm text-muted mt-1">Enrol in courses available for your level to start tracking attendance.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {([['enrolled', 'My Enrolled Courses', <CheckCircle size={14} />], ['available', 'Browse & Enrol', <Search size={14} />]] as const).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => { setTab(id as Tab); setSearch('') }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-brand-primary text-white shadow-lg'
                  : 'text-muted hover:text-white-text'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        <SearchInput placeholder={tab === 'enrolled' ? 'Search enrolled courses…' : 'Search available courses…'} onChange={setSearch} />

        <AnimatePresence mode="wait">
          {tab === 'enrolled' ? (
            <motion.div key="enrolled" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="glass-card p-5 h-36 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <EmptyState
                  icon={<BookOpen size={32} />}
                  title="No enrolled courses"
                  description='Switch to "Browse & Enrol" to register in courses available for your level.'
                />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="glass-card p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono text-electric-cyan mb-1">{c.code}</p>
                          <h3 className="font-semibold text-white-text text-sm leading-snug">{c.name}</h3>
                          <p className="text-xs text-muted mt-1">{c.department}</p>
                        </div>
                        <span className="badge badge-green ml-2 flex-shrink-0">
                          <CheckCircle size={10} className="inline mr-1" />Enrolled
                        </span>
                      </div>
                      {c.lecturer && (
                        <p className="text-xs text-muted mt-2">Lecturer: <span className="text-white-text">{c.lecturer.full_name}</span></p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="available" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="glass-card p-5 h-44 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <EmptyState
                  icon={<Search size={32} />}
                  title="No available courses"
                  description="You are already enrolled in all courses for your level, or the admin hasn't uploaded courses yet."
                />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="glass-card p-5 flex flex-col"
                    >
                      <div className="flex-1 mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs font-mono text-electric-cyan">{c.code}</p>
                          <span className="badge badge-cyan">Level {c.level}</span>
                        </div>
                        <h3 className="font-semibold text-white-text text-sm leading-snug">{c.name}</h3>
                        <p className="text-xs text-muted mt-1">{c.department}</p>
                        {c.description && (
                          <p className="text-xs text-muted mt-2 line-clamp-2">{c.description}</p>
                        )}
                        {c.lecturer ? (
                          <p className="text-xs mt-2 text-muted">
                            Lecturer: <span className="text-white-text">{c.lecturer.full_name}</span>
                          </p>
                        ) : (
                          <p className="text-xs mt-2 italic text-muted">No lecturer assigned yet</p>
                        )}
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        leftIcon={<PlusCircle size={13} />}
                        loading={enrollingId === c.id}
                        onClick={() => handleEnroll(c.id, c.name)}
                      >
                        Enrol Now
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <HelpOverlay />
    </Layout>
  )
}
