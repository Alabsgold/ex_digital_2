import { useEffect, useState } from 'react'
import { UserPlus, Upload, Edit, Ban, RotateCcw, Key } from 'lucide-react'
import { useAdminStore } from '@/store/adminStore'
import Layout from '@/components/Layout'
import HelpOverlay from '@/components/HelpOverlay'
import SearchInput from '@/components/SearchInput'
import Select from '@/components/Select'
import DataTable from '@/components/DataTable'
import Button from '@/components/Button'
import Modal from '@/components/Modal'
import Input from '@/components/Input'
import ConfirmModal from '@/components/ConfirmModal'
import { RoleBadge, StatusBadge } from '@/components/Badge'
import { useToast } from '@/components/Toast'
import type { User } from '@/store/authStore'

export default function AdminUserManagement() {
  const { users, usersPagination, isLoading, fetchUsers, updateUser, createUser, deactivateUser, reactivateUser, bulkImportUsers } = useAdminStore()
  const { success, error: toastError } = useToast()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', email: '', role: '', department: '', level: '' })

  const load = (page = 1) => fetchUsers({ search, role: roleFilter, page })
  useEffect(() => { load() }, [search, roleFilter, statusFilter])

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createForm, setCreateForm] = useState({ full_name: '', email: '', role: 'lecturer' as 'admin'|'lecturer'|'student', department: '', level: '', password: '' })

  const handleCreateSubmit = async () => {
    if (!createForm.password || createForm.password.length < 8) {
      toastError('Please assign a password (at least 8 characters).')
      return
    }
    setCreateLoading(true)
    try {
      await createUser({
        full_name: createForm.full_name,
        email: createForm.email,
        role: createForm.role,
        department: createForm.department || undefined,
        level: createForm.level || undefined,
        password: createForm.password,
      })
      success('User created successfully.')
      setCreateModalOpen(false)
      setCreateForm({ full_name: '', email: '', role: 'lecturer', department: '', level: '', password: '' })
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setCreateLoading(false)
    }
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setEditForm({ full_name: u.full_name, email: u.email, role: u.role, department: u.department ?? '', level: u.level ?? '' })
  }

  const handleEditSubmit = async () => {
    if (!editUser) return
    setEditLoading(true)
    try {
      await updateUser(editUser.id, editForm)
      success('User updated successfully.')
      setEditUser(null)
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    try {
      await deactivateUser(deactivateTarget.id)
      success('User deactivated.')
      setDeactivateTarget(null)
    } catch (err: any) {
      toastError(err.message)
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setImportLoading(true)
      try {
        const result = await bulkImportUsers(file)
        success(`Import complete: ${result.created} created, ${result.failed} failed.`)
        load()
      } catch (err: any) {
        toastError(err.message || 'Import failed.')
      } finally {
        setImportLoading(false)
      }
    }
    input.click()
  }

  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'student', label: 'Student' },
    { value: 'lecturer', label: 'Lecturer' },
    { value: 'admin', label: 'Admin' },
  ]

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="page-title">User Management</h1>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)} leftIcon={<UserPlus size={14} />}>
              Add User
            </Button>
            <Button variant="secondary" size="sm" onClick={handleImport} loading={importLoading} leftIcon={<Upload size={14} />}>
              Import CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <SearchInput placeholder="Search users..." onChange={setSearch} className="flex-1 min-w-48" />
          <Select label="" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} options={roleOptions} className="w-40" />
        </div>

        <DataTable
          data={users}
          keyField="id"
          isLoading={isLoading}
          emptyTitle="No users found"
          totalPages={usersPagination.pages}
          currentPage={usersPagination.page}
          onPageChange={(p) => fetchUsers({ search, role: roleFilter, page: p })}
          columns={[
            {
              key: 'full_name',
              header: 'User',
              render: (v, row: User) => (
                <div>
                  <p className="font-medium text-white-text text-sm">{v}</p>
                  <p className="text-xs text-muted">{row.email}</p>
                </div>
              ),
            },
            { key: 'matric_number', header: 'Matric', render: (v) => <span className="text-xs font-mono text-muted">{v || '—'}</span> },
            { key: 'role', header: 'Role', render: (v) => <RoleBadge role={v} /> },
            { key: 'department', header: 'Department', render: (v) => <span className="text-xs text-muted">{v || '—'}</span> },
            { key: 'is_active', header: 'Status', render: (v) => <StatusBadge status={v ? 'active' : 'inactive'} /> },
            {
              key: 'id',
              header: 'Actions',
              render: (_, row: User) => (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(row)} className="text-electric-cyan hover:text-neon-green text-xs p-1.5 rounded hover:bg-white/5 transition-colors" aria-label="Edit user">
                    <Edit size={14} />
                  </button>
                  {row.is_active ? (
                    <button onClick={() => setDeactivateTarget(row)} className="text-soft-red hover:text-soft-red/80 text-xs p-1.5 rounded hover:bg-white/5 transition-colors" aria-label="Deactivate user">
                      <Ban size={14} />
                    </button>
                  ) : (
                    <button onClick={() => reactivateUser(row.id).then(() => success('User reactivated.'))} className="text-neon-green text-xs p-1.5 rounded hover:bg-white/5 transition-colors" aria-label="Reactivate user">
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Create User Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Add New User" size="md">
        <div className="space-y-4">
          <Input label="Full Name" value={createForm.full_name} onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))} required />
          <Input label="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} required />
          <Select label="Role" value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as any }))}
            options={[{ value: 'student', label: 'Student' }, { value: 'lecturer', label: 'Lecturer' }, { value: 'admin', label: 'Admin' }]} required />
          
          <Input label="Department (Optional)" value={createForm.department} onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))} />
          {createForm.role === 'student' && (
            <Input label="Level (Optional)" value={createForm.level} onChange={(e) => setCreateForm((f) => ({ ...f, level: e.target.value }))} />
          )}
          
          <Input label="Temporary Password" type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} showPasswordToggle required />
          
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button variant="primary" fullWidth onClick={handleCreateSubmit} loading={createLoading}>Create User</Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User" size="md">
        <div className="space-y-4">
          <Input label="Full Name" value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
          <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
          <Select label="Role" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
            options={[{ value: 'student', label: 'Student' }, { value: 'lecturer', label: 'Lecturer' }, { value: 'admin', label: 'Admin' }]} />
          <Input label="Department" value={editForm.department} onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={() => setEditUser(null)}>Cancel</Button>
            <Button variant="primary" fullWidth onClick={handleEditSubmit} loading={editLoading}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirm */}
      <ConfirmModal
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Deactivate User?"
        message={`This will prevent ${deactivateTarget?.full_name} from logging in. Their data will be preserved.`}
        confirmLabel="Deactivate"
      />

      <HelpOverlay />
    </Layout>
  )
}
