import { useEffect, useState } from 'react'
import { PlusCircle, Archive, Edit } from 'lucide-react'
import { useCourseStore, CourseCreate } from '@/store/courseStore'
import Layout from '@/components/Layout'
import HelpOverlay from '@/components/HelpOverlay'
import SearchInput from '@/components/SearchInput'
import DataTable from '@/components/DataTable'
import Modal from '@/components/Modal'
import Input from '@/components/Input'
import Button from '@/components/Button'
import ConfirmModal from '@/components/ConfirmModal'
import { useToast } from '@/components/Toast'

export default function AdminCourseManagement() {
  const { courses, pages, page, isLoading, fetchCourses, createCourse, updateCourse } = useCourseStore()
  const { success, error: toastError } = useToast()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', description: '', department: '' })

  useEffect(() => { fetchCourses({ search }) }, [search])

  const handleCreate = async () => {
    if (!form.code || !form.name || !form.department) { toastError('Code, name, and department are required.'); return }
    setLoading(true)
    try {
      await createCourse(form as CourseCreate)
      success(`Course ${form.code} created successfully.`)
      setCreateOpen(false)
      setForm({ code: '', name: '', description: '', department: '' })
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

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Course Management</h1>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)} leftIcon={<PlusCircle size={14} />}>
            Create Course
          </Button>
        </div>

        <SearchInput placeholder="Search courses..." onChange={setSearch} />

        <DataTable
          data={courses}
          keyField="id"
          isLoading={isLoading}
          emptyTitle="No courses found"
          totalPages={pages}
          currentPage={page}
          onPageChange={(p) => fetchCourses({ search, page: p })}
          columns={[
            { key: 'code', header: 'Code', render: (v) => <span className="font-mono text-electric-cyan text-sm">{v}</span> },
            { key: 'name', header: 'Course Name' },
            { key: 'department', header: 'Department', render: (v) => <span className="text-sm text-muted">{v}</span> },
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
              render: (id, row) => (
                <div className="flex gap-2">
                  {row.is_active && (
                    <button
                      onClick={() => setArchiveTarget(id)}
                      className="text-amber-warning hover:text-amber-warning/80 p-1.5 rounded hover:bg-white/5 transition-colors"
                      aria-label="Archive course"
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

      {/* Create Course Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Course" size="md">
        <div className="space-y-4">
          <Input label="Course Code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. CSC301" required />
          <Input label="Course Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Data Structures" required />
          <Input label="Department" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder="e.g. Computer Science" required />
          <Input label="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief course description" />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" fullWidth onClick={handleCreate} loading={loading}>Create Course</Button>
          </div>
        </div>
      </Modal>

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
