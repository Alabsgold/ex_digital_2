import { useEffect, useState } from 'react'
import { PlusCircle, Archive, UserCheck, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { useCourseStore, CourseCreate, Course } from '@/store/courseStore'
import { useAdminStore } from '@/store/adminStore'
import Layout from '@/components/Layout'
import HelpOverlay from '@/components/HelpOverlay'
import SearchInput from '@/components/SearchInput'
import DataTable from '@/components/DataTable'
import Modal from '@/components/Modal'
import Input from '@/components/Input'
import Button from '@/components/Button'
import ConfirmModal from '@/components/ConfirmModal'
import Select from '@/components/Select'
import { useToast } from '@/components/Toast'

const LEVELS = ['100', '200', '300', '400', '500', '600']

export default function AdminCourseManagement() {
  const { courses, pages, page, isLoading, fetchCourses, createCourse, updateCourse, assignLecturer, fetchEnrolledStudents } = useCourseStore()
  const { users, fetchUsers } = useAdminStore()
  const { success, error: toastError } = useToast()

  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null)
  const [assignTarget, setAssignTarget] = useState<Course | null>(null)
  const [studentsTarget, setStudentsTarget] = useState<Course | null>(null)
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLecturerId, setSelectedLecturerId] = useState('')
  const [form, setForm] = useState({ code: '', name: '', description: '', department: '', level: '100' })

  // Load courses & lecturers
  useEffect(() => {
    fetchCourses({ search, is_active: showArchived ? undefined : true })
  }, [search, showArchived])

  useEffect(() => {
    fetchUsers({ role: 'lecturer', per_page: 100 } as any)
  }, [])

  const lecturers = users.filter(u => u.role === 'lecturer')
  const lecturerOptions = [
    { value: '', label: 'Unassigned' },
    ...lecturers.map(l => ({ value: l.id, label: `${l.full_name} (${l.email})` })),
  ]
  const levelOptions = LEVELS.map(l => ({ value: l, label: `${l} Level` }))

  const handleCreate = async () => {
    if (!form.code || !form.name || !form.department || !form.level) {
      toastError('Code, name, level, and department are required.')
      return
    }
    setLoading(true)
    try {
      await createCourse(form as CourseCreate)
      success(`Course ${form.code.toUpperCase()} added to EX-AMS.`)
      setCreateOpen(false)
      setForm({ code: '', name: '', description: '', department: '', level: '100' })
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    try {
      await updateCourse(archiveTarget, { is_active: false })
      success('Course archived.')
      setArchiveTarget(null)
    } catch (err: any) {
      toastError(err.message)
    }
  }

  const openAssign = (course: Course) => {
    setAssignTarget(course)
    setSelectedLecturerId(course.lecturer_id ?? '')
    setAssignOpen(true)
  }

  const handleAssign = async () => {
    if (!assignTarget) return
    setLoading(true)
    try {
      if (selectedLecturerId) {
        await assignLecturer(assignTarget.id, selectedLecturerId)
        success('Lecturer assigned successfully.')
      } else {
        // Clear lecturer by patching (unassign)
        await updateCourse(assignTarget.id, {})
        success('Lecturer unassigned.')
      }
      setAssignOpen(false)
      setAssignTarget(null)
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const openStudents = async (course: Course) => {
    setStudentsTarget(course)
    try {
      const list = await fetchEnrolledStudents(course.id)
      setEnrolledStudents(list)
    } catch {
      setEnrolledStudents([])
    }
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Course Management</h1>
            <p className="text-sm text-muted mt-1">Only admins can add courses to EX-AMS. Lecturers register available courses; students are enrolled automatically.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchived(p => !p)}
              className={`text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors border ${
                showArchived ? 'border-amber-warning/40 text-amber-warning' : 'border-white/10 text-muted hover:text-white-text'
              }`}
            >
              {showArchived ? <Eye size={12} /> : <EyeOff size={12} />}
              {showArchived ? 'Showing all' : 'Active only'}
            </button>
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)} leftIcon={<PlusCircle size={14} />}>
              Add Course
            </Button>
          </div>
        </div>

        <SearchInput placeholder="Search courses by name or code…" onChange={setSearch} />

        <DataTable
          data={courses}
          keyField="id"
          isLoading={isLoading}
          emptyTitle="No courses found"
          totalPages={pages}
          currentPage={page}
          onPageChange={(p) => fetchCourses({ search, is_active: showArchived ? undefined : true, page: p })}
          columns={[
            {
              key: 'code',
              header: 'Code',
              render: (v) => <span className="font-mono text-electric-cyan text-sm font-semibold">{v}</span>,
            },
            {
              key: 'name',
              header: 'Course Name',
              render: (v, row: Course) => (
                <div>
                  <p className="text-sm font-medium text-white-text">{v}</p>
                  {row.description && <p className="text-xs text-muted mt-0.5 line-clamp-1">{row.description}</p>}
                </div>
              ),
            },
            { key: 'department', header: 'Department', render: (v) => <span className="text-sm text-muted">{v}</span> },
            { key: 'level', header: 'Level', render: (v) => <span className="badge badge-cyan">{v} Level</span> },
            {
              key: 'lecturer',
              header: 'Lecturer',
              render: (v) => v
                ? <span className="text-xs text-white-text">{v.full_name}</span>
                : <span className="text-xs text-muted italic">Unassigned</span>,
            },
            { key: 'enrollment_count', header: 'Students', render: (v) => <span className="text-sm">{v}</span> },
            {
              key: 'is_active',
              header: 'Status',
              render: (v) => (
                <span className={`badge ${v ? 'badge-green' : 'badge-muted'}`}>{v ? 'Active' : 'Archived'}</span>
              ),
            },
            {
              key: 'id',
              header: 'Actions',
              render: (id, row: Course) => (
                <div className="flex gap-1.5">
                  {/* Assign Lecturer */}
                  <button
                    onClick={() => openAssign(row)}
                    className="text-electric-cyan hover:text-neon-green p-1.5 rounded hover:bg-white/5 transition-colors"
                    title="Assign Lecturer"
                  >
                    <UserCheck size={14} />
                  </button>
                  {/* View Students */}
                  <button
                    onClick={() => openStudents(row)}
                    className="text-muted hover:text-white-text p-1.5 rounded hover:bg-white/5 transition-colors"
                    title="View Enrolled Students"
                  >
                    <Eye size={14} />
                  </button>
                  {/* Archive */}
                  {row.is_active && (
                    <button
                      onClick={() => setArchiveTarget(id)}
                      className="text-amber-warning hover:text-amber-warning/80 p-1.5 rounded hover:bg-white/5 transition-colors"
                      title="Archive course"
                    >
                      <Archive size={14} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* ── Create Course Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Course to EX-AMS" size="md">
        <div className="space-y-4">
          <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(0,210,255,0.06)', border: '1px solid rgba(0,210,255,0.15)', color: '#00D2FF' }}>
            ℹ️ Only admins can add courses here. Lecturers will register these courses from the Courses tab.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Course Code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. CSC301"
              required
            />
            <Select
              label="Level"
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
              options={levelOptions}
            />
          </div>
          <Input
            label="Course Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Data Structures and Algorithms"
            required
          />
          <Input
            label="Department"
            value={form.department}
            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            placeholder="e.g. Computer Science"
            required
          />
          <Input
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Brief course description"
          />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" fullWidth onClick={handleCreate} loading={loading}>Add Course</Button>
          </div>
        </div>
      </Modal>

      {/* ── Assign Lecturer Modal ────────────────────────────────────────────── */}
      <Modal isOpen={assignOpen} onClose={() => { setAssignOpen(false); setAssignTarget(null) }} title="Assign Lecturer" size="sm">
        {assignTarget && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-xs text-muted">Course</p>
              <p className="font-semibold text-white-text">{assignTarget.code} — {assignTarget.name}</p>
            </div>
            <Select
              label="Select Lecturer"
              value={selectedLecturerId}
              onChange={(e) => setSelectedLecturerId(e.target.value)}
              options={lecturerOptions}
            />
            <div className="flex gap-3 pt-1">
              <Button variant="ghost" fullWidth onClick={() => { setAssignOpen(false); setAssignTarget(null) }}>Cancel</Button>
              <Button variant="primary" fullWidth onClick={handleAssign} loading={loading}>Assign</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Enrolled Students Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={!!studentsTarget}
        onClose={() => { setStudentsTarget(null); setEnrolledStudents([]) }}
        title={`Enrolled Students — ${studentsTarget?.code ?? ''}`}
        size="md"
      >
        {enrolledStudents.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">No students enrolled yet.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {enrolledStudents.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div>
                  <p className="text-sm text-white-text font-medium">{s.full_name}</p>
                  <p className="text-xs text-muted font-mono">{s.matric_number ?? 'No matric'} · Level {s.level}</p>
                </div>
                <span className="text-xs text-muted">{s.email}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Archive Confirm ──────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="Archive Course?"
        message="This will deactivate the course. Students will no longer be able to mark attendance for it."
        confirmLabel="Archive"
        variant="warning"
      />

      <HelpOverlay />
    </Layout>
  )
}
