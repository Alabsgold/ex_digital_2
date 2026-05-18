import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import apiClient from '@/lib/apiClient'

export interface User {
  id: string
  email: string
  full_name: string
  matric_number: string | null
  role: 'admin' | 'lecturer' | 'student'
  department: string | null
  level: string | null
  is_active: boolean
  created_at: string
  last_login: string | null
}

export interface RegisterData {
  email: string
  password: string
  full_name: string
  matric_number?: string
  department?: string
  level?: string
  role?: 'student' | 'lecturer'
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (login: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  fetchProfile: () => Promise<void>
  clearError: () => void
  isAdmin: () => boolean
  isLecturer: () => boolean
  isStudent: () => boolean
  getDashboardPath: () => string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (login: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await apiClient.post('/auth/login', { login, password })
          set({
            user: data.user,
            token: data.access_token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (err: any) {
          const message = err.response?.data?.detail || 'Login failed. Please try again.'
          set({ isLoading: false, error: message })
          throw new Error(message)
        }
      },

      register: async (formData: RegisterData) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await apiClient.post('/auth/register', formData)
          set({
            user: data.user,
            token: data.access_token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (err: any) {
          const message = err.response?.data?.detail || 'Registration failed. Please try again.'
          set({ isLoading: false, error: message })
          throw new Error(message)
        }
      },

      logout: () => {
        // Fire and forget logout API
        if (get().token) {
          apiClient.post('/auth/logout').catch(() => {})
        }
        set({ user: null, token: null, isAuthenticated: false, error: null })
      },

      fetchProfile: async () => {
        try {
          const { data } = await apiClient.get('/auth/me')
          set({ user: data, isAuthenticated: true })
        } catch {
          set({ user: null, token: null, isAuthenticated: false })
        }
      },

      clearError: () => set({ error: null }),

      isAdmin: () => get().user?.role === 'admin',
      isLecturer: () => get().user?.role === 'lecturer',
      isStudent: () => get().user?.role === 'student',

      getDashboardPath: () => {
        const role = get().user?.role
        if (role === 'admin') return '/admin/dashboard'
        if (role === 'lecturer') return '/lecturer/dashboard'
        return '/student/dashboard'
      },
    }),
    {
      name: 'ex-digital-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)
