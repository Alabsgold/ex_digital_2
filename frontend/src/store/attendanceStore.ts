import { create } from 'zustand'
import apiClient from '@/lib/apiClient'

export interface AttendanceRecord {
  id: string
  session_id: string
  course_name: string
  course_code: string
  student_name: string
  student_matric: string | null
  status: 'present' | 'late' | 'absent'
  marked_by: string
  marked_at: string
}

export interface AttendanceByCourse {
  course_name: string
  course_code: string
  percentage: number
  present: number
  total: number
}

export interface AttendanceStats {
  total_sessions: number
  present_count: number
  absent_count: number
  late_count: number
  percentage: number
  by_course: AttendanceByCourse[]
}

export interface AttendanceFilters {
  course_id?: string
  from_date?: string
  to_date?: string
  status?: string
  page?: number
  per_page?: number
}

export interface LecturerStats {
  total_courses: number
  active_sessions: number
  total_students_taught: number
  today_attendance_count: number
  attendance_trend: { date: string, count: number }[]
  course_stats: { course_name: string, course_code: string, enrolled: number, sessions: number, attendance_percentage: number }[]
}

interface AttendanceState {
  records: AttendanceRecord[]
  total: number
  page: number
  pages: number
  stats: AttendanceStats | null
  lecturerStats: LecturerStats | null

  isLoading: boolean
  error: string | null
  fetchMyAttendance: (filters?: AttendanceFilters) => Promise<void>
  fetchStats: () => Promise<void>
  fetchLecturerStats: () => Promise<void>
  submitSessionCode: (sessionCode: string) => Promise<any>
  clearError: () => void
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  records: [],
  total: 0,
  page: 1,
  pages: 1,
  stats: null,
  lecturerStats: null,
  isLoading: false,
  error: null,

  fetchLecturerStats: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.get('/attendance/lecturer-stats')
      set({ lecturerStats: data, isLoading: false })
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.detail || 'Failed to fetch lecturer stats.' })
    }
  },


  fetchMyAttendance: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.course_id) params.set('course_id', filters.course_id)
      if (filters.from_date) params.set('from_date', filters.from_date)
      if (filters.to_date) params.set('to_date', filters.to_date)
      if (filters.status) params.set('status', filters.status)
      if (filters.page) params.set('page', String(filters.page))
      if (filters.per_page) params.set('per_page', String(filters.per_page))
      const { data } = await apiClient.get(`/attendance/my?${params}`)
      set({
        records: data.items,
        total: data.total,
        page: data.page,
        pages: data.pages,
        isLoading: false,
      })
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.detail || 'Failed to fetch attendance.' })
    }
  },

  fetchStats: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.get('/attendance/stats')
      set({ stats: data, isLoading: false })
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.detail || 'Failed to fetch stats.' })
    }
  },

  submitSessionCode: async (sessionCode: string) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.post('/attendance/rapid-scan', {
        scans: [{
          session_code: sessionCode,
          timestamp: new Date().toISOString()
        }]
      })
      set({ isLoading: false })
      return data
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.detail || 'Failed to submit code.' })
      throw err
    }
  },

  clearError: () => set({ error: null }),
}))
