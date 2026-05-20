import { create } from 'zustand'
import apiClient from '@/lib/apiClient'

export interface Session {
  id: string
  course_id: string
  course_name: string
  course_code: string
  qr_uuid: string
  session_code: string
  is_active: boolean
  duration_minutes: number
  venue?: string | null
  started_at: string
  ended_at: string | null
  attendee_count: number
  elapsed_seconds?: number
  remaining_seconds?: number
}

export interface Attendee {
  student_name: string
  matric_number: string | null
  marked_at: string
  status: string
}

interface SessionState {
  activeSessions: Session[]
  currentSession: Session | null
  liveAttendees: Attendee[]
  isLoading: boolean
  error: string | null
  sseSource: EventSource | null
  startSession: (courseId: string, durationMinutes: number, venue?: string) => Promise<Session>
  endSession: (sessionId: string) => Promise<void>
  cancelSession: (sessionId: string) => Promise<void>
  fetchActiveSessions: () => Promise<void>
  scanBarcode: (sessionId: string, matricNumber: string) => Promise<any>
  connectSSE: (sessionId: string) => Promise<void>
  disconnectSSE: () => void
  setCurrentSession: (session: Session | null) => void
  clearError: () => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSessions: [],
  currentSession: null,
  liveAttendees: [],
  isLoading: false,
  error: null,
  sseSource: null,

  startSession: async (courseId, durationMinutes, venue) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.post('/sessions/start', {
        course_id: courseId,
        duration_minutes: durationMinutes,
        venue,
      })
      set((state) => ({
        currentSession: data,
        activeSessions: [data, ...state.activeSessions],
        isLoading: false,
      }))
      return data
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to start session.'
      set({ isLoading: false, error: message })
      throw new Error(message)
    }
  },

  endSession: async (sessionId) => {
    set({ isLoading: true, error: null })
    try {
      await apiClient.post(`/sessions/${sessionId}/end`)
      set((state) => ({
        activeSessions: state.activeSessions.filter((s) => s.id !== sessionId),
        currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
        isLoading: false,
      }))
      get().disconnectSSE()
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to end session.'
      set({ isLoading: false, error: message })
      throw new Error(message)
    }
  },

  cancelSession: async (sessionId) => {
    set({ isLoading: true, error: null })
    try {
      await apiClient.delete(`/sessions/${sessionId}`)
      set((state) => ({
        activeSessions: state.activeSessions.filter((s) => s.id !== sessionId),
        currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
        isLoading: false,
      }))
      get().disconnectSSE()
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to cancel session.'
      set({ isLoading: false, error: message })
      throw new Error(message)
    }
  },

  fetchActiveSessions: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.get('/sessions/active')
      set({ activeSessions: data, isLoading: false })
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.detail || 'Failed to fetch sessions.' })
    }
  },

  scanBarcode: async (sessionId: string, matricNumber: string) => {
    try {
      const { data } = await apiClient.post('/attendance/barcode-scan', {
        session_id: sessionId,
        matric_number: matricNumber
      })
      // Return response so the scanner can display student name
      return data
    } catch (err: any) {
      throw err  // re-throw full error (with response.status) for error classification
    }
  },

  connectSSE: async (sessionId) => {
    const existing = get().sseSource
    if (existing) existing.close()

    // Fetch previously marked attendees
    try {
      const { data } = await apiClient.get(`/sessions/${sessionId}/attendees?per_page=100`)
      set({ liveAttendees: data.items })
    } catch {
      set({ liveAttendees: [] })
    }

    const token = localStorage.getItem('ex-digital-auth')
      ? JSON.parse(localStorage.getItem('ex-digital-auth')!).state?.token
      : null

    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/sessions/${sessionId}/attendees/stream?token=${token}`
    const source = new EventSource(url)

    source.addEventListener('attendee', (e) => {
      try {
        const attendee = JSON.parse(e.data) as Attendee
        set((state) => ({ liveAttendees: [attendee, ...state.liveAttendees] }))
      } catch {}
    })

    source.onerror = () => {
      // Auto-reconnect handled by browser
    }

    set({ sseSource: source })
  },

  disconnectSSE: () => {
    const source = get().sseSource
    if (source) {
      source.close()
      set({ sseSource: null })
    }
  },

  setCurrentSession: (session) => set({ currentSession: session }),
  clearError: () => set({ error: null }),
}))
