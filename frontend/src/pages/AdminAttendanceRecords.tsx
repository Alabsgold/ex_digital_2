import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useAdminStore } from '@/store/adminStore'
import { useCourseStore } from '@/store/courseStore'
import Layout from '@/components/Layout'
import HelpOverlay from '@/components/HelpOverlay'
import DataTable from '@/components/DataTable'
import Select from '@/components/Select'
import { useToast } from '@/components/Toast'

export default function AdminAttendanceRecords() {
  const {
    attendanceRecords,
    attendancePagination,
    isLoading,
    fetchAttendanceRecords
  } = useAdminStore()
  const { courses, fetchCourses } = useCourseStore()
  const { error } = useToast()

  const [courseId, setCourseId] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  // Load active courses for the dropdown
  useEffect(() => {
    fetchCourses({ is_active: true, per_page: 100 })
  }, [])

  // Load records whenever filters change
  useEffect(() => {
    fetchAttendanceRecords({
      course_id: courseId || undefined,
      status: status || undefined,
      from_date: fromDate ? `${fromDate}T00:00:00Z` : undefined,
      to_date: toDate ? `${toDate}T23:59:59Z` : undefined,
      page: 1
    })
  }, [courseId, status, fromDate, toDate])

  const handlePageChange = (page: number) => {
    fetchAttendanceRecords({
      course_id: courseId || undefined,
      status: status || undefined,
      from_date: fromDate ? `${fromDate}T00:00:00Z` : undefined,
      to_date: toDate ? `${toDate}T23:59:59Z` : undefined,
      page
    })
  }

  const handleDownload = () => {
    if (!courseId) {
      error('Please select a course to download its attendance records.')
      return
    }
    const authData = localStorage.getItem('ex-digital-auth')
    const token = authData ? JSON.parse(authData).state.token : null
    if (token) {
      window.open(`${import.meta.env.VITE_API_URL}/courses/${courseId}/attendance/export?token=${token}`, '_blank')
    } else {
      error('Authentication token not found.')
    }
  }

  const courseOptions = [
    { value: '', label: 'All Courses' },
    ...courses.map(c => ({ value: c.id, label: `${c.code} — ${c.name}` }))
  ]

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'present', label: 'Present' },
    { value: 'late', label: 'Late' },
    { value: 'absent', label: 'Absent' }
  ]

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Global Attendance Ledger</h1>
            <p className="text-sm text-muted mt-1">View and export attendance records across all courses and sessions.</p>
          </div>
          <button
            onClick={handleDownload}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Course Filter"
            options={courseOptions}
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          />
          <Select
            label="Status Filter"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <div>
            <label className="block text-xs text-muted mb-1 ml-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-dark-bg/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white-text focus:outline-none focus:border-neon-green/50 focus:ring-1 focus:ring-neon-green/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1 ml-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-dark-bg/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white-text focus:outline-none focus:border-neon-green/50 focus:ring-1 focus:ring-neon-green/50 transition-all"
            />
          </div>
        </div>

        <DataTable
          data={attendanceRecords}
          keyField="id"
          isLoading={isLoading}
          emptyTitle="No records found"
          totalPages={attendancePagination.pages}
          currentPage={attendancePagination.page}
          onPageChange={handlePageChange}
          columns={[
            {
              key: 'marked_at',
              header: 'Date & Time',
              render: (v) => <span className="text-sm">{new Date(v).toLocaleString('en-GB')}</span>,
            },
            {
              key: 'course_code',
              header: 'Course',
              render: (v, row) => (
                <div>
                  <span className="font-mono text-electric-cyan font-bold block">{v}</span>
                  <span className="text-xs text-muted truncate max-w-[150px] inline-block" title={row.course_name}>
                    {row.course_name}
                  </span>
                </div>
              ),
            },
            {
              key: 'student_name',
              header: 'Student',
              render: (v, row) => (
                <div>
                  <span className="text-sm text-white-text font-medium block">{v}</span>
                  <span className="text-xs text-muted font-mono">{row.student_matric || 'No matric'}</span>
                </div>
              ),
            },
            {
              key: 'marked_by',
              header: 'Marked By',
              render: (v) => <span className="badge badge-muted capitalize">{v.replace('_', ' ')}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (v) => (
                <span className={`badge ${
                  v === 'present' ? 'badge-green' : v === 'late' ? 'badge-amber' : 'badge-red'
                }`}>
                  {v}
                </span>
              ),
            },
          ]}
        />
      </div>
      <HelpOverlay />
    </Layout>
  )
}
