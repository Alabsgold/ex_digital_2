import { create } from 'zustand'
import apiClient from '@/lib/apiClient'

export interface Course {
  id: string
  code: string
  name: string
  description: string | null
  department: string
  lecturer_id: string | null
  lecturer: { id: string; full_name: string; email: string } | null
  is_active: boolean
  created_at: string
  enrollment_count: number
}

export interface CourseFilters {
  department?: string
  is_active?: boolean
  search?: string
  page?: number
  per_page?: number
}

export interface CourseCreate {
  code: string
  name: string
  description?: string
  department: string
  lecturer_id?: string
}

export interface CourseUpdate {
  name?: string
  description?: string
  department?: string
  is_active?: boolean
}

interface CourseState {
  courses: Course[]
  currentCourse: Course | null
  total: number
  page: number
  pages: number
  isLoading: boolean
  error: string | null
  fetchCourses: (filters?: CourseFilters) => Promise<void>
  fetchCourse: (id: string) => Promise<void>
  createCourse: (data: CourseCreate) => Promise<Course>
  updateCourse: (id: string, data: CourseUpdate) => Promise<void>
  enrollStudents: (courseId: string, studentIds: string[]) => Promise<any>
  assignLecturer: (courseId: string, lecturerId: string) => Promise<void>
  clearError: () => void
}

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  currentCourse: null,
  total: 0,
  page: 1,
  pages: 1,
  isLoading: false,
  error: null,

  fetchCourses: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.department) params.set('department', filters.department)
      if (filters.is_active !== undefined) params.set('is_active', String(filters.is_active))
      if (filters.search) params.set('search', filters.search)
      if (filters.page) params.set('page', String(filters.page))
      if (filters.per_page) params.set('per_page', String(filters.per_page))
      const { data } = await apiClient.get(`/courses/?${params}`)
      set({ courses: data.items, total: data.total, page: data.page, pages: data.pages, isLoading: false })
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.detail || 'Failed to fetch courses.' })
    }
  },

  fetchCourse: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.get(`/courses/${id}`)
      set({ currentCourse: data, isLoading: false })
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.detail || 'Course not found.' })
    }
  },

  createCourse: async (courseData) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.post('/courses/', courseData)
      set((state) => ({ courses: [data, ...state.courses], isLoading: false }))
      return data
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to create course.'
      set({ isLoading: false, error: message })
      throw new Error(message)
    }
  },

  updateCourse: async (id, courseData) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.patch(`/courses/${id}`, courseData)
      set((state) => ({
        courses: state.courses.map((c) => (c.id === id ? data : c)),
        currentCourse: state.currentCourse?.id === id ? data : state.currentCourse,
        isLoading: false,
      }))
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to update course.'
      set({ isLoading: false, error: message })
      throw new Error(message)
    }
  },

  enrollStudents: async (courseId, studentIds) => {
    const { data } = await apiClient.post(`/courses/${courseId}/enroll`, { student_ids: studentIds })
    return data
  },

  assignLecturer: async (courseId, lecturerId) => {
    const { data } = await apiClient.post(`/courses/${courseId}/assign-lecturer`, { lecturer_id: lecturerId })
    set((state) => ({
      courses: state.courses.map((c) => (c.id === courseId ? data : c)),
    }))
  },

  clearError: () => set({ error: null }),
}))
