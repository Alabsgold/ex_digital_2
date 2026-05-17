import { useEffect, useState } from 'react'
import { Download, Filter } from 'lucide-react'
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
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function StudentAttendanceHistory() {
  const { records, stats, total, page, pages, isLoading, fetchMyAttendance, fetchStats } = useAttendanceStore()
  const { courses, fetchCourses } = useCourseStore()

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
  useEffect(() => { loadData(1) }, [courseFilter, statusFilter, fromDate, toDate])

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

  const courseOptions = [{ value: '', label: 'All Courses' }, ...courses.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))]
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'present', label: 'Present' },
    { value: 'late', label: 'Late' },
    { value: 'absent', label: 'Absent' },
  ]

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="page-title">My Attendance History</h1>
          <button onClick={handleExport} className="btn-secondary text-sm px-4 py-2 min-h-[40px]">
            <Download size={14} /> Export CSV
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={<TrendingUp size={18} />} title="Overall Rate" value={stats?.percentage ?? 0} suffix="%" color="green" />
          <StatsCard icon={<CheckCircle size={18} />} title="Present" value={stats?.present_count ?? 0} color="green" />
          <StatsCard icon={<Clock size={18} />} title="Late" value={stats?.late_count ?? 0} color="amber" />
          <StatsCard icon={<XCircle size={18} />} title="Absent" value={stats?.absent_count ?? 0} color="red" />
        </div>

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
      </div>
      <HelpOverlay />
    </Layout>
  )
}
