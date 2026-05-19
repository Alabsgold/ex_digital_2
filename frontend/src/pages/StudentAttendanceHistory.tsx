import { useEffect, useState } from 'react'
import { Download, Filter, BookOpen, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useAttendanceStore } from '@/store/attendanceStore'
import { useCourseStore } from '@/store/courseStore'
import Layout from '@/components/Layout'
import HelpOverlay from '@/components/HelpOverlay'
import SearchInput from '@/components/SearchInput'
import Select from '@/components/Select'
import DateRangePicker from '@/components/DateRangePicker'
import DataTable from '@/components/DataTable'
import StatsCard from '@/components/StatsCard'
import { StatusBadge } from '@/components/Badge'
import { motion } from 'framer-motion'

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function PercentageRing({ pct }: { pct: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const color = pct >= 75 ? '#00FF88' : pct >= 50 ? '#FFB444' : '#FF4444'
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={circ - (circ * Math.min(pct, 100)) / 100}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}

type Tab = 'history' | 'courses'

export default function StudentAttendanceHistory() {
  const { records, stats, total, page, pages, isLoading, fetchMyAttendance, fetchStats } = useAttendanceStore()
  const { courses, fetchCourses } = useCourseStore()

  const [tab, setTab] = useState<Tab>('courses')
  const [courseFilter, setCourseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const loadData = (pg = 1) => {
    fetchMyAttendance({
      course_id: courseFilter || undefined,
      status: statusFilter || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      page: pg,
      per_page: 20,
    })
    setCurrentPage(pg)
  }

  useEffect(() => { fetchStats(); fetchCourses() }, [])
  useEffect(() => { if (tab === 'history') loadData(1) }, [courseFilter, statusFilter, fromDate, toDate, tab])

  const handleExport = () => {
    const rows = [['Date', 'Course Code', 'Course Name', 'Status', 'Marked By'].join(',')]
    records.forEach((r) => {
      rows.push([formatDate(r.marked_at), r.course_code, r.course_name, r.status, r.marked_by].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attendance_history.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const courseOptions = [
    { value: '', label: 'All Courses' },
    ...courses.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` })),
  ]
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'present', label: 'Present' },
    { value: 'late', label: 'Late' },
    { value: 'absent', label: 'Absent' },
  ]

  const byCourse = stats?.by_course ?? []

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="page-title">My Attendance</h1>
          {tab === 'history' && (
            <button onClick={handleExport} className="btn-secondary text-sm px-4 py-2 min-h-[40px]">
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>

        {/* Overall summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={<TrendingUp size={18} />} title="Overall Rate" value={stats?.percentage ?? 0} suffix="%" color="green" />
          <StatsCard icon={<CheckCircle size={18} />} title="Present" value={stats?.present_count ?? 0} color="green" />
          <StatsCard icon={<Clock size={18} />} title="Late" value={stats?.late_count ?? 0} color="amber" />
          <StatsCard icon={<XCircle size={18} />} title="Absent" value={stats?.absent_count ?? 0} color="red" />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {([
            ['courses', 'Per Course', <BookOpen size={14} />],
            ['history', 'Full History', <Filter size={14} />],
          ] as const).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === id ? 'bg-brand-primary text-white shadow-lg' : 'text-muted hover:text-white-text'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* ── Per-Course breakdown ─────────────────────────────────────────── */}
        {tab === 'courses' && (
          <motion.div key="courses" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card p-5 h-20 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            ) : byCourse.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <BookOpen size={36} className="mx-auto mb-3 text-muted" />
                <p className="text-muted text-sm">No attendance data yet. Enrol in courses and attend sessions to see your breakdown here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {byCourse.map((c, i) => {
                  const pct = c.percentage
                  const color = pct >= 75 ? '#00FF88' : pct >= 50 ? '#FFB444' : '#FF4444'
                  const bgColor = pct >= 75 ? 'rgba(0,255,136,0.05)' : pct >= 50 ? 'rgba(255,180,68,0.05)' : 'rgba(255,68,68,0.05)'
                  const borderColor = pct >= 75 ? 'rgba(0,255,136,0.15)' : pct >= 50 ? 'rgba(255,180,68,0.15)' : 'rgba(255,68,68,0.15)'
                  return (
                    <motion.div
                      key={c.course_code}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-5 rounded-xl flex items-center gap-5"
                      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
                    >
                      <PercentageRing pct={pct} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-electric-cyan font-semibold">{c.course_code}</span>
                        </div>
                        <p className="text-sm font-semibold text-white-text truncate">{c.course_name}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <CheckCircle size={11} style={{ color: '#00FF88' }} />
                            {c.present} attended
                          </span>
                          <span>of {c.total} sessions</span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold" style={{ color }}>{pct}%</p>
                        <p className="text-xs text-muted mt-0.5">
                          {pct >= 75 ? 'On track' : pct >= 50 ? 'Needs improvement' : 'At risk'}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Full attendance history ──────────────────────────────────────── */}
        {tab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Filters */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
                <Filter size={14} /> Filters
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Course"
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  options={courseOptions}
                />
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={statusOptions}
                />
              </div>
              <DateRangePicker
                fromDate={fromDate}
                toDate={toDate}
                onFromChange={setFromDate}
                onToChange={setToDate}
              />
            </div>

            {/* Table */}
            <DataTable
              data={records}
              keyField="id"
              isLoading={isLoading}
              emptyTitle="No attendance records found"
              emptyDescription="Your attendance history will appear here after your first scan."
              totalPages={pages}
              currentPage={currentPage}
              onPageChange={(p) => loadData(p)}
              columns={[
                { key: 'marked_at', header: 'Date & Time', render: (v) => <span className="text-xs font-mono">{formatDate(v)}</span> },
                { key: 'course_code', header: 'Code', render: (v) => <span className="font-mono text-electric-cyan text-xs">{v}</span> },
                { key: 'course_name', header: 'Course' },
                { key: 'status', header: 'Status', render: (v) => <StatusBadge status={v} /> },
                { key: 'marked_by', header: 'Method', render: (v) => <span className="text-xs text-muted capitalize">{v.replace('_', ' ')}</span> },
              ]}
            />
          </motion.div>
        )}
      </div>
      <HelpOverlay />
    </Layout>
  )
}
