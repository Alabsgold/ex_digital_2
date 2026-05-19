import { create } from 'zustand'
import apiClient from '@/lib/apiClient'
import type { User } from '@/store/authStore'

export interface DashboardStats {
  total_users: number
  total_students: number
  total_lecturers: number
  total_admins: number
  total_courses: number
  active_courses: number
  archived_courses: number
  active_sessions_now: number
  total_attendance_records_today: number
  overall_attendance_percentage: number
  erp_sync_status: { pending: number; last_sync: string | null; status: string }
  users_by_department: { department: string; count: number }[]
  attendance_trend: { date: string; percentage: number }[]
}

export interface UserFilters {
  search?: string
  role?: string
  is_active?: boolean
  department?: string
  page?: number
  per_page?: number
}

export interface UserCreate {
  email: string
  password: string
  full_name: string
  matric_number?: string
  role: 'admin' | 'lecturer' | 'student'
  department?: string
  level?: string
}

export interface UserUpdate {
  full_name?: string
  email?: string
  role?: string
  department?: string
  level?: string
  is_active?: boolean
}

export interface BulkImportResult {
  total: number
  created: number
  failed: number
  errors: { row: number; message: string }[]
}

interface AdminState {
  dashboardStats: DashboardStats | null
  users: User[]
  usersPagination: { total: number; page: number; pages: number; per_page: number }
  isLoading: boolean
  error: string | null
  fetchDashboardStats: () => Promise<void>
  fetchUsers: (filters?: UserFilters) => Promise<void>
  createUser: (data: UserCreate) => Promise<void>
  updateUser: (id: string, data: UserUpdate) => Promise<void>
  deactivateUser: (id: string) => Promise<void>
  reactivateUser: (id: string) => Promise<void>
  bulkImportUsers: (file: File) => Promise<BulkImportResult>
  clearError: () => void
}

export const useAdminStore = create<AdminState>((set) => ({
  dashboardStats: null,
  users: [],
  usersPagination: { total: 0, page: 1, pages: 1, per_page: 25 },
  isLoading: false,
  error: null,

  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.get('/admin/dashboard/stats')
      set({ dashboardStats: data, isLoading: false })
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.detail || 'Failed to load stats.' })
    }
  },

  fetchUsers: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.role) params.set('role', filters.role)
      if (filters.is_active !== undefined) params.set('is_active', String(filters.is_active))
      if (filters.department) params.set('department', filters.department)
      if (filters.page) params.set('page', String(filters.page))
      if (filters.per_page) params.set('per_page', String(filters.per_page))
      const { data } = await apiClient.get(`/admin/users?${params}`)
      set({
        users: data.items,
        usersPagination: { total: data.total, page: data.page, pages: data.pages, per_page: data.per_page },
        isLoading: false,
      })
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.detail || 'Failed to fetch users.' })
    }
  },

  createUser: async (userData) => {
    const { data } = await apiClient.post('/admin/users', userData)
    // Add the new user to the beginning of the list
    set((state) => ({ users: [data, ...state.users] }))
  },

  updateUser: async (id, userData) => {
    const { data } = await apiClient.patch(`/admin/users/${id}`, userData)
    set((state) => ({ users: state.users.map((u) => (u.id === id ? data : u)) }))
  },

  deactivateUser: async (id) => {
    await apiClient.delete(`/admin/users/${id}`)
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, is_active: false } : u)),
    }))
  },

  reactivateUser: async (id) => {
    const { data } = await apiClient.post(`/admin/users/${id}/reactivate`)
    set((state) => ({ users: state.users.map((u) => (u.id === id ? data : u)) }))
  },

  bulkImportUsers: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post('/auth/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  clearError: () => set({ error: null }),
}))
